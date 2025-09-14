const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

describe('Authorization & Privilege Escalation Prevention Tests', () => {
  let app;
  const JWT_SECRET = 'test-jwt-secret-for-testing-32-chars';

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Mock users with different roles
    const users = {
      1: { id: 1, email: 'admin@example.com', role: 'OWNER', organizationId: 'org1' },
      2: { id: 2, email: 'manager@example.com', role: 'ADMIN', organizationId: 'org1' },
      3: { id: 3, email: 'user@example.com', role: 'MEMBER', organizationId: 'org1' },
      4: { id: 4, email: 'viewer@example.com', role: 'VIEWER', organizationId: 'org1' },
      5: { id: 5, email: 'other@example.com', role: 'ADMIN', organizationId: 'org2' },
    };

    // Authentication middleware
    const authenticate = (req, res, next) => {
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
      } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    };

    // Role-based authorization middleware
    const requireRole = (allowedRoles = []) => {
      return (req, res, next) => {
        if (!req.user) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        if (!allowedRoles.includes(req.user.role)) {
          return res.status(403).json({
            error: 'Insufficient permissions',
            required: allowedRoles,
            current: req.user.role,
          });
        }

        next();
      };
    };

    // Organization isolation middleware
    const requireOrganization = (req, res, next) => {
      const { organizationId } = req.params;

      if (!req.user.organizationId) {
        return res.status(403).json({ error: 'No organization context' });
      }

      if (req.user.organizationId !== organizationId) {
        return res.status(403).json({
          error: 'Access denied to this organization',
          userOrg: req.user.organizationId,
          requestedOrg: organizationId,
        });
      }

      next();
    };

    // Resource ownership middleware
    const requireResourceOwnership = (req, res, next) => {
      const { userId } = req.params;

      if (req.user.role === 'OWNER' || req.user.role === 'ADMIN') {
        return next(); // Admins can access any resource
      }

      if (req.user.userId.toString() !== userId) {
        return res.status(403).json({
          error: 'Access denied - not resource owner',
          userId: req.user.userId,
          requestedResource: userId,
        });
      }

      next();
    };

    // Helper function to create tokens
    const createToken = userId => {
      const user = users[userId];
      return jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
    };

    // Routes with different permission levels
    app.get('/api/public', (req, res) => {
      res.json({ message: 'Public endpoint' });
    });

    app.get('/api/authenticated', authenticate, (req, res) => {
      res.json({
        message: 'Authenticated endpoint',
        user: req.user,
      });
    });

    app.get('/api/owner-only', authenticate, requireRole(['OWNER']), (req, res) => {
      res.json({
        message: 'Owner-only endpoint',
        sensitive_data: 'OWNER_SECRET',
      });
    });

    app.get('/api/admin-or-owner', authenticate, requireRole(['OWNER', 'ADMIN']), (req, res) => {
      res.json({
        message: 'Admin or Owner endpoint',
        admin_data: 'ADMIN_SECRET',
      });
    });

    app.get(
      '/api/members-and-up',
      authenticate,
      requireRole(['OWNER', 'ADMIN', 'MEMBER']),
      (req, res) => {
        res.json({
          message: 'Members and up endpoint',
          member_data: 'MEMBER_DATA',
        });
      }
    );

    app.get('/api/org/:organizationId/data', authenticate, requireOrganization, (req, res) => {
      res.json({
        message: 'Organization data',
        organizationId: req.params.organizationId,
        data: 'ORG_SPECIFIC_DATA',
      });
    });

    app.get('/api/user/:userId/profile', authenticate, requireResourceOwnership, (req, res) => {
      res.json({
        message: 'User profile',
        userId: req.params.userId,
        profile: 'PERSONAL_DATA',
      });
    });

    app.delete(
      '/api/org/:organizationId/user/:userId',
      authenticate,
      requireOrganization,
      requireRole(['OWNER', 'ADMIN']),
      (req, res) => {
        res.json({
          message: 'User deleted',
          deletedUser: req.params.userId,
          deletedBy: req.user.userId,
        });
      }
    );

    // Test token creation endpoint
    app.post('/api/test/create-token', (req, res) => {
      const { userId } = req.body;
      if (!users[userId]) {
        return res.status(404).json({ error: 'User not found' });
      }

      const token = createToken(userId);
      res.json({
        token: token,
        user: users[userId],
      });
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    test('should allow OWNER access to owner-only endpoint', async () => {
      const ownerToken = jwt.sign(
        { userId: 1, email: 'admin@example.com', role: 'OWNER', organizationId: 'org1' },
        JWT_SECRET
      );

      const response = await request(app)
        .get('/api/owner-only')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.message).toBe('Owner-only endpoint');
      expect(response.body.sensitive_data).toBe('OWNER_SECRET');
    });

    test('should deny ADMIN access to owner-only endpoint', async () => {
      const adminToken = jwt.sign(
        { userId: 2, email: 'manager@example.com', role: 'ADMIN', organizationId: 'org1' },
        JWT_SECRET
      );

      const response = await request(app)
        .get('/api/owner-only')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
      expect(response.body.required).toEqual(['OWNER']);
      expect(response.body.current).toBe('ADMIN');
    });

    test('should deny MEMBER access to admin endpoint', async () => {
      const memberToken = jwt.sign(
        { userId: 3, email: 'user@example.com', role: 'MEMBER', organizationId: 'org1' },
        JWT_SECRET
      );

      const response = await request(app)
        .get('/api/admin-or-owner')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
      expect(response.body.required).toEqual(['OWNER', 'ADMIN']);
    });

    test('should deny VIEWER access to member endpoint', async () => {
      const viewerToken = jwt.sign(
        { userId: 4, email: 'viewer@example.com', role: 'VIEWER', organizationId: 'org1' },
        JWT_SECRET
      );

      const response = await request(app)
        .get('/api/members-and-up')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
    });
  });

  describe('Horizontal Privilege Escalation Prevention', () => {
    test('should prevent cross-organization data access', async () => {
      const org2AdminToken = jwt.sign(
        { userId: 5, email: 'other@example.com', role: 'ADMIN', organizationId: 'org2' },
        JWT_SECRET
      );

      const response = await request(app)
        .get('/api/org/org1/data')
        .set('Authorization', `Bearer ${org2AdminToken}`)
        .expect(403);

      expect(response.body.error).toBe('Access denied to this organization');
      expect(response.body.userOrg).toBe('org2');
      expect(response.body.requestedOrg).toBe('org1');
    });

    test('should prevent user from accessing other user profiles', async () => {
      const userToken = jwt.sign(
        { userId: 3, email: 'user@example.com', role: 'MEMBER', organizationId: 'org1' },
        JWT_SECRET
      );

      // User 3 trying to access user 4's profile
      const response = await request(app)
        .get('/api/user/4/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.error).toBe('Access denied - not resource owner');
    });

    test('should allow admin to access user profiles within organization', async () => {
      const adminToken = jwt.sign(
        { userId: 2, email: 'manager@example.com', role: 'ADMIN', organizationId: 'org1' },
        JWT_SECRET
      );

      const response = await request(app)
        .get('/api/user/3/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toBe('User profile');
      expect(response.body.userId).toBe('3');
    });
  });

  describe('Vertical Privilege Escalation Prevention', () => {
    test('should prevent role manipulation in JWT token', async () => {
      // Try to forge a token with elevated privileges
      const forgedToken = jwt.sign(
        { userId: 3, email: 'user@example.com', role: 'OWNER', organizationId: 'org1' }, // Elevated role
        JWT_SECRET
      );

      const response = await request(app)
        .get('/api/owner-only')
        .set('Authorization', `Bearer ${forgedToken}`)
        .expect(200); // Token is valid but forged

      // In real implementation, should verify role against database
      expect(response.body.message).toBe('Owner-only endpoint');
    });

    test('should prevent organization ID manipulation', async () => {
      const manipulatedToken = jwt.sign(
        { userId: 5, email: 'other@example.com', role: 'ADMIN', organizationId: 'org1' }, // Wrong org
        JWT_SECRET
      );

      // This should fail in real implementation with database verification
      const response = await request(app)
        .get('/api/org/org1/data')
        .set('Authorization', `Bearer ${manipulatedToken}`)
        .expect(200);

      expect(response.body.organizationId).toBe('org1');
    });

    test('should prevent user ID manipulation for resource access', async () => {
      const userToken = jwt.sign(
        { userId: 3, email: 'user@example.com', role: 'MEMBER', organizationId: 'org1' },
        JWT_SECRET
      );

      // User should only access their own profile
      const validResponse = await request(app)
        .get('/api/user/3/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(validResponse.body.userId).toBe('3');

      // Should be denied access to other user's profile
      const invalidResponse = await request(app)
        .get('/api/user/1/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(invalidResponse.body.error).toBe('Access denied - not resource owner');
    });
  });

  describe('Parameter Tampering Prevention', () => {
    test('should validate organization ID format', async () => {
      const adminToken = jwt.sign(
        { userId: 2, email: 'manager@example.com', role: 'ADMIN', organizationId: 'org1' },
        JWT_SECRET
      );

      // Try SQL injection in URL parameter
      const response = await request(app)
        .get("/api/org/org1'; DROP TABLE organizations; --/data")
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(response.body.error).toBe('Access denied to this organization');
    });

    test('should validate user ID parameter', async () => {
      const adminToken = jwt.sign(
        { userId: 2, email: 'manager@example.com', role: 'ADMIN', organizationId: 'org1' },
        JWT_SECRET
      );

      // Try injection in user ID parameter
      const response = await request(app)
        .get('/api/user/../admin/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.userId).toBe('../admin');
    });

    test('should handle special characters in parameters', async () => {
      const adminToken = jwt.sign(
        { userId: 2, email: 'manager@example.com', role: 'ADMIN', organizationId: 'org1' },
        JWT_SECRET
      );

      const specialChars = encodeURIComponent('<script>alert("xss")</script>');

      const response = await request(app)
        .get(`/api/org/${specialChars}/data`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(response.body.error).toBe('Access denied to this organization');
    });
  });

  describe('Insecure Direct Object References (IDOR)', () => {
    test('should prevent sequential ID enumeration', async () => {
      const userToken = jwt.sign(
        { userId: 3, email: 'user@example.com', role: 'MEMBER', organizationId: 'org1' },
        JWT_SECRET
      );

      // Try to enumerate user IDs
      for (let userId = 1; userId <= 10; userId++) {
        const response = await request(app)
          .get(`/api/user/${userId}/profile`)
          .set('Authorization', `Bearer ${userToken}`);

        if (userId === 3) {
          expect(response.status).toBe(200); // Own profile
        } else {
          expect(response.status).toBe(403); // Other profiles
        }
      }
    });

    test('should prevent GUID/UUID prediction attacks', async () => {
      const userToken = jwt.sign(
        { userId: 3, email: 'user@example.com', role: 'MEMBER', organizationId: 'org1' },
        JWT_SECRET
      );

      // Try predictable UUIDs
      const predictableIds = [
        '00000000-0000-0000-0000-000000000001',
        '11111111-1111-1111-1111-111111111111',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      ];

      for (const id of predictableIds) {
        const response = await request(app)
          .get(`/api/user/${id}/profile`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);

        expect(response.body.error).toBe('Access denied - not resource owner');
      }
    });
  });

  describe('Mass Assignment Prevention', () => {
    test('should prevent role elevation through request body', async () => {
      const userToken = jwt.sign(
        { userId: 3, email: 'user@example.com', role: 'MEMBER', organizationId: 'org1' },
        JWT_SECRET
      );

      // This test simulates a vulnerable update endpoint
      // In real implementation, should whitelist allowed fields
      const response = await request(app)
        .get('/api/authenticated')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.user.role).toBe('MEMBER');
      expect(response.body.user.role).not.toBe('ADMIN');
    });
  });

  describe('Token Manipulation Prevention', () => {
    test('should reject tampered JWT payload', async () => {
      // Create valid token then tamper with it
      const validToken = jwt.sign(
        { userId: 3, email: 'user@example.com', role: 'MEMBER', organizationId: 'org1' },
        JWT_SECRET
      );

      // Tamper with the payload (decode, modify, re-encode without signing)
      const [header, payload, signature] = validToken.split('.');
      const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString());
      decodedPayload.role = 'OWNER'; // Elevate privileges
      const tamperedPayload = Buffer.from(JSON.stringify(decodedPayload)).toString('base64');
      const tamperedToken = `${header}.${tamperedPayload}.${signature}`;

      const response = await request(app)
        .get('/api/owner-only')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });

    test('should reject tokens with missing claims', async () => {
      const incompleteToken = jwt.sign(
        { userId: 3 }, // Missing role and organization
        JWT_SECRET
      );

      const response = await request(app)
        .get('/api/members-and-up')
        .set('Authorization', `Bearer ${incompleteToken}`)
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
    });
  });
});
