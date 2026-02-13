/**
 * Snapshot generation and management
 */

import { prisma } from "./db";
import { getStorageAdapter } from "./storage/r2";
import { DRAWING_CONSTANTS, StrokeChunkWithId } from "@graffiti/shared";
import * as crypto from "crypto";

// Optional canvas import (may not be available on Windows without build tools)
let canvas: any = null;
try {
  canvas = require("canvas");
} catch (error) {
  console.warn("Canvas module not available. Snapshot generation will be disabled.");
  console.warn("To enable snapshots on Windows, install build tools or use WSL/Docker.");
}

/**
 * Generate a snapshot for a room
 */
export async function generateSnapshot(roomId: string): Promise<string | null> {
  // Check if canvas is available
  if (!canvas) {
    console.warn(`Snapshot generation skipped for room ${roomId}: canvas module not available`);
    return null;
  }

  try {
    // Get the latest snapshot for this room
    const latestSnapshot = await prisma.snapshot.findFirst({
      where: { roomId },
      orderBy: { createdAt: "desc" },
    });

    // Get all strokes since the last snapshot (or all strokes if no snapshot)
    const strokes = await prisma.stroke.findMany({
      where: {
        roomId,
        ...(latestSnapshot?.lastStrokeIdIncluded
          ? {
              id: {
                gt: latestSnapshot.lastStrokeIdIncluded,
              },
            }
          : {}),
      },
      orderBy: { createdAt: "asc" },
    });

    // Create canvas
    const canvasInstance = canvas.createCanvas(DRAWING_CONSTANTS.CANVAS_WIDTH, DRAWING_CONSTANTS.CANVAS_HEIGHT);
    const ctx = canvasInstance.getContext("2d");

    // Fill with white background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, DRAWING_CONSTANTS.CANVAS_WIDTH, DRAWING_CONSTANTS.CANVAS_HEIGHT);

    // If there's a previous snapshot, load and draw it first
    if (latestSnapshot?.r2Url && latestSnapshot.r2Url.startsWith("http")) {
      try {
        const image = await canvas.loadImage(latestSnapshot.r2Url);
        ctx.drawImage(image, 0, 0);
      } catch (error) {
        console.warn("Failed to load previous snapshot, continuing without it:", error);
      }
    }

    // Replay strokes
    for (const stroke of strokes) {
      drawStroke(ctx, {
        id: stroke.id,
        userId: stroke.userId,
        roomId: stroke.roomId,
        points: stroke.points as any,
        color: stroke.color,
        size: stroke.size,
        opacity: stroke.opacity,
        createdAt: stroke.createdAt,
      });
    }

    // Convert to PNG buffer
    const buffer = canvasInstance.toBuffer("image/png");

    // Upload to storage
    const storage = getStorageAdapter();
    const key = `snapshots/${roomId}/${Date.now()}-${crypto.randomBytes(8).toString("hex")}.png`;
    const url = await storage.upload(key, buffer, "image/png");

    // Save snapshot record
    const snapshot = await prisma.snapshot.create({
      data: {
        roomId,
        r2Key: key,
        r2Url: url,
        lastStrokeIdIncluded: strokes.length > 0 ? strokes[strokes.length - 1].id : latestSnapshot?.lastStrokeIdIncluded || null,
      },
    });

    console.log(`Generated snapshot for room ${roomId}: ${snapshot.id}`);
    return url;
  } catch (error) {
    console.error("Error generating snapshot:", error);
    return null;
  }
}

/**
 * Draw a stroke on the canvas context
 */
function drawStroke(ctx: any, stroke: StrokeChunkWithId): void {
  const points = stroke.points as Array<{ x: number; y: number }>;
  if (points.length === 0) return;

  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = stroke.opacity;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }

  ctx.stroke();
  ctx.globalAlpha = 1.0;
}

/**
 * Get the latest snapshot URL for a room
 */
export async function getLatestSnapshotUrl(roomId: string): Promise<string | null> {
  const snapshot = await prisma.snapshot.findFirst({
    where: { roomId },
    orderBy: { createdAt: "desc" },
  });

  return snapshot?.r2Url || null;
}

/**
 * Get strokes since the last snapshot
 */
export async function getStrokesSinceSnapshot(roomId: string): Promise<StrokeChunkWithId[]> {
  const latestSnapshot = await prisma.snapshot.findFirst({
    where: { roomId },
    orderBy: { createdAt: "desc" },
  });

  const strokes = await prisma.stroke.findMany({
    where: {
      roomId,
      ...(latestSnapshot?.lastStrokeIdIncluded
        ? {
            id: {
              gt: latestSnapshot.lastStrokeIdIncluded,
            },
          }
        : {}),
    },
    orderBy: { createdAt: "asc" },
    include: {
      user: true,
    },
  });

  return strokes.map((stroke: any) => ({
    id: stroke.id,
    userId: stroke.userId,
    roomId: stroke.roomId,
    points: stroke.points as any,
    color: stroke.color,
    size: stroke.size,
    opacity: stroke.opacity,
    createdAt: stroke.createdAt,
  }));
}

