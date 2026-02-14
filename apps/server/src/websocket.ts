/**
 * WebSocket server for real-time drawing
 */

import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { prisma } from "./db";
import { checkRateLimit, cleanupRateLimit } from "./rateLimiter";
import { spendCredits, getCurrentCredits, addEarnedCredits, hasInfiniteCredits, grantInfiniteCredits } from "./credits";
import { ClientMessage, ServerMessage, DRAWING_CONSTANTS, RATE_LIMIT, CREDIT_CONSTANTS } from "@graffiti/shared";
import { isValidHexColor, clamp, generateUUID } from "@graffiti/shared";

interface Connection {
  ws: WebSocket;
  userId: string;
  roomId: string;
  connectionId: string;
  lastEarnTime: number;
  isAlive: boolean;
}

// Room management: roomId -> Set of connections
const rooms = new Map<string, Set<Connection>>();

// User management: userId -> active connection (for single connection enforcement)
const userConnections = new Map<string, Connection>();

// Track stroke counts per room for snapshot triggering
const roomStrokeCounts = new Map<string, number>();

/**
 * Broadcast message to all connections in a room
 */
function broadcastToRoom(roomId: string, message: ServerMessage, excludeConnectionId?: string): void {
  const room = rooms.get(roomId);
  if (!room) return;

  const data = JSON.stringify(message);
  for (const conn of room) {
    if (conn.connectionId !== excludeConnectionId && conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(data);
    }
  }
}

/**
 * Send message to a specific connection
 */
function sendToConnection(conn: Connection, message: ServerMessage): void {
  if (conn.ws.readyState === WebSocket.OPEN) {
    conn.ws.send(JSON.stringify(message));
  }
}

/**
 * Handle connection close
 */
function handleClose(conn: Connection): void {
  cleanupRateLimit(conn.connectionId);
  
  const room = rooms.get(conn.roomId);
  if (room) {
    room.delete(conn);
    if (room.size === 0) {
      rooms.delete(conn.roomId);
    }
  }

  // Remove from user connections if this is the active one
  const activeConn = userConnections.get(conn.userId);
  if (activeConn?.connectionId === conn.connectionId) {
    userConnections.delete(conn.userId);
  }
}

/**
 * Validate stroke chunk
 */
function validateStrokeChunk(chunk: any): boolean {
  if (!chunk || typeof chunk !== "object") return false;
  if (!Array.isArray(chunk.points)) return false;
  if (chunk.points.length === 0 || chunk.points.length > RATE_LIMIT.MAX_CHUNK_SIZE) return false;
  if (typeof chunk.color !== "string" || !isValidHexColor(chunk.color)) return false;
  if (typeof chunk.size !== "number" || chunk.size < DRAWING_CONSTANTS.MIN_BRUSH_SIZE || chunk.size > DRAWING_CONSTANTS.MAX_BRUSH_SIZE) return false;
  if (typeof chunk.opacity !== "number" || chunk.opacity < 0 || chunk.opacity > 1) return false;
  if (typeof chunk.roomId !== "string") return false;

  // Validate points
  for (const point of chunk.points) {
    if (typeof point.x !== "number" || typeof point.y !== "number") return false;
    if (point.x < 0 || point.x > DRAWING_CONSTANTS.CANVAS_WIDTH) return false;
    if (point.y < 0 || point.y > DRAWING_CONSTANTS.CANVAS_HEIGHT) return false;
  }

  return true;
}

/**
 * Handle incoming message
 */
async function handleMessage(conn: Connection, rawMessage: string): Promise<void> {
  try {
    const message: ClientMessage = JSON.parse(rawMessage);

    switch (message.type) {
      case "join": {
        // Validate join message
        if (typeof message.roomId !== "string" || typeof message.userId !== "string") {
          sendToConnection(conn, { type: "error", message: "Invalid join message" });
          return;
        }

        // Update connection room
        const oldRoom = rooms.get(conn.roomId);
        if (oldRoom) {
          oldRoom.delete(conn);
        }

        conn.roomId = message.roomId;
        if (!rooms.has(conn.roomId)) {
          rooms.set(conn.roomId, new Set());
        }
        rooms.get(conn.roomId)!.add(conn);

        // Check for existing connection for this user and kick it
        const existingConn = userConnections.get(message.userId);
        if (existingConn && existingConn.connectionId !== conn.connectionId) {
          existingConn.ws.close(1008, "New connection from same user");
          handleClose(existingConn);
        }

        userConnections.set(message.userId, conn);
        conn.userId = message.userId;

        // Get room state
        const { getLatestSnapshotUrl, getStrokesSinceSnapshot } = await import("./snapshot");
        const snapshotUrl = await getLatestSnapshotUrl(conn.roomId);
        const strokesSinceSnapshot = await getStrokesSinceSnapshot(conn.roomId);
        const credits = await getCurrentCredits(conn.userId);
        const infiniteCredits = hasInfiniteCredits(conn.userId);

        // Send init message
        sendToConnection(conn, {
          type: "init",
          snapshotUrl,
          strokesSinceSnapshot,
          credits,
          infiniteCredits,
        });

        // Initialize earn time
        conn.lastEarnTime = Date.now();
        break;
      }

      case "stroke_chunk": {
        // Validate message
        if (!validateStrokeChunk(message.chunk)) {
          sendToConnection(conn, { type: "error", message: "Invalid stroke chunk" });
          return;
        }

        // Check rate limit
        if (!checkRateLimit(conn.connectionId)) {
          sendToConnection(conn, { type: "error", message: "Rate limit exceeded" });
          return;
        }

        // Verify room matches
        if (message.chunk.roomId !== conn.roomId) {
          sendToConnection(conn, { type: "error", message: "Room mismatch" });
          return;
        }

        // Calculate cost and check credits
        const cost = message.chunk.points.length * CREDIT_CONSTANTS.COST_PER_POINT;
        const hasCredits = await spendCredits(conn.userId, message.chunk.points.length);

        if (!hasCredits) {
          sendToConnection(conn, { type: "error", message: "Insufficient credits" });
          return;
        }

        // Save to database
        const stroke = await prisma.stroke.create({
          data: {
            userId: conn.userId,
            roomId: message.chunk.roomId,
            points: message.chunk.points as any, // Prisma Json type
            color: message.chunk.color,
            size: message.chunk.size,
            opacity: message.chunk.opacity,
          },
          include: {
            user: true,
          },
        });

        // Increment stroke count for snapshot triggering
        const currentCount = roomStrokeCounts.get(conn.roomId) || 0;
        roomStrokeCounts.set(conn.roomId, currentCount + 1);

        // Get updated credits
        const credits = await getCurrentCredits(conn.userId);
        const infiniteCredits = hasInfiniteCredits(conn.userId);

        // Create broadcast message
        const broadcastChunk: ServerMessage = {
          type: "stroke_chunk_broadcast",
          chunk: {
            id: stroke.id,
            userId: stroke.userId,
            roomId: stroke.roomId,
            points: message.chunk.points,
            color: message.chunk.color,
            size: message.chunk.size,
            opacity: message.chunk.opacity,
            createdAt: stroke.createdAt,
          },
        };

        // Broadcast to room
        broadcastToRoom(conn.roomId, broadcastChunk, conn.connectionId);

        // Send credits update to sender
        sendToConnection(conn, {
          type: "credits_update",
          credits,
          infiniteCredits,
        });

        break;
      }

      case "cheat_code": {
        // Validate cheat code
        if (typeof message.code !== "string") {
          sendToConnection(conn, { type: "error", message: "Invalid cheat code" });
          return;
        }

        // Check if code is correct
        if (message.code.toLowerCase() === "lactosetolerant") {
          grantInfiniteCredits(conn.userId);
          const credits = await getCurrentCredits(conn.userId);
          sendToConnection(conn, {
            type: "credits_update",
            credits,
            infiniteCredits: true,
          });
        } else {
          sendToConnection(conn, { type: "error", message: "Invalid cheat code" });
        }
        break;
      }

      case "ping": {
        sendToConnection(conn, { type: "pong" });
        break;
      }

      default: {
        sendToConnection(conn, { type: "error", message: "Unknown message type" });
      }
    }
  } catch (error) {
    console.error("Error handling message:", error);
    sendToConnection(conn, { type: "error", message: "Invalid message format" });
  }
}

/**
 * Check and award periodic credits (gradual earning)
 */
async function checkPeriodicCredits(conn: Connection): Promise<void> {
  const now = Date.now();
  const timeSinceLastEarn = now - conn.lastEarnTime;
  const secondsElapsed = timeSinceLastEarn / 1000;

  // Award credits if at least 1 second has passed
  if (secondsElapsed >= 1) {
    const newCredits = await addEarnedCredits(conn.userId, secondsElapsed);
    const infiniteCredits = hasInfiniteCredits(conn.userId);
    
    sendToConnection(conn, {
      type: "credits_update",
      credits: newCredits,
      infiniteCredits,
    });
    
    // Update last earn time to now (or keep partial seconds for next calculation)
    conn.lastEarnTime = now;
  }
}

/**
 * Create WebSocket server
 * If httpServer is provided, attach to it (for Railway single port)
 * Otherwise, create standalone server on specified port
 */
export function createWebSocketServer(port: number, httpServer?: any): void {
  const wss = httpServer 
    ? new WebSocketServer({ server: httpServer })
    : new WebSocketServer({ port });

  // Heartbeat to detect dead connections and award gradual credits
  const heartbeatInterval = setInterval(() => {
    for (const [roomId, connections] of rooms.entries()) {
      for (const conn of connections) {
        if (!conn.isAlive) {
          conn.ws.terminate();
          handleClose(conn);
          continue;
        }

        conn.isAlive = false;
        conn.ws.ping();

        // Check and award gradual credits (runs every second)
        checkPeriodicCredits(conn).catch(console.error);
      }
    }
  }, CREDIT_CONSTANTS.EARN_CHECK_INTERVAL_MS); // Every second

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const connectionId = generateUUID();
    const conn: Connection = {
      ws,
      userId: "",
      roomId: "global", // Default room
      connectionId,
      lastEarnTime: Date.now(),
      isAlive: true,
    };

    // Add to default room
    if (!rooms.has(conn.roomId)) {
      rooms.set(conn.roomId, new Set());
    }
    rooms.get(conn.roomId)!.add(conn);

    ws.on("pong", () => {
      conn.isAlive = true;
    });

    ws.on("message", (data: Buffer) => {
      handleMessage(conn, data.toString()).catch(console.error);
    });

    ws.on("close", () => {
      handleClose(conn);
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      handleClose(conn);
    });
  });

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  if (httpServer) {
    console.log(`WebSocket server attached to HTTP server`);
  } else {
    console.log(`WebSocket server listening on port ${port}`);
  }
}

/**
 * Get stroke count for a room (for snapshot triggering)
 */
export function getRoomStrokeCount(roomId: string): number {
  return roomStrokeCounts.get(roomId) || 0;
}

/**
 * Reset stroke count for a room (after snapshot)
 */
export function resetRoomStrokeCount(roomId: string): void {
  roomStrokeCounts.set(roomId, 0);
}

/**
 * Get all active room IDs
 */
export function getActiveRooms(): string[] {
  return Array.from(rooms.keys());
}

