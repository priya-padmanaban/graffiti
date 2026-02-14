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
   - **💡 Cost-saving tip:** Set to `true` to enable snapshots, which dramatically reduces Railway egress costs by serving canvas images from R2 instead of sending all stroke data through Railway

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

## Part 3: Set Up Custom Domain (Optional)

If you have a custom domain (e.g., `graffiti.monster`), you can configure it with Vercel:

### Step 1: Add Domain in Vercel

1. Go to **Vercel** → Your Project → **Settings** → **Domains**
2. Enter your domain: `graffiti.monster` (or `www.graffiti.monster` if you prefer)
3. Click **"Add"**
4. Vercel will show you DNS records to add

### Step 2: Configure DNS at Namecheap

1. Go to [Namecheap](https://www.namecheap.com) → **Domain List** → Click **"Manage"** next to `graffiti.monster`
2. Go to **"Advanced DNS"** tab
3. Add the DNS records Vercel provided:
   - **A Record** or **CNAME Record** pointing to Vercel's servers
   - Usually something like: `CNAME www cname.vercel-dns.com` or `A @ 76.76.21.21`
4. **Save** the changes

### Step 3: Wait for DNS Propagation

- DNS changes can take a few minutes to 48 hours (usually 5-30 minutes)
- Vercel will show "Valid Configuration" when it's ready
- You can check status in Vercel → Settings → Domains

### Step 4: Update Railway CORS

Once your domain is working, update Railway's CORS settings:

1. Go to **Railway** → Your server service → **Variables** tab
2. Find **`CORS_ORIGIN`** variable
3. Update it to: `https://graffiti.monster` (or `https://www.graffiti.monster` if you used www)
4. Click **"Save"**
5. Railway will automatically redeploy

**Note:** Your Vercel environment variables (`NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL`) should still point to your Railway server URL - they don't need to change.

## Part 4: Connect Vercel to Railway

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

## Monitoring & Admin

### Check Which Rooms Have Content

**Option A: Admin API Endpoint (Easiest)**

Visit this URL in your browser or use curl:
```
https://your-railway-url.railway.app/api/admin/rooms
```

This returns a JSON list of all rooms with:
- `roomId`: The room identifier
- `strokeCount`: Number of strokes in the room
- `lastStrokeAt`: When the last stroke was drawn
- `snapshotCount`: Number of snapshots for the room
- `url`: Direct link to the room

**Option B: Query Database Directly**

1. In Railway, go to your **server service** → **Terminal** tab
2. Run:
   ```bash
   cd apps/server
   npx prisma studio
   ```
   - This opens Prisma Studio in your browser
   - Navigate to the `Stroke` table
   - Group by `roomId` to see which rooms have strokes

**Option C: SQL Query via Railway Terminal**

1. In Railway, go to your **PostgreSQL service** → **Terminal** tab
2. Connect to the database:
   ```bash
   psql $DATABASE_URL
   ```
3. Run:
   ```sql
   SELECT 
     "roomId",
     COUNT(*) as stroke_count,
     MAX("createdAt") as last_stroke
   FROM "Stroke"
   GROUP BY "roomId"
   ORDER BY last_stroke DESC;
   ```

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

**💰 Highly Recommended for Cost Savings!**

Enabling snapshots dramatically reduces Railway egress costs. Instead of sending all stroke data (potentially MBs) through Railway every time someone loads a room, snapshots:
- Store canvas images in Cloudflare R2 (free egress)
- Only send recent strokes since the last snapshot (much less data)
- Serve snapshot images directly from R2, bypassing Railway entirely

**To enable snapshot generation in production:**

### Step 1: Get R2 API Token

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **R2** → **Manage R2 API Tokens**
2. Click **"Create API token"**
3. Configure the token:
   - **Token name**: `graffiti-snapshots` (or any name you prefer)
   - **Permissions**: Select **"Object Read & Write"**
   - **TTL**: Leave empty (no expiration) or set a date
   - **Allow access to buckets**: Select your bucket name
4. Click **"Create API Token"**
5. **Copy both values immediately** (you won't see the secret again):
   - **Access Key ID** → This is your `R2_ACCESS_KEY_ID`
   - **Secret Access Key** → This is your `R2_SECRET_ACCESS_KEY`

### Step 2: Get Your Account ID and Endpoint

1. In Cloudflare Dashboard → **R2**, look at the URL or your account settings
2. Your **Account ID** is visible in the R2 dashboard URL or in your account overview
3. Your **Endpoint URL** format is: `https://<account-id>.r2.cloudflarestorage.com`
   - Replace `<account-id>` with your actual Cloudflare account ID

### Step 3: Set Up Public Access (Optional but Recommended)

To serve snapshot images directly from R2:

1. Go to your **R2 bucket** in Cloudflare Dashboard
2. Click **Settings** tab
3. Under **Public Access**, you can either:
   - **Option A**: Use Cloudflare's default public URL (free)
     - Format: `https://pub-<random-id>.r2.dev`
     - This is automatically available for public buckets
   - **Option B**: Connect a custom domain (requires Cloudflare Pages/Workers)
4. If using Option A, your `R2_PUBLIC_URL` will be `https://pub-<random-id>.r2.dev`
   - You can find this by making a file public and checking its URL

### Step 4: Add Environment Variables to Railway

1. Go to **Railway** → Your server service → **Variables** tab
2. Add these variables:

   **R2_ENABLED:**
   - Value: `true`

   **R2_ENDPOINT:**
   - Value: `https://<your-account-id>.r2.cloudflarestorage.com`
   - Replace `<your-account-id>` with your Cloudflare account ID

   **R2_BUCKET:**
   - Value: Your bucket name (e.g., `graffiti-snapshots`)

   **R2_ACCESS_KEY_ID:**
   - Value: The Access Key ID from Step 1

   **R2_SECRET_ACCESS_KEY:**
   - Value: The Secret Access Key from Step 1

   **R2_PUBLIC_URL:** (Optional but recommended)
   - Value: `https://pub-<random-id>.r2.dev` (from Step 3, Option A)
   - Or your custom domain if you set one up

3. Click **"Save"** after each variable

### Step 5: Redeploy Railway

Railway will automatically redeploy when you save the variables. Watch the logs to confirm snapshots are working - you should see messages like:
```
Generated snapshot for room <roomId>: <snapshot-id>
```

**Note:** Make sure your R2 bucket allows public read access for the snapshot images, or configure a public URL as described in Step 3.

### Step 6: Verify Snapshots Are Working

**When will snapshots appear?**

Snapshots are generated automatically when:
- A room accumulates **100 strokes** (default threshold, configurable via `SNAPSHOT_STROKE_THRESHOLD`)
- The snapshot worker runs (checks every **30 seconds** by default, configurable via `SNAPSHOT_INTERVAL_MS`)

**So you'll see snapshots appear:**
- After drawing at least 100 strokes in a room
- Within 30 seconds of reaching that threshold (when the worker next runs)

**How to verify:**

1. **Check Railway logs:**
   - Go to Railway → Your server service → **Deployments** → Click latest deployment → **View Logs**
   - Look for messages like:
     ```
     Triggering snapshot for room <roomId> (100 strokes)
     Generated snapshot for room <roomId>: <snapshot-id>
     ```

2. **Check your R2 bucket:**
   - Go to Cloudflare Dashboard → **R2** → Your bucket
   - You should see files in `snapshots/<roomId>/` folders
   - Files are named like: `snapshots/global/1234567890-abc123.png`

3. **Test by drawing:**
   - Open your app and draw in a room
   - Draw at least 100 strokes (you can draw quickly to test)
   - Wait up to 30 seconds
   - Check Railway logs and your R2 bucket

**If snapshots aren't appearing:**
- Verify all R2 environment variables are set correctly in Railway
- Check Railway logs for errors (especially R2 connection errors)
- Make sure `R2_ENABLED=true` is set
- Verify your R2 API token has "Object Read & Write" permissions
- Check that the bucket name matches exactly

## That's It! 🎉

Your app should now be live:
- **Web**: `https://your-app.vercel.app`
- **Server**: `https://your-server.railway.app`

Both HTTP API and WebSocket run on the same Railway port automatically.
