/**
 * Simple script to generate a test JWT token for documentation testing
 */
const jwt = require('jsonwebtoken');

// Use the same JWT secret as the server
const JWT_SECRET = process.env.JWT_SECRET || 'Kx9mP2vN8qR5tY7uI3oL6wE1zX4sD0fG';

// Create a test payload
const payload = {
  userId: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  organizationId: 'test-org-id',
  organizationSlug: 'test-org',
  role: 'OWNER',
  isAdmin: true,
  type: 'access',
};

// Generate token
const token = jwt.sign(payload, JWT_SECRET, {
  expiresIn: '1h',
  issuer: 'nectar-api',
  audience: 'nectar-users',
});

console.log('Generated test token:');
console.log(token);