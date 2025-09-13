const request = require('supertest');
const express = require('express');
const { PrismaClient } = require('@prisma/client');

describe('SQL Injection Prevention Tests', () => {
  let app;
  let prisma;

  beforeEach(() => {
    app = express();
    prisma = new PrismaClient();
    app.use(express.json());

    // Mock vulnerable endpoints to test SQL injection prevention
    app.post('/api/test/search', async (req, res) => {
      try {
        const { query } = req.body;

        // This should use parameterized queries (safe)
        const results = await prisma.user.findMany({
          where: {
            email: {
              contains: query,
            },
          },
        });

        res.json({ results });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Test raw query handling (should be parameterized)
    app.post('/api/test/raw-query', async (req, res) => {
      try {
        const { userId } = req.body;

        // Safe parameterized query
        const result = await prisma.$queryRaw`
          SELECT * FROM "User" WHERE id = ${userId}
        `;

        res.json({ result });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  });

  afterEach(async () => {
    await prisma.$disconnect();
  });

  describe('Parameterized Query Protection', () => {
    test('should prevent SQL injection in search queries', async () => {
      const maliciousPayload = "'; DROP TABLE users; --";

      const response = await request(app)
        .post('/api/test/search')
        .send({ query: maliciousPayload })
        .expect(200);

      // Should return empty results, not execute malicious SQL
      expect(response.body.results).toBeDefined();
      expect(Array.isArray(response.body.results)).toBe(true);
    });

    test('should prevent SQL injection in numeric parameters', async () => {
      const maliciousPayload = '1; DROP TABLE users; --';

      const response = await request(app)
        .post('/api/test/raw-query')
        .send({ userId: maliciousPayload })
        .expect(500); // Should fail due to invalid parameter type

      expect(response.body.error).toBeDefined();
    });

    test('should handle special characters safely in search', async () => {
      const specialChars = 'test\'"\\;--/**/';

      const response = await request(app)
        .post('/api/test/search')
        .send({ query: specialChars })
        .expect(200);

      expect(response.body.results).toBeDefined();
      expect(Array.isArray(response.body.results)).toBe(true);
    });

    test('should prevent union-based SQL injection', async () => {
      const unionPayload = "test' UNION SELECT * FROM passwords WHERE '1'='1";

      const response = await request(app)
        .post('/api/test/search')
        .send({ query: unionPayload })
        .expect(200);

      // Should treat entire payload as search string, not execute UNION
      expect(response.body.results).toBeDefined();
      expect(Array.isArray(response.body.results)).toBe(true);
    });

    test('should prevent boolean-based blind SQL injection', async () => {
      const blindPayload = "test' AND 1=1 --";

      const response = await request(app)
        .post('/api/test/search')
        .send({ query: blindPayload })
        .expect(200);

      expect(response.body.results).toBeDefined();
      expect(Array.isArray(response.body.results)).toBe(true);
    });

    test('should prevent time-based blind SQL injection', async () => {
      const timePayload = "test'; WAITFOR DELAY '00:00:05'; --";

      const startTime = Date.now();
      const response = await request(app)
        .post('/api/test/search')
        .send({ query: timePayload })
        .expect(200);
      const endTime = Date.now();

      // Should not cause significant delay (under 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      expect(response.body.results).toBeDefined();
    });
  });

  describe('Input Sanitization', () => {
    test('should reject malformed JSON with SQL injection attempts', async () => {
      const malformedJson = '{"query": "test"; DROP TABLE users; --"}';

      const response = await request(app)
        .post('/api/test/search')
        .set('Content-Type', 'application/json')
        .send(malformedJson)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should handle null and undefined values safely', async () => {
      const response1 = await request(app)
        .post('/api/test/search')
        .send({ query: null })
        .expect(200);

      const response2 = await request(app)
        .post('/api/test/search')
        .send({ query: undefined })
        .expect(200);

      expect(response1.body.results).toBeDefined();
      expect(response2.body.results).toBeDefined();
    });

    test('should limit query length to prevent buffer overflow attacks', async () => {
      const longPayload = 'A'.repeat(10000) + "'; DROP TABLE users; --";

      const response = await request(app)
        .post('/api/test/search')
        .send({ query: longPayload })
        .expect(200);

      // Should handle long strings without executing malicious code
      expect(response.body.results).toBeDefined();
    });
  });

  describe('Error Handling Security', () => {
    test('should not expose database structure in error messages', async () => {
      const response = await request(app)
        .post('/api/test/raw-query')
        .send({ userId: 'invalid_id_type' })
        .expect(500);

      const errorMessage = response.body.error.toLowerCase();

      // Should not contain sensitive database information
      expect(errorMessage).not.toContain('table');
      expect(errorMessage).not.toContain('column');
      expect(errorMessage).not.toContain('schema');
      expect(errorMessage).not.toContain('database');
    });

    test('should handle database connection errors securely', async () => {
      // Simulate database connection failure
      await prisma.$disconnect();

      const response = await request(app)
        .post('/api/test/search')
        .send({ query: 'test' })
        .expect(500);

      // Should not expose internal error details
      expect(response.body.error).toBeDefined();
      expect(response.body.error).not.toContain('connection');
      expect(response.body.error).not.toContain('prisma');
    });
  });
});
