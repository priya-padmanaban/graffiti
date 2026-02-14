# Deployment Guide

Complete guide to deploy the Graffiti app to Vercel (web) and Railway (server).

## Prerequisites

- GitHub repository with your code
- Vercel account (free)
- Railway account (free tier available)
- Docker Desktop (for local PostgreSQL, optional)

## Part 1: Deploy Web App to Vercel

### Step 1: Create Vercel Project

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. **Import your GitHub repository**
3. Configure the project:
   - **Root Directory**: `apps/web`
   - **Framework**: Next.js (auto-detected)
   - **Build Command**: `cd ../.. && npm run build:shared && cd apps/web && npm run build`
   - **Install Command**: `cd ../.. && npm install`
   - **Output Directory**: `.next` (default)

### Step 2: Add Environment Variables (Temporary)

Add these now (you'll update them after deploying the server):

1. Go to **Settings** → **Environment Variables**
2. Add:
   ```
   NEXT_PUBLIC_API_URL=https://your-server-url.railway.app
   NEXT_PUBLIC_WS_URL=wss://your-server-url.railway.app
   ```
   (Use placeholder URLs for now)

3. Click **Deploy**

4. **Copy your Vercel URL** (e.g., `https://your-app.vercel.app`)

## Part 2: Deploy Server to Railway

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app) → **New Project**
2. Select **"Deploy from GitHub repo"**
3. Authorize Railway to access GitHub if needed
4. Select your **graffiti** repository
5. Click **"Deploy Now"**

### Step 2: Configure Service Settings

1. Click on the service (named after your repo)
2. Go to **Settings** tab

**Root Directory:**
- Set to: `.` (just a dot - project root)
- This is CRITICAL for the Dockerfile to work

**Dockerfile Path:**
- Set to: `apps/server/Dockerfile`
- Railway should auto-detect this

**Start Command:**
- Leave empty (Dockerfile CMD handles it)
- Or set to: `cd apps/server && node dist/index.js`

**Build Command:**
- Leave empty (Dockerfile handles the build)
- Railway will use the Dockerfile automatically

Click **"Save"**

### Step 3: Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Wait ~30 seconds for it to deploy
4. Click on the **PostgreSQL** service
5. Go to **"Variables"** tab
6. **Copy the `DATABASE_URL`** value (you'll need it)

### Step 4: Set Environment Variables

1. Go back to your **server service** (not the database)
2. Go to **"Variables"** tab
3. Click **"+ New Variable"** for each:

   **PORT:**
   - Name: `PORT`
   - Value: `3001`
   - (Railway will override this, but set it anyway)

   **WS_PORT:**
   - Name: `WS_PORT`
   - Value: `3002`
   - (Not used on Railway, but good to have)

   **DATABASE_URL:**
   - Name: `DATABASE_URL`
   - Value: Paste the URL from PostgreSQL service

   **CORS_ORIGIN:**
   - Name: `CORS_ORIGIN`
   - Value: `https://your-app.vercel.app` (your Vercel URL from Part 1)

   **R2_ENABLED:**
   - Name: `R2_ENABLED`
   - Value: `false`
   - (Set to `true` later if you want snapshots with R2)

4. Click **"Save"** after each variable

### Step 5: Deploy and Get URL

1. Railway will automatically start deploying
2. Watch the build logs - you should see:
   - ✅ OpenSSL installing
   - ✅ Dependencies installing
   - ✅ Shared package building
   - ✅ Prisma generating
   - ✅ Server building
   - ✅ "Server started" message

3. Once deployed, go to **Settings** → **Networking**
4. Click **"Generate Domain"**
5. **Copy your Railway URL** (e.g., `graffiti-server-production.up.railway.app`)

### Step 6: Database Migrations (Automatic!)

**Good news!** Migrations now run automatically when the server starts. The Dockerfile has been configured to run `prisma migrate deploy` before starting the server.

**You don't need to do anything manually!** Just deploy and the migrations will run automatically on first startup.

**Note:** If you need to run migrations manually (e.g., for troubleshooting), you can use Railway's web terminal:

1. In Railway, click on your **server service**
2. Look for **"Terminal"** tab or **"Connect"** → **"Shell"** button
3. Run:
   ```bash
   cd apps/server
   npx prisma migrate deploy
   ```

**Option C: Add to Dockerfile (Automatic, but less flexible)**

If you can't access the terminal, you can modify the Dockerfile to run migrations on startup. However, this runs migrations every time the container starts, which is usually fine but not ideal.

**Note:** If migrations fail, check that `DATABASE_URL` is set correctly in Railway variables.

## Part 3: Connect Vercel to Railway

### Step 1: Update Vercel Environment Variables

1. Go back to **Vercel** → Your Project → **Settings** → **Environment Variables**

2. **Update** the URLs with your actual Railway URL:

   **NEXT_PUBLIC_API_URL:**
   - Value: `https://your-railway-url.railway.app`
   - (Use `https://`, not `http://`)

   **NEXT_PUBLIC_WS_URL:**
   - Value: `wss://your-railway-url.railway.app`
   - (Use `wss://` for secure WebSocket, not `ws://`)

3. Click **"Save"** for each

### Step 2: Redeploy Vercel

1. Go to **Deployments** tab
2. Click **"..."** on the latest deployment
3. Click **"Redeploy"**
4. Wait for build to complete

## Part 4: Test Everything

1. **Open your Vercel app**: `https://your-app.vercel.app`
2. **Check browser console** for any errors
3. **Try drawing** on the canvas
4. **Check connection status** - should show "Connected"
5. **Verify credits** are displaying correctly

## Troubleshooting

### Build Fails on Railway

**"Tracker 'idealTree' already exists"**
- Railway auto-detects Dockerfile, so no build command needed
- Make sure Root Directory is `.` (project root)
- Make sure Dockerfile Path is `apps/server/Dockerfile`

**"Cannot find module '@graffiti/shared'"**
- Make sure Root Directory is `.` (not `apps/server`)
- Dockerfile builds shared package first, so this should work

**Prisma OpenSSL Error**
- Already fixed in Dockerfile with `openssl1.1-compat`
- If still happens, check build logs to confirm OpenSSL installed

### WebSocket Not Connecting

**Connection fails:**
- Make sure you're using `wss://` (not `ws://`) in Vercel env vars
- Check `CORS_ORIGIN` matches your Vercel domain exactly (no trailing slash)
- Verify Railway service is running (check Deployments tab)

**"Connection refused":**
- Check Railway service is deployed and running
- Verify the Railway URL is correct
- Check Railway logs for errors

### Database Errors

**"Relation does not exist":**
- Run migrations: `npx prisma migrate deploy` in Railway shell
- Check `DATABASE_URL` is correct in Railway variables

**Connection timeout:**
- Verify PostgreSQL service is running in Railway
- Check `DATABASE_URL` format is correct

### Vercel Build Fails

**TypeScript errors:**
- Make sure shared package builds first
- Check build command includes `npm run build:shared`

**Module not found:**
- Verify install command runs from project root
- Check that workspaces are set up correctly

## Environment Variables Summary

### Vercel (`apps/web`)
```
NEXT_PUBLIC_API_URL=https://your-railway-url.railway.app
NEXT_PUBLIC_WS_URL=wss://your-railway-url.railway.app
```

### Railway (`apps/server`)
```
PORT=3001
WS_PORT=3002
DATABASE_URL=<from Railway PostgreSQL>
CORS_ORIGIN=https://your-vercel-app.vercel.app
R2_ENABLED=false
```

## Production Checklist

- [ ] Web app deployed to Vercel
- [ ] Server deployed to Railway
- [ ] PostgreSQL database added
- [ ] Environment variables set in both services
- [ ] Database migrations run
- [ ] Railway URL copied
- [ ] Vercel env vars updated with Railway URL
- [ ] Vercel redeployed
- [ ] Tested drawing functionality
- [ ] Tested WebSocket connection
- [ ] Tested credit system
- [ ] Tested cheat code

## Optional: Enable Snapshots with R2

If you want snapshot generation in production:

1. **Create R2 bucket** in Cloudflare dashboard
2. **Get credentials**:
   - Endpoint URL
   - Access Key ID
   - Secret Access Key
   - Public URL (if using custom domain)

3. **Add to Railway environment variables**:
   ```
   R2_ENABLED=true
   R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
   R2_BUCKET=graffiti-snapshots
   R2_ACCESS_KEY_ID=your-key
   R2_SECRET_ACCESS_KEY=your-secret
   R2_PUBLIC_URL=https://your-public-domain.com
   ```

4. **Redeploy Railway**

## That's It! 🎉

Your app should now be live:
- **Web**: `https://your-app.vercel.app`
- **Server**: `https://your-server.railway.app`

Both HTTP API and WebSocket run on the same Railway port automatically.
