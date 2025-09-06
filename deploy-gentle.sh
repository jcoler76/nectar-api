#!/bin/bash
# Gentle production deployment script for mirabel-api
# Preserves ecosystem files, environment variables, and critical configurations

echo "🚀 Starting Gentle Mirabel API deployment..."

# Target branch (default to main). Can be overridden by first arg or DEPLOY_BRANCH env var
BRANCH=${DEPLOY_BRANCH:-${1:-main}}
echo "🌿 Target branch: $BRANCH"

# Navigate to the project directory
cd ~/mirabel-api || { echo "❌ Failed to navigate to project directory"; exit 1; }

# Create timestamped backup directory
BACKUP_DIR=~/deployment-backups/$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
echo "📦 Creating backup directory: $BACKUP_DIR"

# Comprehensive backup of ALL critical files
echo "🔒 Backing up critical files..."

# Environment files
cp -f ./server/.env.production $BACKUP_DIR/.env.production.bak 2>/dev/null || echo "  - .env.production not found"
cp -f ./server/.env $BACKUP_DIR/.env.bak 2>/dev/null || echo "  - .env not found"
cp -f ./.env.production $BACKUP_DIR/root_.env.production.bak 2>/dev/null || echo "  - root .env.production not found"
cp -f ./.env $BACKUP_DIR/root_.env.bak 2>/dev/null || echo "  - root .env not found"

# PM2 ecosystem file (CRITICAL)
cp -f ./server/ecosystem.config.js $BACKUP_DIR/ecosystem.config.js.bak 2>/dev/null || echo "  - ecosystem.config.js not found"

# Configuration files
cp -f ./config-overrides.js $BACKUP_DIR/config-overrides.js.bak 2>/dev/null || echo "  - config-overrides.js not found"
cp -f ./postcss.config.js $BACKUP_DIR/postcss.config.js.bak 2>/dev/null || echo "  - postcss.config.js not found"
cp -f ./tailwind.config.js $BACKUP_DIR/tailwind.config.js.bak 2>/dev/null || echo "  - tailwind.config.js not found"

# CORS and server configs
cp -f ./server/config/corsOptions.js $BACKUP_DIR/corsOptions.js.bak 2>/dev/null || echo "  - corsOptions.js not found"

# Package files (for dependency tracking)
cp -f ./package.json $BACKUP_DIR/package.json.bak 2>/dev/null || echo "  - package.json not found"
cp -f ./package-lock.json $BACKUP_DIR/root_package-lock.json.bak 2>/dev/null || echo "  - root package-lock.json not found"
cp -f ./server/package.json $BACKUP_DIR/server-package.json.bak 2>/dev/null || echo "  - server/package.json not found"
cp -f ./server/package-lock.json $BACKUP_DIR/server-package-lock.json.bak 2>/dev/null || echo "  - server/package-lock.json not found"

# Prisma schema
cp -f ./server/prisma/schema.prisma $BACKUP_DIR/schema.prisma.bak 2>/dev/null || echo "  - schema.prisma not found"

# Logs
cp -r ./server/logs $BACKUP_DIR/logs 2>/dev/null || echo "  - logs directory not found"

echo "✅ Backup completed to: $BACKUP_DIR"
ls -la $BACKUP_DIR/ 2>/dev/null

# Check git status before making changes
echo "📋 Current git status:"
git status --porcelain

# Stash any local changes instead of destroying them
if [[ -n $(git status --porcelain) ]]; then
    echo "💾 Stashing local changes instead of destroying them..."
    git stash push -m "Pre-deployment stash $(date)"
    echo "✅ Local changes stashed (can be recovered with 'git stash list' and 'git stash pop')"
fi

# Stop PM2 gracefully
echo "🔄 Gracefully stopping PM2 processes..."
pm2 stop mirabel-api 2>/dev/null || echo "  - mirabel-api not running"
# Don't delete PM2 processes - just stop them

# Pull latest changes (gentle approach)
echo "📥 Pulling latest changes from GitHub..."
git fetch origin
git checkout "$BRANCH"

# Use merge instead of hard reset to preserve any important local commits
if git merge "origin/$BRANCH" --no-edit; then
    echo "✅ Successfully merged latest changes"
else
    echo "⚠️  Merge conflicts detected. Manual intervention required."
    echo "Current status:"
    git status
    exit 1
fi

# Preserve critical configuration files during update
echo "🛡️  Preserving critical configuration files..."

# Restore ecosystem file if it exists in backup
if [ -f $BACKUP_DIR/ecosystem.config.js.bak ]; then
    cp -f $BACKUP_DIR/ecosystem.config.js.bak ./server/ecosystem.config.js
    echo "✅ Preserved existing ecosystem.config.js"
fi

# Restore environment files
if [ -f $BACKUP_DIR/.env.production.bak ]; then
    cp -f $BACKUP_DIR/.env.production.bak ./server/.env.production
    echo "✅ Preserved existing .env.production"
fi

if [ -f $BACKUP_DIR/.env.bak ]; then
    cp -f $BACKUP_DIR/.env.bak ./server/.env
    echo "✅ Preserved existing .env"
fi

# Restore custom configuration files
if [ -f $BACKUP_DIR/config-overrides.js.bak ]; then
    cp -f $BACKUP_DIR/config-overrides.js.bak ./config-overrides.js
    echo "✅ Preserved existing config-overrides.js"
fi

if [ -f $BACKUP_DIR/corsOptions.js.bak ]; then
    cp -f $BACKUP_DIR/corsOptions.js.bak ./server/config/corsOptions.js
    echo "✅ Preserved existing CORS configuration"
fi

# Smart dependency installation (only if package.json changed)
echo "🔍 Checking if dependencies need updating..."

# Frontend dependencies
if [ ! -d "node_modules" ] || \
   ! diff -q ./package.json $BACKUP_DIR/package.json.bak >/dev/null 2>&1 || \
   { [ -f ./package-lock.json ] && ! diff -q ./package-lock.json $BACKUP_DIR/root_package-lock.json.bak >/dev/null 2>&1; }; then
    echo "📦 Frontend dependencies changed or missing - installing..."
    if [ -f ./package-lock.json ]; then
        npm ci || npm install --legacy-peer-deps
    else
        npm install --legacy-peer-deps
    fi
else
    echo "✅ Frontend dependencies unchanged - skipping npm install"
fi

# Backend dependencies  
cd server
if [ ! -d "node_modules" ] || \
   ! diff -q ./package.json $BACKUP_DIR/server-package.json.bak >/dev/null 2>&1 || \
   { [ -f ./package-lock.json ] && ! diff -q ./package-lock.json $BACKUP_DIR/server-package-lock.json.bak >/dev/null 2>&1; }; then
    echo "📦 Backend dependencies changed or missing - installing..."
    if [ -f ./package-lock.json ]; then
        npm ci --omit=dev || npm ci || npm install --omit=dev --no-audit --no-fund
    else
        npm install --omit=dev --no-audit --no-fund
    fi
else
    echo "✅ Backend dependencies unchanged - skipping npm install"
fi
cd ..

# Only rebuild if source files have changed OR FORCE_REBUILD=1
echo "🔍 Checking if rebuild is necessary..."
if [ "$FORCE_REBUILD" = "1" ] || [ ! -d "build" ] || find src -newer build -type f | grep -q .; then
    if [ "$FORCE_REBUILD" = "1" ]; then
        echo "🔁 FORCE_REBUILD=1 detected - rebuilding frontend regardless of timestamps..."
    else
        echo "🏗️  Source files changed - rebuilding frontend..."
    fi
    npm run build
else
    echo "✅ Build is up to date - skipping rebuild"
fi

# Database operations (gentle)
echo "🗄️  Running gentle database updates..."
cd server

# Generate Prisma client if schema changed or client missing
if [ -f "prisma/schema.prisma" ]; then
    if [ ! -d "node_modules/@prisma/client" ] || ! diff -q "./prisma/schema.prisma" "$BACKUP_DIR/schema.prisma.bak" >/dev/null 2>&1; then
        echo "🧬 Generating Prisma client..."
        npx prisma generate || echo "⚠️  Prisma generate failed - continuing..."
    else
        echo "✅ Prisma client up to date - skipping generate"
    fi
fi

# Only run migrations if they exist and are newer
if [ -f "scripts/runMigrations.js" ]; then
    echo "📊 Running database migrations..."
    node scripts/runMigrations.js || echo "⚠️  Migration script failed but continuing..."
fi

# Run importance field backfill for Activity Logs (one-time migration)
if [ -f "scripts/backfillImportance.js" ]; then
    echo "🔧 Running importance field backfill for Activity Logs..."
    node scripts/backfillImportance.js || echo "⚠️  Importance backfill failed but continuing..."
fi

# Gentle database validation with timeout
echo "🔍 Running database validation (30 second timeout)..."
if timeout 35 npm run db:validate; then
    echo "✅ Database schema validation passed"
else
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 124 ]; then
        echo "⚠️  Database validation timed out - continuing deployment"
    else
        echo "⚠️  Database validation failed (exit code: $EXIT_CODE) - continuing deployment"
    fi
fi

cd ..

# Start PM2 with preserved configuration
echo "🚀 Starting application with preserved PM2 configuration..."

# Use the preserved ecosystem file
if [ -f "./server/ecosystem.config.js" ]; then
    pm2 start server/ecosystem.config.js --env production
else
    echo "⚠️  No ecosystem.config.js found - using default PM2 start"
    cd server
    pm2 start server.js --name mirabel-api --env production
    cd ..
fi

# Save PM2 configuration
pm2 save

# Health check
echo "🏥 Performing health check..."
sleep 5

# Check PM2 status
echo "📊 PM2 Status:"
pm2 status

# Check if application is responding
echo "🌐 Testing application response..."
if curl -f http://localhost:3001/api/health >/dev/null 2>&1; then
    echo "✅ Application is responding correctly"
else
    echo "⚠️  Application may not be responding on port 3001"
fi

echo ""
echo "🎉 Gentle deployment completed!"
echo ""
echo "📋 What was preserved:"
echo "  ✅ Environment variables and secrets"
echo "  ✅ PM2 ecosystem configuration"
echo "  ✅ Custom CORS settings"
echo "  ✅ Local configuration files"
echo "  ✅ Stashed local changes (recoverable)"
echo ""
echo "📋 What was updated:"
echo "  ✅ Source code from git"
echo "  ✅ Dependencies (only if changed)"
echo "  ✅ Frontend build (only if needed)"
echo "  ✅ Database migrations (if available)"
echo ""
echo "🔧 Recovery commands (if needed):"
echo "  📁 View backups: ls -la $BACKUP_DIR"
echo "  🔄 Restore stashed changes: git stash list && git stash pop"
echo "  📊 Check logs: pm2 logs mirabel-api"
echo "  🏥 Health check: curl http://localhost:3001/api/health"
echo ""
echo "🔗 Application URLs:"
echo "  🌐 Frontend: https://mirabelconnect.mirabeltechnologies.com"
echo "  🔌 API Health: https://mirabelconnect.mirabeltechnologies.com/api/health"