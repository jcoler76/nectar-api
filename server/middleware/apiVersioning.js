const { logger } = require('../utils/logger');

// Current API version
const CURRENT_VERSION = 'v1';
const SUPPORTED_VERSIONS = ['v1'];
const DEPRECATED_VERSIONS = [];

/**
 * API Versioning Middleware
 * Handles version detection from headers, URL path, or query parameters
 */
const apiVersioning = (req, res, next) => {
  try {
    // 1. Check for version in URL path (e.g., /api/v1/users)
    const pathVersion = req.path.match(/^\/api\/(v\d+)\//)?.[1];

    // 2. Check for version in Accept header (e.g., application/vnd.nectarstudio.v1+json)
    const acceptHeader = req.headers.accept || '';
    const headerVersion = acceptHeader.match(/application\/vnd\.nectarstudio\.(v\d+)\+json/)?.[1];

    // 3. Check for version in custom header
    const customHeaderVersion = req.headers['x-api-version'];

    // 4. Check for version in query parameter
    const queryVersion = req.query.version;

    // Determine version (priority: path > custom header > accept header > query > default)
    const requestedVersion =
      pathVersion || customHeaderVersion || headerVersion || queryVersion || CURRENT_VERSION;

    // Validate version
    if (!SUPPORTED_VERSIONS.includes(requestedVersion)) {
      logger.warn('Unsupported API version requested', {
        requestedVersion,
        supportedVersions: SUPPORTED_VERSIONS,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        path: req.path,
      });

      return res.status(400).json({
        error: {
          code: 'UNSUPPORTED_API_VERSION',
          message: `API version '${requestedVersion}' is not supported`,
          supportedVersions: SUPPORTED_VERSIONS,
          currentVersion: CURRENT_VERSION,
        },
      });
    }

    // Check for deprecated versions
    if (DEPRECATED_VERSIONS.includes(requestedVersion)) {
      logger.warn('Deprecated API version used', {
        version: requestedVersion,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        path: req.path,
      });

      // Add deprecation warning header
      res.set(
        'X-API-Deprecation-Warning',
        `API version ${requestedVersion} is deprecated. Please upgrade to ${CURRENT_VERSION}.`
      );
      res.set('X-API-Current-Version', CURRENT_VERSION);
    }

    // Set version information on request object
    req.apiVersion = requestedVersion;
    req.isCurrentVersion = requestedVersion === CURRENT_VERSION;
    req.isDeprecatedVersion = DEPRECATED_VERSIONS.includes(requestedVersion);

    // Add version headers to response
    res.set('X-API-Version', requestedVersion);
    res.set('X-API-Current-Version', CURRENT_VERSION);

    // Log version usage for analytics
    logger.debug('API version determined', {
      version: requestedVersion,
      method: req.method,
      path: req.path,
      source: pathVersion
        ? 'path'
        : customHeaderVersion
          ? 'header'
          : headerVersion
            ? 'accept'
            : queryVersion
              ? 'query'
              : 'default',
    });

    next();
  } catch (error) {
    logger.error('API versioning error', {
      error: error.message,
      path: req.path,
      headers: req.headers,
    });

    return res.status(500).json({
      error: {
        code: 'VERSIONING_ERROR',
        message: 'Error processing API version',
      },
    });
  }
};

/**
 * Version-specific route wrapper
 * Use this to create version-specific implementations
 */
const versionRoute = (versions, handler) => {
  return (req, res, next) => {
    const currentVersion = req.apiVersion || CURRENT_VERSION;

    // Check if current version is supported by this route
    if (Array.isArray(versions) && !versions.includes(currentVersion)) {
      return res.status(400).json({
        error: {
          code: 'VERSION_NOT_SUPPORTED_FOR_ENDPOINT',
          message: `This endpoint does not support API version '${currentVersion}'`,
          supportedVersions: versions,
        },
      });
    }

    // If versions is an object, call the appropriate handler
    if (typeof versions === 'object' && !Array.isArray(versions)) {
      const versionHandler = versions[currentVersion];
      if (!versionHandler) {
        return res.status(400).json({
          error: {
            code: 'VERSION_NOT_IMPLEMENTED',
            message: `Version '${currentVersion}' is not implemented for this endpoint`,
          },
        });
      }
      return versionHandler(req, res, next);
    }

    // Default behavior - call the handler
    return handler(req, res, next);
  };
};

/**
 * Middleware to add versioning information to API responses
 */
const addVersionInfo = (req, res, next) => {
  const originalJson = res.json;

  res.json = function (data) {
    // Skip _meta for stored procedure endpoints (DreamFactory compatibility)
    const isStoredProcEndpoint = req.path.includes('/_proc/');

    // Add version metadata to successful responses (except stored procedures)
    if (
      !isStoredProcEndpoint &&
      res.statusCode >= 200 &&
      res.statusCode < 300 &&
      typeof data === 'object' &&
      data !== null
    ) {
      data._meta = {
        ...data._meta,
        apiVersion: req.apiVersion || CURRENT_VERSION,
        timestamp: new Date().toISOString(),
      };
    }

    return originalJson.call(this, data);
  };

  next();
};

/**
 * Create versioned router for specific API version
 */
const createVersionedRouter = (version, routes) => {
  const express = require('express');
  const router = express.Router();

  // Add version validation middleware
  router.use((req, res, next) => {
    if (req.apiVersion !== version) {
      return res.status(400).json({
        error: {
          code: 'VERSION_MISMATCH',
          message: `This router is for API version '${version}' but '${req.apiVersion}' was requested`,
        },
      });
    }
    next();
  });

  // Mount routes
  if (typeof routes === 'function') {
    routes(router);
  }

  return router;
};

/**
 * Deprecation middleware for specific versions
 */
const deprecateVersion = (version, deprecationDate, replacementVersion = CURRENT_VERSION) => {
  return (req, res, next) => {
    if (req.apiVersion === version) {
      logger.warn('Deprecated API version accessed', {
        version,
        deprecationDate,
        replacementVersion,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        path: req.path,
      });

      res.set('X-API-Deprecation-Date', deprecationDate);
      res.set('X-API-Replacement-Version', replacementVersion);
      res.set(
        'X-API-Deprecation-Warning',
        `API version ${version} is deprecated as of ${deprecationDate}. Please upgrade to ${replacementVersion}.`
      );
    }
    next();
  };
};

module.exports = {
  apiVersioning,
  versionRoute,
  addVersionInfo,
  createVersionedRouter,
  deprecateVersion,
  CURRENT_VERSION,
  SUPPORTED_VERSIONS,
  DEPRECATED_VERSIONS,
};
