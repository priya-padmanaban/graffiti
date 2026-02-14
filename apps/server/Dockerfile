# Dockerfile for WebSocket server (for Railway/Render)
# This assumes Railway builds from project root, not apps/server
FROM node:18-alpine

    # Install OpenSSL for Prisma
    RUN apk add --no-cache openssl

WORKDIR /app

# Copy root package files
COPY package.json turbo.json ./
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server

# Install dependencies (from root)
# Clear any existing npm cache to avoid conflicts
RUN rm -rf node_modules/.cache 2>/dev/null || true
RUN npm install --prefer-offline --no-audit

# Build shared package first
RUN cd packages/shared && npm run build

# Generate Prisma client
RUN cd apps/server && npx prisma generate

# Build server (this will use the built shared package)
RUN cd apps/server && npm run build:server

WORKDIR /app/apps/server

EXPOSE 3001 3002

# Run migrations on startup, then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]

