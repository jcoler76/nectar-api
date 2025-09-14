// TypeScript bridge for workflow nodes to import a logger from TS with Node/ESM compatibility
// Re-exports the existing CommonJS logger from middleware/logger.js

// eslint-disable-next-line @typescript-eslint/no-var-requires
const loggerModule = require('../middleware/logger');

export const logger = loggerModule.logger as import('winston').Logger;
export const baseLogger = loggerModule.baseLogger as import('winston').Logger;
export const sanitizeLogArgs = loggerModule.sanitizeLogArgs as (...args: any[]) => unknown;
