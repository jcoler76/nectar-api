# 🐳 Docker Setup - Next Steps

Your PostgreSQL 17 environment is **ready to launch**! Follow these steps:

## ✅ What's Already Done

- ✅ PostgreSQL 17 + Redis Docker configuration
- ✅ Prisma schema with complete multi-tenant architecture  
- ✅ Environment variables configured
- ✅ Database initialization scripts ready
- ✅ Setup scripts for both Windows and Linux/macOS

## 🚀 Quick Start (3 steps)

### Step 1: Start Docker Desktop
Make sure Docker Desktop is running (you should see the Docker whale icon in your system tray)

### Step 2: Start the Databases
```bash
# Option A: Use our setup script (recommended)
./setup-docker.sh

# Option B: Manual start
docker compose up -d postgres redis

# Check if containers are running
docker compose ps
```

### Step 3: Initialize Prisma
```bash
cd server
npm install
npx prisma generate
npx prisma db push
```

## 🎯 What You'll Get

### PostgreSQL 17 Database
- **Host**: localhost:5432
- **Database**: nectar_core  
- **Username**: nectar_admin
- **Password**: nectar_dev_2024!

### Multi-Tenant Schema Ready
- **Organizations** with workspaces
- **User memberships** with roles (Owner, Admin, Member, Viewer)
- **Subscriptions** with 5 tiers (Free → Enterprise)
- **Database connections** supporting 10 database types
- **Usage tracking** for billing
- **Audit logging** for compliance

### Management Tools
```bash
# Start pgAdmin (database GUI)
docker compose --profile development up -d pgadmin

# Access at: http://localhost:5050
# Email: admin@nectar-api.local
# Password: pgadmin_2024!
```

## 🔧 Verify Setup

```bash
# Check containers are running
docker compose ps

# View PostgreSQL logs
docker compose logs postgres

# Test database connection
docker exec nectar-postgres pg_isready -U nectar_admin -d nectar_core

# View Prisma schema
cd server && npx prisma studio
```

## 🏃‍♂️ Start Development

```bash
# Terminal 1: Backend
cd server && npm run dev

# Terminal 2: Frontend  
npm start

# Visit: http://localhost:3000
```

## 🎉 You're Ready!

Once Docker is started, run:
```bash
./setup-docker.sh
```

This will:
- Pull PostgreSQL 17 and Redis images
- Start containers with health checks
- Install dependencies
- Generate Prisma client  
- Initialize database
- Display connection info

---

**🆘 Need Help?**
- Docker not starting? Check Docker Desktop is running
- Port conflicts? See SETUP_GUIDE.md troubleshooting
- Database issues? Run `docker compose logs postgres`