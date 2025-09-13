#!/usr/bin/env node

/**
 * Debug XSS Test - Identify the exact failing test case
 */

const express = require('express');
const request = require('supertest');
const helmet = require('helmet');

async function debugXSSTest() {
  console.log('🔍 Debugging XSS Prevention Test Failure');
  console.log('='.repeat(50));

  const app = express();
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          objectSrc: ["'none'"],
        },
      },
    })
  );
  app.use(express.json());

  app.post('/api/comment', (req, res) => {
    const { comment } = req.body;
    const escaped = comment
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');

    res.json({ success: true, original: comment, escaped });
  });

  const tests = [
    {
      name: 'Script injection',
      payload: '<script>alert("XSS")</script>',
      expected: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;',
    },
    {
      name: 'IMG onerror',
      payload: '<img src="x" onerror="alert(\'XSS\')">',
      expected: '&lt;img src=&quot;x&quot; onerror=&quot;alert(&#x27;XSS&#x27;)&quot;&gt;',
    },
    {
      name: 'JavaScript URL',
      payload: '<a href="javascript:alert(\'XSS\')">Click</a>',
      expected: '&lt;a href=&quot;javascript:alert(&#x27;XSS&#x27;)&quot;&gt;Click&lt;/a&gt;',
    },
    {
      name: 'Safe content',
      payload: 'Normal comment text',
      expected: 'Normal comment text',
    },
  ];

  console.log('Testing each XSS case in detail:\n');

  let totalTests = 0;
  let passedTests = 0;

  for (const test of tests) {
    totalTests++;
    console.log(`Test: ${test.name}`);
    console.log(`Input: ${test.payload}`);
    console.log(`Expected: ${test.expected}`);

    try {
      const response = await request(app).post('/api/comment').send({ comment: test.payload });
      const actual = response.body.escaped;

      console.log(`Actual: ${actual}`);

      if (actual === test.expected) {
        console.log(`✅ PASS\n`);
        passedTests++;
      } else {
        console.log(`❌ FAIL`);
        console.log(`Difference found:`);

        // Character-by-character comparison
        for (let i = 0; i < Math.max(actual.length, test.expected.length); i++) {
          const actualChar = actual[i] || 'EOF';
          const expectedChar = test.expected[i] || 'EOF';
          if (actualChar !== expectedChar) {
            console.log(`  Position ${i}: got '${actualChar}' expected '${expectedChar}'`);
          }
        }
        console.log();
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}\n`);
    }
  }

  // Test CSP headers
  console.log('Testing Content Security Policy headers:');
  try {
    const response = await request(app).post('/api/comment').send({ comment: 'test' });
    const csp = response.headers['content-security-policy'];

    if (csp) {
      console.log(`✅ CSP Header present: ${csp}`);
      totalTests++;
      passedTests++;
    } else {
      console.log(`❌ CSP Header missing`);
      totalTests++;
    }
  } catch (error) {
    console.log(`❌ CSP test error: ${error.message}`);
    totalTests++;
  }

  console.log('\n' + '='.repeat(50));
  console.log(
    `Summary: ${passedTests}/${totalTests} tests passed (${((passedTests / totalTests) * 100).toFixed(1)}%)`
  );

  if (passedTests < totalTests) {
    console.log('\n🔧 Issues found that need fixing:');
    if (passedTests < totalTests - 1) {
      console.log('• XSS escaping logic needs adjustment');
    }
    if (!response.headers['content-security-policy']) {
      console.log('• CSP headers configuration needs review');
    }
  }
}

if (require.main === module) {
  debugXSSTest().catch(console.error);
}

module.exports = debugXSSTest;
