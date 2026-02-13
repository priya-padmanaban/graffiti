# Project Structure

```
graffiti/
├── package.json                 # Root package.json with workspaces
├── turbo.json                   # Turborepo configuration
├── docker-compose.yml          # PostgreSQL Docker setup
├── README.md                   # Main documentation
├── PROJECT_STRUCTURE.md        # This file
│
├── packages/
│   └── shared/                 # Shared types and utilities
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts        # Exports
│           ├── types.ts        # WebSocket protocol types, constants
│           └── utils.ts        # Utility functions (UUID, validation)
│
├── apps/
│   ├── server/                 # WebSocket + HTTP API server
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── env.example         # Environment variable template
│   │   ├── prisma/
│   │   │   └── schema.prisma   # Database schema (User, Stroke, Snapshot)
│   │   └── src/
│   │       ├── index.ts        # Main entry point, snapshot worker
│   │       ├── config.ts      # Configuration loader
│   │       ├── db.ts           # Prisma client singleton
│   │       ├── api.ts          # HTTP API server (Express)
│   │       ├── websocket.ts    # WebSocket server, room management
│   │       ├── credits.ts      # Credit system (spend, earn, get)
│   │       ├── rateLimiter.ts  # Rate limiting per connection
│   │       ├── snapshot.ts     # Snapshot generation (node-canvas, R2)
│   │       └── storage/
│   │           └── r2.ts       # R2/S3 storage adapter + mock
│   │
│   └── web/                    # Next.js client application
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.js
│       ├── tailwind.config.js
│       ├── postcss.config.js
│       ├── env.example         # Environment variable template
│       └── src/
│           ├── app/
│           │   ├── layout.tsx  # Root layout
│           │   ├── page.tsx    # Home page (redirects to /r/global)
│           │   ├── globals.css # Tailwind imports
│           │   └── r/
│           │       └── [roomId]/
│           │           └── page.tsx  # Room page with drawing UI
│           ├── components/
│           │   ├── Canvas.tsx  # Drawing canvas component
│           │   └── RulesModal.tsx  # Credit rules modal
│           └── lib/
│               ├── storage.ts   # localStorage userId management
│               └── websocket.ts # WebSocket client wrapper
│
└── scripts/
    ├── setup.sh               # Setup script (bash)
    └── setup.ps1              # Setup script (PowerShell)
```

## Key Files

### Shared Package
- **types.ts**: WebSocket message types, stroke chunk structure, credit constants, drawing constants
- **utils.ts**: UUID generation, validation helpers

### Server
- **index.ts**: Starts HTTP API, WebSocket server, snapshot worker
- **websocket.ts**: Connection management, message handling, room broadcasting, credit validation
- **snapshot.ts**: Canvas rendering with node-canvas, R2 upload, stroke replay
- **credits.ts**: Credit spending, earning, balance management
- **api.ts**: HTTP endpoint for room state (`GET /api/rooms/:roomId/state`)

### Web
- **Canvas.tsx**: Drawing logic, batching, coordinate transformation, snapshot loading, stroke replay
- **page.tsx** (room): Main UI with controls, WebSocket connection, credit display
- **websocket.ts**: WebSocket client with reconnection, message handling

## Database Tables

1. **User**: userId (from localStorage), credits balance
2. **Stroke**: All drawn strokes with points, color, size, opacity, roomId
3. **Snapshot**: R2 keys, URLs, last stroke ID included

## Message Flow

1. Client connects → WebSocket
2. Client sends `join` → Server responds with `init` (snapshot URL + strokes since)
3. Client loads snapshot image, replays strokes
4. User draws → Client batches points → Sends `stroke_chunk`
5. Server validates credits, saves to DB, broadcasts to room
6. Server sends `credits_update` to sender
7. Snapshot worker periodically generates new snapshots

## Environment Files Needed

- `apps/server/.env` (from `apps/server/env.example`)
- `apps/web/.env.local` (from `apps/web/env.example`)

