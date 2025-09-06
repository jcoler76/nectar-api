# Credential Rotation Guide - Mirabel API

**Document Version:** 1.0  
**Created:** 2025-01-19  
**Last Updated:** 2025-01-19  
**Author:** Security Team

## 🎯 Overview

This guide provides step-by-step instructions for rotating all credentials in the Mirabel API application to maintain security and prevent unauthorized access.

## 🚨 Emergency Credential Rotation

If credentials have been exposed or compromised, follow these steps immediately:

### Step 1: Generate New Credentials

```bash
cd server
node scripts/generateSecureCredentials.js
```

This will output secure replacements for all credentials:
- JWT_SECRET
- ENCRYPTION_KEY
- SESSION_SECRET
- MCP_DEVELOPER_KEY
- MongoDB connection string template
- Email app passwords
- Redis passwords

### Step 2: Update Environment Files

#### Development Environment (`server/.env`)
```bash
# Replace these with values from generateSecureCredentials.js:
JWT_SECRET=YOUR_NEW_JWT_SECRET_HERE
ENCRYPTION_KEY=YOUR_NEW_ENCRYPTION_KEY_HERE
SESSION_SECRET=YOUR_NEW_SESSION_SECRET_HERE
MONGODB_URI="mongodb://NEW_USERNAME:NEW_SECURE_PASSWORD@your-mongo-host/mirabel-api"
OPENAI_API_KEY=YOUR_NEW_OPENAI_API_KEY_HERE
EMAIL_PASS=YOUR_NEW_EMAIL_APP_PASSWORD_HERE
```

#### Production Environment (`.env.production`)
```bash
MCP_DEVELOPER_KEY=YOUR_NEW_MCP_DEVELOPER_KEY_HERE
```

#### MCP Configuration (`server/mcp/env.mcp`)
```bash
MCP_DEVELOPER_KEY=YOUR_NEW_MCP_DEVELOPER_KEY_HERE
MCP_UNIVERSAL_KEY_1=YOUR_NEW_MCP_UNIVERSAL_KEY_1_HERE
MCP_UNIVERSAL_KEY_2=YOUR_NEW_MCP_UNIVERSAL_KEY_2_HERE
```

### Step 3: External Service Credentials

#### MongoDB Atlas
1. Create new database user with secure password
2. Delete old user after testing
3. Update connection string in environment files

#### OpenAI Platform
1. Visit https://platform.openai.com/api-keys
2. Create new API key
3. Delete old API key
4. Update `OPENAI_API_KEY` in environment files

#### Email Provider (Gmail/Outlook)
1. Generate new app-specific password
2. Delete old app password
3. Update `EMAIL_PASS` in environment files

#### Redis (if used)
1. Update Redis password in configuration
2. Update `REDIS_PASSWORD` in environment files

### Step 4: Verify New Credentials

```bash
# Scan for any remaining exposed credentials
cd server
node scripts/scanForExposedCredentials.js

# Test application with new credentials
npm run dev
```

### Step 5: Monitor for Unauthorized Access

- Check application logs for failed authentication attempts with old credentials
- Monitor external service usage for any suspicious activity
- Set up alerts for multiple failed login attempts

## 📅 Regular Credential Rotation Schedule

### Monthly (High Priority)
- [ ] API Keys (OpenAI, external services)
- [ ] MCP Developer Keys
- [ ] Email app passwords

### Quarterly (Medium Priority)
- [ ] JWT Secrets
- [ ] Encryption Keys
- [ ] Database passwords
- [ ] Redis passwords

### Annually (Standard)
- [ ] Session secrets
- [ ] Certificate renewals (if applicable)

## 🔐 Security Best Practices

### Credential Generation
- **Length**: Minimum 32 characters for secrets, 64+ for JWT secrets
- **Complexity**: Use cryptographically secure random generation
- **Uniqueness**: Never reuse credentials across environments
- **Rotation**: Establish regular rotation schedules

### Storage
- **Environment Variables**: Never hardcode credentials in source code
- **Access Control**: Limit who can access credential storage
- **Encryption**: Encrypt credentials at rest when possible
- **Backup**: Securely backup credential recovery methods

### Deployment
- **Zero-Downtime**: Plan rotations to avoid service interruption
- **Testing**: Always test new credentials in staging first
- **Rollback**: Have rollback plan if new credentials fail
- **Documentation**: Keep rotation history for audit purposes

## 🔍 Credential Audit Checklist

Run this checklist before and after credential rotation:

- [ ] No credentials in source code (use scanner script)
- [ ] No credentials in git history
- [ ] No credentials in log files
- [ ] Environment files excluded from git (`.gitignore`)
- [ ] Old credentials revoked in external services
- [ ] New credentials tested and working
- [ ] Access logs reviewed for suspicious activity
- [ ] Team notified of credential rotation completion

## 🚨 Incident Response

### If Credentials Are Exposed

1. **Immediate Action** (within 1 hour):
   - Run emergency rotation steps above
   - Revoke exposed credentials in external services
   - Change any related passwords or access keys

2. **Investigation** (within 24 hours):
   - Determine how credentials were exposed
   - Check logs for unauthorized access
   - Assess scope of potential compromise

3. **Communication** (within 48 hours):
   - Notify stakeholders of incident
   - Document lessons learned
   - Implement additional safeguards

### If Unauthorized Access Detected

1. **Immediate Response**:
   - Block suspicious IP addresses
   - Rotate all potentially compromised credentials
   - Review and secure any accessed data

2. **System Hardening**:
   - Implement additional access controls
   - Enhance monitoring and alerting
   - Review and update security policies

## 📊 Credential Inventory

### Application Secrets
| Credential Type | Location | Rotation Frequency | Last Rotated |
|----------------|----------|-------------------|--------------|
| JWT_SECRET | server/.env | Quarterly | 2025-01-19 |
| ENCRYPTION_KEY | server/.env | Quarterly | 2025-01-19 |
| SESSION_SECRET | server/.env | Quarterly | 2025-01-19 |

### External Service Keys
| Service | Key Type | Location | Rotation Frequency | Last Rotated |
|---------|----------|----------|-------------------|--------------|
| OpenAI | API Key | server/.env | Monthly | 2025-01-19 |
| MongoDB | Connection String | server/.env | Quarterly | 2025-01-19 |
| Email Provider | App Password | server/.env | Monthly | 2025-01-19 |

### MCP Keys
| Key Type | Location | Rotation Frequency | Last Rotated |
|----------|----------|-------------------|--------------|
| MCP_DEVELOPER_KEY | mcp/env.mcp | Monthly | 2025-01-19 |
| MCP_UNIVERSAL_KEY_1 | mcp/env.mcp | Monthly | 2025-01-19 |
| MCP_UNIVERSAL_KEY_2 | mcp/env.mcp | Monthly | 2025-01-19 |

## 🔧 Automation Scripts

The following scripts are available to help with credential management:

### `scripts/generateSecureCredentials.js`
Generates cryptographically secure credentials for all application secrets.

### `scripts/scanForExposedCredentials.js`
Scans the entire codebase for potentially exposed credentials.

### Future Enhancements
- Automated credential rotation with zero downtime
- Integration with secret management services (HashiCorp Vault, AWS Secrets Manager)
- Automated testing of new credentials before deployment

## 📞 Emergency Contacts

- **Security Team**: security@mirabeltechnologies.com
- **DevOps Team**: devops@mirabeltechnologies.com
- **On-Call Engineer**: +1-XXX-XXX-XXXX

## 📚 Additional Resources

- [OWASP Credential Management Guide](https://owasp.org/www-community/credentials)
- [NIST Special Publication 800-63B](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)

---

**Important**: This document contains sensitive security information. Access should be restricted to authorized personnel only.