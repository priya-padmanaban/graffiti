# Railway Build Fix

## Problem
The build command is failing with "npm error Tracker 'idealTree' already exists"

## Solution

Use the simpler build command that's now in package.json:

### Option 1: Use the build:full script (Recommended)

In Railway Settings → Build Command, use:
```
npm run build:full
```

This script is defined in `apps/server/package.json` and handles everything properly.

### Option 2: Use npm ci instead of npm install

If you want to keep the long command, use:
```
cd ../.. && npm ci && npm run build:shared && cd apps/server && npx prisma generate && npm run build:server
```

The key change is `npm ci` instead of `npm install` - it's faster and more reliable for CI/CD.

### Option 3: Let Railway auto-detect

Railway might auto-detect the build process. Try:
1. Remove the build command entirely
2. Make sure root directory is `apps/server`
3. Railway might use the `build` script automatically

## Quick Fix Steps

1. Go to Railway → Your Service → Settings
2. Find "Build Command"
3. Change it to: `npm run build:full`
4. Save
5. Redeploy

This should fix the npm tracker error!

