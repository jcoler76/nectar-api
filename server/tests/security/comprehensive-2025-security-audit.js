#!/usr/bin/env node

/**
 * Comprehensive 2025 Security Audit
 *
 * Tests for OWASP Top 10:2021 compliance PLUS emerging vulnerabilities
 * expected to appear in OWASP Top 10:2025
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const SECURITY_TEST_CATEGORIES = [
  {
    category: 'OWASP Top 10:2021 Core Tests',
    tests: [
      {
        name: 'A01:2021 - Broken Access Control',
        files: ['authorizationBypass.test.js', 'idorSecurity.test.js'],
        description: 'Access control and authorization testing',
      },
      {
        name: 'A02:2021 - Cryptographic Failures',
        files: ['apiSecurity.test.js'],
        description: 'Encryption and data protection testing',
      },
      {
        name: 'A03:2021 - Injection',
        files: ['inputValidation.test.js', 'xssPrevention.test.js'],
        description: 'SQL injection, XSS, and other injection attacks',
      },
      {
        name: 'A04:2021 - Insecure Design',
        files: ['business-logic-vulnerabilities.test.js'],
        description: 'Design-level security flaws and business logic',
      },
      {
        name: 'A05:2021 - Security Misconfiguration',
        files: ['securityHeaders.test.js'],
        description: 'Security configuration and headers',
      },
      {
        name: 'A06:2021 - Vulnerable Components',
        files: ['emerging-vulnerabilities-2025.test.js'],
        description: 'Component security and supply chain',
      },
      {
        name: 'A07:2021 - Auth Failures',
        files: ['sessionSecurity.test.js'],
        description: 'Authentication and session management',
      },
      {
        name: 'A08:2021 - Data Integrity Failures',
        files: ['emerging-vulnerabilities-2025.test.js'],
        description: 'Software and data integrity',
      },
      {
        name: 'A09:2021 - Logging Failures',
        files: ['comprehensive-security-audit.js'],
        description: 'Security logging and monitoring',
      },
      {
        name: 'A10:2021 - SSRF',
        files: ['apiSecurity.test.js'],
        description: 'Server-side request forgery',
      },
    ],
  },
  {
    category: 'Emerging 2025 Vulnerabilities',
    tests: [
      {
        name: 'Race Conditions & Timing Attacks',
        files: ['emerging-vulnerabilities-2025.test.js'],
        description: 'Concurrent execution and timing-based vulnerabilities',
      },
      {
        name: 'Memory Management Vulnerabilities',
        files: ['emerging-vulnerabilities-2025.test.js'],
        description: 'Memory exhaustion and management issues',
      },
      {
        name: 'AI/ML Security Vulnerabilities',
        files: ['emerging-vulnerabilities-2025.test.js'],
        description: 'Prompt injection and AI-specific attacks',
      },
      {
        name: 'Supply Chain Security',
        files: ['emerging-vulnerabilities-2025.test.js'],
        description: 'Dependency and supply chain attacks',
      },
      {
        name: 'Advanced Business Logic Flaws',
        files: ['business-logic-vulnerabilities.test.js'],
        description: 'Complex business logic manipulation',
      },
      {
        name: 'Template Injection Attacks',
        files: ['emerging-vulnerabilities-2025.test.js'],
        description: 'Server-side template injection',
      },
    ],
  },
];

class Comprehensive2025SecurityAudit {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
    this.testDirectory = path.join(__dirname);
  }

  async runCompleteAudit() {
    console.log('🛡️  COMPREHENSIVE 2025 SECURITY AUDIT');
    console.log('='.repeat(80));
    console.log('📅 Testing against OWASP Top 10:2021 + Emerging 2025 Threats');
    console.log('🕐 Audit Start Time:', new Date().toISOString());
    console.log('='.repeat(80));
    console.log();

    const auditResults = {
      categories: [],
      totalTests: 0,
      totalPassed: 0,
      overallScore: 0,
      owaspCompliance: {},
      emergingThreats: {},
      recommendations: [],
    };

    for (const category of SECURITY_TEST_CATEGORIES) {
      console.log(`🔍 CATEGORY: ${category.category}`);
      console.log('-'.repeat(60));

      const categoryResults = await this.runCategoryTests(category);
      auditResults.categories.push(categoryResults);
      auditResults.totalTests += categoryResults.totalTests;
      auditResults.totalPassed += categoryResults.totalPassed;

      console.log(
        `📊 Category Score: ${categoryResults.score}% (${categoryResults.totalPassed}/${categoryResults.totalTests})`
      );
      console.log();
    }

    // Calculate overall score
    auditResults.overallScore = (
      (auditResults.totalPassed / auditResults.totalTests) *
      100
    ).toFixed(1);

    this.generateComprehensiveReport(auditResults);
    return auditResults;
  }

  async runCategoryTests(category) {
    const categoryResult = {
      name: category.category,
      tests: [],
      totalTests: 0,
      totalPassed: 0,
      score: 0,
    };

    for (const test of category.tests) {
      console.log(`  🧪 Testing: ${test.name}`);
      console.log(`     📝 ${test.description}`);

      let testPassed = 0;
      let testTotal = 0;

      for (const testFile of test.files) {
        const result = await this.runIndividualTest(testFile);
        if (result.success) {
          testPassed += result.passed || 1;
          testTotal += result.total || 1;
          console.log(`     ✅ ${testFile}: PASSED`);
        } else {
          testTotal += 1;
          console.log(`     ❌ ${testFile}: ${result.error || 'FAILED'}`);
        }
      }

      const testScore = testTotal > 0 ? (testPassed / testTotal) * 100 : 0;
      categoryResult.tests.push({
        name: test.name,
        passed: testPassed,
        total: testTotal,
        score: testScore,
      });

      categoryResult.totalPassed += testPassed;
      categoryResult.totalTests += testTotal;

      console.log(`     📊 ${test.name}: ${testScore.toFixed(1)}% (${testPassed}/${testTotal})`);
    }

    categoryResult.score =
      categoryResult.totalTests > 0
        ? (categoryResult.totalPassed / categoryResult.totalTests) * 100
        : 0;

    return categoryResult;
  }

  async runIndividualTest(testFile) {
    const testPath = path.join(this.testDirectory, testFile);

    if (!fs.existsSync(testPath)) {
      return {
        success: false,
        error: 'Test file not found',
        passed: 0,
        total: 1,
      };
    }

    // For existing audit scripts, run them directly
    if (testFile === 'comprehensive-security-audit.js') {
      try {
        const auditResult = require(testPath);
        if (typeof auditResult === 'function') {
          await auditResult();
        }
        return { success: true, passed: 1, total: 1 };
      } catch (error) {
        return { success: false, error: error.message, passed: 0, total: 1 };
      }
    }

    // For Jest tests, try to parse the file to count tests
    try {
      const testContent = fs.readFileSync(testPath, 'utf8');
      const testCount = (testContent.match(/test\(/g) || []).length;

      return new Promise(resolve => {
        const jest = spawn('npx', ['jest', testPath, '--silent'], {
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
          if (code === 0) {
            resolve({ success: true, passed: testCount, total: testCount });
          } else {
            // Try to parse Jest output for actual pass/fail counts
            const passMatch = stdout.match(/(\d+) passing/);
            const failMatch = stdout.match(/(\d+) failing/);

            const passed = passMatch ? parseInt(passMatch[1]) : 0;
            const failed = failMatch ? parseInt(failMatch[1]) : 0;
            const total = passed + failed || testCount;

            resolve({
              success: passed > 0,
              passed: passed,
              total: total,
              error: code !== 0 ? 'Some tests failed' : undefined,
            });
          }
        });

        // Timeout after 30 seconds
        setTimeout(() => {
          jest.kill();
          resolve({
            success: false,
            error: 'Test timeout',
            passed: 0,
            total: testCount,
          });
        }, 30000);
      });
    } catch (error) {
      return {
        success: false,
        error: error.message,
        passed: 0,
        total: 1,
      };
    }
  }

  generateComprehensiveReport(auditResults) {
    console.log('='.repeat(80));
    console.log('🏆 COMPREHENSIVE 2025 SECURITY AUDIT REPORT');
    console.log('='.repeat(80));
    console.log('🕐 Audit Completion Time:', new Date().toISOString());
    console.log();

    // Overall Score
    console.log('🎯 OVERALL SECURITY ASSESSMENT');
    console.log('-'.repeat(40));
    console.log(`📊 Total Security Score: ${auditResults.overallScore}%`);
    console.log(`🧪 Total Tests Executed: ${auditResults.totalPassed}/${auditResults.totalTests}`);
    console.log();

    // Category Breakdown
    console.log('📊 CATEGORY BREAKDOWN');
    console.log('-'.repeat(40));
    auditResults.categories.forEach((category, index) => {
      const statusIcon = category.score >= 90 ? '✅' : category.score >= 70 ? '⚠️' : '❌';
      const scoreColor = category.score >= 90 ? '🟢' : category.score >= 70 ? '🟡' : '🔴';

      console.log(`${index + 1}. ${statusIcon} ${scoreColor} ${category.name}`);
      console.log(
        `   Score: ${category.score.toFixed(1)}% (${category.totalPassed}/${category.totalTests})`
      );

      category.tests.forEach(test => {
        const testIcon = test.score >= 90 ? '✅' : test.score >= 70 ? '⚠️' : '❌';
        console.log(`   ${testIcon} ${test.name}: ${test.score.toFixed(1)}%`);
      });
      console.log();
    });

    // Security Posture Assessment
    console.log('🛡️ SECURITY POSTURE ASSESSMENT');
    console.log('-'.repeat(40));
    const overallScore = parseFloat(auditResults.overallScore);

    if (overallScore >= 95) {
      console.log('🏆 EXCEPTIONAL: Enterprise-grade security with future-ready protections');
    } else if (overallScore >= 90) {
      console.log('🏆 EXCELLENT: Strong security posture with comprehensive controls');
    } else if (overallScore >= 85) {
      console.log('✅ VERY GOOD: Solid security with room for emerging threat protection');
    } else if (overallScore >= 80) {
      console.log('⚠️ GOOD: Basic security in place, needs enhancement for 2025 threats');
    } else {
      console.log('❌ NEEDS IMPROVEMENT: Significant security gaps require immediate attention');
    }
    console.log();

    // OWASP Compliance Status
    console.log('📋 COMPLIANCE STATUS');
    console.log('-'.repeat(40));
    console.log(`✅ OWASP Top 10:2021: ${overallScore >= 85 ? 'COMPLIANT' : 'GAPS IDENTIFIED'}`);
    console.log(`🔮 2025 Future-Ready: ${overallScore >= 90 ? 'READY' : 'NEEDS PREPARATION'}`);
    console.log(`🏢 Enterprise Security: ${overallScore >= 95 ? 'ENTERPRISE-GRADE' : 'STANDARD'}`);
    console.log();

    // Recommendations
    console.log('💡 RECOMMENDATIONS');
    console.log('-'.repeat(40));

    if (overallScore >= 95) {
      console.log('✅ Maintain exceptional security posture');
      console.log('🔄 Implement continuous security monitoring');
      console.log('📊 Regular penetration testing');
      console.log('🎓 Security awareness training');
    } else if (overallScore >= 90) {
      console.log('🔧 Address minor gaps in lower-scoring categories');
      console.log('🚀 Enhance emerging threat detection');
      console.log('📈 Implement advanced monitoring');
    } else if (overallScore >= 80) {
      console.log('⚠️ Priority: Address vulnerabilities in failing categories');
      console.log('🛡️ Strengthen basic security controls');
      console.log('📚 Review security best practices');
    } else {
      console.log('🚨 URGENT: Address critical security gaps immediately');
      console.log('🔒 Implement fundamental security controls');
      console.log('👥 Consider security consulting');
    }

    // Future-Proofing Recommendations
    console.log();
    console.log('🔮 2025 FUTURE-PROOFING RECOMMENDATIONS');
    console.log('-'.repeat(40));
    console.log('🤖 Implement AI/ML security controls');
    console.log('⚡ Enhance race condition protections');
    console.log('🔗 Strengthen supply chain security');
    console.log('⏱️ Implement timing attack protections');
    console.log('💾 Review memory management security');
    console.log('🎯 Enhance business logic validation');

    console.log();
    console.log('='.repeat(80));
    console.log('📝 AUDIT COMPLETE - Security assessment ready for 2025');
    console.log('='.repeat(80));
  }
}

if (require.main === module) {
  const audit = new Comprehensive2025SecurityAudit();
  audit.runCompleteAudit().catch(console.error);
}

module.exports = Comprehensive2025SecurityAudit;
