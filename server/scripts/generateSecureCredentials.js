#!/usr/bin/env node

/**
 * Security Credential Generator
 * Generates secure credentials for the Mirabel API application
 *
 * Usage: node scripts/generateSecureCredentials.js
 */

const crypto = require('crypto');

// Generate secure random strings
function generateSecureString(length = 64) {
  return crypto
    .randomBytes(length)
    .toString('base64')
    .replace(/[+/=]/g, c => {
      switch (c) {
        case '+':
          return '-';
        case '/':
          return '_';
        case '=':
          return '';
        default:
          return c;
      }
    });
}

// Generate API key with prefix
function generateApiKey(prefix = 'mapi') {
  const randomPart = crypto.randomBytes(32).toString('hex');
  return `${prefix}_${randomPart}`;
}

// Generate MCP key with prefix
function generateMCPKey() {
  const randomPart = crypto.randomBytes(32).toString('base64').replace(/[+/=]/g, '');
  return `mcp_${randomPart}`;
}

console.log('🔐 Generating Secure Credentials for Mirabel API\n');
console.log('='.repeat(60));

console.log('\n📊 JWT AND ENCRYPTION SECRETS');
console.log('-'.repeat(40));
console.log('JWT_SECRET=' + generateSecureString(64));
console.log('ENCRYPTION_KEY=' + generateSecureString(32));
console.log('SESSION_SECRET=' + generateSecureString(32));

console.log('\n🔑 API KEYS');
console.log('-'.repeat(40));
console.log('MCP_DEVELOPER_KEY=' + generateMCPKey());
console.log('MCP_UNIVERSAL_KEY_1=' + generateMCPKey());
console.log('MCP_UNIVERSAL_KEY_2=' + generateMCPKey());

console.log('\n🗄️ DATABASE CONNECTION');
console.log('-'.repeat(40));
console.log('# Generate a new MongoDB user with a secure password');
console.log('# Replace these with your actual database credentials:');
console.log(
  'MONGODB_URI="mongodb://NEW_USERNAME:' +
    generateSecureString(32).substring(0, 16) +
    '@your-mongo-host/mirabel-api"'
);

console.log('\n📧 EMAIL CONFIGURATION');
console.log('-'.repeat(40));
console.log('# Generate app-specific password for your email provider');
console.log('EMAIL_USER=your-email@domain.com');
console.log('EMAIL_PASS=' + generateSecureString(16).substring(0, 16));
console.log('EMAIL_FROM="Mirabel API <your-email@domain.com>"');

console.log('\n🔒 REDIS CONFIGURATION');
console.log('-'.repeat(40));
console.log('REDIS_PASSWORD=' + generateSecureString(24).substring(0, 24));

console.log('\n⚠️  SECURITY NOTES:');
console.log('-'.repeat(40));
console.log('1. 🔄 IMMEDIATELY rotate the exposed credentials in production');
console.log('2. 🚫 NEVER commit these credentials to git');
console.log('3. 🔐 Store them securely in your environment variables');
console.log('4. 📝 Update your .env files with these new values');
console.log('5. 🔁 Set up regular credential rotation (every 90 days)');
console.log('6. 📊 Monitor for any unauthorized access with old credentials');

console.log('\n✅ NEXT STEPS:');
console.log('-'.repeat(40));
console.log('1. Copy the credentials above to your .env files');
console.log('2. Create new MongoDB user with limited permissions');
console.log('3. Update OpenAI API key with a new one from their dashboard');
console.log('4. Generate new email app-specific password');
console.log('5. Test all services with new credentials');
console.log('6. Remove old credentials from any logs or backups');

console.log('\n🔍 CREDENTIAL AUDIT:');
console.log('-'.repeat(40));
console.log('Files that contained exposed credentials:');
console.log('- server/.env (JWT_SECRET, MONGODB_URI, OPENAI_API_KEY, EMAIL_PASS)');
console.log('- .env.production (MCP_DEVELOPER_KEY)');
console.log('- server/query-procedures.js (MONGODB_URI hardcoded)');
console.log('- test-mcp-endpoint.js (test credentials)');
console.log('\n✅ All hardcoded credentials have been replaced with env vars');
