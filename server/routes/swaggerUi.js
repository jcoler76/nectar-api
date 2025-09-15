const express = require('express');
const swaggerUi = require('swagger-ui-express');

const router = express.Router();

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
      requestInterceptor: `(function(request) {
        // Note: Authentication now requires proper Authorization header
        // Token must be provided via Bearer token in API calls
        return request;
      })`,
    },
    customSiteTitle: `Nectar API Docs - Role ${req.params.roleId}`,
  })(req, res, next);
});

module.exports = router;
