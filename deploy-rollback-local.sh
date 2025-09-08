#!/bin/bash
# Emergency rollback script for nectar-api
# Restores from the most recent backup

echo "🚨 Emergency Rollback Script for Nectar API"
echo "============================================"

# Find the most recent backup
BACKUP_BASE=~/deployment-backups
if [ ! -d "$BACKUP_BASE" ]; then
    echo "❌ No backup directory found at $BACKUP_BASE"
    exit 1
fi

LATEST_BACKUP=$(ls -1t $BACKUP_BASE | head -1)
if [ -z "$LATEST_BACKUP" ]; then
    echo "❌ No backups found in $BACKUP_BASE"
    exit 1
fi

BACKUP_DIR="$BACKUP_BASE/$LATEST_BACKUP"
echo "📁 Using backup: $BACKUP_DIR"

# Navigate to project directory
cd ~/nectar-api || { echo "❌ Failed to navigate to project directory"; exit 1; }

echo "🛑 Stopping current PM2 processes..."
pm2 stop all

echo "🔄 Restoring files from backup..."

# Restore environment files
if [ -f "$BACKUP_DIR/.env.production.bak" ]; then
    cp -f "$BACKUP_DIR/.env.production.bak" ./server/.env.production
    echo "✅ Restored .env.production"
fi

if [ -f "$BACKUP_DIR/.env.bak" ]; then
    cp -f "$BACKUP_DIR/.env.bak" ./server/.env
    echo "✅ Restored .env"
fi

# Restore ecosystem configuration
if [ -f "$BACKUP_DIR/ecosystem.config.js.bak" ]; then
    cp -f "$BACKUP_DIR/ecosystem.config.js.bak" ./server/ecosystem.config.js
    echo "✅ Restored ecosystem.config.js"
fi

# Restore configuration files
if [ -f "$BACKUP_DIR/config-overrides.js.bak" ]; then
    cp -f "$BACKUP_DIR/config-overrides.js.bak" ./config-overrides.js
    echo "✅ Restored config-overrides.js"
fi

if [ -f "$BACKUP_DIR/corsOptions.js.bak" ]; then
    mkdir -p ./server/config
    cp -f "$BACKUP_DIR/corsOptions.js.bak" ./server/config/corsOptions.js
    echo "✅ Restored CORS configuration"
fi

echo "🚀 Restarting application..."
if [ -f "./server/ecosystem.config.js" ]; then
    pm2 start server/ecosystem.config.js --env production
else
    cd server
    pm2 start server.js --name nectar-api --env production
    cd ..
fi

pm2 save

echo "✅ Rollback completed!"
echo "📊 PM2 Status:"
pm2 status

echo ""
echo "🔍 Verify rollback:"
echo "  curl http://localhost:3001/api/health"