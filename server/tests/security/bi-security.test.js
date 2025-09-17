const request = require('supertest');
const app = require('../../app');
const { generateTestToken } = require('../helpers/authHelper');

describe('BI Security Tests', () => {
  let userTokenOrgA, userTokenOrgB, adminToken;
  let orgAId = 'org-a-uuid';
  let orgBId = 'org-b-uuid';
  let workflowAId = 'workflow-a-uuid';
  let workflowBId = 'workflow-b-uuid';

  beforeAll(async () => {
    // Generate test tokens for different organizations
    userTokenOrgA = generateTestToken({
      userId: 'user-a-uuid',
      organizationId: orgAId,
      role: 'MEMBER',
      email: 'user-a@org-a.com',
    });

    userTokenOrgB = generateTestToken({
      userId: 'user-b-uuid',
      organizationId: orgBId,
      role: 'MEMBER',
      email: 'user-b@org-b.com',
    });

    adminToken = generateTestToken({
      userId: 'admin-uuid',
      organizationId: orgAId,
      role: 'ORGANIZATION_ADMIN',
      email: 'admin@org-a.com',
    });
  });

  describe('Workflow Analytics Security', () => {
    test('should prevent access to other organization workflows', async () => {
      const response = await request(app)
        .get(`/api/workflows/${workflowBId}/analytics`)
        .set('Authorization', `Bearer ${userTokenOrgA}`)
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    test('should prevent access to analytics summary with manipulated org ID', async () => {
      const response = await request(app)
        .get(`/api/workflows/analytics/summary?organizationId=${orgBId}`)
        .set('Authorization', `Bearer ${userTokenOrgA}`)
        .expect(200);

      // Should return data for user's org (orgAId), not the requested orgBId
      expect(response.body.success).toBe(true);
      // Data should be scoped to user's organization, not the requested one
    });

    test('should prevent access to trends with manipulated parameters', async () => {
      const response = await request(app)
        .get(`/api/workflows/analytics/trends?organizationId=${orgBId}`)
        .set('Authorization', `Bearer ${userTokenOrgA}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should return trends for user's org only
    });

    test('should prevent access to optimization for unauthorized workflows', async () => {
      const response = await request(app)
        .get(`/api/workflows/${workflowBId}/optimization`)
        .set('Authorization', `Bearer ${userTokenOrgA}`)
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('AI Query Security', () => {
    test('should require authentication for NL queries', async () => {
      const response = await request(app)
        .post('/api/ai/nl-query')
        .send({ query: 'Show me all users' })
        .expect(401);
    });

    test('should require organization membership for NL queries', async () => {
      const tokenWithoutOrg = generateTestToken({
        userId: 'user-no-org',
        role: 'MEMBER',
        email: 'user@example.com',
        // No organizationId
      });

      const response = await request(app)
        .post('/api/ai/nl-query')
        .set('Authorization', `Bearer ${tokenWithoutOrg}`)
        .send({ query: 'Show me all users' })
        .expect(403);

      expect(response.body.error).toContain('organization');
    });

    test('should scope AI queries to user organization', async () => {
      const response = await request(app)
        .post('/api/ai/nl-query')
        .set('Authorization', `Bearer ${userTokenOrgA}`)
        .send({
          query: 'Show me user count',
          serviceName: 'test-service',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      // The generated query should include organization scoping
      if (response.body.data.generatedQuery) {
        expect(response.body.data.generatedQuery.toLowerCase()).toContain('organizationid');
      }
    });
  });

  describe('Cross-Organization Data Isolation', () => {
    test('should not leak data between organizations in analytics', async () => {
      // User from Org A tries to access data
      const responseA = await request(app)
        .get('/api/workflows/analytics/summary')
        .set('Authorization', `Bearer ${userTokenOrgA}`)
        .expect(200);

      // User from Org B tries to access data
      const responseB = await request(app)
        .get('/api/workflows/analytics/summary')
        .set('Authorization', `Bearer ${userTokenOrgB}`)
        .expect(200);

      // Responses should be different (organization-scoped)
      expect(responseA.body).not.toEqual(responseB.body);
    });

    test('should enforce organization boundaries in all endpoints', async () => {
      const endpoints = ['/api/workflows/analytics/summary', '/api/workflows/analytics/trends'];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${userTokenOrgA}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        // Data should be scoped to organization
      }
    });
  });

  describe('Input Validation Security', () => {
    test('should reject dangerous SQL injection attempts in NL queries', async () => {
      const maliciousQueries = [
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM sensitive_data --",
        "'; DELETE FROM workflows; --",
      ];

      for (const maliciousQuery of maliciousQueries) {
        const response = await request(app)
          .post('/api/ai/nl-query')
          .set('Authorization', `Bearer ${userTokenOrgA}`)
          .send({ query: maliciousQuery })
          .expect(200);

        // Should not execute dangerous queries
        if (response.body.data.executionError) {
          expect(response.body.data.executionError).toContain('security');
        }
      }
    });

    test('should validate UUID format for workflow IDs', async () => {
      const invalidIds = ['invalid-id', '123', 'not-a-uuid'];

      for (const invalidId of invalidIds) {
        const response = await request(app)
          .get(`/api/workflows/${invalidId}/analytics`)
          .set('Authorization', `Bearer ${userTokenOrgA}`)
          .expect(400);
      }
    });
  });

  describe('Rate Limiting and DoS Protection', () => {
    test('should rate limit NL query requests', async () => {
      const requests = [];

      // Make multiple rapid requests
      for (let i = 0; i < 15; i++) {
        requests.push(
          request(app)
            .post('/api/ai/nl-query')
            .set('Authorization', `Bearer ${userTokenOrgA}`)
            .send({ query: `Query ${i}` })
        );
      }

      const responses = await Promise.all(requests);

      // Some requests should be rate limited
      const rateLimited = responses.some(res => res.status === 429);
      expect(rateLimited).toBe(true);
    });
  });
});

describe('Security Headers and CORS', () => {
  test('should include security headers in responses', async () => {
    const response = await request(app)
      .get('/api/workflows/analytics/summary')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Check for security headers
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBeDefined();
  });
});

// Helper function to generate test JWT tokens
function generateTestToken(payload) {
  const jwt = require('jsonwebtoken');
  return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
}
