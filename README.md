# Graffiti - Realtime Multiplayer Drawing

A real-time multiplayer drawing application where users can draw together on a shared canvas. Built with Next.js, WebSockets, PostgreSQL, and Cloudflare R2.

## Architecture

This is a monorepo containing:

- **`/apps/web`**: Next.js 14+ client application (App Router, TypeScript, Tailwind)
- **`/apps/server`**: Node.js WebSocket server (TypeScript, Express, Prisma)
- **`/packages/shared`**: Shared types and utilities for WebSocket protocol

## Features

- **Real-time Drawing**: Multiple users can draw simultaneously on a shared canvas
- **Credit System**: Users start with credits, spend them per point drawn, and earn more over time
- **Rooms**: Support for multiple drawing rooms via URL routing (`/r/[roomId]`)
- **Persistence**: Strokes stored in PostgreSQL, periodic snapshots stored in Cloudflare R2
- **Snapshot System**: Automatic canvas snapshots for fast loading
- **Security**: Rate limiting, payload validation, single connection per user

## Local Setup

### Prerequisites

- Node.js 18+
- Docker and Docker Compose (for PostgreSQL)
- npm or yarn

**Note for Windows users**: The `canvas` package (used for snapshots) requires build tools. See [WINDOWS_SETUP.md](./WINDOWS_SETUP.md) for details. The server will run without canvas, but snapshots will be disabled.

### 1. Start PostgreSQL

```bash
docker-compose up -d
```

This starts a PostgreSQL database on `localhost:5432` with:
- User: `graffiti`
- Password: `graffiti`
- Database: `graffiti`

### 2. Install Dependencies

```bash
npm install
```

**Windows users**: If canvas installation fails, you can:
- Continue anyway (server works, snapshots disabled)
- Or install build tools (see [WINDOWS_SETUP.md](./WINDOWS_SETUP.md))
- Or skip canvas: `npm install --no-optional`

### 3. Configure Environment Variables

**Server** (`apps/server/.env`):
```bash
cp apps/server/env.example apps/server/.env
```

Edit `apps/server/.env`:
- Set `DATABASE_URL` to match your PostgreSQL connection
- Configure R2 settings (or set `R2_ENABLED=false` to use local mock storage)

**Web** (`apps/web/.env.local`):
```bash
cp apps/web/env.example apps/web/.env.local
```

Edit `apps/web/.env.local`:
- Set `NEXT_PUBLIC_API_URL` (default: `http://localhost:3001`)
- Set `NEXT_PUBLIC_WS_URL` (default: `ws://localhost:3002`)

### 4. Run Database Migrations

```bash
cd apps/server
npm run db:generate
npm run db:migrate
```

### 5. Start Development Servers

From the root directory:

```bash
npm run dev
```

This starts:
- Web app: `http://localhost:3000`
- API server: `http://localhost:3001`
- WebSocket server: `ws://localhost:3002`

## Environment Variables

### Server (`apps/server/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `PORT` | HTTP API server port | `3001` |
| `WS_PORT` | WebSocket server port | `3002` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |
| `R2_ENABLED` | Enable R2 storage (set to `false` for local mock) | `true` |
| `R2_ENDPOINT` | Cloudflare R2 endpoint URL | Required if R2_ENABLED=true |
| `R2_BUCKET` | R2 bucket name | Required if R2_ENABLED=true |
| `R2_ACCESS_KEY_ID` | R2 access key | Required if R2_ENABLED=true |
| `R2_SECRET_ACCESS_KEY` | R2 secret key | Required if R2_ENABLED=true |
| `R2_PUBLIC_URL` | Public URL prefix for R2 objects | Optional |
| `SNAPSHOT_INTERVAL_MS` | Snapshot check interval | `30000` (30s) |
| `SNAPSHOT_STROKE_THRESHOLD` | Strokes before triggering snapshot | `100` |

### Web (`apps/web/.env.local`)

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | HTTP API server URL | `http://localhost:3001` |
| `NEXT_PUBLIC_WS_URL` | WebSocket server URL | `ws://localhost:3002` |

## How Snapshots Work

The snapshot system periodically generates PNG images of the canvas state:

1. **Triggering**: Snapshots are generated when:
   - The snapshot worker runs (every `SNAPSHOT_INTERVAL_MS` milliseconds)
   - A room has accumulated `SNAPSHOT_STROKE_THRESHOLD` strokes since the last snapshot

2. **Generation**:
   - Server loads the latest snapshot (if exists)
   - Replays all strokes since that snapshot
   - Renders to an offscreen canvas using `node-canvas`
   - Uploads PNG to R2 (or local filesystem if R2 disabled)
   - Records snapshot metadata in PostgreSQL

3. **Loading**:
   - When a client joins, it fetches the latest snapshot URL
   - Loads the snapshot image onto the canvas
   - Replays strokes that occurred after the snapshot
   - This provides fast initial load even with thousands of strokes

## Credit System

### Credit Math

- **Starting Credits**: `500` credits (equivalent to 5 seconds of drawing at 100 points/second)
- **Cost Per Point**: `1` credit per point drawn
- **Earning Interval**: Every `5 minutes` (300,000ms) of active connection
- **Earn Amount**: `500` credits per interval

### Example

If a user draws 100 points:
- Cost: `100 points × 1 credit/point = 100 credits`
- Remaining: `500 - 100 = 400 credits`

After 5 minutes of connection:
- Earned: `+500 credits`
- New total: `400 + 500 = 900 credits`

### Server-Side Enforcement

All credit calculations and deductions happen server-side. The client UI displays credits but cannot be trusted. The server:
- Validates credit balance before accepting stroke chunks
- Rejects chunks that would exceed available credits
- Sends `credits_update` messages to keep clients in sync

## Message Protocol

### Client → Server

```typescript
// Join a room
{ type: "join", roomId: string, userId: string }

// Send stroke chunk
{ type: "stroke_chunk", chunk: StrokeChunk }

// Ping (keepalive)
{ type: "ping" }
```

### Server → Client

```typescript
// Initial state on join
{ type: "init", snapshotUrl: string | null, strokesSinceSnapshot: StrokeChunkWithId[], credits: number }

// Broadcast stroke from another user
{ type: "stroke_chunk_broadcast", chunk: StrokeChunkWithId }

// Credits updated
{ type: "credits_update", credits: number }

// Error occurred
{ type: "error", message: string }

// Pong (response to ping)
{ type: "pong" }
```

### StrokeChunk Structure

```typescript
{
  points: Array<{ x: number, y: number, timestamp?: number }>,
  color: string,      // Hex color (#RRGGBB)
  size: number,       // Brush size (1-100)
  opacity: number,    // 0-1
  roomId: string
}
```

## Database Schema

### User
- `id`: UUID (primary key)
- `userId`: String (unique, client-provided from localStorage)
- `credits`: Integer (current credit balance)
- `createdAt`, `updatedAt`: Timestamps

### Stroke
- `id`: UUID (primary key)
- `userId`: String (foreign key to User.userId)
- `roomId`: String
- `points`: JSON (array of {x, y, timestamp?})
- `color`: String (hex)
- `size`: Float
- `opacity`: Float
- `createdAt`: Timestamp
- Indexed on `(roomId, createdAt)` and `(roomId, id)`

### Snapshot
- `id`: UUID (primary key)
- `roomId`: String
- `r2Key`: String (unique, S3/R2 object key)
- `r2Url`: String (full URL)
- `lastStrokeIdIncluded`: String (last stroke ID in snapshot)
- `createdAt`: Timestamp
- Indexed on `(roomId, createdAt)`

## Security & Abuse Prevention

- **Rate Limiting**: Max 10 stroke chunks per second per connection
- **Payload Validation**: 
  - Max 50 points per chunk
  - Brush size clamped to 1-100
  - Color must be valid hex
  - Points must be within canvas bounds
- **Single Connection**: Only one active connection per userId (older connections are kicked)
- **Credit Enforcement**: Server validates and rejects insufficient credit attempts
- **Malformed Messages**: Invalid messages are ignored, errors sent to client

## Scaling Notes

### Current Limitations (MVP)

- Single server instance (no horizontal scaling)
- In-memory room/connection management
- No Redis for shared state
- PostgreSQL as single source of truth

### Future Scaling Considerations

1. **Horizontal Scaling**:
   - Use Redis for room/connection state
   - WebSocket load balancing (sticky sessions)
   - Shared rate limiting state

2. **Database**:
   - Read replicas for snapshot/stroke queries
   - Partition strokes table by roomId or date
   - Archive old strokes to cold storage

3. **Snapshot Generation**:
   - Move to background job queue (Bull, BullMQ)
   - Parallel snapshot generation for multiple rooms
   - CDN caching for snapshot URLs

4. **WebSocket**:
   - Consider Socket.IO with Redis adapter for multi-server
   - Or use managed WebSocket service (Pusher, Ably)

5. **Storage**:
   - R2 is already scalable, but consider:
     - Lifecycle policies for old snapshots
     - Compression (WebP instead of PNG)
     - CDN in front of R2

## Scripts

### Root Level

- `npm run dev`: Start all apps in development mode
- `npm run build`: Build all apps
- `npm run start`: Start all apps in production mode

### Server (`apps/server`)

- `npm run dev`: Start with hot reload (tsx watch)
- `npm run build`: Compile TypeScript
- `npm run start`: Run compiled server
- `npm run db:generate`: Generate Prisma client
- `npm run db:migrate`: Run database migrations
- `npm run db:studio`: Open Prisma Studio

### Web (`apps/web`)

- `npm run dev`: Start Next.js dev server
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run lint`: Run ESLint

## Development

### Adding a New Room

Rooms are created automatically when users join. Just navigate to `/r/your-room-name` and start drawing.

### Testing Locally Without R2

Set `R2_ENABLED=false` in `apps/server/.env`. Snapshots will be saved to `apps/server/snapshots/` directory locally.

### Canvas Size

The canvas has a fixed logical resolution of 1600×900 pixels. It scales to fit the viewport while maintaining aspect ratio. All stroke coordinates are in this logical space.

## License

MIT

