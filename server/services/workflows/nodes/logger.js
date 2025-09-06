const { logger } = require('../../../utils/logger');

const execute = async (config, context) => {
  const { label, message, level = 'info', includeContext = false } = config;

  logger.info(`Executing Logger Node: ${label}`);

  // Interpolate the message with context data if needed
  let logMessage = message;
  if (typeof message === 'string' && message.includes('{{')) {
    // Simple interpolation for common context variables
    logMessage = message
      .replace(/\{\{trigger\}\}/g, JSON.stringify(context.trigger || {}))
      .replace(/\{\{currentNodeId\}\}/g, context.currentNodeId || 'unknown')
      .replace(/\{\{timestamp\}\}/g, new Date().toISOString());
  }

  // Determine log level and execute
  switch (level.toLowerCase()) {
    case 'error':
      logger.error(`[Workflow Logger] ${label}: ${logMessage}`);
      break;
    case 'warn':
    case 'warning':
      logger.warn(`[Workflow Logger] ${label}: ${logMessage}`);
      break;
    case 'debug':
      logger.debug(`[Workflow Logger] ${label}: ${logMessage}`);
      break;
    case 'info':
    default:
      logger.info(`[Workflow Logger] ${label}: ${logMessage}`);
      break;
  }

  // Include context data if requested
  if (includeContext) {
    const contextData = {
      trigger: context.trigger,
      currentNodeId: context.currentNodeId,
      timestamp: new Date().toISOString(),
    };
    logger.debug(`[Workflow Logger] ${label} - Context:`, contextData);
  }

  logger.info(`Logger node completed: ${label}`);

  return {
    status: 'success',
    logged: true,
    message: logMessage,
    level: level.toLowerCase(),
    timestamp: new Date().toISOString(),
  };
};

module.exports = {
  execute,
};
