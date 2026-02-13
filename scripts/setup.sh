#!/bin/bash

# Setup script for Graffiti monorepo

echo "🚀 Setting up Graffiti..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Start PostgreSQL
echo "📦 Starting PostgreSQL..."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Install dependencies
echo "📥 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
cd apps/server
npm run db:generate

# Run migrations
echo "🗄️  Running database migrations..."
npm run db:migrate

cd ../..

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Copy apps/server/env.example to apps/server/.env and configure"
echo "2. Copy apps/web/env.example to apps/web/.env.local and configure"
echo "3. Run 'npm run dev' to start all services"

