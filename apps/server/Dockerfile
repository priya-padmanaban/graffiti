# Dockerfile for WebSocket server (for Railway/Render)
FROM node:18-alpine

WORKDIR /app

# Copy root package files
COPY package.json turbo.json ./
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server

# Install dependencies (from root)
RUN npm ci

# Build shared package first
RUN cd packages/shared && npm run build

# Generate Prisma client
RUN cd apps/server && npx prisma generate

# Build server (this will use the built shared package)
RUN cd apps/server && npm run build:server

WORKDIR /app/apps/server

EXPOSE 3001 3002

CMD ["npm", "start"]

