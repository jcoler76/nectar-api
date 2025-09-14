const { logger } = require('../utils/logger');

// Global error handler for customer app
const globalErrorHandler = (err, req, res, next) => {
  // Log error details
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    organizationId: req.user?.organizationId,
    userId: req.user?.userId,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Don't expose internal errors to customers
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({
      error: 'An internal server error occurred',
      code: 'INTERNAL_ERROR',
    });
  } else {
    res.status(500).json({
      error: err.message,
      stack: err.stack,
      code: 'INTERNAL_ERROR',
    });
  }
};

// 404 handler
const notFoundHandler = (req, res) => {
  logger.warn('Route not found', {
    path: req.path,
    method: req.method,
    organizationId: req.user?.organizationId,
    ip: req.ip,
  });

  res.status(404).json({
    error: 'Route not found',
    code: 'NOT_FOUND',
  });
};

// Validation error handler
const validationErrorHandler = (err, req, res, next) => {
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
    }));

    logger.info('Validation error', {
      errors,
      organizationId: req.user?.organizationId,
      path: req.path,
      method: req.method,
    });

    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors,
    });
  }

  next(err);
};

module.exports = {
  globalErrorHandler,
  notFoundHandler,
  validationErrorHandler,
};
