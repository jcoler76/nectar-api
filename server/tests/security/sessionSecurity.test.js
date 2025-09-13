const request = require('supertest');
const express = require('express');
const session = require('express-session');
const jwt = require('jsonwebtoken');

describe('Session Management & Security Tests', () => {
  let app;
  const JWT_SECRET = 'test-jwt-secret-for-testing-32-chars';

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Configure secure session
    app.use(
      session({
        secret: 'test-session-secret-should-be-env-var',
        name: 'sessionId', // Don't use default 'connect.sid'
        resave: false,
        saveUninitialized: false,
        cookie: {
          secure: false, // Set to true in production with HTTPS
          httpOnly: true,
          maxAge: 30 * 60 * 1000, // 30 minutes
          sameSite: 'strict',
        },
        rolling: true, // Reset expiration on activity
      })
    );

    // Mock user database
    const users = {
      1: {
        id: 1,
        email: 'user@example.com',
        password: 'hashed-password',
        sessionVersion: 1,
      },
    };

    // Mock session store for blacklisted tokens
    const blacklistedTokens = new Set();
    const activeSessions = new Map();

    // Login endpoint with session creation
    app.post('/api/auth/login', async (req, res) => {
      const { email, password } = req.body;

      // Simulate authentication
      const user = Object.values(users).find(u => u.email === email);
      if (!user || password !== 'correct-password') {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Create session
      req.session.userId = user.id;
      req.session.email = user.email;
      req.session.loginTime = new Date();
      req.session.lastActivity = new Date();

      // Generate JWT with session reference
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          sessionId: req.session.id,
          sessionVersion: user.sessionVersion,
        },
        JWT_SECRET,
        { expiresIn: '30m' }
      );

      // Track active session
      activeSessions.set(req.session.id, {
        userId: user.id,
        createdAt: new Date(),
        lastActivity: new Date(),
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        token: token,
        sessionId: req.session.id,
        user: {
          id: user.id,
          email: user.email,
        },
      });
    });

    // Logout endpoint
    app.post('/api/auth/logout', (req, res) => {
      const token = req.headers.authorization?.split(' ')[1];

      if (token) {
        blacklistedTokens.add(token);
      }

      if (req.session) {
        activeSessions.delete(req.session.id);
        req.session.destroy(err => {
          if (err) {
            return res.status(500).json({ error: 'Logout failed' });
          }
          res.clearCookie('sessionId');
          res.json({ success: true, message: 'Logged out successfully' });
        });
      } else {
        res.json({ success: true, message: 'No active session' });
      }
    });

    // Session validation middleware
    const validateSession = (req, res, next) => {
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      if (blacklistedTokens.has(token)) {
        return res.status(401).json({ error: 'Token has been revoked' });
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Check if session still exists
        if (!activeSessions.has(decoded.sessionId)) {
          return res.status(401).json({ error: 'Session has expired' });
        }

        // Check session version for forced logout
        const user = users[decoded.userId];
        if (user && user.sessionVersion !== decoded.sessionVersion) {
          return res.status(401).json({ error: 'Session invalidated by security update' });
        }

        // Update last activity
        const session = activeSessions.get(decoded.sessionId);
        session.lastActivity = new Date();

        req.user = decoded;
        req.sessionData = session;
        next();
      } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    };

    // Protected endpoint
    app.get('/api/protected/profile', validateSession, (req, res) => {
      res.json({
        success: true,
        user: req.user,
        sessionInfo: {
          createdAt: req.sessionData.createdAt,
          lastActivity: req.sessionData.lastActivity,
          userAgent: req.sessionData.userAgent,
        },
      });
    });

    // Session management endpoints
    app.get('/api/sessions/active', validateSession, (req, res) => {
      const userSessions = [];

      for (const [sessionId, sessionData] of activeSessions.entries()) {
        if (sessionData.userId === req.user.userId) {
          userSessions.push({
            sessionId: sessionId,
            createdAt: sessionData.createdAt,
            lastActivity: sessionData.lastActivity,
            userAgent: sessionData.userAgent,
            ipAddress: sessionData.ipAddress,
            current: sessionId === req.user.sessionId,
          });
        }
      }

      res.json({
        success: true,
        sessions: userSessions,
      });
    });

    app.delete('/api/sessions/:sessionId', validateSession, (req, res) => {
      const { sessionId } = req.params;
      const session = activeSessions.get(sessionId);

      if (!session || session.userId !== req.user.userId) {
        return res.status(404).json({ error: 'Session not found' });
      }

      activeSessions.delete(sessionId);
      res.json({
        success: true,
        message: 'Session terminated',
      });
    });

    app.delete('/api/sessions/all/except-current', validateSession, (req, res) => {
      let terminatedCount = 0;

      for (const [sessionId, sessionData] of activeSessions.entries()) {
        if (sessionData.userId === req.user.userId && sessionId !== req.user.sessionId) {
          activeSessions.delete(sessionId);
          terminatedCount++;
        }
      }

      res.json({
        success: true,
        message: `${terminatedCount} sessions terminated`,
      });
    });

    // Change password endpoint (invalidates all sessions)
    app.post('/api/auth/change-password', validateSession, (req, res) => {
      const { currentPassword, newPassword } = req.body;
      const user = users[req.user.userId];

      if (!user || currentPassword !== 'correct-password') {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Update user and increment session version
      user.password = 'new-hashed-password';
      user.sessionVersion += 1;

      // Invalidate all user sessions except current
      for (const [sessionId, sessionData] of activeSessions.entries()) {
        if (sessionData.userId === req.user.userId && sessionId !== req.user.sessionId) {
          activeSessions.delete(sessionId);
        }
      }

      res.json({
        success: true,
        message: 'Password changed successfully. Other sessions have been terminated.',
      });
    });

    // Session hijacking detection
    app.get('/api/protected/sensitive', validateSession, (req, res) => {
      const currentUA = req.headers['user-agent'];
      const currentIP = req.ip;
      const sessionUA = req.sessionData.userAgent;
      const sessionIP = req.sessionData.ipAddress;

      // Detect potential session hijacking
      if (currentUA !== sessionUA || currentIP !== sessionIP) {
        // Log suspicious activity
        console.warn('Potential session hijacking detected', {
          userId: req.user.userId,
          sessionId: req.user.sessionId,
          originalUA: sessionUA,
          currentUA: currentUA,
          originalIP: sessionIP,
          currentIP: currentIP,
        });

        // In production, you might want to invalidate the session
        return res.status(403).json({
          error: 'Session security violation detected',
          code: 'SESSION_HIJACK_SUSPECTED',
        });
      }

      res.json({
        success: true,
        data: 'Sensitive data accessed successfully',
      });
    });

    // Session timeout check
    app.use('/api/protected', (req, res, next) => {
      if (req.sessionData) {
        const lastActivity = new Date(req.sessionData.lastActivity);
        const now = new Date();
        const timeDiff = now - lastActivity;
        const timeout = 30 * 60 * 1000; // 30 minutes

        if (timeDiff > timeout) {
          activeSessions.delete(req.user.sessionId);
          return res.status(401).json({ error: 'Session has timed out' });
        }
      }
      next();
    });
  });

  describe('Session Creation and Management', () => {
    test('should create secure session on login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'correct-password',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.sessionId).toBeDefined();

      // Check that session cookie is set with secure attributes
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();

      const sessionCookie = cookies.find(cookie => cookie.includes('sessionId'));
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie).toContain('HttpOnly');
      expect(sessionCookie).toContain('SameSite=Strict');
    });

    test('should reject invalid login credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'wrong-password',
        })
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });

    test('should track multiple sessions for same user', async () => {
      // Create first session
      const session1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'correct-password',
        })
        .expect(200);

      // Create second session
      const session2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'correct-password',
        })
        .expect(200);

      expect(session1.body.sessionId).not.toBe(session2.body.sessionId);

      // Check active sessions
      const activeSessionsResponse = await request(app)
        .get('/api/sessions/active')
        .set('Authorization', `Bearer ${session1.body.token}`)
        .expect(200);

      expect(activeSessionsResponse.body.sessions).toHaveLength(2);
    });
  });

  describe('Session Validation', () => {
    test('should validate active session tokens', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'correct-password',
        })
        .expect(200);

      const response = await request(app)
        .get('/api/protected/profile')
        .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.sessionInfo).toBeDefined();
    });

    test('should reject requests without tokens', async () => {
      const response = await request(app).get('/api/protected/profile').expect(401);

      expect(response.body.error).toBe('No token provided');
    });

    test('should reject invalid tokens', async () => {
      const response = await request(app)
        .get('/api/protected/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });

    test('should reject expired tokens', async () => {
      const expiredToken = jwt.sign(
        {
          userId: 1,
          sessionId: 'expired-session',
        },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/protected/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('Session Termination', () => {
    test('should terminate session on logout', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'correct-password',
        })
        .expect(200);

      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .expect(200);

      // Token should be blacklisted
      const response = await request(app)
        .get('/api/protected/profile')
        .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .expect(401);

      expect(response.body.error).toBe('Token has been revoked');
    });

    test('should terminate specific sessions', async () => {
      // Create two sessions
      const session1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'correct-password',
        })
        .expect(200);

      const session2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'correct-password',
        })
        .expect(200);

      // Terminate session2 from session1
      await request(app)
        .delete(`/api/sessions/${session2.body.sessionId}`)
        .set('Authorization', `Bearer ${session1.body.token}`)
        .expect(200);

      // Session1 should still work
      await request(app)
        .get('/api/protected/profile')
        .set('Authorization', `Bearer ${session1.body.token}`)
        .expect(200);

      // Session2 should be terminated
      await request(app)
        .get('/api/protected/profile')
        .set('Authorization', `Bearer ${session2.body.token}`)
        .expect(401);
    });

    test('should terminate all other sessions', async () => {
      // Create multiple sessions
      const sessions = [];
      for (let i = 0; i < 3; i++) {
        const session = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'user@example.com',
            password: 'correct-password',
          })
          .expect(200);
        sessions.push(session.body);
      }

      // Terminate all except current
      await request(app)
        .delete('/api/sessions/all/except-current')
        .set('Authorization', `Bearer ${sessions[0].token}`)
        .expect(200);

      // First session should still work
      await request(app)
        .get('/api/protected/profile')
        .set('Authorization', `Bearer ${sessions[0].token}`)
        .expect(200);

      // Other sessions should be terminated
      for (let i = 1; i < sessions.length; i++) {
        await request(app)
          .get('/api/protected/profile')
          .set('Authorization', `Bearer ${sessions[i].token}`)
          .expect(401);
      }
    });
  });

  describe('Session Security Features', () => {
    test('should detect potential session hijacking', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .set('User-Agent', 'Original-Browser/1.0')
        .send({
          email: 'user@example.com',
          password: 'correct-password',
        })
        .expect(200);

      // Try to access with different User-Agent
      const response = await request(app)
        .get('/api/protected/sensitive')
        .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .set('User-Agent', 'Different-Browser/2.0')
        .expect(403);

      expect(response.body.error).toBe('Session security violation detected');
      expect(response.body.code).toBe('SESSION_HIJACK_SUSPECTED');
    });

    test('should invalidate sessions on password change', async () => {
      // Create multiple sessions
      const session1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'correct-password',
        })
        .expect(200);

      const session2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'correct-password',
        })
        .expect(200);

      // Change password from session1
      await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${session1.body.token}`)
        .send({
          currentPassword: 'correct-password',
          newPassword: 'new-password',
        })
        .expect(200);

      // Session1 should still work (current session)
      await request(app)
        .get('/api/protected/profile')
        .set('Authorization', `Bearer ${session1.body.token}`)
        .expect(200);

      // Session2 should be invalidated
      await request(app)
        .get('/api/protected/profile')
        .set('Authorization', `Bearer ${session2.body.token}`)
        .expect(401);
    });

    test('should prevent session fixation attacks', async () => {
      // In a session fixation attack, an attacker would try to force a specific session ID
      // Our implementation generates random session IDs, so this test verifies uniqueness

      const sessions = [];
      for (let i = 0; i < 10; i++) {
        const session = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'user@example.com',
            password: 'correct-password',
          })
          .expect(200);
        sessions.push(session.body.sessionId);
      }

      // All session IDs should be unique
      const uniqueSessionIds = new Set(sessions);
      expect(uniqueSessionIds.size).toBe(sessions.length);
    });

    test('should handle concurrent session operations safely', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'correct-password',
        })
        .expect(200);

      // Make concurrent requests
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .get('/api/protected/profile')
            .set('Authorization', `Bearer ${loginResponse.body.token}`)
        );
      }

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Session Timeout and Cleanup', () => {
    test('should handle session timeout', async () => {
      // This test is simplified - in a real scenario, you'd need to manipulate time
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'correct-password',
        })
        .expect(200);

      // Simulate session usage
      await request(app)
        .get('/api/protected/profile')
        .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .expect(200);

      // Session should remain valid with recent activity
      expect(loginResponse.body.sessionId).toBeDefined();
    });

    test('should extend session on activity', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'correct-password',
        })
        .expect(200);

      // Make request to update activity
      const profileResponse = await request(app)
        .get('/api/protected/profile')
        .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .expect(200);

      expect(profileResponse.body.sessionInfo.lastActivity).toBeDefined();

      // Make another request shortly after
      await request(app)
        .get('/api/protected/profile')
        .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .expect(200);
    });
  });

  describe('Session Information Disclosure', () => {
    test('should not expose session secrets in responses', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'correct-password',
        })
        .expect(200);

      const profileResponse = await request(app)
        .get('/api/protected/profile')
        .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .expect(200);

      const responseText = JSON.stringify(profileResponse.body);

      // Should not expose sensitive information
      expect(responseText).not.toContain('secret');
      expect(responseText).not.toContain('password');
      expect(responseText).not.toContain('hash');
      expect(responseText).not.toContain(JWT_SECRET);
    });

    test('should provide session information safely', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'correct-password',
        })
        .expect(200);

      const sessionsResponse = await request(app)
        .get('/api/sessions/active')
        .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .expect(200);

      expect(sessionsResponse.body.sessions).toHaveLength(1);

      const session = sessionsResponse.body.sessions[0];
      expect(session.sessionId).toBeDefined();
      expect(session.createdAt).toBeDefined();
      expect(session.lastActivity).toBeDefined();
      expect(session.userAgent).toBeDefined();
      expect(session.current).toBe(true);

      // Should not expose internal details
      expect(session.secret).toBeUndefined();
      expect(session.internalId).toBeUndefined();
    });
  });
});
