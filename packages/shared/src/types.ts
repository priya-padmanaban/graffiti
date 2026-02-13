/**
 * Shared types for WebSocket protocol and data structures
 */

export interface Point {
  x: number;
  y: number;
  timestamp?: number;
}

export interface StrokeChunk {
  points: Point[];
  color: string; // hex color
  size: number; // brush size
  opacity: number; // 0-1
  roomId: string;
}

export interface StrokeChunkWithId extends StrokeChunk {
  id: string;
  userId: string;
  createdAt: Date;
}

// Client -> Server messages
export type ClientMessage =
  | { type: "join"; roomId: string; userId: string }
  | { type: "stroke_chunk"; chunk: StrokeChunk }
  | { type: "cheat_code"; code: string }
  | { type: "ping" };

// Server -> Client messages
export type ServerMessage =
  | { type: "init"; snapshotUrl: string | null; strokesSinceSnapshot: StrokeChunkWithId[]; credits: number; infiniteCredits?: boolean }
  | { type: "stroke_chunk_broadcast"; chunk: StrokeChunkWithId }
  | { type: "credits_update"; credits: number; infiniteCredits?: boolean }
  | { type: "error"; message: string }
  | { type: "pong" };

// Credit system constants
export const CREDIT_CONSTANTS = {
  STARTING_CREDITS: 500, // 5 seconds worth (100 credits per second equivalent)
  EARN_RATE_PER_SECOND: 1.67, // Credits earned per second (500 credits over 5 minutes = ~1.67/sec)
  EARN_CHECK_INTERVAL_MS: 1000, // Check and award credits every second
  COST_PER_POINT: 1, // 1 credit per point
} as const;

// Drawing constants
export const DRAWING_CONSTANTS = {
  CANVAS_WIDTH: 1600,
  CANVAS_HEIGHT: 900,
  MAX_POINTS_PER_CHUNK: 50,
  BATCH_INTERVAL_MS: 50,
  MAX_BRUSH_SIZE: 100,
  MIN_BRUSH_SIZE: 1,
} as const;

// Rate limiting
export const RATE_LIMIT = {
  MAX_STROKES_PER_SECOND: 10,
  MAX_CHUNK_SIZE: 50,
} as const;

