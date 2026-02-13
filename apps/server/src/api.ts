/**
 * HTTP API server for room state initialization
 */

import express from "express";
import { prisma } from "./db";
import { getLatestSnapshotUrl, getStrokesSinceSnapshot } from "./snapshot";
import { getCurrentCredits, hasInfiniteCredits } from "./credits";
import { config } from "./config";

const app = express();

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

export function createApiServer(port: number): void {
  app.listen(port, () => {
    console.log(`HTTP API server listening on port ${port}`);
  });
}

