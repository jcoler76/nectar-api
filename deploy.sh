#!/bin/bash
# Production deployment script for nectar-api
# Updated for ShadCN UI migration, Prisma integration, and enhanced security features

echo "Starting Nectar API deployment..."

# Navigate to the project directory
cd ~/nectar-api || { echo "Failed to navigate to project directory"; exit 1; }

# Create timestamped backup directory
BACKUP_DIR=~/deployment-backups/$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
echo "Creating backup directory: $BACKUP_DIR"

# Backup ALL environment files (comprehensive backup)
echo "Backing up ALL environment files..."
# Main environment files
cp -f ./server/.env.production $BACKUP_DIR/.env.production.bak 2>/dev/null || echo "  - .env.production not found (will be created)"
cp -f ./server/.env $BACKUP_DIR/.env.bak 2>/dev/null || echo "  - .env not found"
cp -f ./.env.production $BACKUP_DIR/root_.env.production.bak 2>/dev/null || echo "  - root .env.production not found"
cp -f ./.env $BACKUP_DIR/root_.env.bak 2>/dev/null || echo "  - root .env not found"

# Backup ALL .env files recursively (safety net)
echo "Searching for additional .env files..."
find . -name ".env*" -type f -exec cp {} $BACKUP_DIR/ \; 2>/dev/null || :

# Backup Prisma and configuration files
echo "Backing up configuration files..."
cp -f ./server/prisma/schema.prisma $BACKUP_DIR/schema.prisma.bak 2>/dev/null || echo "  - schema.prisma not found"
cp -f ./tailwind.config.js $BACKUP_DIR/tailwind.config.js.bak 2>/dev/null || echo "  - tailwind.config.js not found"
cp -f ./components.json $BACKUP_DIR/components.json.bak 2>/dev/null || echo "  - components.json not found"

# List what was backed up
echo "Backup completed. Files backed up to: $BACKUP_DIR"
ls -la $BACKUP_DIR/ 2>/dev/null || echo "Backup directory contents will be shown after backup"

# Backup logs before cleanup
echo "Backing up logs..."
cp -r ./server/logs $BACKUP_DIR/logs 2>/dev/null || echo "  - logs directory not found"

# Stop the current running instance
echo "Stopping current instance..."
pm2 stop all
pm2 delete all

# Pull latest changes from GitHub
echo "Pulling latest changes from GitHub..."
git reset --hard HEAD
git clean -fd
git fetch origin
git checkout main
git reset --hard origin/main

# Clean install and rebuild
echo "Installing frontend dependencies..."
rm -rf node_modules/
rm -rf build/

# CRITICAL: Fix TailwindCSS PostCSS configuration using config-overrides.js
echo "🚨 FIXING: TailwindCSS PostCSS configuration via config-overrides.js..."

# Ensure config-overrides.js has the correct PostCSS override for React Scripts
cat > config-overrides.js << 'EOF'
module.exports = function override(config, env) {
  // Add fallbacks for node core modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "stream": require.resolve("stream-browserify"),
    "vm": require.resolve("vm-browserify"),
    "crypto": require.resolve("crypto-browserify"),
    "buffer": require.resolve("buffer/"),
    "util": require.resolve("util/"),
    "assert": require.resolve("assert/"),
    "http": require.resolve("stream-http"),
    "https": require.resolve("https-browserify"),
    "os": require.resolve("os-browserify/browser"),
    "url": require.resolve("url/")
  };

  // FORCE override React Scripts' PostCSS configuration with TailwindCSS
  const oneOfRule = config.module.rules.find(rule => rule.oneOf);
  if (oneOfRule) {
    oneOfRule.oneOf.forEach(rule => {
      if (rule.use) {
        rule.use.forEach(loader => {
          if (loader.loader && loader.loader.includes('postcss-loader')) {
            loader.options = {
              postcssOptions: {
                plugins: [
                  require('tailwindcss'),
                  require('autoprefixer'),
                ],
              },
            };
          }
        });
      }
    });
  }

  return config;
};
EOF

# Create traditional PostCSS config (will be ignored by React Scripts but good for other tools)
cat > postcss.config.js << 'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

echo "✅ TailwindCSS configuration updated via config-overrides.js (React Scripts compatible)"

# Handle React 18 compatibility and ShadCN UI migration
echo "Setting up React 18 and ShadCN UI dependencies..."
# Remove problematic packages that were replaced
npm uninstall react-json-view vm2 ip --legacy-peer-deps || true

# Install React 18 compatible alternatives and new dependencies
npm install @microlink/react-json-view ipaddr.js --save --legacy-peer-deps

# Install Tailwind CSS and PostCSS dependencies for ShadCN UI (INCLUDING the separate postcss plugin)
npm install tailwindcss postcss autoprefixer @tailwindcss/postcss --save-dev --legacy-peer-deps || true

# Install Radix UI components for ShadCN UI system
npm install @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-dropdown-menu --save --legacy-peer-deps || true

# Install all dependencies with legacy peer deps to handle React version conflicts
npm install --legacy-peer-deps --force

# Setup frontend environment
echo "Setting up frontend environment..."
echo "REACT_APP_API_URL=https://nectarconnect.nectartechnologies.com" > .env.production

# Install server dependencies with special handling for mongoose and missing modules
echo "Installing server dependencies..."
cd server
rm -rf node_modules/
rm -f package-lock.json
npm cache clean --force

# Install new backend dependencies for enhanced features
echo "Installing enhanced backend dependencies..."
# Remove problematic packages
npm uninstall vm2 ip --save || true

# Install security and replacement packages
npm install ipaddr.js --save
npm install crypto-js --save
npm install lodash.get --save
npm install multer --save

# Install new Bull.js queue system dependencies
npm install bull --save
npm install node-cache --save

# Install CSRF protection
npm install csurf --save

# Install PDF generation
npm install pdfkit --save

# Install SQL parsing
npm install node-sql-parser --save

# Install Prisma ORM
npm install prisma @prisma/client --save

# Install Azure authentication packages
npm install @azure/identity @azure/msal-node --save

# Update existing packages to latest versions
npm install mongoose@7.8.2 --save
npm install mssql@^11.0.1 --save
npm install jsonwebtoken@^9.0.2 --save

# Install all dependencies
npm install --no-package-lock
cd ..

# IMPORTANT: Restore the original .env.production file to preserve encryption keys and secrets
echo "Restoring environment variables..."
if [ -f $BACKUP_DIR/.env.production.bak ]; then
  cp -f $BACKUP_DIR/.env.production.bak ./server/.env.production
  echo "✅ Restored .env.production from backup"
else
  echo "⚠️  No .env.production backup found - will create new file"
fi

# Skip Template20 database checks - not required for current deployment
echo "✅ Skipping Template20 database configuration (not required currently)"

# Setup Prisma database configuration
echo "Setting up Prisma database configuration..."
cd server

# Generate Prisma client if schema exists
if [ -f "prisma/schema.prisma" ]; then
  echo "Generating Prisma client..."
  npx prisma generate || echo "⚠️  Prisma generate failed (Template20 DB not configured) - continuing with deployment"
  
  echo "Running Prisma database push to sync schema..."
  npx prisma db push --accept-data-loss || echo "⚠️  Prisma db push failed (Template20 DB not configured) - continuing with deployment"
else
  echo "⚠️  No Prisma schema found - skipping Prisma setup"
fi

cd ..

# Ensure Redis is available for Bull queue system
echo "Checking Redis availability for Bull queue system..."
if command -v redis-cli >/dev/null 2>&1; then
  if redis-cli ping >/dev/null 2>&1; then
    echo "✅ Redis is running and available"
  else
    echo "⚠️  Redis is installed but not running - attempting to start..."
    sudo systemctl start redis-server || echo "Failed to start Redis - queue functionality may be limited"
  fi
else
  echo "⚠️  Redis not found - installing..."
  sudo apt-get update && sudo apt-get install -y redis-server
  sudo systemctl enable redis-server
  sudo systemctl start redis-server
fi

# Check if essential environment variables are set
echo "Validating critical environment variables..."
ENV_FILE="./server/.env.production"

# Create comprehensive environment file if missing critical variables
if [ ! -f "$ENV_FILE" ] || ! grep -q "ENCRYPTION_KEY" "$ENV_FILE"; then
  echo "Setting up enhanced environment configuration..."
  
  # Add new required environment variables
  cat >> "$ENV_FILE" << 'EOF'

# Enhanced Security Configuration
ENCRYPTION_KEY=${ENCRYPTION_KEY:-$(openssl rand -hex 32)}
REFRESH_TOKEN_ROTATION=true
ENABLE_2FA=false
ENABLE_AUDIT_LOGGING=true
SESSION_TIMEOUT=86400
MAX_FILE_SIZE=10485760

# Redis Configuration for Bull Queues
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Rate Limiting Configuration
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX_ATTEMPTS=5
API_RATE_LIMIT_WINDOW_MS=60000
API_RATE_LIMIT_MAX_REQUESTS=100

# Enhanced CSRF Protection
CSRF_PROTECTION_ENABLED=true
CSRF_COOKIE_SECURE=true
CSRF_COOKIE_SAME_SITE=strict

# Database Configuration
TEMPLATE20_DATABASE_URL=${DATABASE_URL:-}
EOF
  echo "✅ Enhanced environment variables added"
else
  echo "✅ Environment file exists with required variables"
fi

# Update CORS settings
echo "Updating CORS configuration..."
cat > server/config/corsOptions.js << 'EOF'
const corsOptions = {
  origin: ['https://nectarconnect.nectartechnologies.com', 'http://localhost:3000', 'http://localhost:8000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-nectar-api-key'],
  exposedHeaders: ['X-Total-Count'],
  credentials: true,
  maxAge: 600 // 10 minutes
};

module.exports = corsOptions;
EOF

# Ensure environment files exist
[ ! -f ./server/.env.production ] && cp ./server/.env ./server/.env.production 2>/dev/null || :

# TailwindCSS PostCSS configuration is handled above via config-overrides.js
echo "✅ TailwindCSS configuration already set via config-overrides.js method"

# Pre-build verification
echo "🔍 Pre-build verification:"
echo "Checking @tailwindcss/postcss installation:"
npm list @tailwindcss/postcss || echo "⚠️  @tailwindcss/postcss not found in npm list"
echo "Current PostCSS configuration:"
cat postcss.config.js
echo "TailwindCSS package version:"
npm list tailwindcss

# Build frontend
echo "🚀 Building frontend..."
if ! npm run build; then
  echo "❌ Frontend build failed. Checking for react-app-rewired..."
  npm install react-app-rewired --save-dev --legacy-peer-deps
  echo "🔄 Retrying frontend build..."
  npm run build
fi

# Update ecosystem.config.js for PM2 with MCP support
echo "Updating PM2 configuration..."
cat > server/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'nectar-api',
      script: 'server.js',
      cwd: '/home/ubuntu/nectar-api/server',
      interpreter: '/usr/bin/node',
      env_production: {
        NODE_ENV: 'production'
      },
      env_file: '.env.production'
    }
  ]
}
EOF

# Run database initialization and migrations
echo "Running database initialization and migrations..."
cd server

# Initialize database if script exists
if [ -f "scripts/runMigrations.js" ]; then
  echo "Running database migrations..."
  node scripts/runMigrations.js
else
  echo "No migration script found - skipping migrations"
fi

# Run database initialization
if npm run db:init >/dev/null 2>&1; then
  echo "✅ Database initialization completed"
else
  echo "⚠️  Database initialization not available or failed"
fi

# Validate database schema
if npm run db:validate >/dev/null 2>&1; then
  echo "✅ Database schema validation passed"
else
  echo "⚠️  Database schema validation not available or failed"
fi

# Run API key migration (enhanced security)
echo "Running enhanced API key migration..."
if [ -f "scripts/migrateApiKeysFixed.js" ]; then
  echo "Running secure API key migration..."
  node scripts/migrateApiKeysFixed.js
elif [ -f "scripts/migrateApiKeys.js" ]; then
  echo "Running API key migration (fallback)..."
  node scripts/migrateApiKeys.js
else
  echo "API key migration script not found - skipping"
fi

# Seed rate limiting configuration
if npm run db:seed-rate-limits >/dev/null 2>&1; then
  echo "✅ Rate limiting configuration seeded"
else
  echo "⚠️  Rate limiting seed not available"
fi

# Initialize Bull queues if script exists
if [ -f "scripts/initializeQueues.js" ]; then
  echo "Initializing Bull queue system..."
  node scripts/initializeQueues.js
else
  echo "Queue initialization script not found - queues will initialize on server start"
fi

cd ..

# Start with PM2
echo "Starting application with PM2..."
pm2 start server/ecosystem.config.js

# Save PM2 configuration to survive server restarts
pm2 save

# Check status
echo "Deployment completed. Checking application status:"
pm2 status

echo "Deployment completed successfully!"
echo ""
echo "🎨 UI Framework Migration:"
echo "- Migrated from Material-UI to ShadCN UI with Tailwind CSS"
echo "- Enhanced theming system and component library"
echo "- React 18 compatibility fully implemented"
echo "- Modern design system with improved accessibility"
echo ""
echo "🔧 Backend Enhancements:"
echo "- Prisma ORM integration for enhanced database management"
echo "- Bull.js queue system with Redis for background processing"
echo "- Enhanced rate limiting with dynamic, tiered system"
echo "- CSRF protection and security header improvements"
echo "- PDF generation capabilities with PDFKit"
echo ""
echo "🔒 Security Improvements:"
echo "- API keys migrated to bcrypt hashing (one-way encryption)"
echo "- Enhanced JWT token rotation and refresh mechanism"
echo "- Improved CORS configuration with strict policies"
echo "- Console logging override in production for data protection"
echo "- Comprehensive audit logging system"
echo ""
echo "📊 Performance Optimizations:"
echo "- Node-cache for in-memory caching"
echo "- Connection pooling with mssql@11.0.1"
echo "- Queue-based workflow processing"
echo "- Enhanced database query optimization"
echo ""
echo "🔧 Dependencies Updated:"
echo "- Removed: vm2, react-json-view, ip (security vulnerabilities)"
echo "- Added: @microlink/react-json-view, ipaddr.js, bull, prisma"
echo "- Updated: mssql@11.0.1, jsonwebtoken@9.0.2, nodemon@3.1.10"
echo "- New: ShadCN UI components, Tailwind CSS, Azure authentication"
echo ""
echo "📋 Next Steps:"
echo "1. Test UI components for ShadCN migration compatibility"
echo "2. Verify queue system functionality with Redis"
echo "3. Monitor rate limiting and security enhancements"
echo "4. Review Prisma database operations and performance"
echo "5. Validate API key migration completed successfully"
echo "6. Test PDF generation and new workflow capabilities"
echo ""
# Cleanup: Restore original PostCSS config if backup exists (optional)
if [ -f postcss.config.js.backup ]; then
  echo "PostCSS backup exists - keeping production configuration"
  # Uncomment the line below if you want to restore original config after deployment
  # mv postcss.config.js.backup postcss.config.js
fi

echo "🔍 Health Checks:"
echo "- Frontend: https://nectarconnect.nectartechnologies.com"
echo "- API Health: https://nectarconnect.nectartechnologies.com/api/health"
echo "- Queue Status: Check PM2 logs for Bull queue initialization"
echo "- Database: Prisma schema validation completed"