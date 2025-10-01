const express = require('express');
const swaggerUi = require('swagger-ui-express');
const { logger } = require('../utils/logger');

const router = express.Router();

// Debug endpoint to test session authentication
router.get('/debug/session', (req, res) => {
  logger.info('Session debug request', {
    hasSession: !!req.session,
    hasUser: !!req.session?.user,
    sessionUser: req.session?.user
      ? {
          id: req.session.user.id,
          email: req.session.user.email,
          organizationId: req.session.user.organizationId,
        }
      : null,
    cookies: req.headers.cookie || 'none',
    userAgent: req.headers['user-agent'],
  });

  res.json({
    hasSession: !!req.session,
    hasUser: !!req.session?.user,
    sessionUser: req.session?.user || null,
    timestamp: new Date().toISOString(),
  });
});

// Blueprints Swagger UI (loads spec from the JSON endpoint)
router.use('/blueprints/ui', swaggerUi.serve, (req, res, next) => {
  const baseUrl = `${req.protocol}://${req.get('host')}/api/documentation/blueprints/openapi`;

  return swaggerUi.setup(null, {
    swaggerOptions: {
      url: baseUrl,
      displayRequestDuration: true,
      requestInterceptor: `(function(request) {
        // Note: Authentication now requires proper Authorization header
        // Token must be provided via Bearer token in API calls
        return request;
      })`,
    },
    customSiteTitle: 'Nectar Blueprints API Docs',
  })(req, res, next);
});

// Role-based Swagger UI (dynamic per role)
router.use('/openapi/:roleId/ui', swaggerUi.serve, (req, res, next) => {
  const baseUrl = `${req.protocol}://${req.get('host')}/api/documentation/openapi/${encodeURIComponent(
    req.params.roleId
  )}`;

  return swaggerUi.setup(null, {
    swaggerOptions: {
      url: baseUrl,
      displayRequestDuration: true,
      withCredentials: true, // Enable sending cookies with requests
      requestInterceptor: `(function(request) {
        // Ensure credentials are included for cross-origin requests
        request.credentials = 'include';
        return request;
      })`,
    },
    customSiteTitle: `Nectar API Docs - Role ${req.params.roleId}`,
  })(req, res, next);
});

module.exports = router;
