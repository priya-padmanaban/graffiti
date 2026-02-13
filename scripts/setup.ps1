# Setup script for Graffiti monorepo (PowerShell)

Write-Host "🚀 Setting up Graffiti..." -ForegroundColor Cyan

# Check if Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Host "❌ Docker is not running. Please start Docker and try again." -ForegroundColor Red
    exit 1
}

# Start PostgreSQL
Write-Host "📦 Starting PostgreSQL..." -ForegroundColor Yellow
docker-compose up -d

# Wait for PostgreSQL to be ready
Write-Host "⏳ Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Install dependencies
Write-Host "📥 Installing dependencies..." -ForegroundColor Yellow
npm install

# Generate Prisma client
Write-Host "🔧 Generating Prisma client..." -ForegroundColor Yellow
Set-Location apps/server
npm run db:generate

# Run migrations
Write-Host "🗄️  Running database migrations..." -ForegroundColor Yellow
npm run db:migrate

Set-Location ../..

Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Copy apps/server/env.example to apps/server/.env and configure"
Write-Host "2. Copy apps/web/env.example to apps/web/.env.local and configure"
Write-Host "3. Run 'npm run dev' to start all services"

