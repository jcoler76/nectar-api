const express = require('express');
const router = express.Router();

// Lightweight admin settings for API key header configuration.
// This updates process.env at runtime and immediately affects auth middleware.
// CORS allowed headers also update because we build options per request.

function parseCsv(val) {
  return (val || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

// Require admin privileges
router.use((req, res, next) => {
  if (req.user?.isSuperAdmin || req.user?.isAdmin) return next();
  return res.status(403).json({ success: false, message: 'Admin access required' });
});

// GET current security-related settings
router.get('/settings/security', (req, res) => {
  const primary = process.env.API_AUTH_HEADER || 'x-nectarstudio-api-key';
  const aliases = parseCsv(process.env.API_HEADER_ALIASES || '');
  const corsOrigins = parseCsv(
    process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:8000'
  );

  res.json({
    apiAuthHeader: primary,
    apiHeaderAliases: aliases,
    corsAllowedOrigins: corsOrigins,
  });
});

// PUT to update API auth header and aliases
router.put('/settings/security', (req, res) => {
  const { apiAuthHeader, apiHeaderAliases } = req.body || {};

  if (apiAuthHeader && typeof apiAuthHeader === 'string') {
    process.env.API_AUTH_HEADER = apiAuthHeader.trim();
  }
  if (Array.isArray(apiHeaderAliases)) {
    process.env.API_HEADER_ALIASES = apiHeaderAliases
      .map(s => s.trim())
      .filter(Boolean)
      .join(',');
  } else if (typeof apiHeaderAliases === 'string') {
    process.env.API_HEADER_ALIASES = apiHeaderAliases;
  }

  const primary = process.env.API_AUTH_HEADER || 'x-nectarstudio-api-key';
  const aliases = parseCsv(process.env.API_HEADER_ALIASES || '');

  res.json({
    success: true,
    apiAuthHeader: primary,
    apiHeaderAliases: aliases,
    note: 'Settings applied. Auth middleware uses them immediately. CORS headers reflect updates per request.',
  });
});

module.exports = router;
