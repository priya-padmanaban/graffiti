# Windows Setup Guide

## Quick Start (Without Canvas/Snapshots)

If you just want to get the app running quickly on Windows without snapshot generation:

1. **Install dependencies** (canvas will be skipped):
   ```bash
   npm install --no-optional
   ```

2. **Or install normally** - the server will run without canvas, just skip snapshot generation:
   ```bash
   npm install
   ```

The server will start and work fine, but snapshots will be disabled. You'll see a warning message but the app will function normally.

## Full Setup (With Canvas/Snapshots)

To enable snapshot generation on Windows, you need to install build tools:

### Option 1: Install Windows Build Tools (Recommended)

1. **Install Visual Studio Build Tools**:
   - Download from: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
   - Install "Desktop development with C++" workload
   - Or use the smaller installer: https://aka.ms/vs/17/release/vs_buildtools.exe

2. **Install Python 3.x**:
   - Download from: https://www.python.org/downloads/
   - Make sure to check "Add Python to PATH" during installation
   - Verify: `python --version` in terminal

3. **Install dependencies**:
   ```bash
   npm install
   ```

### Option 2: Use WSL (Windows Subsystem for Linux)

1. **Install WSL**:
   ```powershell
   wsl --install
   ```

2. **Run the server in WSL**:
   ```bash
   # In WSL terminal
   cd /mnt/c/Users/pripa/OneDrive/Documentos/graffiti
   npm install
   ```

### Option 3: Use Docker for Server

Run the server in a Docker container where canvas builds easily:

1. Create a Dockerfile for the server (see below)
2. Build and run the server container

## Current Status

After running `npm install`, if you see:
- ✅ **Success**: All packages installed, canvas works
- ⚠️ **Warning**: Canvas failed but server will run (snapshots disabled)

The server will start either way. Check the console output when starting the server to see if canvas is available.

## Troubleshooting

### "canvas module not available" warning

This is **normal** if canvas didn't install. The server will work, just without snapshots. To fix:

1. Install Visual Studio Build Tools
2. Install Python 3.x
3. Run `npm rebuild canvas` or `npm install canvas`

### Prisma not found

If you see `'prisma' is not recognized`, the install failed. Try:

```bash
# Install dependencies first (even if canvas fails)
npm install --ignore-scripts

# Then install prisma globally or use npx
npx prisma generate
npx prisma migrate dev
```

### Python not found

Make sure Python is in your PATH:
```powershell
# Check if Python is available
python --version

# If not, add Python to PATH or reinstall with "Add to PATH" checked
```

## Development Workflow

For development on Windows, you can:

1. **Skip snapshots** (easiest):
   - Just run the server without canvas
   - Everything else works fine
   - Snapshots are optional for MVP

2. **Use Docker for server**:
   - Run PostgreSQL in Docker (already set up)
   - Run server in Docker too (avoids Windows build issues)

3. **Use WSL**:
   - Run everything in WSL where Linux packages work better

The web app works fine on Windows regardless - it's just the server's canvas dependency that's tricky.

