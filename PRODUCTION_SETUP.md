# Production Setup Guide for nectarstudio.ai

This guide covers setting up your production environment with the domain structure:
- **nectarstudio.ai** - Marketing site (port 5000)
- **app.nectarstudio.ai** - Customer application (port 3000)
- **admin.nectarstudio.ai** - Admin portal (port 4000)

## 1. DNS Configuration

Set up these DNS records with your domain registrar:

```
Type    Name                    Value
A       nectarstudio.ai         YOUR_SERVER_IP
CNAME   app.nectarstudio.ai     nectarstudio.ai
CNAME   admin.nectarstudio.ai   nectarstudio.ai
CNAME   www.nectarstudio.ai     nectarstudio.ai
```

## 2. SSL Certificates

### Using Let's Encrypt (Recommended)
```bash
# Install certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Get certificates for all domains
sudo certbot --nginx -d nectarstudio.ai -d www.nectarstudio.ai
sudo certbot --nginx -d app.nectarstudio.ai
sudo certbot --nginx -d admin.nectarstudio.ai

# Auto-renewal (already configured by certbot)
sudo systemctl enable certbot.timer
```

## 3. Nginx Configuration

Copy the production Nginx configuration:

```bash
# Install nginx if not already installed
sudo apt install nginx

# Copy the production config
sudo cp nginx-production.conf /etc/nginx/sites-available/nectarstudio
sudo ln -s /etc/nginx/sites-available/nectarstudio /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 4. Environment Configuration

### Main Application (.env.production)
```bash
# Copy the production environment file
cp .env.production .env

# Edit with your actual production values:
nano .env
```

Required values to update:
- Database URLs
- JWT secrets
- SMTP settings
- Stripe keys (if using)
- Any other service API keys

### Admin Backend
Update `admin-backend/.env`:
```bash
NODE_ENV=production
ALLOWED_ORIGINS=https://admin.nectarstudio.ai,https://nectarstudio.ai
PORT=4001
```

## 5. Application Startup

### Using PM2 (Recommended)
```bash
# Install PM2 globally
npm install -g pm2

# Start all services
npm run pm2:start

# Save PM2 process list
pm2 save

# Setup auto-startup
pm2 startup
```

### Manual startup order:
```bash
# 1. Start main backend (port 3001)
cd server && npm start &

# 2. Start customer app (port 3000)
npm start &

# 3. Start admin backend (port 4001)
cd admin-backend && npm start &

# 4. Start admin frontend (port 4000)
cd admin-frontend && npm start &

# 5. Start marketing backend (port 5001)
cd marketing-site/backend && npm start &

# 6. Start marketing frontend (port 5000)
cd marketing-site/frontend && npm start &
```

## 6. Firewall Configuration

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Allow SSH (if needed)
sudo ufw allow 22

# Enable firewall
sudo ufw enable
```

## 7. Verification Steps

1. **DNS Resolution**: Test that domains resolve to your server
   ```bash
   nslookup nectarstudio.ai
   nslookup app.nectarstudio.ai
   nslookup admin.nectarstudio.ai
   ```

2. **SSL Certificates**: Verify certificates are working
   ```bash
   curl -I https://nectarstudio.ai
   curl -I https://app.nectarstudio.ai
   curl -I https://admin.nectarstudio.ai
   ```

3. **Application Health**: Check each service
   - https://nectarstudio.ai (Marketing site)
   - https://app.nectarstudio.ai (Customer app)
   - https://admin.nectarstudio.ai (Admin portal)

## 8. Monitoring and Maintenance

### Log Management
```bash
# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# PM2 logs
pm2 logs

# Application logs
tail -f server/logs/app.log
```

### Regular Maintenance
- SSL certificate renewal (automatic with Let's Encrypt)
- Application updates via your deployment pipeline
- Database backups
- Security updates for the server

## 9. Troubleshooting

### Common Issues:

1. **502 Bad Gateway**: Application not running on expected port
   ```bash
   pm2 status
   netstat -tlnp | grep :3000
   ```

2. **SSL Certificate Issues**:
   ```bash
   sudo certbot certificates
   sudo nginx -t
   ```

3. **CORS Errors**: Check environment variables match domain names
   ```bash
   grep -r "CORS_ORIGIN\|ALLOWED_ORIGINS" .env*
   ```

4. **Port Conflicts**: Ensure no other services using required ports
   ```bash
   sudo lsof -i :3000
   sudo lsof -i :4000
   sudo lsof -i :5000
   ```

## 10. Security Considerations

- Keep all dependencies updated
- Use strong passwords for database access
- Implement proper backup strategies
- Monitor application logs for suspicious activity
- Regular security audits using `npm audit`
- Consider using a Web Application Firewall (WAF)

## Files Created

- `nginx-production.conf` - Nginx configuration for all domains
- `.env.production` - Production environment variables template
- This guide for reference

## Next Steps

1. Update DNS records
2. Install SSL certificates
3. Configure Nginx
4. Update environment variables with real production values
5. Deploy and test each service
6. Set up monitoring and backups