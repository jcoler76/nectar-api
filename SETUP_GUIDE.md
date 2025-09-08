# 🚀 Nectar API - Complete Setup Guide

## Prerequisites

- **Node.js 18+** (https://nodejs.org/)
- **Docker Desktop** (https://www.docker.com/products/docker-desktop/)
- **Git** (https://git-scm.com/)

## Quick Setup (Recommended)

### Windows Users
```powershell
# Run the PowerShell setup script
.\setup-docker.ps1
```

### macOS/Linux Users
```bash
# Run the bash setup script
./setup-docker.sh
```

## Manual Setup

### 1. Install Dependencies

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ..
npm install
```

### 2. Start Database Services

```bash
# Start PostgreSQL 17 and Redis
docker compose up -d postgres redis

# Optional: Start pgAdmin for database management
docker compose --profile development up -d pgadmin
```

### 3. Setup Environment

```bash
# Copy environment variables
cd server
cp .env.postgresql .env
```

### 4. Initialize Database

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Or push schema directly (for development)
npx prisma db push
```

## Database Information

### PostgreSQL 17
- **Host**: localhost
- **Port**: 5432
- **Database**: nectar_core
- **Username**: nectar_admin
- **Password**: nectar_dev_2024!
- **Connection URL**: `postgresql://nectar_admin:nectar_dev_2024!@localhost:5432/nectar_core`

### Redis
- **Host**: localhost
- **Port**: 6379
- **Password**: nectar_redis_2024!
- **Connection URL**: `redis://:nectar_redis_2024!@localhost:6379`

### pgAdmin (Database Management)
- **URL**: http://localhost:5050
- **Email**: admin@nectar-api.local
- **Password**: pgadmin_2024!

## Starting the Application

### Development Mode

```bash
# Terminal 1: Start backend server
cd server
npm run dev

# Terminal 2: Start frontend server
npm start
```

### Access Points
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **GraphQL Playground**: http://localhost:3001/graphql
- **pgAdmin**: http://localhost:5050

## Docker Services

### Core Services
```bash
# Start all core services
docker compose up -d postgres redis

# Check service status
docker compose ps

# View logs
docker compose logs postgres
docker compose logs redis
```

### Development Tools
```bash
# Start pgAdmin
docker compose --profile development up -d pgadmin

# Stop all services
docker compose down

# Remove volumes (⚠️ This deletes data!)
docker compose down -v
```

## Database Schema Overview

### Multi-Tenant Architecture
- **Organizations**: Workspaces for teams
- **Memberships**: User roles within organizations
- **Subscriptions**: Billing and plan management
- **Database Connections**: Multi-database support
- **Usage Metrics**: API call tracking
- **Audit Logs**: Compliance and security

### Supported Database Types
- PostgreSQL
- MySQL/MariaDB
- Microsoft SQL Server
- MongoDB
- Redis
- Supabase
- Snowflake
- BigQuery
- DynamoDB

## Configuration

### Environment Variables (.env)
```bash
# Database
DATABASE_URL=postgresql://nectar_admin:nectar_dev_2024!@localhost:5432/nectar_core?schema=public
POSTGRES_USER=nectar_admin
POSTGRES_PASSWORD=nectar_dev_2024!
POSTGRES_DB=nectar_core

# Redis
REDIS_URL=redis://:nectar_redis_2024!@localhost:6379
REDIS_PASSWORD=nectar_redis_2024!

# Application
NODE_ENV=development
JWT_SECRET=nectar_jwt_secret_development_only_2024!
```

## Prisma Commands

### Development
```bash
# Generate Prisma client
npx prisma generate

# Push schema changes
npx prisma db push

# Create migration
npx prisma migrate dev --name <migration_name>

# View database
npx prisma studio
```

### Production
```bash
# Apply migrations
npx prisma migrate deploy

# Seed database
npx prisma db seed
```

## Troubleshooting

### Port Conflicts
If port 5432 is already in use:
```yaml
# In docker-compose.yml, change:
ports:
  - "5433:5432"  # Use different host port
```

Then update DATABASE_URL:
```
DATABASE_URL=postgresql://nectar_admin:nectar_dev_2024!@localhost:5433/nectar_core?schema=public
```

### Docker Issues
```bash
# Reset Docker environment
docker compose down -v
docker system prune -f
docker volume prune -f

# Rebuild and start
docker compose up -d --build
```

### Database Connection Issues
```bash
# Check container status
docker compose ps

# View PostgreSQL logs
docker compose logs postgres

# Test connection
docker exec nectar-postgres pg_isready -U nectar_admin -d nectar_core
```

### Prisma Issues
```bash
# Reset Prisma client
rm -rf node_modules/.prisma
npm run prisma:generate

# Reset database (⚠️ Deletes all data!)
npx prisma migrate reset
```

## Security Notes

### Development vs Production
- **Development**: Uses default passwords for convenience
- **Production**: Generate secure passwords and use environment variables
- **JWT Secret**: Generate a secure random string for production

### Password Generation
```bash
# Generate secure password
openssl rand -base64 32

# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Next Steps

1. **Run Setup Script**: Execute the appropriate setup script for your OS
2. **Verify Connection**: Ensure PostgreSQL and Redis are running
3. **Start Development**: Begin coding with `npm run dev`
4. **Database Management**: Use pgAdmin to explore the schema
5. **API Testing**: Test endpoints with the built-in GraphQL playground

## Support

- **PostgreSQL 17 Documentation**: https://www.postgresql.org/docs/17/
- **Prisma Documentation**: https://www.prisma.io/docs/
- **Docker Documentation**: https://docs.docker.com/

---

📋 **Current Status**: PostgreSQL 17 + Prisma + Multi-tenant architecture ready for development!