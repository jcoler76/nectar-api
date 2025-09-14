const { logger } = require('../middleware/logger');

/**
 * Override console methods in production to use sanitized logger
 * This prevents accidental sensitive data leakage through console.log
 */
function overrideConsole() {
  if (process.env.NODE_ENV === 'production') {
    // Save original console methods for emergency use
    const originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug,
    };

    // Override console methods
    console.log = (...args) => {
      logger.info('Console.log called', { message: args[0], data: args.slice(1) });
    };

    console.error = (...args) => {
      logger.error('Console.error called', { message: args[0], data: args.slice(1) });
    };

    console.warn = (...args) => {
      logger.warn('Console.warn called', { message: args[0], data: args.slice(1) });
    };

    console.info = (...args) => {
      logger.info('Console.info called', { message: args[0], data: args.slice(1) });
    };

    console.debug = (...args) => {
      logger.debug('Console.debug called', { message: args[0], data: args.slice(1) });
    };

    // Expose original console for emergency use
    global._originalConsole = originalConsole;

    logger.info('Console methods overridden for production environment');
  }
}

module.exports = { overrideConsole };
