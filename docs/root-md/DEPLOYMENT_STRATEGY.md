# Zero-Downtime Deployment Strategy

This document outlines the production-ready deployment strategy that eliminates the painful debugging sessions we experienced during staging setup.

## 🏗️ Architecture Overview

### Current Setup
- **Staging Server**: `18.216.237.63` (staging-api.magazinemanager.biz)
- **Production Server**: `44.247.138.4` (api.magazinemanager.biz)
- **Docker Registry**: GitHub Container Registry (ghcr.io)
- **CI/CD**: GitHub Actions with self-hosted runner

### Deployment Flow
```
Developer Push → GitHub Actions → Build Image → Self-Hosted Runner → Deploy
```

## 🔧 Setup Instructions

### 1. Set Up Self-Hosted GitHub Runner (Solves VPN Issue)

Run this on a machine inside your VPN that can access both servers:

```bash
# Make setup script executable
chmod +x scripts/setup-github-runner.sh

# Run the setup script
sudo ./scripts/setup-github-runner.sh
```

After running the script:
1. Go to GitHub Repository Settings → Actions → Runners
2. Click "New self-hosted runner"
3. Copy the registration token
4. Complete the runner registration:
   ```bash
   sudo -u github-runner /home/github-runner/actions-runner/config.sh \
     --url https://github.com/jcolermirabel/nectar-api \
     --token YOUR_TOKEN \
     --name vpn-runner-$(hostname) \
     --labels vpn,staging,production
   ```
5. Start the runner service:
   ```bash
   sudo systemctl enable github-runner
   sudo systemctl start github-runner
   ```

### 2. GitHub Secrets Setup

Add these secrets in GitHub repository settings:

```bash
# For self-hosted runner SSH access
STAGING_HOST=18.216.237.63
PRODUCTION_HOST=44.247.138.4

# SSH keys (private keys, not .ppk files)
STAGING_SSH_KEY=<private-key-content>
PRODUCTION_SSH_KEY=<private-key-content>

# SSH usernames
STAGING_SSH_USER=ubuntu
PRODUCTION_SSH_USER=ubuntu
```

### 3. Server Preparation

On both staging and production servers:

```bash
# Ensure deployment script is executable
chmod +x scripts/deploy-production.sh

# Ensure environment file exists
ls -la server/.env.production

# Ensure Docker is running
docker ps

# Test current container
curl http://localhost:3001/health
```

## 🚀 Deployment Process

### Automatic Deployments

1. **Staging**: Push to `staging` branch
   ```bash
   git checkout staging
   git push origin staging
   ```

2. **Production**: Push to `main` branch (after staging success)
   ```bash
   git checkout main
   git merge staging
   git push origin main
   ```

### Manual Deployments

Use GitHub Actions workflow dispatch:
1. Go to Actions tab in GitHub
2. Select "Deploy with VPN Access"
3. Click "Run workflow"
4. Choose environment (staging/production)

### Local Emergency Deployment

If GitHub Actions is down, use the production script directly:

```bash
# On the target server
./scripts/deploy-production.sh staging-abc123f
```

## 🔍 Deployment Script Features

The `deploy-production.sh` script provides:

### ✅ Zero-Downtime Deployment
- Runs new container on alternate port first
- Health checks before switching
- Automatic rollback on failure

### ✅ Comprehensive Testing
- Health endpoint verification
- Critical path testing (frontend, API, static assets)
- Domain access verification

### ✅ Safety Features
- Backup creation before deployment
- Automatic rollback on failure
- Container cleanup
- Nginx configuration reload

### ✅ Monitoring
- Detailed logging of each step
- Health check progress indicators
- Error reporting with context

## 🛠️ Troubleshooting

### Common Issues

#### 1. Image Pull Failures
```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u username --password-stdin

# Check image availability
docker pull ghcr.io/jcolermirabel/nectar-api:staging-abc123f
```

#### 2. Health Check Failures
```bash
# Check container logs
docker logs nectar-api

# Check specific endpoints
curl http://localhost:3001/health
curl http://localhost:3001/api/health
```

#### 3. Nginx Issues
```bash
# Test configuration
sudo nginx -t

# Check nginx status
sudo systemctl status nginx

# Reload configuration
sudo systemctl reload nginx
```

#### 4. Self-Hosted Runner Issues
```bash
# Check runner status
sudo systemctl status github-runner

# View runner logs
sudo journalctl -u github-runner -f

# Restart runner
sudo systemctl restart github-runner
```

### Recovery Procedures

#### Quick Rollback
```bash
# Use the backup container
docker rename nectar-api nectar-api-failed
docker rename nectar-api-backup nectar-api
docker start nectar-api
```

#### Database Issues
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check database connectivity
docker exec -it nectar-api mongosh --eval "db.adminCommand('ping')"
```

## 📊 Monitoring & Alerts

### Health Endpoints
- **Application**: `http://localhost:3001/health`
- **API**: `http://localhost:3001/api/health`
- **Database**: Check logs for MongoDB connectivity

### Key Metrics
- Container uptime: `docker ps --format "table {{.Names}}\t{{.Status}}"`
- Memory usage: `docker stats --no-stream`
- Disk space: `df -h`

## 🔒 Security Considerations

### Environment Variables
- Never commit `.env.production` files
- Use GitHub Secrets for sensitive data
- Rotate SSH keys regularly

### Container Security
- Images are scanned during build
- Non-root user in containers
- Security headers in Nginx

### Network Security
- VPN-protected servers
- SSH key-based authentication
- HTTPS with Let's Encrypt certificates

## 📈 Performance Optimization

### Build Optimization
- Multi-stage Docker builds
- Layer caching in GitHub Actions
- Optimized package installation

### Runtime Optimization
- Production environment variables
- Proper caching headers
- Nginx reverse proxy

### Resource Management
- Container memory limits
- Automatic cleanup of old images
- Disk space monitoring

## 🎯 Success Metrics

### Deployment Time
- **Target**: 2-3 minutes end-to-end
- **Previous**: 2-3 hours with debugging

### Downtime
- **Target**: Zero downtime
- **Previous**: Minutes to hours

### Reliability
- **Target**: 99%+ successful deployments
- **Previous**: High failure rate due to manual process

---

## 🚨 Emergency Contacts

- **DevOps**: [Your contact information]
- **System Admin**: [Server administrator contact]
- **On-call**: [Emergency contact for production issues]

This strategy ensures that production deployments are fast, reliable, and recoverable, eliminating the painful debugging sessions experienced during the initial staging setup.
