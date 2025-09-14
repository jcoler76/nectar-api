const winston = require('winston');
const morgan = require('morgan');
const { createSanitizedLogger, sanitizeLogArgs } = require('../utils/logSanitizer');

// Base Winston logger
const baseLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'nectar-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Add console transport for non-production
if (process.env.NODE_ENV !== 'production') {
  baseLogger.add(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    })
  );
}

// Create sanitized logger
const logger = createSanitizedLogger(baseLogger);

// Custom Morgan token to sanitize sensitive data in URLs
morgan.token('sanitized-url', req => {
  let url = req.originalUrl || req.url;
  // Remove sensitive query parameters
  url = url.replace(/([?&])(password|token|apiKey|secret)=[^&]*/gi, '$1$2=[REDACTED]');
  return url;
});

// Request logger with sanitized output
const requestLogger = morgan(
  ':method :sanitized-url :status :response-time ms - :res[content-length]',
  {
    stream: {
      write: message => logger.info(message.trim()),
    },
    skip: req => {
      // Skip logging for health checks
      return req.url === '/health' || req.url === '/api/health';
    },
  }
);

// Export both sanitized and base logger
module.exports = {
  logger,
  baseLogger,
  requestLogger,
  sanitizeLogArgs,
};
