// Re-export the sanitized logger from middleware
// This ensures all logging goes through the sanitized Winston logger
const { logger, baseLogger, sanitizeLogArgs } = require('../middleware/logger');

module.exports = {
  logger,
  baseLogger,
  sanitizeLogArgs,
};
