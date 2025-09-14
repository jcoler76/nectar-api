const express = require('express');
const swaggerUi = require('swagger-ui-express');

const router = express.Router();

// Blueprints Swagger UI (loads spec from the JSON endpoint)
router.use('/blueprints/ui', swaggerUi.serve, (req, res, next) => {
  const url = `${req.protocol}://${req.get('host')}/api/documentation/blueprints/openapi`;
  return swaggerUi.setup(null, {
    swaggerOptions: {
      url,
      displayRequestDuration: true,
    },
    customSiteTitle: 'Nectar Blueprints API Docs',
  })(req, res, next);
});

// Role-based Swagger UI (dynamic per role)
router.use('/openapi/:roleId/ui', swaggerUi.serve, (req, res, next) => {
  const url = `${req.protocol}://${req.get('host')}/api/documentation/openapi/${encodeURIComponent(
    req.params.roleId
  )}`;
  return swaggerUi.setup(null, {
    swaggerOptions: {
      url,
      displayRequestDuration: true,
    },
    customSiteTitle: `Nectar API Docs - Role ${req.params.roleId}`,
  })(req, res, next);
});

module.exports = router;
