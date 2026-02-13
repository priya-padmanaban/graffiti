# Dockerfile for WebSocket server (for Railway/Render)
FROM node:18-alpine

WORKDIR /app

# Copy root package files
COPY package.json turbo.json ./
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server

# Install dependencies
RUN npm install

# Build shared package
RUN cd packages/shared && npm run build

# Build server
RUN cd apps/server && npm run build

# Generate Prisma client
RUN cd apps/server && npx prisma generate

WORKDIR /app/apps/server

EXPOSE 3001 3002

CMD ["npm", "start"]

