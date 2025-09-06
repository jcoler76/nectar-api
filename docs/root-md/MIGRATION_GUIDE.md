# Migration Guide: From Manual Deployment to GitHub Actions CI/CD

## Current Setup vs New Setup

### Current (Manual via PuTTY)
```bash
# You currently:
1. SSH into server via PuTTY
2. Run: chmod +x ~/mirabel-api/deploy-gentle.sh
3. Run: cd ~/mirabel-api && ./deploy-gentle.sh main
4. Run: sudo nginx -t && sudo systemctl reload nginx
5. Hope nothing breaks 🤞
```

### New (Automated via GitHub)
```bash
# You will:
1. git push origin main
2. GitHub Actions handles everything automatically ✨
```

## Step-by-Step Migration Plan

### Phase 1: Preparation (Do this now on Windows)

1. **Commit new deployment files:**
```bash
git add Dockerfile .dockerignore docker-compose.yml
git add .github/workflows/deploy.yml
git add scripts/setup-deployment.sh
git add DEPLOYMENT.md MIGRATION_GUIDE.md
git add server/routes/index.js  # Health check endpoint
git commit -m "feat: add Docker-based CI/CD deployment configuration"
git push origin main
```

2. **Set up GitHub Secrets:**
   - Go to: https://github.com/jcolermirabel/mirabel-api/settings/secrets/actions
   - Add these secrets:
     - `STAGING_HOST`: Your staging server IP
     - `PRODUCTION_HOST`: Your production server IP  
     - `SSH_USER`: ubuntu (or your SSH username)
     - `SSH_KEY`: Your private SSH key (the one you use with PuTTY)

### Phase 2: Server Setup (One-time on each Linux server)

1. **SSH into your staging server first** (via PuTTY as usual)

2. **Run the setup script:**
```bash
# Download setup script
curl -o setup-deployment.sh https://raw.githubusercontent.com/jcolermirabel/mirabel-api/main/scripts/setup-deployment.sh
chmod +x setup-deployment.sh
./setup-deployment.sh
```

3. **Configure environment:**
```bash
# Edit the production environment file
nano ~/mirabel-api/.env.production

# Copy your existing environment variables from your current setup
# Make sure to include all your database connections, JWT secrets, etc.
```

4. **Initial Docker setup:**
```bash
# Log out and back in for Docker group membership
exit
# SSH back in

# Test Docker installation
docker --version
docker compose version
```

### Phase 3: Test Deployment (Staging First!)

1. **Create staging branch:**
```bash
# On your Windows machine
git checkout -b staging
git push origin staging
```

2. **Monitor deployment:**
   - Go to: https://github.com/jcolermirabel/mirabel-api/actions
   - Watch the "Build & Deploy" workflow
   - It should deploy to your staging server automatically

3. **Verify deployment on server:**
```bash
# SSH into staging server
docker compose ps
docker compose logs -f mirabel-api
curl http://localhost:3001/health
```

### Phase 4: Production Deployment

Once staging works perfectly:

1. **Deploy to production:**
```bash
# On Windows
git checkout main
git merge staging
git push origin main
```

2. **Monitor production deployment:**
   - Watch GitHub Actions
   - Check production server health

### Phase 5: Cleanup Old Setup

After successful deployments:

1. **Archive old deployment script:**
```bash
# On server
mv ~/mirabel-api/deploy-gentle.sh ~/mirabel-api/deploy-gentle.sh.backup
```

2. **Remove old PM2 processes (if not using Docker):**
```bash
pm2 stop all
pm2 delete all
pm2 save
```

## Troubleshooting Common Issues

### Issue: "Permission denied (publickey)"
**Solution:** Your SSH key in GitHub Secrets might be incorrect
```bash
# Get your private key content (on Windows)
type C:\Users\JColer\.ssh\id_rsa
# Copy entire content including BEGIN and END lines
# Paste into GitHub Secret SSH_KEY
```

### Issue: "docker: command not found"
**Solution:** Docker not installed properly
```bash
# Re-run setup script
./setup-deployment.sh
# Or manually install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in
```

### Issue: Build fails with "npm ERR! Legacy peer deps"
**Solution:** Already handled in Dockerfile with `--legacy-peer-deps` flag

### Issue: "Health check failed"
**Solution:** Check application logs
```bash
docker compose logs --tail=100 mirabel-api
# Check environment variables
docker compose exec mirabel-api env | grep NODE_ENV
```

## Rollback Procedure

If something goes wrong:

### Quick Rollback (Use old method temporarily)
```bash
# SSH into server
cd ~/mirabel-api
./deploy-gentle.sh.backup main  # Use your old script
```

### Docker Rollback
```bash
# List available images
docker images | grep mirabel

# Rollback to previous version
docker compose down
docker run -d --name mirabel-api-temp \
  -p 3001:3001 \
  --env-file .env.production \
  ghcr.io/jcolermirabel/mirabel-api:previous-tag
```

## Benefits You'll Experience

1. **No more manual deployments** - Just push code
2. **Consistent deployments** - Same process every time
3. **Automatic rollbacks** - If health checks fail
4. **Zero downtime** - Blue-green deployment strategy
5. **Better monitoring** - GitHub Actions shows all logs
6. **Version history** - Every deployment is tagged
7. **Parallel deployments** - Can deploy to multiple servers

## Timeline Recommendation

- **Week 1**: Set up staging server, test deployments
- **Week 2**: Run parallel (use both old and new methods)
- **Week 3**: Switch production to new method
- **Week 4**: Decommission old deployment scripts

## Support Resources

- GitHub Actions logs: https://github.com/jcolermirabel/mirabel-api/actions
- Docker documentation: https://docs.docker.com
- GitHub Container Registry: https://docs.github.com/en/packages

## Quick Commands Reference

```bash
# Deploy to staging
git push origin staging

# Deploy to production
git push origin main

# Check deployment status (on server)
docker compose ps
docker compose logs -f mirabel-api

# Restart service (on server)
docker compose restart mirabel-api

# Emergency stop (on server)
docker compose down

# View resource usage (on server)
docker stats
```

## Final Checklist Before Going Live

- [ ] GitHub Secrets configured
- [ ] Docker installed on both servers
- [ ] Environment files configured on servers
- [ ] Health check endpoint working (`/health`)
- [ ] Staging deployment successful
- [ ] Backup of old deployment scripts
- [ ] Team notified of new process
- [ ] Documentation bookmarked

---

**Remember:** Start with staging, gain confidence, then move to production. Your old deployment method remains available as a fallback during the transition period.