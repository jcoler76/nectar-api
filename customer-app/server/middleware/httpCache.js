/**
 * HTTP Caching Middleware
 * Provides caching headers for different types of responses
 */

/**
 * Cache static API responses (configurations, metadata) for 5 minutes
 */
const cacheStaticResponse = (maxAge = 300) => {
  return (req, res, next) => {
    res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
    res.setHeader('Expires', new Date(Date.now() + maxAge * 1000).toUTCString());
    next();
  };
};

/**
 * Cache user-specific responses for 1 minute
 */
const cacheUserResponse = (maxAge = 60) => {
  return (req, res, next) => {
    res.setHeader('Cache-Control', `private, max-age=${maxAge}`);
    res.setHeader('Expires', new Date(Date.now() + maxAge * 1000).toUTCString());
    next();
  };
};

/**
 * Prevent caching for dynamic/sensitive data
 */
const noCache = () => {
  return (req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  };
};

/**
 * Add ETag support for conditional requests
 */
const addETag = () => {
  return (req, res, next) => {
    const originalSend = res.send;
    res.send = function (data) {
      if (data && typeof data === 'string') {
        const crypto = require('crypto');
        const etag = crypto.createHash('md5').update(data).digest('hex');
        res.setHeader('ETag', `"${etag}"`);

        // Check if client has the same version
        if (req.headers['if-none-match'] === `"${etag}"`) {
          res.status(304).end();
          return;
        }
      }
      originalSend.call(this, data);
    };
    next();
  };
};

module.exports = {
  cacheStaticResponse,
  cacheUserResponse,
  noCache,
  addETag,
};
