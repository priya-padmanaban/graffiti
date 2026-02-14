/**
 * HTTP API server for room state initialization
 */

import express from "express";
import { createServer, Server } from "http";
import { prisma } from "./db";
import { getLatestSnapshotUrl, getStrokesSinceSnapshot } from "./snapshot";
import { getCurrentCredits, hasInfiniteCredits } from "./credits";
import { config } from "./config";

const app = express();
let httpServer: Server | null = null;

app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", config.cors.origin);
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

/**
 * GET /api/rooms/:roomId/state
 * Returns snapshot URL, strokes since snapshot, and user credits
 */
app.get("/api/rooms/:roomId/state", async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({ error: "userId query parameter required" });
    }

    const snapshotUrl = await getLatestSnapshotUrl(roomId);
    const strokesSinceSnapshot = await getStrokesSinceSnapshot(roomId);
    const credits = await getCurrentCredits(userId);
    const infiniteCredits = hasInfiniteCredits(userId);

    res.json({
      snapshotUrl,
      strokesSinceSnapshot,
      credits,
      infiniteCredits,
    });
  } catch (error) {
    console.error("Error getting room state:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/admin/rooms
 * Returns list of all rooms with content (stroke counts and metadata)
 * Useful for monitoring which rooms have been used
 */
app.get("/api/admin/rooms", async (req, res) => {
  try {
    // Get all unique roomIds from strokes
    const roomsWithStrokes = await prisma.stroke.groupBy({
      by: ["roomId"],
      _count: {
        id: true,
      },
      _max: {
        createdAt: true,
      },
    });

    // Get snapshot counts per room
    const roomsWithSnapshots = await prisma.snapshot.groupBy({
      by: ["roomId"],
      _count: {
        id: true,
      },
    });

    const snapshotCounts = new Map(
      roomsWithSnapshots.map((r) => [r.roomId, r._count.id])
    );

    // Format response
    const rooms = roomsWithStrokes.map((room) => ({
      roomId: room.roomId,
      strokeCount: room._count.id,
      lastStrokeAt: room._max.createdAt,
      snapshotCount: snapshotCounts.get(room.roomId) || 0,
      url: `https://${req.get("host")?.replace(/:\d+$/, "") || "graffiti.monster"}/r/${room.roomId}`,
    }));

    // Sort by last stroke date (most recent first)
    rooms.sort((a, b) => {
      const dateA = a.lastStrokeAt ? new Date(a.lastStrokeAt).getTime() : 0;
      const dateB = b.lastStrokeAt ? new Date(b.lastStrokeAt).getTime() : 0;
      return dateB - dateA;
    });

    res.json({ rooms, total: rooms.length });
  } catch (error) {
    console.error("Error getting rooms list:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export function createApiServer(port: number): Server {
  if (!httpServer) {
    httpServer = createServer(app);
  }
  httpServer.listen(port, () => {
    console.log(`HTTP API server listening on port ${port}`);
  });
  return httpServer;
}

