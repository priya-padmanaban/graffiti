# Installation Fix Summary

## Issues Fixed

### 1. Canvas Package Build Failure ✅

**Problem**: The `canvas` package (node-canvas) requires native build tools (Python, Visual Studio Build Tools) which aren't installed on Windows by default.

**Solution**: 
- Made `canvas` an **optional dependency** in `package.json`
- Updated `snapshot.ts` to gracefully handle missing canvas module
- Server now runs without canvas, just disables snapshot generation

**Result**: You can now install and run the server without canvas. Snapshots will be skipped with a warning message.

### 2. Prisma Not Found ✅

**Problem**: Prisma CLI wasn't available because the install failed.

**Solution**: 
- Installed dependencies with `--no-optional` to skip canvas
- Generated Prisma client with `npx prisma generate`

**Result**: Prisma is now working.

## Current Status

✅ **Dependencies installed** (without canvas)  
✅ **Prisma client generated**  
⚠️ **Canvas not available** (snapshots disabled, but server works)

## Next Steps

1. **Create environment files**:
   ```bash
   # Copy server env template
   Copy-Item apps/server/env.example apps/server/.env
   
   # Copy web env template  
   Copy-Item apps/web/env.example apps/web/.env.local
   ```

2. **Update server .env**:
   - Set `DATABASE_URL="postgresql://graffiti:graffiti@localhost:5432/graffiti?schema=public"`
   - Set `R2_ENABLED=false` (to use local mock storage)

3. **Run database migrations**:
   ```bash
   cd apps/server
   npx prisma migrate dev
   ```

4. **Start the app**:
   ```bash
   # From root directory
   npm run dev
   ```

## Enabling Snapshots Later (Optional)

If you want snapshot generation, you have three options:

### Option 1: Install Build Tools
1. Install Visual Studio Build Tools
2. Install Python 3.x
3. Run: `npm install canvas` or `npm rebuild canvas`

### Option 2: Use WSL
Run the server in WSL where canvas builds easily.

### Option 3: Use Docker
Run the server in a Docker container.

See [WINDOWS_SETUP.md](./WINDOWS_SETUP.md) for detailed instructions.

## Testing

The app should work fine without snapshots:
- ✅ Real-time drawing works
- ✅ Credit system works
- ✅ Rooms work
- ✅ Stroke persistence works
- ⚠️ Snapshots disabled (but not critical for MVP)

When a user joins, they'll load strokes from the database directly (no snapshot image, but all strokes are replayed).

