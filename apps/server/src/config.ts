/**
 * Server configuration
 */

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  wsPort: parseInt(process.env.WS_PORT || "3002", 10),
  
  // R2/S3 configuration
  r2: {
    enabled: process.env.R2_ENABLED !== "false", // Default to true, set to "false" to disable
    endpoint: process.env.R2_ENDPOINT || "",
    bucket: process.env.R2_BUCKET || "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    publicUrl: process.env.R2_PUBLIC_URL || "",
  },
  
  // Snapshot configuration
  snapshot: {
    intervalMs: parseInt(process.env.SNAPSHOT_INTERVAL_MS || "30000", 10), // 30 seconds default
    strokeThreshold: parseInt(process.env.SNAPSHOT_STROKE_THRESHOLD || "100", 10), // Every 100 strokes
  },
  
  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  },
} as const;

