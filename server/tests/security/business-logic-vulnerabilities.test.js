const request = require('supertest');
const express = require('express');
const helmet = require('helmet');

describe('Business Logic Vulnerabilities - Advanced Security Tests', () => {
  let app;

  beforeEach(() => {
    app = express();

    app.use(helmet());
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Setup test endpoints
    setupBusinessLogicEndpoints();
  });

  function setupBusinessLogicEndpoints() {
    // User account state
    const userAccounts = new Map();
    userAccounts.set('user1', { balance: 1000, credits: 50, subscriptionTier: 'premium' });
    userAccounts.set('user2', { balance: 500, credits: 25, subscriptionTier: 'basic' });

    // Purchase simulation
    app.post('/api/test/purchase', (req, res) => {
      const { userId, itemId, quantity, price } = req.body;

      if (!userId || !itemId || !quantity || !price) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Business logic validation
      if (quantity <= 0) {
        return res.status(400).json({ error: 'Invalid quantity' });
      }

      if (price <= 0) {
        return res.status(400).json({ error: 'Invalid price' });
      }

      if (quantity > 100) {
        return res.status(400).json({ error: 'Quantity exceeds maximum allowed' });
      }

      const user = userAccounts.get(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const totalCost = price * quantity;

      if (user.balance < totalCost) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      // Atomic transaction simulation
      user.balance -= totalCost;
      userAccounts.set(userId, user);

      res.json({
        success: true,
        itemId,
        quantity,
        totalCost,
        remainingBalance: user.balance,
      });
    });

    // Refund simulation
    app.post('/api/test/refund', (req, res) => {
      const { userId, amount, reason } = req.body;

      const user = userAccounts.get(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Business logic: validate refund amount
      if (amount <= 0) {
        return res.status(400).json({ error: 'Invalid refund amount' });
      }

      // Prevent excessive refunds
      if (amount > 10000) {
        return res.status(400).json({ error: 'Refund amount exceeds maximum allowed' });
      }

      // Check if reason is provided for large refunds
      if (amount > 1000 && (!reason || reason.length < 10)) {
        return res.status(400).json({ error: 'Detailed reason required for large refunds' });
      }

      user.balance += amount;
      userAccounts.set(userId, user);

      res.json({
        success: true,
        refundAmount: amount,
        newBalance: user.balance,
        reason,
      });
    });

    // Subscription upgrade/downgrade
    app.post('/api/test/subscription', (req, res) => {
      const { userId, newTier, action } = req.body;

      const user = userAccounts.get(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const validTiers = ['basic', 'premium', 'enterprise'];
      if (!validTiers.includes(newTier)) {
        return res.status(400).json({ error: 'Invalid subscription tier' });
      }

      // Business logic: prevent downgrade abuse
      if (action === 'downgrade' && user.subscriptionTier === 'basic') {
        return res.status(400).json({ error: 'Cannot downgrade from basic tier' });
      }

      // Business logic: check upgrade eligibility
      if (action === 'upgrade' && user.balance < 100) {
        return res.status(400).json({ error: 'Insufficient balance for upgrade' });
      }

      const oldTier = user.subscriptionTier;
      user.subscriptionTier = newTier;

      // Deduct upgrade fee
      if (action === 'upgrade') {
        user.balance -= 100;
      }

      userAccounts.set(userId, user);

      res.json({
        success: true,
        oldTier,
        newTier,
        action,
        remainingBalance: user.balance,
      });
    });

    // Resource access control
    app.get('/api/test/resource/:resourceId', (req, res) => {
      const { resourceId } = req.params;
      const { userId } = req.query;

      // Simulate resource ownership
      const resourceOwnership = {
        resource1: 'user1',
        resource2: 'user2',
        resource3: 'user1',
      };

      const owner = resourceOwnership[resourceId];
      if (!owner) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      // IDOR protection: verify ownership
      if (owner !== userId) {
        return res.status(403).json({ error: 'Access denied: not resource owner' });
      }

      const user = userAccounts.get(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check subscription level for premium resources
      if (resourceId.startsWith('premium-') && user.subscriptionTier === 'basic') {
        return res.status(403).json({ error: 'Premium subscription required' });
      }

      res.json({
        resourceId,
        owner,
        content: `Content for ${resourceId}`,
        accessLevel: user.subscriptionTier,
      });
    });

    // Credit transfer system
    app.post('/api/test/transfer-credits', (req, res) => {
      const { fromUserId, toUserId, amount } = req.body;

      if (fromUserId === toUserId) {
        return res.status(400).json({ error: 'Cannot transfer to yourself' });
      }

      const fromUser = userAccounts.get(fromUserId);
      const toUser = userAccounts.get(toUserId);

      if (!fromUser || !toUser) {
        return res.status(404).json({ error: 'One or both users not found' });
      }

      if (amount <= 0) {
        return res.status(400).json({ error: 'Invalid transfer amount' });
      }

      if (fromUser.credits < amount) {
        return res.status(400).json({ error: 'Insufficient credits' });
      }

      // Business logic: transfer limits
      if (amount > 100) {
        return res.status(400).json({ error: 'Transfer amount exceeds daily limit' });
      }

      // Atomic operation
      fromUser.credits -= amount;
      toUser.credits += amount;

      userAccounts.set(fromUserId, fromUser);
      userAccounts.set(toUserId, toUser);

      res.json({
        success: true,
        fromUser: { id: fromUserId, credits: fromUser.credits },
        toUser: { id: toUserId, credits: toUser.credits },
        transferAmount: amount,
      });
    });

    // Password reset with business logic
    app.post('/api/test/password-reset', (req, res) => {
      const { email, newPassword, confirmPassword, resetToken } = req.body;

      // Simulate token validation
      const validTokens = new Set(['valid-token-123', 'valid-token-456']);

      if (!validTokens.has(resetToken)) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match' });
      }

      // Password strength validation
      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }

      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
        return res.status(400).json({
          error: 'Password must contain uppercase, lowercase, and number',
        });
      }

      // Business logic: prevent reuse of common passwords
      const commonPasswords = ['password123', 'admin123', 'qwerty123'];
      if (commonPasswords.includes(newPassword.toLowerCase())) {
        return res.status(400).json({ error: 'Password is too common' });
      }

      // Remove used token
      validTokens.delete(resetToken);

      res.json({
        success: true,
        message: 'Password reset successful',
      });
    });

    // Get account info
    app.get('/api/test/account/:userId', (req, res) => {
      const { userId } = req.params;
      const user = userAccounts.get(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        userId,
        balance: user.balance,
        credits: user.credits,
        subscriptionTier: user.subscriptionTier,
      });
    });
  }

  describe('Purchase Logic Security', () => {
    test('should prevent negative quantity purchases', async () => {
      const response = await request(app)
        .post('/api/test/purchase')
        .send({
          userId: 'user1',
          itemId: 'item1',
          quantity: -5,
          price: 10,
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid quantity');
    });

    test('should prevent negative price exploitation', async () => {
      const response = await request(app)
        .post('/api/test/purchase')
        .send({
          userId: 'user1',
          itemId: 'item1',
          quantity: 5,
          price: -10,
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid price');
    });

    test('should enforce quantity limits', async () => {
      const response = await request(app)
        .post('/api/test/purchase')
        .send({
          userId: 'user1',
          itemId: 'item1',
          quantity: 999,
          price: 1,
        })
        .expect(400);

      expect(response.body.error).toBe('Quantity exceeds maximum allowed');
    });

    test('should check sufficient balance', async () => {
      const response = await request(app)
        .post('/api/test/purchase')
        .send({
          userId: 'user1',
          itemId: 'item1',
          quantity: 50,
          price: 100, // 50 * 100 = 5000, but user1 only has 1000
        })
        .expect(400);

      expect(response.body.error).toBe('Insufficient balance');
    });

    test('should process valid purchases correctly', async () => {
      const response = await request(app)
        .post('/api/test/purchase')
        .send({
          userId: 'user1',
          itemId: 'item1',
          quantity: 5,
          price: 10,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.totalCost).toBe(50);
      expect(response.body.remainingBalance).toBe(950);
    });
  });

  describe('Refund Logic Security', () => {
    test('should prevent negative refund amounts', async () => {
      const response = await request(app)
        .post('/api/test/refund')
        .send({
          userId: 'user1',
          amount: -100,
          reason: 'Test refund',
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid refund amount');
    });

    test('should enforce maximum refund limits', async () => {
      const response = await request(app)
        .post('/api/test/refund')
        .send({
          userId: 'user1',
          amount: 99999,
          reason: 'Huge refund attempt',
        })
        .expect(400);

      expect(response.body.error).toBe('Refund amount exceeds maximum allowed');
    });

    test('should require reason for large refunds', async () => {
      const response = await request(app)
        .post('/api/test/refund')
        .send({
          userId: 'user1',
          amount: 5000,
          reason: 'short',
        })
        .expect(400);

      expect(response.body.error).toBe('Detailed reason required for large refunds');
    });

    test('should process valid refunds', async () => {
      const response = await request(app)
        .post('/api/test/refund')
        .send({
          userId: 'user1',
          amount: 100,
          reason: 'Product defect - detailed explanation here',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.refundAmount).toBe(100);
    });
  });

  describe('Subscription Logic Security', () => {
    test('should prevent invalid tier selection', async () => {
      const response = await request(app)
        .post('/api/test/subscription')
        .send({
          userId: 'user1',
          newTier: 'super-premium',
          action: 'upgrade',
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid subscription tier');
    });

    test('should prevent basic tier downgrade', async () => {
      const response = await request(app)
        .post('/api/test/subscription')
        .send({
          userId: 'user2', // user2 has basic tier
          newTier: 'basic',
          action: 'downgrade',
        })
        .expect(400);

      expect(response.body.error).toBe('Cannot downgrade from basic tier');
    });

    test('should check balance for upgrades', async () => {
      // First drain user2's balance
      await request(app).post('/api/test/purchase').send({
        userId: 'user2',
        itemId: 'item1',
        quantity: 50,
        price: 10,
      });

      const response = await request(app)
        .post('/api/test/subscription')
        .send({
          userId: 'user2',
          newTier: 'premium',
          action: 'upgrade',
        })
        .expect(400);

      expect(response.body.error).toBe('Insufficient balance for upgrade');
    });
  });

  describe('Access Control Security (IDOR Prevention)', () => {
    test('should prevent unauthorized resource access', async () => {
      const response = await request(app)
        .get('/api/test/resource/resource1')
        .query({ userId: 'user2' }) // user2 trying to access user1's resource
        .expect(403);

      expect(response.body.error).toBe('Access denied: not resource owner');
    });

    test('should enforce subscription-based access', async () => {
      const response = await request(app)
        .get('/api/test/resource/premium-resource1')
        .query({ userId: 'user2' }) // user2 has basic subscription
        .expect(403);

      expect(response.body.error).toBe('Premium subscription required');
    });

    test('should allow authorized access', async () => {
      const response = await request(app)
        .get('/api/test/resource/resource1')
        .query({ userId: 'user1' })
        .expect(200);

      expect(response.body.resourceId).toBe('resource1');
      expect(response.body.owner).toBe('user1');
    });
  });

  describe('Credit Transfer Security', () => {
    test('should prevent self-transfer', async () => {
      const response = await request(app)
        .post('/api/test/transfer-credits')
        .send({
          fromUserId: 'user1',
          toUserId: 'user1',
          amount: 10,
        })
        .expect(400);

      expect(response.body.error).toBe('Cannot transfer to yourself');
    });

    test('should check sufficient credits', async () => {
      const response = await request(app)
        .post('/api/test/transfer-credits')
        .send({
          fromUserId: 'user1',
          toUserId: 'user2',
          amount: 999, // user1 only has 50 credits
        })
        .expect(400);

      expect(response.body.error).toBe('Insufficient credits');
    });

    test('should enforce transfer limits', async () => {
      const response = await request(app)
        .post('/api/test/transfer-credits')
        .send({
          fromUserId: 'user1',
          toUserId: 'user2',
          amount: 500, // exceeds daily limit of 100
        })
        .expect(400);

      expect(response.body.error).toBe('Transfer amount exceeds daily limit');
    });

    test('should process valid transfers atomically', async () => {
      const response = await request(app)
        .post('/api/test/transfer-credits')
        .send({
          fromUserId: 'user1',
          toUserId: 'user2',
          amount: 20,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.fromUser.credits).toBe(30); // 50 - 20
      expect(response.body.toUser.credits).toBe(45); // 25 + 20
    });
  });

  describe('Password Reset Security', () => {
    test('should validate reset tokens', async () => {
      const response = await request(app)
        .post('/api/test/password-reset')
        .send({
          email: 'test@example.com',
          newPassword: 'NewPassword123',
          confirmPassword: 'NewPassword123',
          resetToken: 'invalid-token',
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid or expired reset token');
    });

    test('should enforce password confirmation', async () => {
      const response = await request(app)
        .post('/api/test/password-reset')
        .send({
          email: 'test@example.com',
          newPassword: 'NewPassword123',
          confirmPassword: 'DifferentPassword123',
          resetToken: 'valid-token-123',
        })
        .expect(400);

      expect(response.body.error).toBe('Passwords do not match');
    });

    test('should enforce password strength', async () => {
      const weakPasswords = [
        'weak', // too short
        'weakpassword', // no uppercase or numbers
        'WEAKPASSWORD', // no lowercase or numbers
        'WeakPassword', // no numbers
        '12345678', // no letters
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/test/password-reset')
          .send({
            email: 'test@example.com',
            newPassword: password,
            confirmPassword: password,
            resetToken: 'valid-token-123',
          })
          .expect(400);

        expect(response.body.error).toMatch(/Password/);
      }
    });

    test('should prevent common passwords', async () => {
      const response = await request(app)
        .post('/api/test/password-reset')
        .send({
          email: 'test@example.com',
          newPassword: 'Password123', // common password
          confirmPassword: 'Password123',
          resetToken: 'valid-token-123',
        })
        .expect(400);

      expect(response.body.error).toBe('Password is too common');
    });

    test('should accept strong passwords and invalidate tokens', async () => {
      const response = await request(app)
        .post('/api/test/password-reset')
        .send({
          email: 'test@example.com',
          newPassword: 'StrongPassword123!',
          confirmPassword: 'StrongPassword123!',
          resetToken: 'valid-token-123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Try to reuse the same token
      const reusedTokenResponse = await request(app)
        .post('/api/test/password-reset')
        .send({
          email: 'test@example.com',
          newPassword: 'AnotherPassword123!',
          confirmPassword: 'AnotherPassword123!',
          resetToken: 'valid-token-123', // same token
        })
        .expect(400);

      expect(reusedTokenResponse.body.error).toBe('Invalid or expired reset token');
    });
  });

  describe('Integer Overflow and Underflow Protection', () => {
    test('should handle large numbers safely', async () => {
      const response = await request(app)
        .post('/api/test/purchase')
        .send({
          userId: 'user1',
          itemId: 'item1',
          quantity: Number.MAX_SAFE_INTEGER,
          price: 1,
        })
        .expect(400);

      // Should be caught by quantity limit validation
      expect(response.body.error).toBe('Quantity exceeds maximum allowed');
    });

    test('should prevent overflow in calculations', async () => {
      const response = await request(app)
        .post('/api/test/purchase')
        .send({
          userId: 'user1',
          itemId: 'item1',
          quantity: 99,
          price: Number.MAX_SAFE_INTEGER,
        })
        .expect(400);

      // Either caught by price validation or calculation overflow protection
      expect(response.status).toBe(400);
    });
  });
});
