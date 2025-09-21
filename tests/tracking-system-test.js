/**
 * Comprehensive Tracking System Test
 * Tests the tracking system across all major features
 */

const { PrismaClient } = require('@prisma/client');
const request = require('supertest');
const app = require('../server/app');
const trackingService = require('../server/services/trackingService');
const dataRetentionService = require('../server/services/dataRetentionService');

describe('Tracking System Integration Tests', () => {
  let prisma;
  let testUser;
  let authToken;

  beforeAll(async () => {
    prisma = new PrismaClient();

    // Create test user
    testUser = await prisma.user.create({
      data: {
        id: 'test-user-tracking',
        email: 'tracking-test@example.com',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: 'hashed-password',
        isActive: true,
        emailVerified: true
      }
    });

    // Create test organization and membership
    const organization = await prisma.organization.create({
      data: {
        id: 'test-org-tracking',
        name: 'Test Organization',
        slug: 'test-org-tracking'
      }
    });

    await prisma.membership.create({
      data: {
        id: 'test-membership-tracking',
        userId: testUser.id,
        organizationId: organization.id,
        role: 'OWNER'
      }
    });

    // Create auth token (simplified for testing)
    authToken = 'test-auth-token';
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.appUsageLog.deleteMany({
      where: { userId: testUser.id }
    });

    await prisma.loginActivityLog.deleteMany({
      where: { userId: testUser.id }
    });

    await prisma.membership.deleteMany({
      where: { userId: testUser.id }
    });

    await prisma.organization.deleteMany({
      where: { id: 'test-org-tracking' }
    });

    await prisma.user.deleteMany({
      where: { id: testUser.id }
    });

    await prisma.$disconnect();
  });

  describe('App Usage Tracking', () => {
    test('should track page view events', async () => {
      const trackingData = {
        sessionId: 'test-session-123',
        userId: testUser.id,
        organizationId: 'test-org-tracking',
        eventType: 'page_view',
        page: '/dashboard',
        elementId: 'dashboard_page',
        metadata: {
          userAgent: 'test-browser',
          referrer: '/login'
        }
      };

      const result = await trackingService.trackAppUsage(trackingData);

      expect(result.success).toBe(true);
      expect(result.logId).toBeDefined();

      // Verify the event was stored
      const storedEvent = await prisma.appUsageLog.findUnique({
        where: { id: result.logId }
      });

      expect(storedEvent).toBeTruthy();
      expect(storedEvent.eventType).toBe('page_view');
      expect(storedEvent.page).toBe('/dashboard');
      expect(storedEvent.userId).toBe(testUser.id);
    });

    test('should track click events', async () => {
      const trackingData = {
        sessionId: 'test-session-123',
        userId: testUser.id,
        organizationId: 'test-org-tracking',
        eventType: 'click',
        page: '/workflows',
        elementId: 'create_workflow_button',
        metadata: {
          elementType: 'button',
          elementText: 'Create Workflow'
        }
      };

      const result = await trackingService.trackAppUsage(trackingData);

      expect(result.success).toBe(true);

      // Verify the event was stored
      const storedEvent = await prisma.appUsageLog.findUnique({
        where: { id: result.logId }
      });

      expect(storedEvent.eventType).toBe('click');
      expect(storedEvent.elementId).toBe('create_workflow_button');
    });

    test('should track feature usage events', async () => {
      const trackingData = {
        sessionId: 'test-session-123',
        userId: testUser.id,
        organizationId: 'test-org-tracking',
        eventType: 'feature_use',
        page: '/workflows/builder',
        elementId: 'workflow_builder',
        metadata: {
          featureName: 'workflow_builder',
          action: 'feature_started',
          workflowType: 'automation'
        }
      };

      const result = await trackingService.trackAppUsage(trackingData);

      expect(result.success).toBe(true);

      // Track feature completion
      const completionData = {
        ...trackingData,
        metadata: {
          ...trackingData.metadata,
          action: 'feature_completed',
          duration: 125000 // 2 minutes 5 seconds
        }
      };

      const completionResult = await trackingService.trackAppUsage(completionData);
      expect(completionResult.success).toBe(true);
    });
  });

  describe('Login Activity Tracking', () => {
    test('should track successful login', async () => {
      const loginData = {
        userId: testUser.id,
        organizationId: 'test-org-tracking',
        email: testUser.email,
        loginType: 'success',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Test Browser',
        metadata: {
          loginMethod: 'password',
          twoFactorUsed: false
        }
      };

      const result = await trackingService.trackLoginActivity(loginData);

      expect(result.success).toBe(true);
      expect(result.logId).toBeDefined();

      // Verify the login was tracked
      const storedLogin = await prisma.loginActivityLog.findUnique({
        where: { id: result.logId }
      });

      expect(storedLogin).toBeTruthy();
      expect(storedLogin.loginType).toBe('success');
      expect(storedLogin.email).toBe(testUser.email);
      expect(storedLogin.ipAddress).toBe('192.168.1.100');
    });

    test('should track failed login attempts', async () => {
      const failedLoginData = {
        email: 'nonexistent@example.com',
        loginType: 'failed',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Test Browser',
        failureReason: 'user_not_found',
        metadata: {
          attemptedEmail: 'nonexistent@example.com'
        }
      };

      const result = await trackingService.trackLoginActivity(failedLoginData);

      expect(result.success).toBe(true);

      // Verify the failed login was tracked
      const storedLogin = await prisma.loginActivityLog.findUnique({
        where: { id: result.logId }
      });

      expect(storedLogin.loginType).toBe('failed');
      expect(storedLogin.failureReason).toBe('user_not_found');
    });

    test('should track suspicious login activity', async () => {
      const suspiciousLoginData = {
        email: testUser.email,
        loginType: 'failed',
        ipAddress: '10.0.0.1',
        userAgent: 'Suspicious Bot',
        failureReason: 'suspicious_activity',
        metadata: {
          suspicionReasons: ['unusual_ip', 'bot_user_agent'],
          riskScore: 85
        }
      };

      const result = await trackingService.trackLoginActivity(suspiciousLoginData);

      expect(result.success).toBe(true);

      const storedLogin = await prisma.loginActivityLog.findUnique({
        where: { id: result.logId }
      });

      expect(storedLogin.failureReason).toBe('suspicious_activity');
      expect(storedLogin.metadata.riskScore).toBe(85);
    });
  });

  describe('API Endpoint Tests', () => {
    test('should accept app usage tracking via API', async () => {
      const trackingPayload = {
        sessionId: 'api-test-session',
        eventType: 'page_view',
        page: '/services',
        elementId: 'services_page',
        metadata: {
          timestamp: new Date().toISOString()
        }
      };

      const response = await request(app)
        .post('/api/tracking/app-usage')
        .send(trackingPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.logId).toBeDefined();
    });

    test('should accept batch tracking events', async () => {
      const batchPayload = {
        events: [
          {
            sessionId: 'batch-test-session',
            eventType: 'click',
            page: '/connections',
            elementId: 'add_connection_button',
            metadata: { buttonType: 'primary' }
          },
          {
            sessionId: 'batch-test-session',
            eventType: 'form_submit',
            page: '/connections/new',
            elementId: 'connection_form',
            metadata: { connectionType: 'database' }
          }
        ]
      };

      const response = await request(app)
        .post('/api/tracking/batch')
        .send(batchPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.processedEvents).toBe(2);
      expect(response.body.results).toHaveLength(2);
    });

    test('should retrieve analytics data via API', async () => {
      // First, add some test data
      await trackingService.trackAppUsage({
        sessionId: 'analytics-test-session',
        userId: testUser.id,
        organizationId: 'test-org-tracking',
        eventType: 'page_view',
        page: '/analytics',
        elementId: 'analytics_page'
      });

      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/api/tracking/analytics/app-usage?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalEvents).toBeGreaterThan(0);
    });
  });

  describe('Data Retention Service', () => {
    test('should get storage statistics', async () => {
      const stats = await dataRetentionService.getStorageStats();

      expect(stats).toBeDefined();
      expect(stats.totalRecords).toBeDefined();
      expect(stats.totalRecords.appUsage).toBeGreaterThanOrEqual(0);
      expect(stats.totalRecords.loginActivity).toBeGreaterThanOrEqual(0);
      expect(stats.retentionPolicies).toBeDefined();
    });

    test('should export user data', async () => {
      const exportData = await dataRetentionService.exportUserData(testUser.id);

      expect(exportData).toBeDefined();
      expect(exportData.userId).toBe(testUser.id);
      expect(exportData.appUsage).toBeInstanceOf(Array);
      expect(exportData.loginActivity).toBeInstanceOf(Array);
      expect(exportData.summary).toBeDefined();
    });

    test('should update retention policies', async () => {
      const result = await dataRetentionService.updateRetentionPolicy(
        'appUsageLog',
        'default',
        400 // 400 days
      );

      expect(result.success).toBe(true);
      expect(result.newValue).toBe(400);
      expect(result.oldValue).toBeDefined();
    });
  });

  describe('Frontend Integration Simulation', () => {
    test('should simulate page tracking workflow', async () => {
      // Simulate a user session with multiple page views
      const sessionId = 'frontend-simulation-session';
      const pages = ['/dashboard', '/workflows', '/connections', '/services'];

      const results = [];

      for (const page of pages) {
        const result = await trackingService.trackAppUsage({
          sessionId,
          userId: testUser.id,
          organizationId: 'test-org-tracking',
          eventType: 'page_view',
          page,
          elementId: `${page.substring(1)}_page`,
          metadata: {
            sessionStart: false,
            previousPage: results.length > 0 ? pages[results.length - 1] : null
          }
        });

        results.push(result);
      }

      // Verify all page views were tracked
      expect(results).toHaveLength(4);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Check that we can retrieve session data
      const sessionEvents = await prisma.appUsageLog.findMany({
        where: {
          sessionId,
          userId: testUser.id
        },
        orderBy: { timestamp: 'asc' }
      });

      expect(sessionEvents).toHaveLength(4);
      expect(sessionEvents[0].page).toBe('/dashboard');
      expect(sessionEvents[3].page).toBe('/services');
    });

    test('should simulate feature usage workflow', async () => {
      const sessionId = 'feature-workflow-session';

      // Start workflow creation
      await trackingService.trackAppUsage({
        sessionId,
        userId: testUser.id,
        organizationId: 'test-org-tracking',
        eventType: 'feature_use',
        page: '/workflows',
        elementId: 'workflow_builder',
        metadata: {
          featureName: 'workflow_creation',
          action: 'feature_started'
        }
      });

      // Add workflow steps
      await trackingService.trackAppUsage({
        sessionId,
        userId: testUser.id,
        organizationId: 'test-org-tracking',
        eventType: 'click',
        page: '/workflows/builder',
        elementId: 'add_trigger_step',
        metadata: {
          stepType: 'trigger',
          triggerType: 'webhook'
        }
      });

      // Complete workflow creation
      await trackingService.trackAppUsage({
        sessionId,
        userId: testUser.id,
        organizationId: 'test-org-tracking',
        eventType: 'feature_use',
        page: '/workflows/builder',
        elementId: 'workflow_builder',
        metadata: {
          featureName: 'workflow_creation',
          action: 'feature_completed',
          workflowId: 'test-workflow-123',
          stepCount: 3,
          duration: 180000 // 3 minutes
        }
      });

      // Verify workflow creation was tracked properly
      const workflowEvents = await prisma.appUsageLog.findMany({
        where: {
          sessionId,
          userId: testUser.id
        }
      });

      expect(workflowEvents).toHaveLength(3);

      const startEvent = workflowEvents.find(e =>
        e.metadata?.action === 'feature_started'
      );
      const completionEvent = workflowEvents.find(e =>
        e.metadata?.action === 'feature_completed'
      );

      expect(startEvent).toBeTruthy();
      expect(completionEvent).toBeTruthy();
      expect(completionEvent.metadata.duration).toBe(180000);
    });
  });

  describe('Performance and Scale Tests', () => {
    test('should handle high-volume tracking', async () => {
      const batchSize = 100;
      const events = [];

      // Generate batch of events
      for (let i = 0; i < batchSize; i++) {
        events.push({
          sessionId: `performance-test-${Math.floor(i / 10)}`,
          userId: testUser.id,
          organizationId: 'test-org-tracking',
          eventType: 'click',
          page: `/test-page-${i % 5}`,
          elementId: `test-element-${i}`,
          metadata: {
            testBatch: true,
            eventIndex: i
          }
        });
      }

      // Track all events
      const startTime = Date.now();
      const results = await Promise.all(
        events.map(event => trackingService.trackAppUsage(event))
      );
      const endTime = Date.now();

      // Verify all events were processed successfully
      expect(results).toHaveLength(batchSize);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Performance check - should handle 100 events in reasonable time
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(5000); // Less than 5 seconds

      console.log(`Processed ${batchSize} events in ${duration}ms`);
    });

    test('should handle concurrent tracking requests', async () => {
      const concurrentRequests = 20;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          trackingService.trackAppUsage({
            sessionId: `concurrent-test-${i}`,
            userId: testUser.id,
            organizationId: 'test-org-tracking',
            eventType: 'concurrent_test',
            page: '/test',
            elementId: `concurrent-element-${i}`,
            metadata: { concurrentTest: true, index: i }
          })
        );
      }

      const results = await Promise.all(promises);

      // Verify all concurrent requests succeeded
      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle missing required fields gracefully', async () => {
      // Test with missing sessionId
      const result = await trackingService.trackAppUsage({
        userId: testUser.id,
        eventType: 'test_event',
        page: '/test'
        // Missing sessionId
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle invalid data types', async () => {
      const result = await trackingService.trackAppUsage({
        sessionId: 123, // Should be string
        userId: testUser.id,
        eventType: 'test_event',
        page: '/test',
        elementId: 'test_element'
      });

      // Service should either convert or reject gracefully
      expect(result).toBeDefined();
    });

    test('should handle large metadata objects', async () => {
      const largeMetadata = {
        description: 'A'.repeat(1000), // 1000 character string
        array: new Array(100).fill('test'),
        nested: {
          level1: {
            level2: {
              level3: 'deep nested value'
            }
          }
        }
      };

      const result = await trackingService.trackAppUsage({
        sessionId: 'large-metadata-test',
        userId: testUser.id,
        organizationId: 'test-org-tracking',
        eventType: 'test_large_metadata',
        page: '/test',
        elementId: 'test_element',
        metadata: largeMetadata
      });

      expect(result.success).toBe(true);
    });
  });
});

// Helper function to run the tests
const runTrackingSystemTests = async () => {
  console.log('🧪 Starting Tracking System Integration Tests...');

  try {
    // This would typically be run with a test runner like Jest
    console.log('✅ All tracking system tests would be executed here');
    console.log('📊 Test coverage areas:');
    console.log('   - App usage tracking (page views, clicks, feature usage)');
    console.log('   - Login activity tracking (success, failures, suspicious activity)');
    console.log('   - API endpoint functionality');
    console.log('   - Data retention and privacy features');
    console.log('   - Frontend integration simulation');
    console.log('   - Performance and scalability');
    console.log('   - Error handling and edge cases');

    return {
      success: true,
      message: 'Tracking system test suite defined and ready to run',
      testCategories: [
        'App Usage Tracking',
        'Login Activity Tracking',
        'API Endpoint Tests',
        'Data Retention Service',
        'Frontend Integration Simulation',
        'Performance and Scale Tests',
        'Error Handling and Edge Cases'
      ]
    };
  } catch (error) {
    console.error('❌ Error in tracking system tests:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  runTrackingSystemTests
};