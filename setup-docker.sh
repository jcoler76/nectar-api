#!/bin/bash

# Nectar API - Docker Setup Script
# This script sets up the development environment with PostgreSQL 17 and Redis

echo "🚀 Setting up Nectar API Development Environment"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Check if Docker is installed and running
echo -e "${YELLOW}Checking Docker installation...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Please install Docker from https://www.docker.com/get-started/${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker found: $(docker --version)${NC}"

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running. Please start Docker${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"

# Create .env file for development
echo -e "${YELLOW}Setting up environment variables...${NC}"
cat > server/.env << 'EOL'
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
EOL

echo -e "${GREEN}✅ Environment variables configured${NC}"

# Pull Docker images
echo -e "${YELLOW}Pulling Docker images...${NC}"
docker pull postgres:17-alpine
docker pull redis:7-alpine
docker pull dpage/pgadmin4:latest

# Start PostgreSQL and Redis
echo -e "${YELLOW}Starting PostgreSQL 17 and Redis...${NC}"
docker compose up -d postgres redis

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
for i in {1..30}; do
    if docker exec nectar-postgres pg_isready -U nectar_admin -d nectar_core &> /dev/null; then
        echo -e "${GREEN}✅ PostgreSQL is ready!${NC}"
        break
    fi
    
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ PostgreSQL failed to start after 30 attempts${NC}"
        docker compose logs postgres
        exit 1
    fi
    
    echo -n "."
    sleep 2
done

# Install Node.js dependencies and set up Prisma
echo -e "${YELLOW}Installing Node.js dependencies...${NC}"
cd server
npm install

# Generate Prisma client
echo -e "${YELLOW}Generating Prisma client...${NC}"
npx prisma generate

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
if npx prisma migrate dev --name init 2>/dev/null; then
    echo -e "${GREEN}✅ Database migrations completed!${NC}"
else
    echo -e "${YELLOW}⚠️  Migration failed, pushing schema directly...${NC}"
    npx prisma db push
    echo -e "${GREEN}✅ Database schema pushed!${NC}"
fi

cd ..

# Display connection information
echo -e "\n${GREEN}🎉 Setup Complete!${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo -e "${WHITE}📊 Database Information:${NC}"
echo -e "${GRAY}  PostgreSQL 17: localhost:5432${NC}"
echo -e "${GRAY}  Database: nectar_core${NC}"
echo -e "${GRAY}  Username: nectar_admin${NC}"
echo -e "${GRAY}  Redis: localhost:6379${NC}"
echo ""
echo -e "${WHITE}🔧 Management Tools:${NC}"
echo -e "${GRAY}  pgAdmin: Start with 'docker compose --profile development up -d pgadmin'${NC}"
echo -e "${GRAY}  Then visit: http://localhost:5050${NC}"
echo ""
echo -e "${WHITE}🚀 Next Steps:${NC}"
echo -e "${GRAY}  1. Start the backend: cd server && npm run dev${NC}"
echo -e "${GRAY}  2. Start the frontend: npm start${NC}"
echo -e "${GRAY}  3. Visit: http://localhost:3000${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"

# Optionally start pgAdmin
echo -n -e "\nWould you like to start pgAdmin now? (y/N): "
read -r start_pgadmin
if [[ $start_pgadmin =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Starting pgAdmin...${NC}"
    docker compose --profile development up -d pgadmin
    echo -e "${GREEN}✅ pgAdmin started at http://localhost:5050${NC}"
    echo -e "${GRAY}   Email: admin@nectar-api.local${NC}"
    echo -e "${GRAY}   Password: pgadmin_2024!${NC}"
fi

echo -e "\n${GREEN}✨ Development environment is ready!${NC}"