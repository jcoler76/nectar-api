# Nectar API - Docker Setup Script for Windows
# This script sets up the development environment with PostgreSQL 17 and Redis

Write-Host "🚀 Setting up Nectar API Development Environment" -ForegroundColor Green

# Check if Docker is installed and running
Write-Host "Checking Docker installation..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker not found. Please install Docker Desktop from https://www.docker.com/products/docker-desktop/" -ForegroundColor Red
    exit 1
}

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop" -ForegroundColor Red
    exit 1
}

# Create .env file for development
Write-Host "Setting up environment variables..." -ForegroundColor Yellow
$envContent = @"
# PostgreSQL Configuration
DATABASE_URL=postgresql://nectar_admin:nectar_dev_2024!@localhost:5432/nectar_core?schema=public
POSTGRES_USER=nectar_admin
POSTGRES_PASSWORD=nectar_dev_2024!
POSTGRES_DB=nectar_core

# Redis Configuration
REDIS_URL=redis://:nectar_redis_2024!@localhost:6379
REDIS_PASSWORD=nectar_redis_2024!

# pgAdmin Configuration (development only)
PGADMIN_EMAIL=admin@nectar-api.local
PGADMIN_PASSWORD=pgadmin_2024!

# JWT Secret (generate a secure one for production)
JWT_SECRET=nectar_jwt_secret_development_only_2024!

# Node Environment
NODE_ENV=development
"@

$envFile = "server\.env"
if (Test-Path $envFile) {
    Write-Host "📝 .env file already exists, backing up..." -ForegroundColor Yellow
    Copy-Item $envFile "$envFile.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
}

$envContent | Out-File -FilePath $envFile -Encoding UTF8
Write-Host "✅ Environment variables configured" -ForegroundColor Green

# Pull Docker images
Write-Host "Pulling Docker images..." -ForegroundColor Yellow
docker pull postgres:17-alpine
docker pull redis:7-alpine
docker pull dpage/pgadmin4:latest

# Start PostgreSQL and Redis
Write-Host "Starting PostgreSQL 17 and Redis..." -ForegroundColor Yellow
docker compose up -d postgres redis

# Wait for PostgreSQL to be ready
Write-Host "Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
$maxAttempts = 30
$attempts = 0

do {
    try {
        $pgReady = docker exec nectar-postgres pg_isready -U nectar_admin -d nectar_core 2>$null
        if ($pgReady -match "accepting connections") {
            Write-Host "✅ PostgreSQL is ready!" -ForegroundColor Green
            break
        }
    } catch {
        # Continue waiting
    }
    
    $attempts++
    if ($attempts -ge $maxAttempts) {
        Write-Host "❌ PostgreSQL failed to start after $maxAttempts attempts" -ForegroundColor Red
        docker compose logs postgres
        exit 1
    }
    
    Start-Sleep 2
    Write-Host "." -NoNewline -ForegroundColor Yellow
} while ($true)

# Install Node.js dependencies and set up Prisma
Write-Host "Installing Node.js dependencies..." -ForegroundColor Yellow
Set-Location server
npm install

# Generate Prisma client
Write-Host "Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate

# Run database migrations
Write-Host "Running database migrations..." -ForegroundColor Yellow
try {
    npx prisma migrate dev --name init
    Write-Host "✅ Database migrations completed!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Migration failed, but this is expected on first run. Let's create the migration..." -ForegroundColor Yellow
    npx prisma db push
    Write-Host "✅ Database schema pushed!" -ForegroundColor Green
}

Set-Location ..

# Display connection information
Write-Host "`n🎉 Setup Complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 Database Information:" -ForegroundColor White
Write-Host "  PostgreSQL 17: localhost:5432" -ForegroundColor Gray
Write-Host "  Database: nectar_core" -ForegroundColor Gray
Write-Host "  Username: nectar_admin" -ForegroundColor Gray
Write-Host "  Redis: localhost:6379" -ForegroundColor Gray
Write-Host ""
Write-Host "🔧 Management Tools:" -ForegroundColor White
Write-Host "  pgAdmin: Start with 'docker compose --profile development up -d pgadmin'" -ForegroundColor Gray
Write-Host "  Then visit: http://localhost:5050" -ForegroundColor Gray
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor White
Write-Host "  1. Start the backend: cd server && npm run dev" -ForegroundColor Gray
Write-Host "  2. Start the frontend: npm start" -ForegroundColor Gray
Write-Host "  3. Visit: http://localhost:3000" -ForegroundColor Gray
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan

# Optionally start pgAdmin
$startPgAdmin = Read-Host "`nWould you like to start pgAdmin now? (y/N)"
if ($startPgAdmin -eq "y" -or $startPgAdmin -eq "Y") {
    Write-Host "Starting pgAdmin..." -ForegroundColor Yellow
    docker compose --profile development up -d pgadmin
    Write-Host "✅ pgAdmin started at http://localhost:5050" -ForegroundColor Green
    Write-Host "   Email: admin@nectar-api.local" -ForegroundColor Gray
    Write-Host "   Password: pgadmin_2024!" -ForegroundColor Gray
}

Write-Host "`n✨ Development environment is ready!" -ForegroundColor Green