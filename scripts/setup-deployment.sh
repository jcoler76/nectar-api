#!/bin/bash

# Setup script for initial server configuration
# Run this once on each Linux server to prepare for Docker deployments

set -e

echo "🚀 Nectar API Deployment Setup Script"
echo "======================================"

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "This script should not be run as root. Please run as ubuntu user."
   exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    print_status "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    print_status "Docker installed successfully"
else
    print_status "Docker is already installed"
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    print_status "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_status "Docker Compose installed successfully"
else
    print_status "Docker Compose is already installed"
fi

# Install MongoDB tools for backups
if ! command -v mongodump &> /dev/null; then
    print_status "Installing MongoDB tools..."
    wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    sudo apt update
    sudo apt install -y mongodb-database-tools
    print_status "MongoDB tools installed successfully"
else
    print_status "MongoDB tools are already installed"
fi

# Create application directory
print_status "Creating application directory..."
mkdir -p ~/nectar-api
cd ~/nectar-api

# Create necessary subdirectories
mkdir -p server/logs server/backups server/uploads deployment-backups

# Set proper permissions
chmod 755 server/logs server/backups server/uploads

# Create initial docker-compose.yml if it doesn't exist
if [ ! -f docker-compose.yml ]; then
    print_status "Creating initial docker-compose.yml..."
    cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  nectar-api:
    image: ghcr.io/jcolermirabel/nectar-api:latest
    container_name: nectar-api
    restart: unless-stopped
    ports:
      - "3001:3001"
    env_file:
      - .env.production
    environment:
      - NODE_ENV=production
      - PORT=3001
    volumes:
      - ./server/logs:/app/server/logs
      - ./server/backups:/app/server/backups
      - ./server/uploads:/app/server/uploads
    networks:
      - nectar-network
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 40s

  mongodb:
    image: mongo:7.0
    container_name: nectar-mongodb
    restart: unless-stopped
    ports:
      - "127.0.0.1:27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=CHANGE_THIS_PASSWORD
      - MONGO_INITDB_DATABASE=nectar
    volumes:
      - mongodb_data:/data/db
      - mongodb_config:/data/configdb
    networks:
      - nectar-network

  redis:
    image: redis:7-alpine
    container_name: nectar-redis
    restart: unless-stopped
    ports:
      - "127.0.0.1:6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - nectar-network

networks:
  nectar-network:
    driver: bridge

volumes:
  mongodb_data:
  mongodb_config:
  redis_data:
EOF
    print_status "docker-compose.yml created"
else
    print_warning "docker-compose.yml already exists, skipping..."
fi

# Create sample .env.production file if it doesn't exist
if [ ! -f .env.production ]; then
    print_status "Creating sample .env.production file..."
    cat > .env.production << 'EOF'
# Node Environment
NODE_ENV=production
PORT=3001

# Database
MONGODB_URI=mongodb://mongodb:27017/nectar
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=CHANGE_THIS_PASSWORD

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# JWT & Security
JWT_SECRET=CHANGE_THIS_TO_A_RANDOM_STRING_MIN_32_CHARS
ENCRYPTION_KEY=CHANGE_THIS_TO_A_RANDOM_STRING
SESSION_SECRET=CHANGE_THIS_TO_A_RANDOM_STRING

# SQL Server (if needed)
SQL_SERVER_HOST=your-sql-server
SQL_SERVER_USER=your-username
SQL_SERVER_PASSWORD=your-password
SQL_SERVER_DATABASE=your-database

# Backup Configuration
DB_BACKUP_ENABLED=true
DB_BACKUP_SCHEDULE=0 2 * * *
DB_BACKUP_RETENTION_DAYS=30
BACKUP_ALERT_EMAIL=admin@nectartechnologies.com

# Email Configuration (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@domain.com
EMAIL_PASS=your-app-password
EMAIL_FROM=Nectar API <no-reply@nectartechnologies.com>
EOF
    print_warning "⚠️  IMPORTANT: Edit .env.production with your actual configuration values!"
else
    print_warning ".env.production already exists, skipping..."
fi

# Setup nginx if installed
if command -v nginx &> /dev/null; then
    print_status "Creating nginx configuration..."
    sudo tee /etc/nginx/sites-available/nectar-api << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF
    print_warning "Remember to:"
    print_warning "  1. Update server_name in /etc/nginx/sites-available/nectar-api"
    print_warning "  2. Enable the site: sudo ln -s /etc/nginx/sites-available/nectar-api /etc/nginx/sites-enabled/"
    print_warning "  3. Test nginx: sudo nginx -t"
    print_warning "  4. Reload nginx: sudo systemctl reload nginx"
    print_warning "  5. Setup SSL with certbot"
else
    print_warning "Nginx not found. Install it manually if needed for reverse proxy."
fi

# Create deployment helper script
print_status "Creating deployment helper script..."
cat > deploy.sh << 'EOF'
#!/bin/bash

# Quick deployment script for manual deployments
# Usage: ./deploy.sh [branch]

BRANCH=${1:-main}
REGISTRY_USER=${GITHUB_USER:-$USER}

echo "🚀 Deploying Nectar API from branch: $BRANCH"

# Login to GitHub Container Registry
echo "Logging into GitHub Container Registry..."
echo "Please enter your GitHub Personal Access Token:"
read -s GITHUB_TOKEN
echo $GITHUB_TOKEN | docker login ghcr.io -u $REGISTRY_USER --password-stdin

# Pull latest image
IMAGE="ghcr.io/$REGISTRY_USER/nectar-api:$BRANCH-latest"
echo "Pulling image: $IMAGE"
docker pull $IMAGE

# Update docker-compose
sed -i "s|image: ghcr.io/.*|image: $IMAGE|g" docker-compose.yml

# Deploy
echo "Deploying application..."
docker compose up -d --no-deps nectar-api

# Wait for health check
echo "Waiting for application to be healthy..."
for i in {1..30}; do
    if curl -f http://localhost:3001/health 2>/dev/null; then
        echo "✅ Application is healthy!"
        break
    fi
    echo "Waiting... ($i/30)"
    sleep 5
done

# Show status
docker compose ps

echo "✅ Deployment complete!"
EOF
chmod +x deploy.sh

print_status "Setup complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Edit .env.production with your actual configuration"
echo "2. Configure GitHub Secrets in your repository:"
echo "   - STAGING_HOST: IP address of staging server"
echo "   - PRODUCTION_HOST: IP address of production server"
echo "   - SSH_USER: ubuntu (or your SSH username)"
echo "   - SSH_KEY: Your private SSH key for server access"
echo "3. If using nginx, configure the reverse proxy"
echo "4. Push your code to GitHub to trigger automatic deployment"
echo ""
echo "🔧 Manual deployment:"
echo "   cd ~/nectar-api && ./deploy.sh [branch]"
echo ""
print_warning "Remember to log out and back in for Docker group membership to take effect!"