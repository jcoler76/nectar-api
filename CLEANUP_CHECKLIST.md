# ✅ Core Service Cleanup - Quick Checklist

> **Full Guide**: See `docs/SAFE_CORE_CLEANUP_PLAN.md`
> **Time Needed**: 2-3 hours
> **Risk**: LOW (with backups)

---

## PRE-FLIGHT CHECKS (MUST DO FIRST!)

- [ ] ✅ Backup exists: `git branch | grep backup-pre-microservices`
- [ ] ✅ Marketing service works independently (ports 5000/5001)
- [ ] ✅ Admin service works independently (ports 4000/4001)
- [ ] ✅ Create new backup: `git branch backup-before-cleanup-$(date +%Y%m%d-%H%M%S)`
- [ ] ✅ Commit or stash current work: `git status`

**⚠️ EMERGENCY ROLLBACK**: `git reset --hard backup-pre-microservices-20250925-220913`

---

## CLEANUP STEPS

### 1. Remove Directories (5 min)
```bash
rm -rf marketing-site/
rm -rf admin-frontend/
rm -rf admin-backend/
```

### 2. Remove Temp Files (2 min)
```bash
rm -f admin_cookies.txt admin-cookies.txt admin_frontend_run.log
rm -f trigger-dashboard.js test-schema-fetch.js
rm -f check-role-schema.js debug-logout.js clear-storage.js
```

### 3. Update package.json (10 min)
- Change name to `"nectar-core"`
- Update version to `"2.0.0"`
- Remove admin/marketing scripts
- See full example in `docs/SAFE_CORE_CLEANUP_PLAN.md`

### 4. Clean Install (5 min)
```bash
rm -rf node_modules package-lock.json
npm install
```

### 5. Update .env (5 min)
```bash
cp .env .env.backup
# Edit .env to remove admin/marketing vars
# Add: SERVICE_NAME=nectar-core
```

### 6. Update README.md (10 min)
- Change title to "Nectar Core Platform"
- Document ports 3000/3001
- Mention microservices architecture
- See template in full guide

### 7. Test Everything (30 min)
```bash
# Start services
npm run dev

# Test endpoints
curl http://localhost:3001/health
curl http://localhost:3001/api/auth/profile

# Manual UI tests:
```
- [ ] Login works
- [ ] Dashboard loads
- [ ] Services page works
- [ ] Workflows work
- [ ] No console errors

### 8. Commit Changes (5 min)
```bash
git add -A
git commit -m "chore: Complete core service cleanup after microservices extraction"
git tag -a v2.0.0-core-service -m "Core service after microservices separation"
```

---

## VALIDATION (MUST ALL PASS)

### Critical Tests
- [ ] Service starts without errors
- [ ] Health check returns 200: `curl http://localhost:3001/health`
- [ ] Login works in UI
- [ ] Dashboard shows correct data
- [ ] No 404 errors in console
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds

### Performance
- [ ] Startup time < 30 seconds
- [ ] Bundle size reasonable
- [ ] No memory leaks

### Data Security
- [ ] RLS still enforced
- [ ] Users only see their org data
- [ ] Audit logs working

---

## TROUBLESHOOTING QUICK FIXES

**Port in use**: `taskkill /PID <PID> /F`
**Module not found**: `npm install` or remove import
**Database error**: Check .env DATABASE_URL
**Build fails**: `rm -rf node_modules && npm install`
**Everything broken**: `git reset --hard backup-before-cleanup-YYYYMMDD`

---

## SUCCESS CRITERIA

✅ Core service runs on 3000/3001
✅ No references to admin/marketing
✅ All tests pass
✅ Documentation updated
✅ Backup tagged and safe

---

**Next Steps After Cleanup**:
1. Monitor for 24 hours
2. Update CI/CD pipelines
3. Update deployment scripts
4. Notify team

**Full Details**: `docs/SAFE_CORE_CLEANUP_PLAN.md`
