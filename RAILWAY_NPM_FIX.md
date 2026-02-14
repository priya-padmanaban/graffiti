# Railway npm Tracker Error Fix

## Problem
Getting "Tracker 'idealTree' already exists" error when building on Railway.

## Root Cause
Railway might be running `npm install` automatically before your build command, causing a conflict.

## Solution

### Option 1: Clear Cache and Use Flags (Recommended)

Update your build command in Railway to:

```
cd ../.. && rm -rf node_modules/.cache 2>/dev/null || true && npm install --prefer-offline --no-audit && npm run build:shared && cd apps/server && npx prisma generate && npm run build:server
```

The flags:
- `--prefer-offline`: Uses cache when available, faster
- `--no-audit`: Skips security audit (faster, not needed in build)
- `rm -rf node_modules/.cache`: Clears npm cache to avoid conflicts

### Option 2: Skip Install if Already Done

If Railway auto-installs, you can skip it:

```
cd ../.. && (npm list 2>/dev/null || npm install) && npm run build:shared && cd apps/server && npx prisma generate && npm run build:server
```

### Option 3: Use Dockerfile (Best for Railway)

Railway auto-detects Dockerfile. Make sure:
1. Root Directory is set to `.` (project root)
2. Dockerfile Path is `apps/server/Dockerfile`
3. No build command needed - Dockerfile handles it

The Dockerfile already has the fix applied.

## Quick Steps

1. Go to Railway → Service → Settings
2. Find "Build Command"
3. Replace with Option 1 command above
4. Save and redeploy

This should fix the tracker error!

