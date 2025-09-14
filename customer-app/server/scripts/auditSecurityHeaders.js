#!/usr/bin/env node

/**
 * Security Headers Audit Script
 * Verifies that all required security headers are properly configured
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// Required security headers and their expected values/patterns
const REQUIRED_HEADERS = {
  'x-frame-options': {
    description: 'Prevents clickjacking attacks',
    expectedValues: ['DENY', 'SAMEORIGIN'],
    severity: 'HIGH',
  },
  'x-content-type-options': {
    description: 'Prevents MIME type sniffing',
    expectedValues: ['nosniff'],
    severity: 'HIGH',
  },
  'x-xss-protection': {
    description: 'Enables XSS filtering',
    expectedValues: ['1; mode=block', '0'],
    severity: 'MEDIUM',
  },
  'strict-transport-security': {
    description: 'Enforces HTTPS connections',
    expectedPattern: /max-age=\d+/,
    severity: 'HIGH',
    httpsOnly: true,
  },
  'content-security-policy': {
    description: 'Prevents XSS and data injection attacks',
    expectedPattern: /.+/,
    severity: 'HIGH',
  },
  'referrer-policy': {
    description: 'Controls referrer information',
    expectedValues: ['strict-origin-when-cross-origin', 'strict-origin', 'no-referrer'],
    severity: 'MEDIUM',
  },
  'permissions-policy': {
    description: 'Controls browser features and APIs',
    expectedPattern: /.+/,
    severity: 'MEDIUM',
  },
};

class SecurityHeadersAuditor {
  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.results = {
      passed: [],
      failed: [],
      warnings: [],
      summary: {},
    };
  }

  async auditHeaders(endpoint = '/') {
    console.log(`🔍 Auditing security headers for: ${this.baseUrl}${endpoint}`);
    console.log('='.repeat(60));

    try {
      const headers = await this.fetchHeaders(endpoint);
      this.analyzeHeaders(headers);
      this.generateReport();
    } catch (error) {
      console.error('❌ Failed to audit headers:', error.message);
      process.exit(1);
    }
  }

  fetchHeaders(endpoint) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.baseUrl);
      const client = url.protocol === 'https:' ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'HEAD',
        timeout: 5000,
      };

      const req = client.request(options, res => {
        resolve(res.headers);
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));
      req.setTimeout(5000);
      req.end();
    });
  }

  analyzeHeaders(headers) {
    const isHttps = this.baseUrl.startsWith('https');

    for (const [headerName, config] of Object.entries(REQUIRED_HEADERS)) {
      const headerValue = headers[headerName.toLowerCase()];

      // Skip HTTPS-only headers for HTTP endpoints
      if (config.httpsOnly && !isHttps) {
        this.results.warnings.push({
          header: headerName,
          message: `Header ${headerName} is only relevant for HTTPS endpoints`,
          severity: 'INFO',
        });
        continue;
      }

      if (!headerValue) {
        this.results.failed.push({
          header: headerName,
          message: `Missing required header: ${headerName}`,
          description: config.description,
          severity: config.severity,
        });
        continue;
      }

      // Check expected values
      if (config.expectedValues) {
        if (config.expectedValues.includes(headerValue)) {
          this.results.passed.push({
            header: headerName,
            value: headerValue,
            message: `✅ ${headerName}: ${headerValue}`,
          });
        } else {
          this.results.failed.push({
            header: headerName,
            value: headerValue,
            message: `Invalid value for ${headerName}: ${headerValue}`,
            expected: config.expectedValues.join(', '),
            severity: config.severity,
          });
        }
      }

      // Check expected pattern
      if (config.expectedPattern) {
        if (config.expectedPattern.test(headerValue)) {
          this.results.passed.push({
            header: headerName,
            value: headerValue,
            message: `✅ ${headerName}: ${headerValue}`,
          });
        } else {
          this.results.failed.push({
            header: headerName,
            value: headerValue,
            message: `Invalid format for ${headerName}: ${headerValue}`,
            severity: config.severity,
          });
        }
      }
    }
  }

  generateReport() {
    console.log('\n📊 SECURITY HEADERS AUDIT REPORT');
    console.log('='.repeat(60));

    // Summary
    const totalChecks = this.results.passed.length + this.results.failed.length;
    const passRate =
      totalChecks > 0 ? ((this.results.passed.length / totalChecks) * 100).toFixed(1) : 0;

    console.log(`\n📈 SUMMARY:`);
    console.log(`   Total Checks: ${totalChecks}`);
    console.log(`   Passed: ${this.results.passed.length}`);
    console.log(`   Failed: ${this.results.failed.length}`);
    console.log(`   Warnings: ${this.results.warnings.length}`);
    console.log(`   Pass Rate: ${passRate}%`);

    // Passed headers
    if (this.results.passed.length > 0) {
      console.log(`\n✅ PASSED (${this.results.passed.length}):`);
      this.results.passed.forEach(result => {
        console.log(`   ${result.message}`);
      });
    }

    // Failed headers
    if (this.results.failed.length > 0) {
      console.log(`\n❌ FAILED (${this.results.failed.length}):`);
      this.results.failed.forEach(result => {
        console.log(`   [${result.severity}] ${result.message}`);
        if (result.description) {
          console.log(`      Description: ${result.description}`);
        }
        if (result.expected) {
          console.log(`      Expected: ${result.expected}`);
        }
      });
    }

    // Warnings
    if (this.results.warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS (${this.results.warnings.length}):`);
      this.results.warnings.forEach(result => {
        console.log(`   ${result.message}`);
      });
    }

    // Recommendations
    console.log(`\n💡 RECOMMENDATIONS:`);
    if (this.results.failed.length === 0) {
      console.log('   🎉 All security headers are properly configured!');
    } else {
      console.log('   🔧 Configure missing security headers in your server middleware');
      console.log('   📚 Review OWASP security headers guide for best practices');
      console.log('   🛡️  Consider using a security middleware like Helmet.js');
    }

    // Grade
    const grade = this.calculateGrade(passRate);
    console.log(`\n🎯 SECURITY GRADE: ${grade}`);

    // Exit code based on critical failures
    const criticalFailures = this.results.failed.filter(f => f.severity === 'HIGH').length;
    if (criticalFailures > 0) {
      console.log(`\n💥 ${criticalFailures} critical security issues found!`);
      process.exit(1);
    }
  }

  calculateGrade(passRate) {
    if (passRate >= 95) return '🏆 A+';
    if (passRate >= 90) return '🥇 A';
    if (passRate >= 85) return '🥈 A-';
    if (passRate >= 80) return '🥉 B+';
    if (passRate >= 75) return '📝 B';
    if (passRate >= 70) return '📉 B-';
    if (passRate >= 65) return '⚠️  C+';
    if (passRate >= 60) return '🚨 C';
    return '💥 F';
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const baseUrl = args[0] || process.env.AUDIT_URL || 'http://localhost:3001';
  const endpoint = args[1] || '/';

  console.log('🔐 Nectar Studio Security Headers Auditor');
  console.log('========================================');

  const auditor = new SecurityHeadersAuditor(baseUrl);
  await auditor.auditHeaders(endpoint);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = SecurityHeadersAuditor;
