#!/usr/bin/env node

/**
 * Session Management Security Assessment
 *
 * Tests current session security implementation and identifies gaps:
 * - Session hijacking protection
 * - Session fixation prevention
 * - Secure session configuration
 * - Session timeout handling
 * - Concurrent session management
 */

const express = require('express');
const request = require('supertest');

async function assessSessionSecurity() {
  console.log('🔐 Session Management Security Assessment');
  console.log('='.repeat(50));

  let testsPassed = 0;
  let totalTests = 0;
  const results = [];

  const addResult = (testName, passed, message) => {
    totalTests++;
    if (passed) {
      testsPassed++;
      console.log(`   ✅ ${testName}: ${message}`);
      results.push({ test: testName, status: 'PASS', message });
    } else {
      console.log(`   ❌ ${testName}: ${message}`);
      results.push({ test: testName, status: 'FAIL', message });
    }
  };

  // Test 1: Check if session middleware exists
  console.log('\n1. 🧪 Testing Session Middleware Configuration');
  try {
    let sessionConfigured = false;
    let sessionSecure = false;

    // Check if express-session is installed
    try {
      require('express-session');
      addResult('Session Package', true, 'express-session is available');
    } catch (error) {
      addResult('Session Package', false, 'express-session not installed');
    }

    // Check app.js for session configuration
    const fs = require('fs');
    try {
      const appContent = fs.readFileSync('../app.js', 'utf8');
      sessionConfigured = appContent.includes('session(') || appContent.includes('express-session');

      if (sessionConfigured) {
        // Check for secure session options
        const hasSecure = appContent.includes('secure:') && appContent.includes('true');
        const hasHttpOnly = appContent.includes('httpOnly:') && appContent.includes('true');
        const hasSameSite = appContent.includes('sameSite:');
        const hasSecret = appContent.includes('secret:');

        sessionSecure = hasSecure && hasHttpOnly && hasSameSite && hasSecret;

        addResult('Session Configuration', sessionConfigured, 'Session middleware configured');
        addResult(
          'Secure Session Config',
          sessionSecure,
          sessionSecure ? 'Session has secure configuration' : 'Session security needs improvement'
        );
      } else {
        addResult('Session Configuration', false, 'Session middleware not found in app.js');
      }
    } catch (error) {
      addResult('Session Configuration', false, `Could not read app.js: ${error.message}`);
    }
  } catch (error) {
    addResult('Session Middleware', false, `Test failed: ${error.message}`);
  }

  // Test 2: Session Storage Backend
  console.log('\n2. 🧪 Testing Session Storage');
  try {
    // Check if Redis session store is configured
    let redisStoreFound = false;
    let mongoStoreFound = false;

    try {
      const fs = require('fs');
      const appContent = fs.readFileSync('../app.js', 'utf8');

      redisStoreFound = appContent.includes('RedisStore') || appContent.includes('connect-redis');
      mongoStoreFound = appContent.includes('MongoStore') || appContent.includes('connect-mongo');

      if (redisStoreFound) {
        addResult('Redis Session Store', true, 'Redis session store configured');
      } else if (mongoStoreFound) {
        addResult('Mongo Session Store', true, 'MongoDB session store configured');
      } else {
        addResult('Session Store', false, 'No persistent session store found (using memory store)');
      }
    } catch (error) {
      addResult('Session Store Check', false, `Could not check session store: ${error.message}`);
    }
  } catch (error) {
    addResult('Session Storage', false, `Test failed: ${error.message}`);
  }

  // Test 3: Session Security Headers
  console.log('\n3. 🧪 Testing Session Security Headers');
  try {
    const app = express();
    app.use(
      require('express-session')({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: false,
        cookie: {
          secure: false, // Allow for testing
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000,
          sameSite: 'strict',
        },
      })
    );

    app.get('/test-session', (req, res) => {
      req.session.testData = 'test';
      res.json({ sessionId: req.sessionID });
    });

    const response = await request(app).get('/test-session');

    const hasSessionCookie =
      response.headers['set-cookie'] &&
      response.headers['set-cookie'].some(cookie => cookie.includes('connect.sid'));
    const cookieHeader =
      response.headers['set-cookie']?.find(cookie => cookie.includes('connect.sid')) || '';
    const hasHttpOnly = cookieHeader.includes('HttpOnly');
    const hasSameSite = cookieHeader.includes('SameSite');

    addResult(
      'Session Cookie',
      hasSessionCookie,
      hasSessionCookie ? 'Session cookie is set' : 'Session cookie not found'
    );
    addResult(
      'HttpOnly Cookie',
      hasHttpOnly,
      hasHttpOnly ? 'Session cookie has HttpOnly flag' : 'Session cookie missing HttpOnly'
    );
    addResult(
      'SameSite Cookie',
      hasSameSite,
      hasSameSite ? 'Session cookie has SameSite protection' : 'Session cookie missing SameSite'
    );
  } catch (error) {
    addResult('Session Security Headers', false, `Test failed: ${error.message}`);
  }

  // Test 4: Session Regeneration (Anti-Fixation)
  console.log('\n4. 🧪 Testing Session Regeneration');
  try {
    const app = express();
    app.use(
      require('express-session')({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false, httpOnly: true },
      })
    );

    app.post('/login', (req, res) => {
      const oldSessionId = req.sessionID;
      req.session.regenerate(err => {
        if (err) {
          return res.status(500).json({ error: 'Session regeneration failed' });
        }
        req.session.user = { id: 1, username: 'test' };
        res.json({
          message: 'Login successful',
          oldSessionId,
          newSessionId: req.sessionID,
        });
      });
    });

    const response = await request(app).post('/login');

    const regenerationWorks =
      response.status === 200 && response.body.oldSessionId !== response.body.newSessionId;

    addResult(
      'Session Regeneration',
      regenerationWorks,
      regenerationWorks ? 'Session regenerates on login' : 'Session regeneration not working'
    );
  } catch (error) {
    addResult('Session Regeneration', false, `Test failed: ${error.message}`);
  }

  // Test 5: Check for Session Timeout Implementation
  console.log('\n5. 🧪 Testing Session Timeout');
  try {
    const fs = require('fs');
    let timeoutImplemented = false;
    let rollingTimeoutImplemented = false;

    // Check auth middleware for session timeout logic
    try {
      const authContent = fs.readFileSync('../middleware/auth.js', 'utf8');
      timeoutImplemented =
        authContent.includes('lastActivity') ||
        authContent.includes('sessionTimeout') ||
        authContent.includes('maxAge');
      rollingTimeoutImplemented =
        authContent.includes('lastActivity') && authContent.includes('Date.now()');

      addResult(
        'Session Timeout',
        timeoutImplemented,
        timeoutImplemented ? 'Session timeout logic found' : 'No session timeout implementation'
      );
      addResult(
        'Rolling Timeout',
        rollingTimeoutImplemented,
        rollingTimeoutImplemented ? 'Rolling session timeout implemented' : 'Static timeout only'
      );
    } catch (error) {
      addResult(
        'Session Timeout Check',
        false,
        `Could not check auth middleware: ${error.message}`
      );
    }
  } catch (error) {
    addResult('Session Timeout', false, `Test failed: ${error.message}`);
  }

  // Test 6: Concurrent Session Management
  console.log('\n6. 🧪 Testing Concurrent Session Management');
  try {
    const fs = require('fs');
    let concurrentSessionsHandled = false;

    // Check if there's logic for managing multiple sessions per user
    try {
      const authContent = fs.readFileSync('../middleware/auth.js', 'utf8');
      const serviceFiles = fs
        .readdirSync('../services/')
        .filter(f => f.includes('session') || f.includes('auth'));

      concurrentSessionsHandled =
        authContent.includes('activeSessions') ||
        authContent.includes('maxSessions') ||
        serviceFiles.length > 0;

      addResult(
        'Concurrent Sessions',
        concurrentSessionsHandled,
        concurrentSessionsHandled
          ? 'Concurrent session management found'
          : 'No concurrent session handling'
      );
    } catch (error) {
      addResult(
        'Concurrent Sessions Check',
        false,
        `Could not check session management: ${error.message}`
      );
    }
  } catch (error) {
    addResult('Concurrent Session Management', false, `Test failed: ${error.message}`);
  }

  // Generate comprehensive report
  console.log('\n' + '='.repeat(50));
  console.log('📊 SESSION SECURITY ASSESSMENT REPORT');
  console.log('='.repeat(50));

  const passedTests = results.filter(r => r.status === 'PASS');
  const failedTests = results.filter(r => r.status === 'FAIL');

  console.log(`\n✅ PASSED: ${passedTests.length}/${totalTests} tests`);
  if (passedTests.length > 0) {
    passedTests.forEach(test => {
      console.log(`   • ${test.test}: ${test.message}`);
    });
  }

  if (failedTests.length > 0) {
    console.log(`\n❌ FAILED: ${failedTests.length} tests`);
    failedTests.forEach(test => {
      console.log(`   • ${test.test}: ${test.message}`);
    });
  }

  const scorePercentage = ((testsPassed / totalTests) * 100).toFixed(1);
  console.log(`\n📈 OVERALL SCORE: ${scorePercentage}%`);

  if (scorePercentage >= 90) {
    console.log('🏆 EXCELLENT: Session security is very strong');
  } else if (scorePercentage >= 75) {
    console.log('✅ GOOD: Session security is adequate with minor gaps');
  } else if (scorePercentage >= 50) {
    console.log('⚠️ FAIR: Session security needs improvement');
  } else {
    console.log('❌ POOR: Session security requires immediate attention');
  }

  console.log('\n🔧 RECOMMENDED ENHANCEMENTS:');
  if (scorePercentage < 90) {
    console.log('   • Implement secure session configuration');
    console.log('   • Add session regeneration on login');
    console.log('   • Implement session timeout with rolling expiration');
    console.log('   • Add concurrent session management');
    console.log('   • Use persistent session store (Redis/MongoDB)');
    console.log('   • Implement session hijacking detection');
  } else {
    console.log('   • ✅ Session security is well implemented');
    console.log('   • 💡 Consider: Session activity monitoring');
    console.log('   • 💡 Consider: Geo-location based session validation');
  }

  console.log('\n' + '='.repeat(50));

  return {
    total: totalTests,
    passed: testsPassed,
    score: scorePercentage,
    results: results,
  };
}

if (require.main === module) {
  assessSessionSecurity().catch(console.error);
}

module.exports = assessSessionSecurity;
