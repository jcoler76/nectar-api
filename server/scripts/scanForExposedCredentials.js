#!/usr/bin/env node

/**
 * Credential Exposure Scanner
 * Scans the codebase for potentially exposed credentials
 *
 * Usage: node scripts/scanForExposedCredentials.js
 */

const fs = require('fs');
const path = require('path');

// Known exposed credentials to search for - replace with actual values in production
const EXPOSED_CREDENTIALS = [
  // Add specific credentials to search for here
  // Example format: 'credential_to_find'
];

// Patterns to detect potential credentials
const CREDENTIAL_PATTERNS = [
  /mongodb:\/\/[^:]+:[^@]+@/, // MongoDB connection strings
  /sk-[a-zA-Z0-9]{48,}/, // OpenAI API keys
  /JWT_SECRET\s*=\s*[^YOUR][^\s]+/, // JWT secrets (not placeholder)
  /ENCRYPTION_KEY\s*=\s*[^YOUR][^\s]+/, // Encryption keys (not placeholder)
  /EMAIL_PASS\s*=\s*[^YOUR][^\s]+/, // Email passwords (not placeholder)
  /MCP_[A-Z_]*KEY\s*=\s*[^YOUR][^\s]+/, // MCP keys (not placeholder)
  /password\s*[:=]\s*['"][^'"\s]{8,}['"]/, // Password assignments
  /secret\s*[:=]\s*['"][^'"\s]{16,}['"]/, // Secret assignments
  /token\s*[:=]\s*['"][^'"\s]{20,}['"]/, // Token assignments
];

// Files and directories to exclude from scanning
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /build/,
  /dist/,
  /logs/,
  /\.log$/,
  /\.lock$/,
  /package-lock\.json$/,
  /\.env\.example$/,
  /generateSecureCredentials\.js$/, // This file contains example credentials
  /scanForExposedCredentials\.js$/, // This file contains search patterns
];

function shouldExcludeFile(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
}

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const findings = [];

    // Check for exact credential matches
    EXPOSED_CREDENTIALS.forEach(credential => {
      if (content.includes(credential)) {
        findings.push({
          type: 'EXACT_MATCH',
          credential: credential.substring(0, 20) + '...',
          file: filePath,
          severity: 'CRITICAL',
        });
      }
    });

    // Check for credential patterns
    CREDENTIAL_PATTERNS.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          findings.push({
            type: 'PATTERN_MATCH',
            credential: match.substring(0, 50) + '...',
            file: filePath,
            severity: 'HIGH',
          });
        });
      }
    });

    return findings;
  } catch (error) {
    // Skip files that can't be read
    return [];
  }
}

function scanDirectory(dirPath) {
  const findings = [];

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (shouldExcludeFile(fullPath)) {
        continue;
      }

      if (entry.isDirectory()) {
        findings.push(...scanDirectory(fullPath));
      } else if (entry.isFile()) {
        findings.push(...scanFile(fullPath));
      }
    }
  } catch (error) {
    // Skip directories that can't be read
  }

  return findings;
}

function main() {
  console.log('🔍 Scanning for Exposed Credentials in Nectar Studio');
  console.log('='.repeat(60));

  const rootDir = path.resolve(__dirname, '../..');
  console.log(`📁 Scanning directory: ${rootDir}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}\n`);

  const findings = scanDirectory(rootDir);

  if (findings.length === 0) {
    console.log('✅ No exposed credentials detected!');
    console.log('\n🛡️  Security Status: GOOD');
    console.log('All credentials appear to be properly secured.');
  } else {
    console.log(`🚨 Found ${findings.length} potential credential exposures:\n`);

    // Group findings by severity
    const critical = findings.filter(f => f.severity === 'CRITICAL');
    const high = findings.filter(f => f.severity === 'HIGH');

    if (critical.length > 0) {
      console.log('🔴 CRITICAL EXPOSURES (Exact credential matches):');
      console.log('-'.repeat(50));
      critical.forEach((finding, index) => {
        console.log(`${index + 1}. File: ${finding.file}`);
        console.log(`   Credential: ${finding.credential}`);
        console.log(`   Action: IMMEDIATE ROTATION REQUIRED\n`);
      });
    }

    if (high.length > 0) {
      console.log('🟡 HIGH RISK PATTERNS (Potential credentials):');
      console.log('-'.repeat(50));
      high.forEach((finding, index) => {
        console.log(`${index + 1}. File: ${finding.file}`);
        console.log(`   Pattern: ${finding.credential}`);
        console.log(`   Action: Review and secure if needed\n`);
      });
    }

    console.log('🔧 REMEDIATION STEPS:');
    console.log('-'.repeat(30));
    console.log('1. Run: node scripts/generateSecureCredentials.js');
    console.log('2. Replace all found credentials with new secure ones');
    console.log('3. Update environment variables');
    console.log('4. Rotate credentials in external services');
    console.log('5. Monitor for unauthorized access');
    console.log('6. Re-run this scan to verify fixes');
  }

  console.log(`\n⏰ Completed at: ${new Date().toISOString()}`);
  console.log('🔒 Remember: Credential security is an ongoing process!');
}

main();
