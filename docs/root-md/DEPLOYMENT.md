# Mirabel API Deployment Guide

## 🚀 Overview

This guide explains the automated deployment process for Mirabel API, replacing manual PuTTY deployments with GitHub Actions CI/CD pipeline.

## 📋 Deployment Architecture

```
Windows Dev → GitHub → GitHub Actions → Docker Image → Linux Servers (Staging/Production)
```

### Key Benefits
- **One-click deployments** via GitHub push
- **Consistent builds** - "build once, deploy anywhere"
- **Zero-downtime deployments** with health checks
- **Automatic rollback** capability
- **No more manual SSH/PuTTY sessions**

## 🔧 Initial Setup (One-time per server)

### 1. Server Preparation

SSH into each Linux server and run:

```bash
# Download and run setup script
curl -o setup-deployment.sh https://raw.githubusercontent.com/yourusername/mirabel-api/main/scripts/setup-deployment.sh
chmod +x setup-deployment.sh
./setup-deployment.sh
```

This script will:
- Install Docker and Docker Compose
- Setup MongoDB tools for backups
- Create necessary directories
- Generate sample configuration files

### 2. GitHub Repository Setup

#### Create GitHub Secrets

Go to your repository Settings → Secrets and variables → Actions, and add:

| Secret Name | Description | Example |
|------------|-------------|---------|
| `STAGING_HOST` | Staging server IP | `192.168.1.100` |
| `PRODUCTION_HOST` | Production server IP | `192.168.1.101` |
| `SSH_USER` | SSH username | `ubuntu` |
| `SSH_KEY` | Private SSH key content | Copy entire private key |
| `GITHUB_TOKEN` | Auto-generated (already exists) | - |

#### Enable GitHub Packages

1. Go to Settings → Packages
2. Enable "Improved container support"
3. Set package visibility to "Private" (or as needed)

### 3. Environment Configuration

On each server, edit `/home/ubuntu/mirabel-api/.env.production`:

```bash
# Critical settings to update:
JWT_SECRET=<generate-random-32-char-string>
ENCRYPTION_KEY=<generate-random-string>
MONGO_ROOT_PASSWORD=<strong-password>
MONGODB_URI=mongodb://mongodb:27017/mirabel

# SQL Server (if using)
SQL_SERVER_HOST=your-sql-server
SQL_SERVER_USER=your-username
SQL_SERVER_PASSWORD=your-password
```

## 📦 Deployment Process

### Automatic Deployment

Simply push to the appropriate branch:

```bash
# Deploy to staging
git push origin staging

# Deploy to production
git push origin main
```

The GitHub Actions workflow will:
1. Run quality checks (linting, tests, security)
2. Build Docker image
3. Push to GitHub Container Registry
4. Deploy to appropriate server
5. Run health checks
6. Reload nginx

### Manual Deployment

For manual deployments or hotfixes:

```bash
# From GitHub Actions page
# Go to Actions → Build & Deploy → Run workflow
# Select environment (staging/production)
```

### Local to Server Deployment (Emergency)

If GitHub Actions is unavailable:

```bash
# On your Windows machine
docker build -t mirabel-api:latest .
docker save mirabel-api:latest | gzip > mirabel-api.tar.gz

# Transfer to server
scp mirabel-api.tar.gz ubuntu@server:/home/ubuntu/

# On server
docker load < mirabel-api.tar.gz
docker compose up -d mirabel-api
```

## 🔄 Deployment Workflow

### Branch Strategy

```
main         → Production deployment
staging      → Staging deployment
feature/*    → No automatic deployment
```

### Deployment Flow

```mermaid
graph LR
    A[Git Push] --> B[GitHub Actions]
    B --> C[Quality Gates]
    C --> D[Build Docker Image]
    D --> E[Push to Registry]
    E --> F[Deploy to Server]
    F --> G[Health Check]
    G --> H[Nginx Reload]
```

### Zero-Downtime Deployment

The deployment uses blue-green strategy:
1. New container starts alongside old one
2. Health checks verify new container
3. Traffic switches to new container
4. Old container is removed

## 🔍 Monitoring & Troubleshooting

### View Deployment Status

```bash
# Check GitHub Actions
# https://github.com/yourusername/mirabel-api/actions

# On server
docker compose ps
docker compose logs -f mirabel-api
```

### Health Checks

```bash
# Check application health
curl http://localhost:3001/health

# Check container health
docker inspect mirabel-api | grep -A 5 Health
```

### Common Issues & Solutions

#### Issue: Deployment fails at "Pull Image"
**Solution**: Check GitHub token permissions
```bash
# Re-login to registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

#### Issue: Health check fails after deployment
**Solution**: Check logs and environment variables
```bash
docker compose logs --tail=100 mirabel-api
docker compose exec mirabel-api env | grep -E "(NODE_ENV|PORT|MONGODB)"
```

#### Issue: "Permission denied" errors
**Solution**: Fix volume permissions
```bash
sudo chown -R 1001:1001 server/logs server/backups server/uploads
```

## 🔐 Security Best Practices

1. **Never commit secrets** - Use environment variables
2. **Rotate credentials regularly** - Update JWT_SECRET quarterly
3. **Use SSH keys** - Never passwords for server access
4. **Limit GitHub token scope** - Only `write:packages` permission
5. **Backup before deployment** - Automatic in workflow

## 📊 Rollback Procedure

### Automatic Rollback

If deployment fails, the system automatically maintains the previous version.

### Manual Rollback

```bash
# On server
cd /home/ubuntu/mirabel-api

# View available images
docker images | grep mirabel-api

# Rollback to specific version
docker compose down
sed -i 's|image: .*|image: ghcr.io/username/mirabel-api:previous-tag|g' docker-compose.yml
docker compose up -d

# Or restore from backup
cd /home/ubuntu/deployment-backups/
ls -la  # Find appropriate backup
cp YYYYMMDD_HHMMSS/.env* /home/ubuntu/mirabel-api/
```

## 📈 Performance Optimization

### Docker Image Optimization
- Multi-stage builds reduce image size by ~60%
- Layer caching speeds up builds
- Production dependencies only in final image

### Resource Limits
```yaml
# docker-compose.yml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
```

### Monitoring Commands
```bash
# Check resource usage
docker stats mirabel-api

# Check disk usage
docker system df

# Clean up unused resources
docker system prune -af
```

## 🎯 Migration from Current Setup

### Phase 1: Test in Staging (Week 1)
1. Set up staging server with Docker
2. Configure GitHub Secrets
3. Test automated deployments
4. Verify all features work

### Phase 2: Production Preparation (Week 2)
1. Schedule maintenance window
2. Backup production database
3. Install Docker on production
4. Test rollback procedures

### Phase 3: Go Live (Week 3)
1. Deploy during low-traffic period
2. Monitor closely for 24 hours
3. Document any issues
4. Train team on new process

## 📝 Deployment Checklist

Before each deployment:

- [ ] All tests passing locally
- [ ] Environment variables updated (if needed)
- [ ] Database migrations prepared
- [ ] Backup verified
- [ ] Team notified of deployment window
- [ ] Monitoring dashboard open

After deployment:

- [ ] Health checks passing
- [ ] Logs checked for errors
- [ ] Key features smoke tested
- [ ] Performance metrics normal
- [ ] Team notified of completion

## 🆘 Emergency Contacts

- **DevOps Issues**: Create GitHub issue with `deployment` label
- **Critical Failures**: Use rollback procedure immediately
- **GitHub Actions Support**: https://github.com/support

---

## Quick Reference

```bash
# Deploy to staging
git push origin staging

# Deploy to production  
git push origin main

# Check deployment status
docker compose ps

# View logs
docker compose logs -f mirabel-api

# Rollback
./deploy.sh previous-version

# Health check
curl http://localhost:3001/health
```