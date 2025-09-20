const express = require('express');
const router = express.Router();
const {
  CURRENT_VERSION,
  SUPPORTED_VERSIONS,
  DEPRECATED_VERSIONS,
} = require('../middleware/apiVersioning');

/**
 * API Information and Documentation Endpoints
 */

// API version information
router.get('/versions', (req, res) => {
  res.json({
    current: CURRENT_VERSION,
    supported: SUPPORTED_VERSIONS,
    deprecated: DEPRECATED_VERSIONS,
    versioningMethods: [
      'URL path: /api/v1/endpoint',
      'Header: X-API-Version: v1',
      'Accept header: application/vnd.nectarstudio.v1+json',
      'Query parameter: ?version=v1',
    ],
    migrationGuide: {
      message: 'To use versioned endpoints, access /api/v1/ instead of /api/',
      examples: {
        Old: '/api/users',
        New: '/api/v1/users',
      },
    },
  });
});

// API health and status
router.get('/health', (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();

  res.json({
    status: 'healthy',
    version: req.apiVersion || CURRENT_VERSION,
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: uptime,
      formatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
    },
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
    },
    environment: process.env.NODE_ENV,
    nodeVersion: process.version,
  });
});

// API endpoints listing
router.get('/endpoints', (req, res) => {
  const version = req.apiVersion || CURRENT_VERSION;

  const endpoints = {
    v1: {
      authentication: [
        'POST /api/auth/login',
        'POST /api/auth/logout',
        'POST /api/auth/refresh',
        'GET /api/csrf-token',
      ],
      users: [
        'GET /api/v1/users',
        'POST /api/v1/users',
        'GET /api/v1/users/:id',
        'PUT /api/v1/users/:id',
        'DELETE /api/v1/users/:id',
      ],
      roles: [
        'GET /api/v1/roles',
        'POST /api/v1/roles',
        'GET /api/v1/roles/:id',
        'PUT /api/v1/roles/:id',
        'DELETE /api/v1/roles/:id',
      ],
      applications: [
        'GET /api/v1/applications',
        'POST /api/v1/applications',
        'PUT /api/v1/applications/:id',
        'DELETE /api/v1/applications/:id',
        'POST /api/v1/applications/:id/regenerate-key',
      ],
      services: [
        'GET /api/v1/services',
        'POST /api/v1/services',
        'PUT /api/v1/services/:id',
        'DELETE /api/v1/services/:id',
      ],
      info: ['GET /api/versions', 'GET /api/health', 'GET /api/endpoints'],
    },
  };

  res.json({
    version,
    endpoints: endpoints[version] || endpoints.v1,
    notes: [
      'All endpoints require authentication except /api/auth/* and /api/health',
      'Use Content-Type: application/json for POST/PUT requests',
      'Include Authorization: Bearer <token> header for authenticated requests',
      'CSRF protection is enabled for state-changing operations',
    ],
  });
});

module.exports = router;
