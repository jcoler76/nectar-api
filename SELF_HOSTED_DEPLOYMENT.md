# Self-Hosted Deployment Guide

## Overview

This guide walks through deploying the Nectar Customer Application in a self-hosted environment. The application has been separated from the marketing site and admin portal to allow customers to run only the core application components they need.

## Architecture

The Nectar platform consists of three independent applications:

### 1. Customer Application (Self-Hosted)
- **Frontend**: React application on port 3000
- **Backend**: Node.js/Express API on port 3001
- **Database**: PostgreSQL with Prisma ORM
- **Purpose**: Core application functionality for end users

### 2. Admin Portal (SaaS Only)
- **Frontend**: Vite/React application on port 4000
- **Backend**: Express API on port 4001
- **Purpose**: Platform management and administration

### 3. Marketing Site (SaaS Only)
- **Frontend**: React application on port 5000
- **Backend**: Express API on port 5001
- **Purpose**: Lead generation and billing management

## Self-Hosted Components

For self-hosted deployment, customers only need:
- Customer Frontend (port 3000)
- Customer Backend (port 3001)
- PostgreSQL Database

## Prerequisites

- Docker and Docker Compose
- PostgreSQL database (can be containerized)
- Node.js 18+ (if running without Docker)
- 2GB RAM minimum, 4GB recommended
- 10GB storage minimum

## Deployment Methods

### Method 1: Docker Compose (Recommended)

#### Quick Start

1. **Clone the customer application files**:
   ```bash
   # Customer application includes:
   # - Root directory (frontend)
   # - server/ directory (backend)
   # - docker-compose.customer.yml
   # - Dockerfile
   # - server/Dockerfile
   ```

2. **Configure environment variables**:
   ```bash
   # Copy and edit environment files
   cp .env.example .env
   cp server/.env.example server/.env
   ```

3. **Start the application**:
   ```bash
   docker-compose -f docker-compose.customer.yml up -d
   ```

4. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

#### Environment Configuration

**Root `.env` (Frontend)**:
```env
# React Frontend Configuration
REACT_APP_API_URL=http://localhost:3001
REACT_APP_SITE_NAME=YourCompany
GENERATE_SOURCEMAP=false
NODE_ENV=production
```

**`server/.env` (Backend)**:
```env
# Backend Configuration
NODE_ENV=production
PORT=3001

# Database Configuration
DATABASE_URL=postgresql://username:password@host:5432/database_name

# Security
JWT_SECRET=your-super-secure-jwt-secret-here
SESSION_SECRET=your-secure-session-secret-here

# Optional: SMTP Configuration for emails
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@yourcompany.com

# Optional: File Upload Configuration
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=10485760
```

#### Docker Compose Configuration

**`docker-compose.customer.yml`**:
```yaml
version: '3.8'

services:
  nectar-frontend:
    build: .
    container_name: nectar-customer-frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:3001
      - REACT_APP_SITE_NAME=YourCompany
    depends_on:
      - nectar-backend
    restart: unless-stopped

  nectar-backend:
    build: ./server
    container_name: nectar-customer-backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - DATABASE_URL=postgresql://nectar:password@postgres:5432/nectar_db
      - JWT_SECRET=your-super-secure-jwt-secret-here
      - SESSION_SECRET=your-secure-session-secret-here
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./uploads:/app/uploads
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    container_name: nectar-postgres
    environment:
      POSTGRES_DB: nectar_db
      POSTGRES_USER: nectar
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U nectar -d nectar_db"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

volumes:
  postgres_data:
```

### Method 2: Manual Installation

#### Backend Setup

1. **Install dependencies**:
   ```bash
   cd server
   npm install
   ```

2. **Configure database**:
   ```bash
   # Set up PostgreSQL database
   # Update DATABASE_URL in server/.env
   ```

3. **Run database migrations**:
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

4. **Start backend**:
   ```bash
   npm run start
   ```

#### Frontend Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build production assets**:
   ```bash
   npm run build
   ```

3. **Serve application**:
   ```bash
   # Using a web server like nginx or apache
   # Serve the build/ directory

   # Or for development
   npm start
   ```

## Database Setup

### PostgreSQL Configuration

1. **Create database**:
   ```sql
   CREATE DATABASE nectar_db;
   CREATE USER nectar WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE nectar_db TO nectar;
   ```

2. **Run migrations**:
   ```bash
   cd server
   npx prisma migrate deploy
   ```

3. **Verify setup**:
   ```bash
   npx prisma db seed  # If seed file exists
   ```

## Security Considerations

### Required Security Configuration

1. **Environment Variables**:
   - Change all default passwords
   - Use strong JWT and session secrets
   - Configure HTTPS in production

2. **Database Security**:
   - Use strong database passwords
   - Restrict database access to application only
   - Enable SSL connections in production

3. **Application Security**:
   - Configure CORS appropriately
   - Set up proper firewall rules
   - Use HTTPS/SSL certificates

### HTTPS Configuration

For production deployment, configure HTTPS:

1. **Using reverse proxy (nginx)**:
   ```nginx
   server {
       listen 443 ssl;
       server_name yourdomain.com;

       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;

       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }

       location /api {
           proxy_pass http://localhost:3001;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

2. **Update environment variables**:
   ```env
   REACT_APP_API_URL=https://yourdomain.com/api
   ```

## Backup and Maintenance

### Database Backups

1. **Automated daily backup**:
   ```bash
   #!/bin/bash
   # backup-script.sh
   DATE=$(date +%Y%m%d_%H%M%S)
   pg_dump -h localhost -U nectar nectar_db > backup_$DATE.sql

   # Keep only last 7 days
   find /backup/path -name "backup_*.sql" -mtime +7 -delete
   ```

2. **Add to crontab**:
   ```bash
   0 2 * * * /path/to/backup-script.sh
   ```

### Application Updates

1. **Update process**:
   ```bash
   # Backup database first
   ./backup-script.sh

   # Stop application
   docker-compose -f docker-compose.customer.yml down

   # Update code/images
   git pull
   docker-compose -f docker-compose.customer.yml pull

   # Start application
   docker-compose -f docker-compose.customer.yml up -d

   # Run any new migrations
   docker exec nectar-customer-backend npx prisma migrate deploy
   ```

### Health Monitoring

Monitor application health:

1. **Health check endpoints**:
   - Backend: `GET /health`
   - Frontend: Check if port 3000 responds

2. **Basic monitoring script**:
   ```bash
   #!/bin/bash
   # health-check.sh
   if ! curl -f http://localhost:3001/health > /dev/null 2>&1; then
       echo "Backend unhealthy - restarting"
       docker restart nectar-customer-backend
   fi

   if ! curl -f http://localhost:3000 > /dev/null 2>&1; then
       echo "Frontend unhealthy - restarting"
       docker restart nectar-customer-frontend
   fi
   ```

## Troubleshooting

### Common Issues

1. **Database connection errors**:
   - Verify DATABASE_URL format
   - Check if PostgreSQL is running
   - Verify network connectivity

2. **Frontend can't reach backend**:
   - Check REACT_APP_API_URL configuration
   - Verify CORS settings in backend
   - Check firewall rules

3. **Permission errors**:
   - Ensure upload directory permissions
   - Check file ownership in Docker containers

4. **Port conflicts**:
   - Change ports in docker-compose.yml
   - Update environment variables accordingly

### Logs and Debugging

1. **View application logs**:
   ```bash
   # Docker logs
   docker logs nectar-customer-frontend
   docker logs nectar-customer-backend
   docker logs nectar-postgres

   # Follow logs in real-time
   docker-compose -f docker-compose.customer.yml logs -f
   ```

2. **Enable debug mode**:
   ```env
   # In server/.env
   NODE_ENV=development
   DEBUG=nectar:*
   ```

## Performance Optimization

### Production Optimizations

1. **Frontend optimizations**:
   - Enable gzip compression
   - Configure browser caching
   - Use CDN for static assets

2. **Backend optimizations**:
   - Configure connection pooling
   - Enable query caching
   - Set up Redis for sessions (optional)

3. **Database optimizations**:
   - Create appropriate indexes
   - Configure PostgreSQL for your hardware
   - Set up regular VACUUM and ANALYZE

### Resource Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 1 core | 2+ cores |
| RAM | 2GB | 4GB+ |
| Storage | 10GB | 50GB+ |
| Network | 10Mbps | 100Mbps+ |

## Support

For self-hosted deployment support:
- Check logs for error messages
- Verify all environment variables are set correctly
- Ensure database connectivity
- Confirm all required ports are open

This deployment package provides a complete, production-ready customer application independent of the marketing site and admin portal.