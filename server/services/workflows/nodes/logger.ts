import { logger } from '../../../utils/logger.js';

export interface LoggerConfig {
  logLevel?: string;
  message?: string;
  label?: string;
}

export const execute = async (config: LoggerConfig, context: any) => {
  const level = (config.logLevel || 'info').toLowerCase();
  const message = config.message || 'Logger node executed';

  const meta = {
    workflowTrigger: (context as any)?.trigger,
    nodeLabel: config.label,
  };

  // @ts-ignore - winston logger has dynamic level methods
  if (typeof (logger as any)[level] === 'function') {
    // @ts-ignore
    (logger as any)[level](message, meta);
  } else {
    logger.info(message, meta);
  }

  return {
    level,
    message,
    timestamp: new Date().toISOString(),
  };
};
