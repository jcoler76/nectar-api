const express = require('express');
const router = express.Router();
const { versionRoute } = require('../../middleware/apiVersioning');

/**
 * API Version 1 Routes
 * This file provides versioned wrappers for core API functionality
 *
 * Migration Strategy:
 * 1. Start by creating v1 routes that wrap existing functionality
 * 2. Gradually move logic into version-specific implementations
 * 3. Deprecate old routes and migrate clients to versioned endpoints
 */

// Import existing route handlers
const userRoutes = require('../users');
const roleRoutes = require('../roles');
const applicationRoutes = require('../applications');
const serviceRoutes = require('../services');

// Middleware to ensure this is v1 only
const v1Only = versionRoute(['v1'], (req, res, next) => next());

// Mount v1 routes with version checking
router.use('/users', v1Only, userRoutes);
router.use('/roles', v1Only, roleRoutes);
router.use('/applications', v1Only, applicationRoutes);
router.use('/services', v1Only, serviceRoutes);

// Version-specific endpoints (examples)
router.get('/version', v1Only, (req, res) => {
  res.json({
    version: 'v1',
    status: 'stable',
    deprecated: false,
    features: [
      'User management',
      'Role-based access control',
      'Application management',
      'Service configuration',
      'Input validation',
      'Authorization checks',
    ],
    endpoints: {
      users: '/api/v1/users',
      roles: '/api/v1/roles',
      applications: '/api/v1/applications',
      services: '/api/v1/services',
    },
  });
});

router.get('/health', v1Only, (req, res) => {
  res.json({
    status: 'healthy',
    version: 'v1',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

module.exports = router;
