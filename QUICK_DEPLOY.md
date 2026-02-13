# Quick Deployment Guide

## Deploy Web App to Vercel (5 minutes)

### Using Vercel Dashboard:

1. **Push code to GitHub** (if not already)

2. **Go to [vercel.com](https://vercel.com)** → New Project → Import your repo

3. **Configure**:
   - **Root Directory**: `apps/web`
   - **Framework**: Next.js (auto-detected)
   - **Build Command**: `cd ../.. && npm run build:shared && cd apps/web && npm run build`
   - **Install Command**: `cd ../.. && npm install`

4. **Add Environment Variables** (you'll update these after deploying the server):
   ```
   NEXT_PUBLIC_API_URL=https://your-server-url.com
   NEXT_PUBLIC_WS_URL=wss://your-server-url.com
   ```

5. **Deploy** → Wait for build to complete

### Using Vercel CLI:

```bash
cd apps/web
npm i -g vercel
vercel login
vercel
# Follow prompts, set root directory to apps/web
```

## Deploy Server to Railway (Recommended - Easiest)

1. **Go to [railway.app](https://railway.app)** → New Project → Deploy from GitHub

2. **Select your repo** → Choose `apps/server` as root directory

3. **Add PostgreSQL**:
   - Click "+ New" → Database → PostgreSQL
   - Copy the `DATABASE_URL` from the PostgreSQL service

4. **Set Environment Variables**:
   ```
   PORT=3001
   WS_PORT=3002
   DATABASE_URL=<from Railway postgres>
   CORS_ORIGIN=https://your-vercel-app.vercel.app
   R2_ENABLED=false
   ```

5. **Deploy** → Railway will auto-detect and build

6. **Get your server URL** (e.g., `graffiti-server-production.up.railway.app`)

7. **Update Vercel environment variables** with your Railway URL:
   ```
   NEXT_PUBLIC_API_URL=https://graffiti-server-production.up.railway.app
   NEXT_PUBLIC_WS_URL=wss://graffiti-server-production.up.railway.app
   ```

8. **Redeploy Vercel** to pick up new env vars

## Run Database Migrations

After server is deployed:

```bash
cd apps/server
DATABASE_URL="your-production-db-url" npx prisma migrate deploy
```

Or use Railway's CLI:
```bash
railway run npx prisma migrate deploy
```

## That's It! 🎉

Your app should now be live:
- **Web**: `https://your-app.vercel.app`
- **Server**: `https://your-server.railway.app`

## Troubleshooting

**Build fails?**
- Make sure root directory is `apps/web` for Vercel
- Check that `build:shared` runs before building web app

**WebSocket not connecting?**
- Use `wss://` (not `ws://`) in production
- Check CORS_ORIGIN matches your Vercel domain exactly

**Database errors?**
- Run migrations: `npx prisma migrate deploy`
- Check DATABASE_URL is correct

