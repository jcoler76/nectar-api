/**
 * Debug Logger Utility
 * Provides safe logging that only outputs in development mode
 */

const debugLogger = {
  /**
   * Log debug information (only in development)
   */
  debug: (...args) => {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.debug('[DEBUG]', ...args);
    }
  },

  /**
   * Log informational messages (only in development)
   */
  info: (...args) => {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('[INFO]', ...args);
    }
  },

  /**
   * Log warnings (always logged)
   */
  warn: (...args) => {
    // eslint-disable-next-line no-console
    console.warn('[WARN]', ...args);
  },

  /**
   * Log errors (always logged)
   */
  error: (...args) => {
    // eslint-disable-next-line no-console
    console.error('[ERROR]', ...args);
  },
};

export default debugLogger;
