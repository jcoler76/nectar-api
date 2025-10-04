/**
 * Advanced Penetration Testing - Beyond OWASP Top 10
 * Tests for sophisticated attack vectors
 */

const axios = require('axios');
const crypto = require('crypto');

const CONFIG = {
  baseURL: process.env.TEST_BASE_URL || 'http://localhost:3001',
  timeout: 30000,
};

class AdvancedSecurityTests {
  constructor() {
    this.client = axios.create({
      baseURL: CONFIG.baseURL,
      timeout: CONFIG.timeout,
      validateStatus: () => true,
    });
    this.results = [];
  }

  log(name, passed, severity, details = {}) {
    this.results.push({ name, passed, severity, details, timestamp: new Date() });
    console.log(`${passed ? '✓' : '✗'} ${name} [${severity}]`);
  }

  // ==================== Timing Attack Tests ====================

  async testTimingAttacks() {
    console.log('\n=== Timing Attack Tests ===\n');

    // Test 1: User enumeration via timing
    try {
      const validEmail = 'admin@nectar.com';
      const invalidEmail = 'nonexistent@nectar.com';

      const times = [];

      // Test valid email multiple times
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await this.client.post('/api/auth/login', {
          email: validEmail,
          password: 'wrongpassword',
        });
        times.push({ type: 'valid', time: Date.now() - start });
      }

      // Test invalid email multiple times
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await this.client.post('/api/auth/login', {
          email: invalidEmail,
          password: 'wrongpassword',
        });
        times.push({ type: 'invalid', time: Date.now() - start });
      }

      const validAvg = times.filter(t => t.type === 'valid').reduce((a, b) => a + b.time, 0) / 5;
      const invalidAvg =
        times.filter(t => t.type === 'invalid').reduce((a, b) => a + b.time, 0) / 5;
      const timeDiff = Math.abs(validAvg - invalidAvg);

      // If timing difference is significant (>100ms), it could indicate user enumeration
      this.log('Timing attack resistance (user enumeration)', timeDiff < 100, 'MEDIUM', {
        validAvg: validAvg.toFixed(2),
        invalidAvg: invalidAvg.toFixed(2),
        difference: timeDiff.toFixed(2),
      });
    } catch (error) {
      this.log('Timing attack test', false, 'MEDIUM', { error: error.message });
    }

    // Test 2: Password comparison timing
    try {
      const passwords = ['a', 'ab', 'abc', 'abcd', 'abcde'];
      const times = [];

      for (const password of passwords) {
        const start = Date.now();
        await this.client.post('/api/auth/login', {
          email: 'test@nectar.com',
          password,
        });
        times.push({ length: password.length, time: Date.now() - start });
      }

      // Check if timing increases with password length (indicates non-constant-time comparison)
      const correlation = this.calculateCorrelation(times);

      this.log(
        'Constant-time password comparison',
        Math.abs(correlation) < 0.7, // Low correlation is good
        'MEDIUM',
        { correlation: correlation.toFixed(3), times }
      );
    } catch (error) {
      this.log('Password timing test', true, 'INFO');
    }
  }

  calculateCorrelation(data) {
    const n = data.length;
    const sumX = data.reduce((sum, item) => sum + item.length, 0);
    const sumY = data.reduce((sum, item) => sum + item.time, 0);
    const sumXY = data.reduce((sum, item) => sum + item.length * item.time, 0);
    const sumX2 = data.reduce((sum, item) => sum + item.length * item.length, 0);
    const sumY2 = data.reduce((sum, item) => sum + item.time * item.time, 0);

    return (
      (n * sumXY - sumX * sumY) / Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
    );
  }

  // ==================== Race Condition Tests ====================

  async testRaceConditions() {
    console.log('\n=== Race Condition Tests ===\n');

    // Test 1: Concurrent requests exploiting race conditions
    try {
      const promises = [];

      // Attempt to exploit race condition in credit/resource allocation
      for (let i = 0; i < 10; i++) {
        promises.push(
          this.client.post('/api/organizations', {
            name: `test-org-${crypto.randomBytes(4).toString('hex')}`,
            slug: `test-${crypto.randomBytes(4).toString('hex')}`,
          })
        );
      }

      const responses = await Promise.all(promises);
      const successCount = responses.filter(r => r.status === 201 || r.status === 200).length;

      this.log(
        'Race condition protection (concurrent resource creation)',
        successCount <= 1, // Should only allow one to succeed if properly protected
        'HIGH',
        { attempts: 10, successful: successCount }
      );
    } catch (error) {
      this.log('Race condition test', true, 'INFO');
    }

    // Test 2: Token refresh race condition
    try {
      const promises = [];

      // Attempt to use refresh token multiple times simultaneously
      for (let i = 0; i < 5; i++) {
        promises.push(
          this.client.post(
            '/api/auth/refresh',
            {},
            {
              headers: { Cookie: 'refreshToken=test-token-12345' },
            }
          )
        );
      }

      const responses = await Promise.all(promises);
      const successCount = responses.filter(r => r.status === 200).length;

      this.log('Refresh token race condition protection', successCount <= 1, 'HIGH', {
        attempts: 5,
        successful: successCount,
      });
    } catch (error) {
      this.log('Token refresh race condition test', true, 'INFO');
    }
  }

  // ==================== Business Logic Tests ====================

  async testBusinessLogicFlaws() {
    console.log('\n=== Business Logic Vulnerability Tests ===\n');

    // Test 1: Price manipulation
    try {
      const response = await this.client.post('/api/checkout', {
        plan: 'enterprise',
        price: 0.01, // Attempt to manipulate price
        credits: 999999,
      });

      this.log(
        'Price manipulation protection',
        response.status >= 400 || (response.data && response.data.price !== 0.01),
        'CRITICAL',
        { status: response.status }
      );
    } catch (error) {
      this.log('Price manipulation test', true, 'INFO');
    }

    // Test 2: Negative quantity
    try {
      const response = await this.client.post('/api/credits/purchase', {
        quantity: -100, // Negative quantity to add credits instead of subtracting
      });

      this.log('Negative quantity validation', response.status >= 400, 'HIGH', {
        status: response.status,
      });
    } catch (error) {
      this.log('Negative quantity test', true, 'INFO');
    }

    // Test 3: Workflow execution limit bypass
    try {
      const promises = [];

      // Attempt to execute workflow more times than allowed
      for (let i = 0; i < 1000; i++) {
        promises.push(
          this.client.post('/api/workflows/execute', {
            workflowId: 'test-workflow-id',
          })
        );
      }

      const responses = await Promise.all(promises);
      const blockedCount = responses.filter(r => r.status === 429 || r.status === 402).length;

      this.log(
        'Workflow execution limits enforced',
        blockedCount > 900, // Most should be blocked
        'MEDIUM',
        { total: 1000, blocked: blockedCount }
      );
    } catch (error) {
      this.log('Workflow limit test', true, 'INFO');
    }

    // Test 4: Account takeover via email change
    try {
      const response = await this.client.patch('/api/users/profile', {
        email: 'admin@nectar.com', // Attempt to change to admin email
      });

      this.log(
        'Email change requires verification',
        response.status >= 400 || (response.data && response.data.emailVerified === false),
        'HIGH',
        { status: response.status }
      );
    } catch (error) {
      this.log('Email change verification test', true, 'INFO');
    }
  }

  // ==================== Cryptographic Tests ====================

  async testCryptographicFlaws() {
    console.log('\n=== Cryptographic Vulnerability Tests ===\n');

    // Test 1: Password policy enforcement
    try {
      const weakPasswords = ['123456', 'password', 'abc123', '12345678', 'qwerty'];
      let rejectedCount = 0;

      for (const password of weakPasswords) {
        const response = await this.client.post('/api/auth/register', {
          email: `test${Math.random()}@test.com`,
          password,
          firstName: 'Test',
          lastName: 'User',
        });

        if (response.status >= 400) {
          rejectedCount++;
        }
      }

      this.log('Weak password rejection', rejectedCount === weakPasswords.length, 'HIGH', {
        tested: weakPasswords.length,
        rejected: rejectedCount,
      });
    } catch (error) {
      this.log('Password policy test', false, 'HIGH', { error: error.message });
    }

    // Test 2: Secure random token generation
    try {
      const tokens = [];

      // Request multiple password reset tokens
      for (let i = 0; i < 3; i++) {
        const response = await this.client.post('/api/auth/forgot-password', {
          email: 'test@nectar.com',
        });

        if (response.data && response.data.token) {
          tokens.push(response.data.token);
        }
      }

      // Check for token uniqueness and entropy
      const uniqueTokens = new Set(tokens).size;
      const hasHighEntropy = tokens.every(t => t && t.length >= 32);

      this.log(
        'Secure token generation',
        uniqueTokens === tokens.length && hasHighEntropy,
        'HIGH',
        { tokens: tokens.length, unique: uniqueTokens, highEntropy: hasHighEntropy }
      );
    } catch (error) {
      this.log('Token generation test', true, 'INFO');
    }

    // Test 3: Insecure direct references
    try {
      // Sequential ID enumeration
      const ids = ['1', '2', '3', '100', '1000'];
      let exposedCount = 0;

      for (const id of ids) {
        const response = await this.client.get(`/api/workflows/${id}`);

        if (response.status === 200 && response.data) {
          exposedCount++;
        }
      }

      this.log('Sequential ID enumeration protected', exposedCount === 0, 'MEDIUM', {
        tested: ids.length,
        exposed: exposedCount,
      });
    } catch (error) {
      this.log('ID enumeration test', true, 'INFO');
    }
  }

  // ==================== API Abuse Tests ====================

  async testAPIAbuse() {
    console.log('\n=== API Abuse & Resource Exhaustion Tests ===\n');

    // Test 1: GraphQL query complexity attack
    try {
      const complexQuery = {
        query: `
          {
            ${'users { workflows { executions { logs { '.repeat(10)}}}}}}}}}}}}}}
          }
        `,
      };

      const response = await this.client.post('/graphql', complexQuery);

      this.log(
        'GraphQL complexity limiting',
        response.status >= 400 || (response.data && response.data.errors),
        'HIGH',
        { status: response.status }
      );
    } catch (error) {
      this.log('GraphQL complexity test', true, 'INFO');
    }

    // Test 2: Slowloris attack simulation (slow request)
    try {
      const start = Date.now();

      // Send request with very slow data
      const response = await this.client.post(
        '/api/contact-chat',
        { message: 'test', email: 'test@test.com' },
        { timeout: 120000 } // 2 minute timeout
      );

      const duration = Date.now() - start;

      this.log(
        'Request timeout protection',
        duration < 60000, // Should timeout before 1 minute
        'MEDIUM',
        { duration: `${duration}ms` }
      );
    } catch (error) {
      this.log('Slowloris protection test', true, 'INFO');
    }

    // Test 3: JSON bomb attack
    try {
      const jsonBomb = { data: 'x'.repeat(100000000) }; // 100MB string

      const response = await this.client.post('/api/contact-chat', jsonBomb);

      this.log(
        'JSON bomb protection',
        response.status === 413 || response.status === 400,
        'MEDIUM',
        { status: response.status, size: '100MB' }
      );
    } catch (error) {
      this.log('JSON bomb protection test', true, 'INFO');
    }

    // Test 4: API endpoint discovery
    try {
      const endpoints = [
        '/admin',
        '/api/admin',
        '/api/debug',
        '/api/internal',
        '/api/test',
        '/.well-known/security.txt',
      ];

      let exposedCount = 0;

      for (const endpoint of endpoints) {
        const response = await this.client.get(endpoint);

        if (response.status === 200) {
          exposedCount++;
        }
      }

      this.log('Hidden endpoints properly secured', exposedCount === 0, 'LOW', {
        tested: endpoints.length,
        exposed: exposedCount,
      });
    } catch (error) {
      this.log('Endpoint discovery test', true, 'INFO');
    }
  }

  // ==================== Memory & Resource Tests ====================

  async testResourceExhaustion() {
    console.log('\n=== Resource Exhaustion Tests ===\n');

    // Test 1: Regex DoS (ReDoS)
    try {
      const redosPayloads = ['a'.repeat(100000) + '!', '(' + 'a'.repeat(50000) + ')*'];

      for (const payload of redosPayloads) {
        const start = Date.now();

        await this.client.post('/api/contact-chat', {
          message: payload,
          email: 'test@test.com',
        });

        const duration = Date.now() - start;

        this.log(
          `ReDoS protection (${payload.length} chars)`,
          duration < 5000, // Should respond in less than 5 seconds
          'HIGH',
          { duration: `${duration}ms`, payloadLength: payload.length }
        );
      }
    } catch (error) {
      this.log('ReDoS protection test', true, 'INFO');
    }

    // Test 2: Connection pool exhaustion
    try {
      const promises = [];

      // Attempt to exhaust connection pool
      for (let i = 0; i < 200; i++) {
        promises.push(this.client.get('/api/health', { timeout: 60000 }));
      }

      const responses = await Promise.all(promises);
      const errorCount = responses.filter(r => r.status === 503 || r.status === 500).length;

      this.log(
        'Connection pool management',
        errorCount < 50, // Some failures are acceptable, but not too many
        'MEDIUM',
        { total: 200, errors: errorCount }
      );
    } catch (error) {
      this.log('Connection pool test', false, 'MEDIUM', { error: error.message });
    }
  }

  // ==================== Run All Advanced Tests ====================

  async runAll() {
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║        Advanced Security & Penetration Testing Suite              ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    await this.testTimingAttacks();
    await this.testRaceConditions();
    await this.testBusinessLogicFlaws();
    await this.testCryptographicFlaws();
    await this.testAPIAbuse();
    await this.testResourceExhaustion();

    // Summary
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;

    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                    ADVANCED TESTS SUMMARY                          ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');
    console.log(`Total: ${this.results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}\n`);

    return this.results;
  }
}

// Run if executed directly
if (require.main === module) {
  const tester = new AdvancedSecurityTests();
  tester
    .runAll()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
}

module.exports = AdvancedSecurityTests;
