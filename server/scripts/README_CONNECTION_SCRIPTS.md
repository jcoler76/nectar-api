# Connection Decryption Management Scripts

This directory contains scripts to help diagnose and fix database connection decryption issues in the Mirabel API.

## Scripts Overview

### 1. `connectionHealthCheck.js` - Quick Health Check
**Purpose**: Provides a quick overview of all connection records and their decryption status.

**Usage**:
```bash
cd server
node scripts/connectionHealthCheck.js
```

**Output**: Shows a summary report of healthy vs unhealthy connections with recommendations.

### 2. `checkConnectionDecryption.js` - Detailed Analysis
**Purpose**: Performs detailed analysis of each connection record, including diagnostic information.

**Usage**:
```bash
cd server
node scripts/checkConnectionDecryption.js

# With connection testing (attempts to connect to each database)
node scripts/checkConnectionDecryption.js --test-connection
```

**Features**:
- Shows detailed information about each connection
- Tests password decryption for each record
- Provides diagnostic details for failed decryptions
- Optionally tests actual database connectivity
- Generates comprehensive report with recommendations

### 3. `fixConnectionDecryption.js` - Interactive Repair Tool
**Purpose**: Interactive script to fix connections that cannot be decrypted.

**Usage**:
```bash
cd server
node scripts/fixConnectionDecryption.js
```

**Features**:
- Identifies connections with decryption issues
- Provides interactive options to:
  - Enter new passwords
  - Skip problematic connections
  - Delete unused connections
- Tests connections after fixing
- Safe operation with user confirmation

## Common Issues and Solutions

### Issue: "Cannot decrypt password (wrong encryption key?)"
**Cause**: The connection was encrypted with a different `ENCRYPTION_KEY` than what's currently set.

**Solutions**:
1. Check if the `ENCRYPTION_KEY` environment variable is correct
2. If the key has changed, use `fixConnectionDecryption.js` to set new passwords
3. If you have the old key, temporarily set it to decrypt, then re-encrypt with the new key

### Issue: "Password stored in plaintext"
**Cause**: The connection password was never encrypted (legacy data).

**Solutions**:
1. Run the existing `reEncryptPasswords.js` script to encrypt all plaintext passwords
2. Or use `fixConnectionDecryption.js` to handle specific connections

### Issue: Database connection test failures
**Cause**: Network connectivity, wrong credentials, or server issues.

**Solutions**:
1. Verify the database server is running and accessible
2. Check firewall settings and network connectivity
3. Verify username and password are correct
4. Check if the database server accepts connections from your IP

## Security Notes

- Always ensure `ENCRYPTION_KEY` is set in your environment variables
- Never store passwords in plaintext
- Use the connection test feature sparingly to avoid account lockouts
- Consider rotating encryption keys periodically (requires re-encryption of all passwords)

## Environment Requirements

These scripts require:
- Node.js environment with access to the server directory
- `MONGODB_URI` environment variable set
- `ENCRYPTION_KEY` environment variable set
- Network access to MongoDB (for the scripts to run)
- Network access to SQL Server instances (for connection testing)

## Existing Related Scripts

- `reEncryptPasswords.js` - Re-encrypts all Connection and Service passwords
- `generateSecureCredentials.js` - Generates new encryption keys
- `rotateEncryptionKey.js` - Helps rotate encryption keys safely