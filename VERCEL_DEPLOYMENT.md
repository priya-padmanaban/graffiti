# Deploying to Vercel

This guide covers deploying the Graffiti app to Vercel (for the web app) and a separate service for the WebSocket server.

## Architecture

- **Web App** (`/apps/web`): Deploy to Vercel ✅
- **WebSocket Server** (`/apps/server`): Deploy to Railway/Render/Fly.io (Vercel doesn't support WebSocket servers well)

## Step 1: Deploy Web App to Vercel

### Option A: Using Vercel CLI

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Navigate to web app**:
   ```bash
   cd apps/web
   ```

3. **Login to Vercel**:
   ```bash
   vercel login
   ```

4. **Deploy**:
   ```bash
   vercel
   ```

5. **Follow prompts**:
   - Link to existing project or create new
   - Set root directory: `apps/web`
   - Override build command: `cd ../.. && npm run build:shared && cd apps/web && npm run build`
   - Override install command: `cd ../.. && npm install`

### Option B: Using Vercel Dashboard

1. **Go to [vercel.com](https://vercel.com)** and import your Git repository

2. **Configure Project**:
   - **Root Directory**: `apps/web`
   - **Framework Preset**: Next.js
   - **Build Command**: `cd ../.. && npm run build:shared && cd apps/web && npm run build`
   - **Install Command**: `cd ../.. && npm install`
   - **Output Directory**: `.next` (default)

3. **Environment Variables**:
   Add these in Vercel dashboard → Settings → Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-server-url.com
   NEXT_PUBLIC_WS_URL=wss://your-server-url.com
   ```

## Step 2: Deploy WebSocket Server

Vercel doesn't support persistent WebSocket connections well. Use one of these alternatives:

### Option A: Railway (Recommended - Easy)

1. **Install Railway CLI**:
   ```bash
   npm i -g @railway/cli
   ```

2. **Login**:
   ```bash
   railway login
   ```

3. **Initialize project**:
   ```bash
   cd apps/server
   railway init
   ```

4. **Add PostgreSQL**:
   ```bash
   railway add postgresql
   ```

5. **Set environment variables** in Railway dashboard:
   ```
   PORT=3001
   WS_PORT=3002
   DATABASE_URL=<from Railway postgres service>
   CORS_ORIGIN=https://your-vercel-app.vercel.app
   R2_ENABLED=false
   ```

6. **Deploy**:
   ```bash
   railway up
   ```

### Option B: Render

1. **Create a new Web Service** on [render.com](https://render.com)

2. **Connect your repository**

3. **Settings**:
   - **Root Directory**: `apps/server`
   - **Build Command**: `cd ../.. && npm run build:shared && cd apps/server && npm run build`
   - **Start Command**: `cd apps/server && npm start`
   - **Environment**: Node

4. **Add PostgreSQL database** (separate service)

5. **Environment Variables**:
   ```
   PORT=3001
   WS_PORT=3002
   DATABASE_URL=<from Render postgres>
   CORS_ORIGIN=https://your-vercel-app.vercel.app
   R2_ENABLED=false
   ```

### Option C: Fly.io

1. **Install Fly CLI**:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Create fly.toml** in `apps/server`:
   ```toml
   app = "graffiti-server"
   primary_region = "iad"

   [build]
     builder = "paketobuildpacks/builder:base"

   [[services]]
     internal_port = 3001
     protocol = "tcp"

     [[services.ports]]
       port = 80
       handlers = ["http"]
       force_https = true

     [[services.ports]]
       port = 443
       handlers = ["tls", "http"]

   [[services]]
     internal_port = 3002
     protocol = "tcp"

     [[services.ports]]
       port = 3002
       handlers = ["tls", "http"]
   ```

3. **Deploy**:
   ```bash
   cd apps/server
   fly launch
   fly deploy
   ```

## Step 3: Update Environment Variables

After deploying both:

1. **Update Vercel environment variables** with your server URL:
   ```
   NEXT_PUBLIC_API_URL=https://your-server.railway.app (or render.com, fly.dev)
   NEXT_PUBLIC_WS_URL=wss://your-server.railway.app (or render.com, fly.dev)
   ```

2. **Redeploy Vercel** to pick up new env vars

## Step 4: Database Setup

### For Production Database:

1. **Run migrations** on your production database:
   ```bash
   cd apps/server
   DATABASE_URL="your-production-db-url" npx prisma migrate deploy
   ```

2. **Generate Prisma client**:
   ```bash
   DATABASE_URL="your-production-db-url" npx prisma generate
   ```

## Step 5: Cloudflare R2 (Optional - for snapshots)

If you want snapshots in production:

1. **Create R2 bucket** in Cloudflare dashboard

2. **Get credentials**:
   - Endpoint URL
   - Access Key ID
   - Secret Access Key
   - Public URL (if using custom domain)

3. **Add to server environment variables**:
   ```
   R2_ENABLED=true
   R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
   R2_BUCKET=graffiti-snapshots
   R2_ACCESS_KEY_ID=your-key
   R2_SECRET_ACCESS_KEY=your-secret
   R2_PUBLIC_URL=https://your-public-domain.com
   ```

## Troubleshooting

### Build Fails on Vercel

- Make sure root directory is set to `apps/web`
- Check that build command includes building shared package first
- Verify all dependencies are in `package.json`

### WebSocket Connection Fails

- Ensure server URL uses `wss://` (secure WebSocket) in production
- Check CORS settings on server match your Vercel domain
- Verify WebSocket port is exposed and accessible

### Database Connection Issues

- Check `DATABASE_URL` is correctly set
- Ensure database allows connections from your server's IP
- Run migrations: `npx prisma migrate deploy`

## Quick Deploy Script

Create a `deploy.sh` script:

```bash
#!/bin/bash

# Build shared package
cd packages/shared
npm run build
cd ../..

# Deploy web to Vercel
cd apps/web
vercel --prod

# Deploy server (example for Railway)
cd ../server
railway up
```

## Production Checklist

- [ ] Web app deployed to Vercel
- [ ] Server deployed to Railway/Render/Fly.io
- [ ] Environment variables set in both services
- [ ] Database migrations run
- [ ] CORS configured correctly
- [ ] WebSocket URL uses `wss://` in production
- [ ] R2 configured (if using snapshots)
- [ ] Test drawing functionality
- [ ] Test credit system
- [ ] Test cheat code

