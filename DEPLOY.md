# Quick Deployment Guide

Deploy the web app to Vercel and the server to Railway.

## Step 1: Deploy Web App to Vercel

1. **Go to [vercel.com](https://vercel.com)** → New Project → Import your GitHub repo

2. **Configure Project**:
   - **Root Directory**: `apps/web`
   - **Framework**: Next.js (auto-detected)
   - **Build Command**: `cd ../.. && npm run build:shared && cd apps/web && npm run build`
   - **Install Command**: `cd ../.. && npm install`

3. **Add Environment Variables** (you'll update these after deploying the server):
   ```
   NEXT_PUBLIC_API_URL=https://your-server-url.railway.app
   NEXT_PUBLIC_WS_URL=wss://your-server-url.railway.app
   ```

4. **Deploy** → Wait for build to complete

5. **Copy your Vercel URL** (e.g., `https://your-app.vercel.app`)

## Step 2: Deploy Server to Railway

1. **Go to [railway.app](https://railway.app)** → New Project → Deploy from GitHub

2. **Select your repo** → Choose `apps/server` as root directory

3. **Add PostgreSQL Database**:
   - Click "+ New" → Database → PostgreSQL
   - Copy the `DATABASE_URL` from the PostgreSQL service variables

4. **Configure Build Settings**:
   - Go to Settings → Build
   - **Build Command**: `cd ../.. && npm install && npm run build:shared && cd apps/server && npx prisma generate && npm run build:server`
   - **Start Command**: `npm start`

5. **Add Environment Variables**:
   ```
   PORT=3001
   WS_PORT=3002
   DATABASE_URL=<paste from PostgreSQL service>
   CORS_ORIGIN=https://your-app.vercel.app
   R2_ENABLED=false
   ```

6. **Deploy** → Railway will build and deploy automatically

7. **Get your Railway URL** (e.g., `graffiti-server-production.up.railway.app`)

## Step 3: Update Vercel Environment Variables

1. **Go back to Vercel** → Your Project → Settings → Environment Variables

2. **Update the URLs** with your Railway server URL:
   ```
   NEXT_PUBLIC_API_URL=https://your-railway-url.railway.app
   NEXT_PUBLIC_WS_URL=wss://your-railway-url.railway.app
   ```

3. **Redeploy** Vercel (Deployments → ... → Redeploy)

## Step 4: Run Database Migrations

1. **In Railway**, go to your server service → Connect → Open Shell

2. **Run migrations**:
   ```bash
   npx prisma migrate deploy
   ```

Or use Railway CLI:
```bash
railway run npx prisma migrate deploy
```

## That's It! 🎉

Your app should now be live:
- **Web**: `https://your-app.vercel.app`
- **Server**: `https://your-server.railway.app`

## Troubleshooting

**Build fails on Railway?**
- Make sure build command includes `npm run build:shared` first
- Check that root directory is `apps/server`

**WebSocket not connecting?**
- Use `wss://` (not `ws://`) in production
- Check `CORS_ORIGIN` matches your Vercel domain exactly (no trailing slash)

**Database errors?**
- Run migrations: `npx prisma migrate deploy`
- Verify `DATABASE_URL` is correct in Railway

