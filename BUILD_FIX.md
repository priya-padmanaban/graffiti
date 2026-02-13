# Build Fix - Shared Package

## Issue

The server was failing to start with:
```
Error: Cannot find module 'C:\Users\pripa\OneDrive\Documentos\graffiti\node_modules\@graffiti\shared\dist\index.js'
```

## Root Cause

The `@graffiti/shared` package needs to be built (TypeScript compiled) before other packages can use it. The `dist/` folder didn't exist.

## Solution

1. **Built the shared package**:
   ```bash
   cd packages/shared
   npm run build
   ```

2. **Updated root package.json** to build shared package first:
   - Added `build:shared` script
   - Updated `dev` and `build` scripts to run `build:shared` first

3. **Updated turbo.json** to ensure proper build order:
   - Added `dependsOn: ["^build"]` to dev pipeline

## Current Status

✅ Shared package built  
✅ Build scripts updated  
✅ Dev command will auto-build shared package

## Usage

Now when you run:
```bash
npm run dev
```

It will:
1. Build the shared package first
2. Then start all apps in dev mode

Or manually build shared:
```bash
npm run build:shared
```

