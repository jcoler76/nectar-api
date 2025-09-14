# PostgreSQL Setup Instructions

## Quick Start

### Option 1: Using Docker (Recommended)

1. **Start PostgreSQL and Redis**:
   ```bash
   docker compose up -d postgres redis
   ```

2. **Verify containers are running**:
   ```bash
   docker ps
   ```

3. **Access pgAdmin** (optional):
   ```bash
   docker compose --profile development up -d pgadmin
   ```
   Then visit: http://localhost:5050
   - Email: admin@nectar-api.local
   - Password: pgadmin_2024!

### Option 2: Local PostgreSQL Installation

1. **Install PostgreSQL 15+** from https://www.postgresql.org/download/

2. **Create database and user**:
   ```sql
   CREATE DATABASE nectar_core;
   CREATE USER nectar_admin WITH PASSWORD 'nectar_dev_2024!';
   GRANT ALL PRIVILEGES ON DATABASE nectar_core TO nectar_admin;
   ```

3. **Run initialization script**:
   ```bash
   psql -U nectar_admin -d nectar_core -f server/database/init/01-enable-extensions.sql
   ```

## Environment Setup

1. **Copy PostgreSQL environment variables**:
   ```bash
   cd server
   cat .env.postgresql >> .env
   ```

2. **Generate Prisma Client**:
   ```bash
   cd server
   npx prisma generate
   ```

3. **Run database migrations**:
   ```bash
   cd server
   npx prisma migrate dev --name init
   ```

## Connection Details

- **Host**: localhost
- **Port**: 5432
- **Database**: nectar_core
- **Username**: nectar_admin
- **Password**: nectar_dev_2024!
- **Connection URL**: postgresql://nectar_admin:nectar_dev_2024!@localhost:5432/nectar_core

## Troubleshooting

### Docker not installed
Install Docker Desktop from: https://www.docker.com/products/docker-desktop/

### Port 5432 already in use
Either stop the existing PostgreSQL service or change the port in docker-compose.yml:
```yaml
ports:
  - "5433:5432"  # Changed from 5432:5432
```

### Connection refused
Ensure PostgreSQL is running:
```bash
docker compose logs postgres
```

### Permission denied
Run initialization as superuser first:
```bash
docker exec -it nectar-postgres psql -U nectar_admin -d nectar_core
```