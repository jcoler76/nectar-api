#!/usr/bin/env node

/**
 * Comprehensive Security Test Suite Runner
 *
 * This script runs all security tests and provides a comprehensive security report
 * covering the 10 most commonly used exploits and their prevention measures.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const SECURITY_TESTS = [
  {
    name: 'SQL Injection Prevention',
    file: 'sqlInjectionPrevention.test.js',
    description: 'Tests protection against SQL injection attacks using parameterized queries',
    vulnerabilityType: 'A03:2021 - Injection',
  },
  {
    name: 'XSS Prevention',
    file: 'xssPrevention.test.js',
    description:
      'Tests protection against Cross-Site Scripting attacks with CSP and input sanitization',
    vulnerabilityType: 'A03:2021 - Injection',
  },
  {
    name: 'CSRF Prevention',
    file: 'csrfPrevention.test.js',
    description: 'Tests protection against Cross-Site Request Forgery with CSRF tokens',
    vulnerabilityType: 'A01:2021 - Broken Access Control',
  },
  {
    name: 'Authentication Bypass Prevention',
    file: 'authenticationBypass.test.js',
    description: 'Tests protection against authentication bypass and brute force attacks',
    vulnerabilityType: 'A07:2021 - Identification and Authentication Failures',
  },
  {
    name: 'Authorization & Privilege Escalation Prevention',
    file: 'authorizationBypass.test.js',
    description: 'Tests protection against authorization bypass and privilege escalation attacks',
    vulnerabilityType: 'A01:2021 - Broken Access Control',
  },
  {
    name: 'Input Validation',
    file: 'inputValidation.test.js',
    description: 'Tests comprehensive input validation and sanitization',
    vulnerabilityType: 'A03:2021 - Injection',
  },
  {
    name: 'Rate Limiting & DoS Prevention',
    file: 'rateLimitingAttacks.test.js',
    description: 'Tests protection against rate limiting bypass and DoS attacks',
    vulnerabilityType: 'A06:2021 - Vulnerable and Outdated Components',
  },
  {
    name: 'Directory Traversal Prevention',
    file: 'directoryTraversal.test.js',
    description: 'Tests protection against path traversal and file inclusion attacks',
    vulnerabilityType: 'A01:2021 - Broken Access Control',
  },
  {
    name: 'API Security',
    file: 'apiSecurity.test.js',
    description:
      'Tests API security including XXE, deserialization, and mass assignment prevention',
    vulnerabilityType: 'A02:2021 - Cryptographic Failures',
  },
  {
    name: 'Session Management Security',
    file: 'sessionSecurity.test.js',
    description: 'Tests secure session management and session hijacking prevention',
    vulnerabilityType: 'A07:2021 - Identification and Authentication Failures',
  },
];

class SecurityTestRunner {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
    this.testDirectory = path.join(__dirname);
  }

  async runAllTests() {
    console.log('🛡️  Starting Comprehensive Security Test Suite');
    console.log('='.repeat(80));
    console.log();

    for (const test of SECURITY_TESTS) {
      console.log(`🧪 Running: ${test.name}`);
      console.log(`📝 Description: ${test.description}`);
      console.log(`⚠️  OWASP Category: ${test.vulnerabilityType}`);
      console.log();

      const result = await this.runSingleTest(test);
      this.results.push({ ...test, ...result });

      if (result.success) {
        console.log(`✅ ${test.name}: PASSED (${result.duration}ms)`);
      } else {
        console.log(`❌ ${test.name}: FAILED (${result.duration}ms)`);
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
      }
      console.log();
    }

    this.generateReport();
  }

  async runSingleTest(test) {
    const testFile = path.join(this.testDirectory, test.file);

    if (!fs.existsSync(testFile)) {
      return {
        success: false,
        error: 'Test file not found',
        duration: 0,
        stats: { total: 0, passed: 0, failed: 1 },
      };
    }

    return new Promise(resolve => {
      const startTime = Date.now();
      const jest = spawn('npx', ['jest', testFile, '--json'], {
        cwd: path.join(__dirname, '..', '..'),
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      jest.stdout.on('data', data => {
        stdout += data.toString();
      });

      jest.stderr.on('data', data => {
        stderr += data.toString();
      });

      jest.on('close', code => {
        const duration = Date.now() - startTime;
        let jestResults = null;

        try {
          // Try to parse Jest JSON output
          const lines = stdout.split('\n');
          const jsonLine = lines.find(line => line.trim().startsWith('{'));
          if (jsonLine) {
            jestResults = JSON.parse(jsonLine);
          }
        } catch (error) {
          // Fallback if JSON parsing fails
        }

        const stats = jestResults
          ? {
              total: jestResults.numTotalTests,
              passed: jestResults.numPassedTests,
              failed: jestResults.numFailedTests,
              suites: jestResults.numTotalTestSuites,
            }
          : { total: 0, passed: 0, failed: 0, suites: 0 };

        resolve({
          success: code === 0,
          duration,
          stats,
          error: code !== 0 ? stderr || 'Test execution failed' : null,
          output: stdout,
        });
      });

      jest.on('error', error => {
        resolve({
          success: false,
          duration: Date.now() - startTime,
          stats: { total: 0, passed: 0, failed: 1 },
          error: error.message,
        });
      });
    });
  }

  generateReport() {
    const totalDuration = Date.now() - this.startTime;
    const successfulTests = this.results.filter(r => r.success).length;
    const failedTests = this.results.filter(r => !r.success).length;
    const totalTests = this.results.reduce((sum, r) => sum + (r.stats?.total || 0), 0);
    const passedTests = this.results.reduce((sum, r) => sum + (r.stats?.passed || 0), 0);

    console.log();
    console.log('🛡️  COMPREHENSIVE SECURITY TEST REPORT');
    console.log('='.repeat(80));
    console.log();

    // Overall Summary
    console.log('📊 OVERALL SUMMARY:');
    console.log(`   • Security Test Suites: ${SECURITY_TESTS.length}`);
    console.log(`   • Successful Suites: ${successfulTests}`);
    console.log(`   • Failed Suites: ${failedTests}`);
    console.log(`   • Total Test Cases: ${totalTests}`);
    console.log(`   • Passed Test Cases: ${passedTests}`);
    console.log(`   • Failed Test Cases: ${totalTests - passedTests}`);
    console.log(
      `   • Success Rate: ${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0}%`
    );
    console.log(`   • Total Duration: ${totalDuration}ms`);
    console.log();

    // OWASP Top 10 Coverage
    console.log('🌟 OWASP TOP 10 2021 COVERAGE:');
    const owaspCategories = [...new Set(SECURITY_TESTS.map(t => t.vulnerabilityType))];
    owaspCategories.forEach(category => {
      const categoryTests = this.results.filter(r => r.vulnerabilityType === category);
      const categorySuccess = categoryTests.filter(r => r.success).length;
      const categoryStatus = categorySuccess === categoryTests.length ? '✅' : '❌';
      console.log(
        `   ${categoryStatus} ${category} (${categorySuccess}/${categoryTests.length} suites passed)`
      );
    });
    console.log();

    // Detailed Results
    console.log('📋 DETAILED RESULTS:');
    this.results.forEach((result, index) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      const testStats = result.stats ? `${result.stats.passed}/${result.stats.total}` : '0/0';

      console.log(`   ${index + 1}. ${status} ${result.name}`);
      console.log(`      Tests: ${testStats} | Duration: ${result.duration}ms`);

      if (!result.success && result.error) {
        console.log(`      Error: ${result.error.split('\n')[0]}`);
      }
      console.log();
    });

    // Security Recommendations
    console.log('🔒 SECURITY RECOMMENDATIONS:');

    if (failedTests > 0) {
      console.log('   ⚠️  CRITICAL: Some security tests failed. Review and fix immediately:');
      this.results
        .filter(r => !r.success)
        .forEach(result => {
          console.log(`      - ${result.name}: ${result.error || 'Unknown error'}`);
        });
    } else {
      console.log(
        '   ✅ All security tests passed! Your application demonstrates strong security posture.'
      );
    }

    console.log();
    console.log('   📚 Additional Security Measures to Consider:');
    console.log('      - Regular security audits and penetration testing');
    console.log('      - Dependency vulnerability scanning');
    console.log('      - Security headers validation');
    console.log('      - SSL/TLS configuration review');
    console.log('      - Logging and monitoring implementation');
    console.log('      - Incident response plan preparation');
    console.log();

    // Generate JSON report
    this.generateJSONReport();

    console.log('='.repeat(80));
    console.log(`🛡️  Security test suite completed in ${totalDuration}ms`);

    if (failedTests > 0) {
      console.log('⚠️  WARNING: Security vulnerabilities detected. Please review and remediate.');
      process.exit(1);
    } else {
      console.log('✅ All security tests passed. Application security looks good!');
      process.exit(0);
    }
  }

  generateJSONReport() {
    const report = {
      metadata: {
        timestamp: new Date().toISOString(),
        totalDuration: Date.now() - this.startTime,
        testSuites: SECURITY_TESTS.length,
        owaspVersion: '2021',
      },
      summary: {
        successful: this.results.filter(r => r.success).length,
        failed: this.results.filter(r => !r.success).length,
        totalTests: this.results.reduce((sum, r) => sum + (r.stats?.total || 0), 0),
        passedTests: this.results.reduce((sum, r) => sum + (r.stats?.passed || 0), 0),
      },
      owaspCoverage: [...new Set(SECURITY_TESTS.map(t => t.vulnerabilityType))].map(category => {
        const categoryTests = this.results.filter(r => r.vulnerabilityType === category);
        return {
          category,
          totalSuites: categoryTests.length,
          passedSuites: categoryTests.filter(r => r.success).length,
          covered: categoryTests.filter(r => r.success).length === categoryTests.length,
        };
      }),
      testResults: this.results.map(result => ({
        name: result.name,
        file: result.file,
        description: result.description,
        vulnerabilityType: result.vulnerabilityType,
        success: result.success,
        duration: result.duration,
        stats: result.stats,
        error: result.error,
      })),
    };

    const reportPath = path.join(__dirname, '..', '..', 'security-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 JSON report saved to: ${reportPath}`);
  }
}

// CLI execution
if (require.main === module) {
  const runner = new SecurityTestRunner();

  console.log('🛡️  Comprehensive Security Test Suite for Nectar API');
  console.log('    Testing against the 10 most common security exploits');
  console.log('    Based on OWASP Top 10 2021');
  console.log();

  runner.runAllTests().catch(error => {
    console.error('❌ Failed to run security tests:', error);
    process.exit(1);
  });
}

module.exports = SecurityTestRunner;
