# Railway Deployment - Step by Step

Follow these exact steps to deploy your server to Railway.

## Step 1: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project" or "Login"
3. Sign in with GitHub (recommended) or email

## Step 2: Create New Project

1. Click **"+ New Project"** button (top right)
2. Select **"Deploy from GitHub repo"**
3. If prompted, authorize Railway to access your GitHub
4. Find and select your **graffiti** repository
5. Click **"Deploy Now"**

## Step 3: Configure the Service

**IMPORTANT**: Railway is using the Dockerfile. You need to set the root directory correctly.

1. Railway will create a service automatically
2. Click on the service (it might be named after your repo)
3. Go to **Settings** tab (left sidebar)
4. Scroll down to **"Root Directory"**
5. **Set it to: `.` (project root - just a dot)**
   - This is CRITICAL for the Dockerfile to work
   - The Dockerfile needs to see the full monorepo structure
6. Scroll to **"Dockerfile Path"** (if visible)
   - Set to: `apps/server/Dockerfile`
7. Click **"Save"**

## Step 4: Set Build Command

1. Still in **Settings**, scroll to **"Build"** section
2. Find **"Build Command"** field
3. Paste this exact command:
   ```
   cd ../.. && npm install && npm run build:shared && cd apps/server && npx prisma generate && npm run build:server
   ```
   (This uses `npm ci` which is more reliable for builds and avoids conflicts)
4. Find **"Start Command"** field
5. Set it to:
   ```
   npm start
   ```
6. Click **"Save"**

## Step 5: Add PostgreSQL Database

1. In your Railway project dashboard, click **"+ New"** button
2. Select **"Database"**
3. Select **"Add PostgreSQL"**
4. Wait for it to deploy (takes ~30 seconds)
5. Click on the **PostgreSQL** service
6. Go to **"Variables"** tab
7. Find **"DATABASE_URL"** - copy this value (you'll need it)

## Step 6: Set Environment Variables

1. Go back to your **server service** (not the database)
2. Go to **"Variables"** tab
3. Click **"+ New Variable"** for each of these:

   **Variable 1:**
   - Name: `PORT`
   - Value: `3001`
   - Click "Add"

   **Variable 2:**
   - Name: `WS_PORT`
   - Value: `3002`
   - Click "Add"

   **Variable 3:**
   - Name: `DATABASE_URL`
   - Value: Paste the DATABASE_URL you copied from PostgreSQL service
   - Click "Add"

   **Variable 4:**
   - Name: `CORS_ORIGIN`
   - Value: `https://your-vercel-app.vercel.app` (replace with your actual Vercel URL)
   - Click "Add"

   **Variable 5:**
   - Name: `R2_ENABLED`
   - Value: `false`
   - Click "Add"

## Step 7: Deploy

1. Railway should automatically start deploying when you save settings
2. If not, go to **"Deployments"** tab
3. Click **"Redeploy"** button
4. Wait for build to complete (watch the logs)
5. Look for: "Server started" and "WebSocket server listening on port 3002"

## Step 8: Get Your Railway URL

1. Still in your server service, go to **"Settings"** tab
2. Scroll to **"Networking"** section
3. Click **"Generate Domain"** button
4. Copy the domain (e.g., `graffiti-server-production.up.railway.app`)
5. This is your server URL!

## Step 9: Run Database Migrations

1. In Railway, go to your **server service**
2. Click **"Connect"** tab (or the terminal icon)
3. Click **"Open Shell"** or **"New Terminal"**
4. In the terminal, type:
   ```
   npx prisma migrate deploy
   ```
5. Press Enter
6. Wait for it to complete - you should see "Applied migration" messages

## Step 10: Update Vercel with Railway URL

1. Go to your Vercel dashboard
2. Select your graffiti project
3. Go to **Settings** → **Environment Variables**
4. Update these variables:

   **NEXT_PUBLIC_API_URL:**
   - Value: `https://your-railway-url.railway.app` (use the domain from Step 8)

   **NEXT_PUBLIC_WS_URL:**
   - Value: `wss://your-railway-url.railway.app` (note: `wss://` not `ws://`)

5. Click **"Save"**
6. Go to **Deployments** tab
7. Click **"..."** on the latest deployment
8. Click **"Redeploy"**

## Step 11: Test It!

1. Open your Vercel app URL
2. Try drawing on the canvas
3. Check browser console for any errors
4. If WebSocket connects, you should see "Connected" status

## Troubleshooting

**Build fails?**
- Check the build logs in Railway
- Make sure root directory is `apps/server`
- Verify build command is exactly as shown

**Can't connect to WebSocket?**
- Make sure you're using `wss://` (not `ws://`) in Vercel env vars
- Check that `CORS_ORIGIN` matches your Vercel domain exactly
- Verify Railway service is running (check "Deployments" tab)

**Database errors?**
- Make sure you ran migrations (Step 9)
- Verify `DATABASE_URL` is correct in Railway variables

**Need to see logs?**
- In Railway, go to your service → "Deployments" tab
- Click on a deployment to see logs
- Or use the "Connect" tab to open a shell

## That's It!

Your server should now be running on Railway and your web app on Vercel should be able to connect to it!

