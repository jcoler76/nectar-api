const { logger } = require('../utils/logger');

const performanceMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // Override res.json to capture response time
  const originalJson = res.json;
  res.json = function (data) {
    const duration = Date.now() - startTime;

    // Log slow requests (over 1 second)
    if (duration > 1000) {
      logger.warn('Slow API request detected', {
        method: req.method,
        url: req.originalUrl,
        duration: `${duration}ms`,
        userId: req.user?.userId,
      });
    }

    // Add performance header for debugging
    res.set('X-Response-Time', `${duration}ms`);

    return originalJson.call(this, data);
  };

  next();
};

module.exports = performanceMiddleware;
