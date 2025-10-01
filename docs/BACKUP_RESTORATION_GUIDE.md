# Backup & Restoration Guide
## Pre-Microservices Separation Safety Net

> **Created**: September 25, 2025
> **Purpose**: Complete backup before separating monolith into microservices
> **Safety Level**: ⚠️ CRITICAL - Use this to revert if separation fails

---

## 🎯 What Was Backed Up

### 1. Git Repository State
- **Backup Branch**: `backup-pre-microservices-20250925-XXXXXX`
- **Backup Commit**: `e5f0532` - "Pre-separation backup: Current state before splitting into microservices"
- **Contains**:
  - Main application (ports 3000/3001)
  - Admin portal (ports 4000/4001)
  - Marketing site (ports 5000/5001)
  - All configurations, migrations, and recent improvements

### 2. Database State
- **Database**: `nectarstudio_ai`
- **Backup Location**: `backups/` directory
- **Backup Command**: See `backups/backup_commands.txt`

---

## 🔄 Complete Restoration Procedure

### Step 1: Restore Git Repository
```bash
# Navigate to project directory
cd C:\Users\jcoler\nectar-api

# Check current state
git status
git log --oneline -5

# Restore to backup state
git checkout backup-pre-microservices-20250925-XXXXXX
git checkout -b restore-from-backup-$(date +%Y%m%d-%H%M%S)

# Or if you want to reset current branch:
git reset --hard backup-pre-microservices-20250925-XXXXXX
```

### Step 2: Restore Database
```bash
# Stop all running services first
# Kill any node processes

# Restore database from backup
psql "postgresql://nectar_admin:nectar_dev_2024!@localhost:5432/" -c "DROP DATABASE IF EXISTS nectarstudio_ai;"
psql "postgresql://nectar_admin:nectar_dev_2024!@localhost:5432/" -f "backups/nectarstudio_ai_backup_XXXXXXXX.sql"
```

### Step 3: Restore Application State
```bash
# Install dependencies (if needed)
npm install

# Restore all three applications
# Main app (ports 3000/3001)
npm start

# Marketing site (ports 5000/5001)
cd marketing-site && npm install && npm start

# Admin portal (ports 4000/4001)
cd admin-frontend && npm install && npm run dev
cd admin-backend && npm install && npm run dev
```

### Step 4: Verify Restoration
- [ ] Main app loads at http://localhost:3000
- [ ] Main API responds at http://localhost:3001
- [ ] Marketing site loads at http://localhost:5000
- [ ] Admin frontend loads at http://localhost:4000
- [ ] Admin backend responds at http://localhost:4001
- [ ] Database has all expected data (users, organizations, etc.)
- [ ] Authentication works on all applications

---

## 📊 Pre-Separation Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Main App      │    │  Marketing Site │    │  Admin Portal   │
│   (3000/3001)   │    │   (5000/5001)   │    │   (4000/4001)   │
│                 │    │                 │    │                 │
│ • Core Platform │    │ • Lead Capture  │    │ • User Mgmt     │
│ • User Auth     │    │ • Stripe Billing│    │ • Lead Mgmt     │
│ • API Services  │    │ • Public Pages  │    │ • System Admin  │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │    Single PostgreSQL     │
                    │      Database            │
                    │   nectarstudio_ai        │
                    └──────────────────────────┘
```

---

## 🚨 Emergency Contacts & Notes

### If Restoration Fails:
1. Check git branch exists: `git branch -a | grep backup-pre`
2. Verify database backup file exists in `backups/`
3. Ensure PostgreSQL is running and accessible
4. Check all environment variables in `server/.env`

### Key Environment Variables:
- `DATABASE_URL`: App-level database access
- `ADMIN_DATABASE_URL`: Admin-level database access
- `NODE_ENV=development`

### Port Assignments:
- **3000**: Main app frontend
- **3001**: Main app backend/API
- **4000**: Admin frontend
- **4001**: Admin backend
- **5000**: Marketing site frontend
- **5001**: Marketing site backend
- **5432**: PostgreSQL database

---

## ✅ Verification Checklist

After restoration, verify these key functionalities:

### Main Application
- [ ] User can log in with existing credentials
- [ ] Dashboard loads with data
- [ ] API endpoints respond correctly
- [ ] Workflows function properly

### Admin Portal
- [ ] Admin can log in with: `support@nectarstudio.ai` / `Fr33d0M!!@!NC`
- [ ] User management page shows all users
- [ ] Dashboard shows metrics (not 0s)
- [ ] All admin functions work

### Marketing Site
- [ ] Public pages load
- [ ] Contact forms work
- [ ] Stripe integration functions

### Database
- [ ] All users exist (should be 11+ users)
- [ ] Organizations exist (should be 13+ orgs)
- [ ] Lead data preserved
- [ ] API activity logs intact

---

## 📝 Rollback Decision Tree

```
Separation Issues?
    ├─ YES → Follow restoration procedure above
    │        Check all verification items
    │        Resume work from stable state
    │
    └─ NO → Continue with microservices separation
             Keep this backup for reference
             Consider additional incremental backups
```

---

**Remember**: This backup represents a fully functional state. If the microservices separation becomes problematic, you can always return to this exact working configuration and try a different approach.

**Last Updated**: September 25, 2025
**Backup Commit**: e5f0532
**Database**: Backed up in backups/ directory