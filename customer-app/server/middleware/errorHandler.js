const { AppError, createSafeError, errorMiddleware } = require('../utils/errorHandler');

// Re-export from the new location for backward compatibility
module.exports = {
  AppError,
  errorHandler: errorMiddleware,
};
