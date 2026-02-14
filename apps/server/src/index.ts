/**
 * Main server entry point
 */

import { config } from "./config";
import { createWebSocketServer } from "./websocket";
import { createApiServer } from "./api";
import { generateSnapshot } from "./snapshot";
import { getRoomStrokeCount, resetRoomStrokeCount, getActiveRooms } from "./websocket";

// Start HTTP API server (use PORT env var if set, otherwise config.port)
const httpPort = parseInt(process.env.PORT || String(config.port), 10);
const httpServer = createApiServer(httpPort);

// Start WebSocket server
// On Railway, use the same port as HTTP (Railway only exposes one port)
// Locally, use separate port for WebSocket
const wsPort = process.env.PORT ? parseInt(process.env.PORT, 10) : config.wsPort;
createWebSocketServer(wsPort, process.env.PORT ? httpServer : undefined);

// Snapshot worker: periodically generate snapshots
async function snapshotWorker(): Promise<void> {
  const activeRooms = getActiveRooms();
  // Always include "global" room even if no active connections
  const roomsToCheck = activeRooms.length > 0 ? activeRooms : ["global"];

  for (const roomId of roomsToCheck) {
    try {
      const strokeCount = getRoomStrokeCount(roomId);
      const shouldSnapshot = strokeCount >= config.snapshot.strokeThreshold;

      if (shouldSnapshot) {
        console.log(`Triggering snapshot for room ${roomId} (${strokeCount} strokes)`);
        await generateSnapshot(roomId);
        resetRoomStrokeCount(roomId);
      }
    } catch (error) {
      console.error(`Error in snapshot worker for room ${roomId}:`, error);
    }
  }
}

// Run snapshot worker every interval
setInterval(snapshotWorker, config.snapshot.intervalMs);

console.log("Server started");
console.log(`HTTP API: http://localhost:${httpPort}`);
if (process.env.PORT) {
  console.log(`WebSocket: ws://localhost:${httpPort} (attached to HTTP server)`);
} else {
  console.log(`WebSocket: ws://localhost:${wsPort}`);
}

