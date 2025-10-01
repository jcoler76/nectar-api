# 🗄️ Database Backup Guide - Before Core Cleanup

> **Critical**: Always backup before major changes!
> **Time**: 5-10 minutes
> **Database**: PostgreSQL `nectarstudio_ai`

---

## QUICK BACKUP (Recommended)

### Step 1: Create Backup Directory
```bash
# Create backup folder with timestamp
mkdir -p backups/db-$(date +%Y%m%d-%H%M%S)
cd backups/db-$(date +%Y%m%d-%H%M%S)
```

### Step 2: Backup Database
```bash
# Full database backup (all tables, data, schema)
pg_dump -U nectar_admin -d nectarstudio_ai -F c -b -v -f nectarstudio_ai_full_backup.dump

# Alternative: Plain SQL format (human-readable)
pg_dump -U nectar_admin -d nectarstudio_ai -F p -b -v -f nectarstudio_ai_backup.sql

# Schema-only backup (for reference)
pg_dump -U nectar_admin -d nectarstudio_ai --schema-only -f nectarstudio_ai_schema.sql
```

**Password**: When prompted, enter `nectar_dev_2024!`

### Step 3: Verify Backup Files
```bash
# Check backup files were created
ls -lh

# Expected output:
# nectarstudio_ai_full_backup.dump  (5-50 MB depending on data)
# nectarstudio_ai_backup.sql        (10-100 MB)
# nectarstudio_ai_schema.sql        (100-500 KB)

# Check file sizes
du -sh *
```

---

## RESTORATION COMMANDS (Keep These Handy)

### To Restore Full Backup
```bash
# Stop application first!
# Then restore:
pg_restore -U nectar_admin -d nectarstudio_ai -c -v nectarstudio_ai_full_backup.dump
```

### To Restore SQL Backup
```bash
psql -U nectar_admin -d nectarstudio_ai -f nectarstudio_ai_backup.sql
```

---

## ALTERNATIVE: Quick Backup Script

Save this as `backup-db.sh`:
```bash
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="backups/db-$TIMESTAMP"
DB_NAME="nectarstudio_ai"
DB_USER="nectar_admin"

echo "Creating backup directory: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

echo "Backing up database: $DB_NAME"
cd "$BACKUP_DIR"

# Full backup
pg_dump -U $DB_USER -d $DB_NAME -F c -b -v -f ${DB_NAME}_full_backup.dump

# SQL backup
pg_dump -U $DB_USER -d $DB_NAME -F p -b -v -f ${DB_NAME}_backup.sql

# Schema only
pg_dump -U $DB_USER -d $DB_NAME --schema-only -f ${DB_NAME}_schema.sql

echo "Backup complete! Files in: $BACKUP_DIR"
ls -lh
```

Usage:
```bash
chmod +x backup-db.sh
./backup-db.sh
```

---

## ✅ BACKUP VERIFICATION CHECKLIST

- [ ] Backup files created (check with `ls -lh`)
- [ ] Files have reasonable size (> 1 MB for full backup)
- [ ] No error messages during backup
- [ ] Backup directory path noted for recovery

**Backup Location**: `backups/db-YYYYMMDD-HHMMSS/`
**Files to Keep**: All `.dump` and `.sql` files

---

## 🚨 EMERGENCY DATABASE RESTORE

If cleanup causes database issues (unlikely, but just in case):

```bash
# 1. Stop all services
# Kill any running processes on ports 3000, 3001

# 2. Restore database
cd backups/db-YYYYMMDD-HHMMSS
pg_restore -U nectar_admin -d nectarstudio_ai -c -v nectarstudio_ai_full_backup.dump

# 3. Restart services
cd ../..
npm run dev
```

---

**Next**: Once backup completes successfully, proceed with `CLEANUP_CHECKLIST.md`
