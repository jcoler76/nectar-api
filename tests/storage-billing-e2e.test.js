/**
 * End-to-End Storage Billing Tests
 *
 * Comprehensive testing for storage billing functionality including:
 * - Storage quota enforcement
 * - Overage calculations
 * - Multi-tenant isolation
 * - Purchase add-ons
 * - Usage tracking
 * - Billing reconciliation
 *
 * These tests verify that the billing system prevents cost overruns
 * and ensures proper security across tenants.
 */

const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const StorageBillingService = require('../server/services/storageBillingService');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

// Test application setup
const app = require('../server/app'); // Adjust path as needed

describe('Storage Billing End-to-End Tests', () => {
  let testUsers = {};
  let testOrganizations = {};
  let authTokens = {};
  let storageBillingService;

  beforeAll(async () => {
    // Initialize storage billing service
    storageBillingService = new StorageBillingService();

    // Clean up test data
    await cleanupTestData();

    // Create test organizations and users
    await setupTestData();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
    await prisma.$disconnect();
  });

  describe('Storage Quota Enforcement', () => {
    test('FREE plan should reject uploads exceeding 100MB limit', async () => {
      const freeOrgToken = authTokens.freeOrg;

      // Create a mock file larger than 100MB
      const largeFileSize = 101 * 1024 * 1024; // 101MB

      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${freeOrgToken}`)
        .attach('files', Buffer.alloc(largeFileSize), 'large-test-file.bin')
        .expect(413);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Storage limit exceeded');
      expect(response.body.quotaStatus.level).toBe('blocked');
    });

    test('STARTER plan should allow uploads within 5GB limit', async () => {
      const starterOrgToken = authTokens.starterOrg;

      // Upload a 1MB file (well within 5GB limit)
      const smallFileSize = 1 * 1024 * 1024; // 1MB

      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${starterOrgToken}`)
        .attach('files', Buffer.alloc(smallFileSize), 'small-test-file.bin')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.files).toHaveLength(1);
      expect(response.body.quotaStatus.level).toBe('normal');
    });

    test('ENTERPRISE plan should handle 1TB limit correctly', async () => {
      const enterpriseOrgToken = authTokens.enterpriseOrg;

      // Test storage info endpoint
      const response = await request(app)
        .get('/api/files/storage/info')
        .set('Authorization', `Bearer ${enterpriseOrgToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.storage.limits.totalStorageBytes).toBe(1024 * 1024 * 1024 * 1024); // 1TB
      expect(response.body.storage.organization.plan).toBe('ENTERPRISE');
    });
  });

  describe('Overage Calculations', () => {
    test('Should calculate overage correctly for STARTER plan', async () => {
      const orgId = testOrganizations.starterOrg.id;

      // Simulate 6GB usage (1GB overage)
      const overage6GB = 6 * 1024 * 1024 * 1024;

      const quotaCheck = await storageBillingService.checkStorageQuota(orgId, overage6GB);

      expect(quotaCheck.overage.isOverLimit).toBe(true);
      expect(quotaCheck.overage.overageGB).toBe(1); // 1GB overage
      expect(quotaCheck.overage.estimatedMonthlyCost).toBe(0.10); // $0.10/GB for STARTER
      expect(quotaCheck.quota.allowsOverages).toBe(true);
    });

    test('Should block FREE plan from exceeding limits', async () => {
      const orgId = testOrganizations.freeOrg.id;

      // Simulate 200MB usage (100MB overage)
      const overage200MB = 200 * 1024 * 1024;

      const quotaCheck = await storageBillingService.checkStorageQuota(orgId, overage200MB);

      expect(quotaCheck.overage.isOverLimit).toBe(true);
      expect(quotaCheck.quota.allowsOverages).toBe(false);
      expect(quotaCheck.quotaStatus.level).toBe('blocked');
    });

    test('Should calculate different overage rates per plan', async () => {
      const plans = [
        { plan: 'STARTER', orgId: testOrganizations.starterOrg.id, rate: 0.10 },
        { plan: 'TEAM', orgId: testOrganizations.teamOrg.id, rate: 0.08 },
        { plan: 'BUSINESS', orgId: testOrganizations.businessOrg.id, rate: 0.06 },
        { plan: 'ENTERPRISE', orgId: testOrganizations.enterpriseOrg.id, rate: 0.05 },
      ];

      for (const { plan, orgId, rate } of plans) {
        // Force 1GB overage for each plan
        const baseLimit = storageBillingService.storageLimits[plan];
        const overageAmount = baseLimit + (1 * 1024 * 1024 * 1024); // +1GB

        const quotaCheck = await storageBillingService.checkStorageQuota(orgId, overageAmount);

        expect(quotaCheck.overage.estimatedMonthlyCost).toBe(rate);
        expect(quotaCheck.quota.overageRate).toBe(rate);
      }
    });
  });

  describe('Multi-Tenant Security', () => {
    test('Users should only see their organization files', async () => {
      const org1Token = authTokens.starterOrg;
      const org2Token = authTokens.teamOrg;

      // Upload file to org1
      const org1Upload = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${org1Token}`)
        .attach('files', Buffer.alloc(1024), 'org1-file.txt')
        .expect(200);

      const org1FileId = org1Upload.body.files[0].id;

      // Upload file to org2
      const org2Upload = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${org2Token}`)
        .attach('files', Buffer.alloc(1024), 'org2-file.txt')
        .expect(200);

      // Org1 should only see their files
      const org1Files = await request(app)
        .get('/api/files')
        .set('Authorization', `Bearer ${org1Token}`)
        .expect(200);

      expect(org1Files.body.files).toHaveLength(1);
      expect(org1Files.body.files[0].filename).toBe('org1-file.txt');

      // Org2 should only see their files
      const org2Files = await request(app)
        .get('/api/files')
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(200);

      expect(org2Files.body.files).toHaveLength(1);
      expect(org2Files.body.files[0].filename).toBe('org2-file.txt');

      // Org2 should not be able to access Org1's file
      await request(app)
        .get(`/api/files/${org1FileId}`)
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(404);
    });

    test('Storage usage should be isolated per organization', async () => {
      const org1Info = await request(app)
        .get('/api/files/storage/info')
        .set('Authorization', `Bearer ${authTokens.starterOrg}`)
        .expect(200);

      const org2Info = await request(app)
        .get('/api/files/storage/info')
        .set('Authorization', `Bearer ${authTokens.teamOrg}`)
        .expect(200);

      // Usage should be independent
      expect(org1Info.body.storage.organization.id).not.toBe(org2Info.body.storage.organization.id);
      expect(org1Info.body.storage.organization.plan).toBe('STARTER');
      expect(org2Info.body.storage.organization.plan).toBe('TEAM');
    });
  });

  describe('Storage Add-on Purchases', () => {
    test('Should list available storage packages', async () => {
      const response = await request(app)
        .get('/api/files/storage/packages')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.packages).toHaveLength(4);

      const packages = response.body.packages;
      expect(packages[0]).toMatchObject({
        id: 'storage_10gb',
        name: '10GB Storage Add-on',
        storageGb: 10,
        priceUsd: 2.00,
      });
    });

    test('Should increase total storage after purchase', async () => {
      const orgToken = authTokens.starterOrg;
      const orgId = testOrganizations.starterOrg.id;

      // Get initial storage info
      const initialInfo = await request(app)
        .get('/api/files/storage/info')
        .set('Authorization', `Bearer ${orgToken}`)
        .expect(200);

      const initialTotalStorage = initialInfo.body.storage.limits.totalStorageBytes;

      // Mock a purchase by directly creating a purchase record
      await prisma.storagePurchase.create({
        data: {
          organizationId: orgId,
          purchaseType: 'addon_pack',
          packId: 'storage_10gb',
          storageGb: 10,
          pricePerGb: 0.20,
          totalCost: 2.00,
          purchaseDate: new Date(),
          expirationDate: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)),
          isActive: true,
        },
      });

      // Get updated storage info
      const updatedInfo = await request(app)
        .get('/api/files/storage/info')
        .set('Authorization', `Bearer ${orgToken}`)
        .expect(200);

      const updatedTotalStorage = updatedInfo.body.storage.limits.totalStorageBytes;
      const addOnStorage = updatedInfo.body.storage.limits.addOnStorageBytes;

      expect(addOnStorage).toBe(10 * 1024 * 1024 * 1024); // 10GB
      expect(updatedTotalStorage).toBe(initialTotalStorage + addOnStorage);
      expect(updatedInfo.body.storage.activePurchases).toHaveLength(1);
    });
  });

  describe('Usage Tracking and Billing', () => {
    test('Should record daily usage correctly', async () => {
      const orgId = testOrganizations.starterOrg.id;

      // Record daily usage
      const usage = await storageBillingService.recordDailyUsage(orgId);

      expect(usage.bytesUsed).toBeGreaterThanOrEqual(0);
      expect(usage.fileCount).toBeGreaterThanOrEqual(0);

      // Verify record was created
      const usageRecord = await prisma.storageUsage.findFirst({
        where: {
          organizationId: orgId,
          date: new Date(new Date().toDateString()),
        },
      });

      expect(usageRecord).toBeTruthy();
      expect(parseInt(usageRecord.bytesStored)).toBe(usage.bytesUsed);
    });

    test('Should calculate monthly overage correctly', async () => {
      const orgId = testOrganizations.starterOrg.id;
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      // Create mock usage data that exceeds the limit
      const excessiveUsage = 6 * 1024 * 1024 * 1024; // 6GB (1GB overage for STARTER)

      await prisma.storageUsage.create({
        data: {
          organizationId: orgId,
          date: lastMonth,
          bytesStored: BigInt(excessiveUsage),
          byteHours: BigInt(excessiveUsage * 24),
          fileCount: 10,
          costUsd: 0.15,
        },
      });

      const overageResult = await storageBillingService.calculateMonthlyOverage(orgId, lastMonth);

      expect(overageResult.overage.overageCost).toBe(0.10); // 1GB * $0.10/GB for STARTER
      expect(overageResult.overage.overageGB).toBe(1);
    });

    test('Should provide storage analytics', async () => {
      const orgId = testOrganizations.starterOrg.id;

      const analytics = await storageBillingService.getStorageAnalytics(orgId, 30);

      expect(analytics.period.days).toBe(30);
      expect(analytics.usage).toBeInstanceOf(Array);
      expect(analytics.summary).toHaveProperty('avgDailyUsage');
      expect(analytics.summary).toHaveProperty('maxUsage');
      expect(analytics.summary).toHaveProperty('totalCost');
      expect(analytics.summary).toHaveProperty('growthRate');
    });
  });

  describe('Cost Prevention and Safeguards', () => {
    test('Should prevent unlimited storage abuse', async () => {
      // Verify no plan has unlimited storage
      const plans = ['FREE', 'STARTER', 'TEAM', 'BUSINESS', 'ENTERPRISE'];

      for (const plan of plans) {
        const limit = storageBillingService.storageLimits[plan];
        expect(limit).toBeLessThan(Number.MAX_SAFE_INTEGER);
        expect(limit).toBeGreaterThan(0);
      }
    });

    test('Should enforce increasing overage rates for cost control', async () => {
      const rates = storageBillingService.overageRates;

      // Verify rate structure encourages plan upgrades
      expect(rates.STARTER).toBeGreaterThan(rates.TEAM);
      expect(rates.TEAM).toBeGreaterThan(rates.BUSINESS);
      expect(rates.BUSINESS).toBeGreaterThan(rates.ENTERPRISE);
      expect(rates.FREE).toBeNull(); // No overages allowed
    });

    test('Should track costs and maintain profit margins', async () => {
      const orgId = testOrganizations.starterOrg.id;

      // Test cost calculation
      const quotaCheck = await storageBillingService.checkStorageQuota(orgId);

      expect(quotaCheck.costs).toHaveProperty('awsCost');
      expect(quotaCheck.costs).toHaveProperty('customerCost');
      expect(quotaCheck.costs).toHaveProperty('profitMargin');

      // Ensure positive profit margin when there are overages
      if (quotaCheck.overage.estimatedMonthlyCost > 0) {
        expect(quotaCheck.costs.profitMargin).toBeGreaterThan(0);
      }
    });
  });

  // Helper functions
  async function setupTestData() {
    // Create test organizations with different plans
    const organizations = [
      { name: 'Free Test Org', plan: 'FREE' },
      { name: 'Starter Test Org', plan: 'STARTER' },
      { name: 'Team Test Org', plan: 'TEAM' },
      { name: 'Business Test Org', plan: 'BUSINESS' },
      { name: 'Enterprise Test Org', plan: 'ENTERPRISE' },
    ];

    for (const orgData of organizations) {
      const org = await prisma.organization.create({
        data: {
          name: orgData.name,
          isActive: true,
        },
      });

      const subscription = await prisma.subscription.create({
        data: {
          organizationId: org.id,
          plan: orgData.plan,
          status: 'active',
          stripeCustomerId: `cus_test_${org.id}`,
        },
      });

      const user = await prisma.user.create({
        data: {
          email: `test-${orgData.plan.toLowerCase()}@example.com`,
          password: await bcrypt.hash('testpassword', 10),
          firstName: 'Test',
          lastName: 'User',
          isActive: true,
          organizationId: org.id,
        },
      });

      // Store references
      const orgKey = `${orgData.plan.toLowerCase()}Org`;
      testOrganizations[orgKey] = org;
      testUsers[orgKey] = user;

      // Generate auth token
      authTokens[orgKey] = jwt.sign(
        {
          userId: user.id,
          organizationId: org.id,
          email: user.email
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );
    }
  }

  async function cleanupTestData() {
    // Clean up in reverse dependency order
    await prisma.storageUsage.deleteMany({
      where: {
        organizationId: {
          in: Object.values(testOrganizations).map(org => org.id),
        },
      },
    });

    await prisma.storageOverage.deleteMany({
      where: {
        organizationId: {
          in: Object.values(testOrganizations).map(org => org.id),
        },
      },
    });

    await prisma.storagePurchase.deleteMany({
      where: {
        organizationId: {
          in: Object.values(testOrganizations).map(org => org.id),
        },
      },
    });

    await prisma.fileStorage.deleteMany({
      where: {
        organizationId: {
          in: Object.values(testOrganizations).map(org => org.id),
        },
      },
    });

    await prisma.subscription.deleteMany({
      where: {
        organizationId: {
          in: Object.values(testOrganizations).map(org => org.id),
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          contains: '@example.com',
        },
      },
    });

    await prisma.organization.deleteMany({
      where: {
        name: {
          contains: 'Test Org',
        },
      },
    });
  }
});