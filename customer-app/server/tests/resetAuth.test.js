/**
 * Reset Authentication API Tests
 * Tests for the admin-only user authentication reset functionality
 */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const usersRouter = require('../routes/users');

const app = express();
app.use(express.json());

// Mock auth middleware for testing
const mockAuth = (userId, isAdmin = false) => {
  return (req, res, next) => {
    req.user = {
      userId,
      isAdmin,
      email: isAdmin ? 'admin@test.com' : 'user@test.com',
    };
    next();
  };
};

// Replace the auth middleware with our mock
jest.mock('../middleware/auth', () => ({
  adminOnly: mockAuth('admin123', true),
}));

app.use('/api/users', usersRouter);

describe('POST /api/users/:id/reset-auth', () => {
  let testUser;
  let adminUser;

  beforeEach(async () => {
    // Create test users
    testUser = new User({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: 'hashedpassword',
      twoFactorSecret: 'encrypted-secret',
      twoFactorBackupCodes: ['code1', 'code2'],
      twoFactorEnabledAt: new Date(),
      trustedDevices: [{ deviceId: 'device1' }],
    });

    adminUser = new User({
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      password: 'hashedpassword',
      isAdmin: true,
    });

    await testUser.save();
    await adminUser.save();
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  it('should successfully reset user authentication', async () => {
    const response = await request(app).post(`/api/users/${testUser._id}/reset-auth`).expect(200);

    expect(response.body.message).toBe('User authentication has been reset successfully');
    expect(response.body.details).toBe('User will be prompted to set up 2FA on their next login');

    // Verify the user's 2FA data was cleared
    const updatedUser = await User.findById(testUser._id);
    expect(updatedUser.twoFactorSecret).toBeUndefined();
    expect(updatedUser.twoFactorBackupCodes).toEqual([]);
    expect(updatedUser.twoFactorEnabledAt).toBeUndefined();
    expect(updatedUser.trustedDevices).toEqual([]);
  });

  it('should return 404 for non-existent user', async () => {
    const fakeUserId = new mongoose.Types.ObjectId();

    const response = await request(app).post(`/api/users/${fakeUserId}/reset-auth`).expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.body.error.message).toBe('User not found');
  });

  it('should return 400 when trying to reset own authentication', async () => {
    // Mock the auth middleware to simulate admin trying to reset their own auth
    app.use(
      '/api/users-self',
      (req, res, next) => {
        req.user = {
          userId: adminUser._id.toString(),
          isAdmin: true,
          email: 'admin@example.com',
        };
        next();
      },
      usersRouter
    );

    const response = await request(app)
      .post(`/api/users-self/${adminUser._id}/reset-auth`)
      .expect(400);

    expect(response.body.error.code).toBe('BAD_REQUEST');
    expect(response.body.error.message).toBe('Cannot reset your own authentication');
  });

  it('should return 400 for invalid user ID format', async () => {
    const response = await request(app).post('/api/users/invalid-id/reset-auth').expect(400);

    expect(response.body.error).toBeDefined();
  });
});
