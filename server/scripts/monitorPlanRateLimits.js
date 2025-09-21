#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const subscriptionLimitService = require('../services/subscriptionLimitService');
const { shouldCountAsBillableApi } = require('../middleware/publicApiTracker');

const prisma = new PrismaClient();

/**
 * Real-time monitoring script for Plan-based Rate Limits
 * Monitors API usage across all subscription tiers
 */

class PlanRateLimitMonitor {
  constructor() {
    this.isRunning = false;
    this.interval = null;
    this.updateIntervalMs = 5000; // Update every 5 seconds
  }

  /**
   * Get all test organizations and their current usage
   */
  async getTestOrganizationUsage() {
    try {
      // Find all test organizations
      const testOrganizations = await prisma.organization.findMany({
        where: {
          OR: [
            { name: { contains: 'Plan Organization' } },
            { name: { contains: 'Tier Organization' } },
          ],
        },
        include: {
          subscription: true,
          applications: {
            where: { isActive: true },
          },
          memberships: {
            include: {
              user: {
                select: {
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      const usageData = [];

      for (const org of testOrganizations) {
        try {
          const [usage, limits, warnings] = await Promise.all([
            subscriptionLimitService.getCurrentUsage(org.id),
            subscriptionLimitService.getOrganizationLimits(org.id),
            subscriptionLimitService.getUsageWarnings(org.id),
          ]);

          const remainingCalls =
            limits.apiCallLimit === -1
              ? 'unlimited'
              : Math.max(0, limits.apiCallLimit - usage.usage.apiCalls);
          const usagePercent =
            limits.apiCallLimit === -1 ? 0 : (usage.usage.apiCalls / limits.apiCallLimit) * 100;

          usageData.push({
            organizationId: org.id,
            organizationName: org.name,
            plan: limits.plan,
            userEmail: org.memberships[0]?.user?.email || 'unknown',
            apiKey: org.applications[0]?.apiKey?.substring(0, 8) + '...' || 'none',
            currentUsage: usage.usage.apiCalls,
            monthlyLimit: limits.apiCallLimit,
            remainingCalls,
            usagePercent: Math.round(usagePercent * 100) / 100,
            period: usage.period,
            warnings: warnings.length,
            status: this.getUsageStatus(usagePercent, limits.plan),
            lastUpdated: new Date(),
          });
        } catch (error) {
          console.error(`Error getting usage for org ${org.id}:`, error.message);
        }
      }

      return usageData.sort((a, b) => a.plan.localeCompare(b.plan));
    } catch (error) {
      console.error('Error getting test organization usage:', error);
      return [];
    }
  }

  /**
   * Get usage status based on percentage and plan
   */
  getUsageStatus(usagePercent, plan) {
    if (plan === 'ENTERPRISE') return '🟢 UNLIMITED';
    if (usagePercent >= 100) return '🔴 EXCEEDED';
    if (usagePercent >= 95) return '🟠 CRITICAL';
    if (usagePercent >= 80) return '🟡 WARNING';
    if (usagePercent >= 50) return '🔵 MODERATE';
    return '🟢 GOOD';
  }

  /**
   * Display usage information in a formatted table
   */
  displayUsage(usageData) {
    // Clear console and show header
    console.clear();
    console.log('═'.repeat(120));
    console.log('🔍 NECTAR API - PLAN RATE LIMIT MONITOR');
    console.log('═'.repeat(120));
    console.log(`📅 Updated: ${new Date().toLocaleString()}`);
    console.log(`🔄 Refresh Rate: ${this.updateIntervalMs / 1000}s`);
    console.log('');

    if (usageData.length === 0) {
      console.log('❌ No test organizations found. Run createTestUsers.js first.');
      return;
    }

    // Table header
    console.log(
      '┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐'
    );
    console.log(
      '│                                             SUBSCRIPTION PLAN USAGE                                                    │'
    );
    console.log(
      '├──────────────┬─────────────────────────┬─────────────┬──────────────┬──────────────┬─────────────┬──────────────────┤'
    );
    console.log(
      '│ PLAN         │ USER EMAIL              │ STATUS      │ USED         │ LIMIT        │ REMAINING   │ USAGE %          │'
    );
    console.log(
      '├──────────────┼─────────────────────────┼─────────────┼──────────────┼──────────────┼─────────────┼──────────────────┤'
    );

    usageData.forEach(data => {
      const plan = data.plan.padEnd(12);
      const email = (data.userEmail || '').substring(0, 23).padEnd(23);
      const status = data.status.padEnd(11);
      const used = data.currentUsage.toLocaleString().padStart(12);
      const limit =
        data.monthlyLimit === -1
          ? 'UNLIMITED'.padStart(12)
          : data.monthlyLimit.toLocaleString().padStart(12);
      const remaining =
        data.remainingCalls === 'unlimited'
          ? 'UNLIMITED'.padStart(11)
          : data.remainingCalls.toLocaleString().padStart(11);
      const percent =
        data.monthlyLimit === -1 ? 'N/A'.padStart(16) : `${data.usagePercent}%`.padStart(16);

      console.log(
        `│ ${plan} │ ${email} │ ${status} │ ${used} │ ${limit} │ ${remaining} │ ${percent} │`
      );
    });

    console.log(
      '└──────────────┴─────────────────────────┴─────────────┴──────────────┴──────────────┴─────────────┴──────────────────┘'
    );

    // Show warnings and alerts
    const alertData = usageData.filter(data => data.warnings > 0 || data.usagePercent >= 80);
    if (alertData.length > 0) {
      console.log('');
      console.log('⚠️  ALERTS & WARNINGS:');
      console.log('─'.repeat(80));
      alertData.forEach(data => {
        if (data.usagePercent >= 100) {
          console.log(`🔴 ${data.plan}: ${data.userEmail} has EXCEEDED their limit!`);
        } else if (data.usagePercent >= 95) {
          console.log(
            `🟠 ${data.plan}: ${data.userEmail} is at ${data.usagePercent}% usage (CRITICAL)`
          );
        } else if (data.usagePercent >= 80) {
          console.log(
            `🟡 ${data.plan}: ${data.userEmail} is at ${data.usagePercent}% usage (WARNING)`
          );
        }
        if (data.warnings > 0) {
          console.log(`   📋 ${data.warnings} active warnings for this organization`);
        }
      });
    }

    // Show API route classification examples
    console.log('');
    console.log('📋 API ROUTE CLASSIFICATION EXAMPLES:');
    console.log('─'.repeat(80));
    console.log('✅ BILLABLE (count toward limits):');
    console.log('   • /api/v1/myservice/_proc/getUsers');
    console.log('   • /api/v2/analytics/_proc/generateReport');
    console.log('   • /api/v2/test/_proc/rate-limit-test');
    console.log('');
    console.log('❌ NON-BILLABLE (do not count):');
    console.log('   • /api/auth/login');
    console.log('   • /api/users/profile');
    console.log('   • /api/tracking/app-usage');
    console.log('   • /api/v2/test/_proc/usage-info');
    console.log('   • /health');

    // Show plan limits
    console.log('');
    console.log('📊 PLAN LIMITS:');
    console.log('─'.repeat(80));
    console.log('• FREE:       25,000 calls/month');
    console.log('• STARTER:  1,000,000 calls/month');
    console.log('• TEAM:     5,000,000 calls/month');
    console.log('• BUSINESS: 10,000,000 calls/month');
    console.log('• ENTERPRISE: Unlimited calls');

    console.log('');
    console.log('Press Ctrl+C to stop monitoring...');
  }

  /**
   * Test a specific API route classification
   */
  testRouteClassification(route, method = 'GET') {
    const isBillable = shouldCountAsBillableApi(route, method);
    console.log(`\n🧪 Route Classification Test:`);
    console.log(`   Route: ${method} ${route}`);
    console.log(
      `   Billable: ${isBillable ? '✅ YES (counts toward limit)' : '❌ NO (internal API)'}`
    );
  }

  /**
   * Start monitoring
   */
  async start() {
    if (this.isRunning) {
      console.log('Monitor is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting Plan Rate Limit Monitor...');

    // Initial display
    const usageData = await this.getTestOrganizationUsage();
    this.displayUsage(usageData);

    // Set up interval
    this.interval = setInterval(async () => {
      if (this.isRunning) {
        const usageData = await this.getTestOrganizationUsage();
        this.displayUsage(usageData);
      }
    }, this.updateIntervalMs);

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      this.stop();
    });
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    console.log('\n👋 Plan Rate Limit Monitor stopped.');
    process.exit(0);
  }

  /**
   * Show one-time usage summary
   */
  async showSummary() {
    console.log('📊 Plan Rate Limit Usage Summary');
    console.log('═'.repeat(50));

    const usageData = await this.getTestOrganizationUsage();
    this.displayUsage(usageData);

    await prisma.$disconnect();
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const monitor = new PlanRateLimitMonitor();

  switch (command) {
    case 'start':
    case 'monitor':
      await monitor.start();
      break;

    case 'summary':
    case 'status':
      await monitor.showSummary();
      break;

    case 'test-route':
      const route = args[1] || '/api/v1/test/_proc/example';
      const method = args[2] || 'GET';
      monitor.testRouteClassification(route, method);
      break;

    case 'help':
    default:
      console.log('📋 Plan Rate Limit Monitor - Usage:');
      console.log('');
      console.log('Commands:');
      console.log('  start, monitor    Start real-time monitoring');
      console.log('  summary, status   Show one-time usage summary');
      console.log('  test-route        Test API route classification');
      console.log('  help              Show this help message');
      console.log('');
      console.log('Examples:');
      console.log('  node monitorPlanRateLimits.js start');
      console.log('  node monitorPlanRateLimits.js summary');
      console.log('  node monitorPlanRateLimits.js test-route "/api/v1/crm/_proc/getLeads" GET');
      console.log('');
      console.log('Prerequisites:');
      console.log('  1. Run: node scripts/createTestUsers.js');
      console.log('  2. Run: node scripts/generateTestUserApiKeys.js');
      break;
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Monitor error:', error);
    process.exit(1);
  });
}

module.exports = PlanRateLimitMonitor;
