/**
 * Master Test Runner for All Penetration Tests
 * Executes all security test suites and generates comprehensive report
 */

const { PenetrationTestRunner } = require('./pen-test-suite');
const AdvancedSecurityTests = require('./advanced-security-tests');
const fs = require('fs');
const path = require('path');

// Color codes
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Configuration
const CONFIG = {
  baseURL: process.env.TEST_BASE_URL || 'http://localhost:3001',
  reportDir: path.join(__dirname, '../../reports'),
  timestamp: new Date().toISOString().replace(/:/g, '-').split('.')[0],
};

class MasterTestRunner {
  constructor() {
    this.allResults = {
      timestamp: new Date(),
      baseURL: CONFIG.baseURL,
      suites: [],
      summary: {
        totalTests: 0,
        totalPassed: 0,
        totalFailed: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
      },
      duration: 0,
      riskLevel: 'UNKNOWN',
    };

    // Ensure reports directory exists
    if (!fs.existsSync(CONFIG.reportDir)) {
      fs.mkdirSync(CONFIG.reportDir, { recursive: true });
    }
  }

  printBanner() {
    console.log(
      `\n${COLORS.bright}${COLORS.magenta}╔════════════════════════════════════════════════════════════════════════╗${COLORS.reset}`
    );
    console.log(
      `${COLORS.bright}${COLORS.magenta}║                                                                        ║${COLORS.reset}`
    );
    console.log(
      `${COLORS.bright}${COLORS.magenta}║        NECTAR API - COMPREHENSIVE SECURITY TEST SUITE                  ║${COLORS.reset}`
    );
    console.log(
      `${COLORS.bright}${COLORS.magenta}║                                                                        ║${COLORS.reset}`
    );
    console.log(
      `${COLORS.bright}${COLORS.magenta}║        Testing all known vulnerabilities and attack vectors            ║${COLORS.reset}`
    );
    console.log(
      `${COLORS.bright}${COLORS.magenta}║                                                                        ║${COLORS.reset}`
    );
    console.log(
      `${COLORS.bright}${COLORS.magenta}╚════════════════════════════════════════════════════════════════════════╝${COLORS.reset}\n`
    );
    console.log(`${COLORS.cyan}Target:${COLORS.reset} ${CONFIG.baseURL}`);
    console.log(`${COLORS.cyan}Started:${COLORS.reset} ${new Date().toLocaleString()}\n`);
  }

  async checkServerHealth() {
    console.log(`${COLORS.yellow}⚙ Checking server health...${COLORS.reset}`);

    const axios = require('axios');
    try {
      const response = await axios.get(`${CONFIG.baseURL}/health`, { timeout: 5000 });

      if (response.status === 200) {
        console.log(`${COLORS.green}✓ Server is healthy and ready for testing${COLORS.reset}\n`);
        return true;
      } else {
        console.log(
          `${COLORS.red}✗ Server health check failed (status: ${response.status})${COLORS.reset}\n`
        );
        return false;
      }
    } catch (error) {
      console.log(`${COLORS.red}✗ Cannot reach server: ${error.message}${COLORS.reset}`);
      console.log(
        `${COLORS.yellow}⚠ Make sure the server is running on ${CONFIG.baseURL}${COLORS.reset}\n`
      );
      return false;
    }
  }

  async runMainPenetrationTests() {
    console.log(
      `${COLORS.bright}${COLORS.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`
    );
    console.log(
      `${COLORS.bright}${COLORS.blue}  Running Main Penetration Test Suite${COLORS.reset}`
    );
    console.log(
      `${COLORS.bright}${COLORS.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}\n`
    );

    const runner = new PenetrationTestRunner();
    const startTime = Date.now();

    try {
      const results = await runner.runAllTests();

      this.allResults.suites.push({
        name: 'Main Penetration Tests',
        results: results.tests,
        summary: results.summary,
        duration: Date.now() - startTime,
      });

      // Aggregate results
      this.allResults.summary.totalTests += results.summary.total;
      this.allResults.summary.totalPassed += results.summary.passed;
      this.allResults.summary.totalFailed += results.summary.failed;
      this.allResults.summary.critical += results.summary.critical;
      this.allResults.summary.high += results.summary.high;
      this.allResults.summary.medium += results.summary.medium;
      this.allResults.summary.low += results.summary.low;
      this.allResults.summary.info += results.summary.info;

      return true;
    } catch (error) {
      console.error(`${COLORS.red}✗ Main test suite failed: ${error.message}${COLORS.reset}\n`);
      return false;
    }
  }

  async runAdvancedSecurityTests() {
    console.log(
      `${COLORS.bright}${COLORS.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`
    );
    console.log(
      `${COLORS.bright}${COLORS.blue}  Running Advanced Security Test Suite${COLORS.reset}`
    );
    console.log(
      `${COLORS.bright}${COLORS.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}\n`
    );

    const tester = new AdvancedSecurityTests();
    const startTime = Date.now();

    try {
      const results = await tester.runAll();

      const summary = {
        total: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
        critical: results.filter(r => !r.passed && r.severity === 'CRITICAL').length,
        high: results.filter(r => !r.passed && r.severity === 'HIGH').length,
        medium: results.filter(r => !r.passed && r.severity === 'MEDIUM').length,
        low: results.filter(r => !r.passed && r.severity === 'LOW').length,
        info: results.filter(r => r.passed && r.severity === 'INFO').length,
      };

      this.allResults.suites.push({
        name: 'Advanced Security Tests',
        results,
        summary,
        duration: Date.now() - startTime,
      });

      // Aggregate results
      this.allResults.summary.totalTests += summary.total;
      this.allResults.summary.totalPassed += summary.passed;
      this.allResults.summary.totalFailed += summary.failed;
      this.allResults.summary.critical += summary.critical;
      this.allResults.summary.high += summary.high;
      this.allResults.summary.medium += summary.medium;
      this.allResults.summary.low += summary.low;
      this.allResults.summary.info += summary.info;

      return true;
    } catch (error) {
      console.error(`${COLORS.red}✗ Advanced test suite failed: ${error.message}${COLORS.reset}\n`);
      return false;
    }
  }

  calculateRiskLevel() {
    const { critical, high, medium } = this.allResults.summary;

    if (critical > 0) return 'CRITICAL';
    if (high > 0) return 'HIGH';
    if (medium > 5) return 'MEDIUM';
    return 'LOW';
  }

  printFinalSummary() {
    const duration = this.allResults.duration / 1000;
    const { summary } = this.allResults;
    const riskLevel = this.calculateRiskLevel();
    this.allResults.riskLevel = riskLevel;

    console.log(
      `\n\n${COLORS.bright}${COLORS.magenta}╔════════════════════════════════════════════════════════════════════════╗${COLORS.reset}`
    );
    console.log(
      `${COLORS.bright}${COLORS.magenta}║                      FINAL TEST SUMMARY                                ║${COLORS.reset}`
    );
    console.log(
      `${COLORS.bright}${COLORS.magenta}╚════════════════════════════════════════════════════════════════════════╝${COLORS.reset}\n`
    );

    console.log(
      `${COLORS.bright}Total Test Suites:${COLORS.reset}   ${this.allResults.suites.length}`
    );
    console.log(`${COLORS.bright}Total Tests Run:${COLORS.reset}     ${summary.totalTests}`);
    console.log(`${COLORS.green}Tests Passed:${COLORS.reset}        ${summary.totalPassed}`);
    console.log(`${COLORS.red}Tests Failed:${COLORS.reset}        ${summary.totalFailed}\n`);

    console.log(`${COLORS.bright}Vulnerabilities by Severity:${COLORS.reset}`);
    console.log(`${COLORS.red}  ● CRITICAL:${COLORS.reset}        ${summary.critical}`);
    console.log(`${COLORS.red}  ● HIGH:${COLORS.reset}            ${summary.high}`);
    console.log(`${COLORS.yellow}  ● MEDIUM:${COLORS.reset}          ${summary.medium}`);
    console.log(`${COLORS.yellow}  ● LOW:${COLORS.reset}             ${summary.low}`);
    console.log(`${COLORS.cyan}  ● INFO:${COLORS.reset}            ${summary.info}\n`);

    console.log(
      `${COLORS.bright}Test Duration:${COLORS.reset}       ${duration.toFixed(2)} seconds\n`
    );

    // Risk Level with color
    let riskColor = COLORS.green;
    if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') riskColor = COLORS.red;
    else if (riskLevel === 'MEDIUM') riskColor = COLORS.yellow;

    console.log(
      `${COLORS.bright}Overall Risk Level:${COLORS.reset}  ${riskColor}${COLORS.bright}${riskLevel}${COLORS.reset}\n`
    );

    // Suite breakdown
    console.log(`${COLORS.bright}Test Suite Breakdown:${COLORS.reset}`);
    this.allResults.suites.forEach((suite, index) => {
      const passRate = ((suite.summary.passed / suite.summary.total) * 100).toFixed(1);
      console.log(`  ${index + 1}. ${suite.name}`);
      console.log(
        `     Tests: ${suite.summary.total} | Passed: ${suite.summary.passed} | Failed: ${suite.summary.failed} (${passRate}% pass rate)`
      );
      console.log(`     Duration: ${(suite.duration / 1000).toFixed(2)}s\n`);
    });

    // Recommendations
    if (summary.critical > 0 || summary.high > 0) {
      console.log(`${COLORS.red}${COLORS.bright}⚠ IMMEDIATE ACTION REQUIRED${COLORS.reset}`);
      console.log(
        `${COLORS.red}Critical or high-severity vulnerabilities were detected.${COLORS.reset}`
      );
      console.log(`${COLORS.yellow}1. Review the detailed report immediately${COLORS.reset}`);
      console.log(
        `${COLORS.yellow}2. Prioritize fixing CRITICAL and HIGH severity issues${COLORS.reset}`
      );
      console.log(`${COLORS.yellow}3. Re-run tests after remediation${COLORS.reset}`);
      console.log(
        `${COLORS.yellow}4. Consider delaying deployment until issues are resolved${COLORS.reset}\n`
      );
    } else if (summary.medium > 0) {
      console.log(`${COLORS.yellow}⚠ Moderate security issues detected${COLORS.reset}`);
      console.log(
        `${COLORS.yellow}Review and address medium-severity findings before production deployment.${COLORS.reset}\n`
      );
    } else {
      console.log(
        `${COLORS.green}✓ Excellent! No critical vulnerabilities detected.${COLORS.reset}`
      );
      console.log(`${COLORS.green}Continue following security best practices.${COLORS.reset}\n`);
    }
  }

  generateHTMLReport() {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Test Report - ${this.allResults.timestamp}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .header h1 { font-size: 28px; margin-bottom: 10px; }
        .header .meta { opacity: 0.9; font-size: 14px; }
        .content { padding: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #667eea; }
        .stat-card.critical { border-left-color: #dc3545; }
        .stat-card.high { border-left-color: #fd7e14; }
        .stat-card.medium { border-left-color: #ffc107; }
        .stat-card.low { border-left-color: #28a745; }
        .stat-card h3 { font-size: 14px; color: #666; margin-bottom: 8px; text-transform: uppercase; }
        .stat-card .value { font-size: 32px; font-weight: bold; color: #333; }
        .risk-badge { display: inline-block; padding: 6px 12px; border-radius: 4px; font-weight: bold; font-size: 14px; }
        .risk-critical { background: #dc3545; color: white; }
        .risk-high { background: #fd7e14; color: white; }
        .risk-medium { background: #ffc107; color: #333; }
        .risk-low { background: #28a745; color: white; }
        .suite { margin-bottom: 30px; border: 1px solid #dee2e6; border-radius: 6px; overflow: hidden; }
        .suite-header { background: #f8f9fa; padding: 15px 20px; border-bottom: 1px solid #dee2e6; }
        .suite-header h2 { font-size: 20px; color: #333; }
        .suite-stats { font-size: 14px; color: #666; margin-top: 5px; }
        .test-list { padding: 20px; }
        .test-item { padding: 12px; margin-bottom: 8px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; }
        .test-item.passed { background: #d4edda; border-left: 4px solid #28a745; }
        .test-item.failed { background: #f8d7da; border-left: 4px solid #dc3545; }
        .test-name { font-weight: 500; }
        .test-severity { padding: 4px 8px; border-radius: 3px; font-size: 12px; font-weight: bold; }
        .severity-critical { background: #dc3545; color: white; }
        .severity-high { background: #fd7e14; color: white; }
        .severity-medium { background: #ffc107; color: #333; }
        .severity-low { background: #28a745; color: white; }
        .severity-info { background: #17a2b8; color: white; }
        .details { margin-top: 8px; font-size: 13px; color: #666; background: rgba(0,0,0,0.03); padding: 8px; border-radius: 3px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 Security Penetration Test Report</h1>
            <div class="meta">
                <div>Target: ${this.allResults.baseURL}</div>
                <div>Generated: ${new Date(this.allResults.timestamp).toLocaleString()}</div>
                <div>Duration: ${(this.allResults.duration / 1000).toFixed(2)} seconds</div>
            </div>
        </div>

        <div class="content">
            <h2 style="margin-bottom: 20px;">Summary</h2>
            <div class="summary">
                <div class="stat-card">
                    <h3>Total Tests</h3>
                    <div class="value">${this.allResults.summary.totalTests}</div>
                </div>
                <div class="stat-card low">
                    <h3>Passed</h3>
                    <div class="value">${this.allResults.summary.totalPassed}</div>
                </div>
                <div class="stat-card critical">
                    <h3>Failed</h3>
                    <div class="value">${this.allResults.summary.totalFailed}</div>
                </div>
                <div class="stat-card">
                    <h3>Risk Level</h3>
                    <div class="value">
                        <span class="risk-badge risk-${this.allResults.riskLevel.toLowerCase()}">${this.allResults.riskLevel}</span>
                    </div>
                </div>
            </div>

            <div class="summary">
                <div class="stat-card critical">
                    <h3>Critical</h3>
                    <div class="value">${this.allResults.summary.critical}</div>
                </div>
                <div class="stat-card high">
                    <h3>High</h3>
                    <div class="value">${this.allResults.summary.high}</div>
                </div>
                <div class="stat-card medium">
                    <h3>Medium</h3>
                    <div class="value">${this.allResults.summary.medium}</div>
                </div>
                <div class="stat-card low">
                    <h3>Low</h3>
                    <div class="value">${this.allResults.summary.low}</div>
                </div>
            </div>

            ${this.allResults.suites
              .map(
                (suite, index) => `
                <div class="suite">
                    <div class="suite-header">
                        <h2>${index + 1}. ${suite.name}</h2>
                        <div class="suite-stats">
                            ${suite.summary.total} tests | 
                            ${suite.summary.passed} passed | 
                            ${suite.summary.failed} failed | 
                            ${(suite.duration / 1000).toFixed(2)}s
                        </div>
                    </div>
                    <div class="test-list">
                        ${suite.results
                          .map(
                            test => `
                            <div class="test-item ${test.passed ? 'passed' : 'failed'}">
                                <div>
                                    <div class="test-name">${test.name}</div>
                                    ${
                                      test.details && Object.keys(test.details).length > 0
                                        ? `<div class="details">${JSON.stringify(test.details, null, 2)}</div>`
                                        : ''
                                    }
                                </div>
                                <span class="test-severity severity-${test.severity.toLowerCase()}">${test.severity}</span>
                            </div>
                        `
                          )
                          .join('')}
                    </div>
                </div>
            `
              )
              .join('')}
        </div>

        <div class="footer">
            Generated by Nectar API Security Test Suite
        </div>
    </div>
</body>
</html>
    `;

    const htmlPath = path.join(CONFIG.reportDir, `security-report-${CONFIG.timestamp}.html`);
    fs.writeFileSync(htmlPath, html);
    console.log(`${COLORS.cyan}📄 HTML report saved: ${htmlPath}${COLORS.reset}`);
  }

  saveJSONReport() {
    const jsonPath = path.join(CONFIG.reportDir, `security-report-${CONFIG.timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(this.allResults, null, 2));
    console.log(`${COLORS.cyan}📊 JSON report saved: ${jsonPath}${COLORS.reset}`);
  }

  async run() {
    const startTime = Date.now();

    this.printBanner();

    // Check server health
    const isHealthy = await this.checkServerHealth();
    if (!isHealthy) {
      console.log(
        `${COLORS.red}✗ Cannot proceed with tests. Server is not available.${COLORS.reset}\n`
      );
      process.exit(1);
    }

    // Run test suites
    await this.runMainPenetrationTests();
    await this.runAdvancedSecurityTests();

    // Calculate total duration
    this.allResults.duration = Date.now() - startTime;

    // Print summary
    this.printFinalSummary();

    // Generate reports
    console.log(`${COLORS.bright}${COLORS.blue}Generating reports...${COLORS.reset}\n`);
    this.saveJSONReport();
    this.generateHTMLReport();

    console.log(`\n${COLORS.green}✓ All tests completed successfully!${COLORS.reset}\n`);

    // Exit with appropriate code
    const exitCode =
      this.allResults.summary.critical > 0 || this.allResults.summary.high > 0 ? 1 : 0;
    process.exit(exitCode);
  }
}

// Run if executed directly
if (require.main === module) {
  const masterRunner = new MasterTestRunner();
  masterRunner.run().catch(error => {
    console.error(`${COLORS.red}Fatal error:${COLORS.reset}`, error);
    process.exit(1);
  });
}

module.exports = MasterTestRunner;
