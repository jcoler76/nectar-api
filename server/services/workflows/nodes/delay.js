const { logger } = require('../../../utils/logger');

const execute = async (config, context) => {
  const duration = config.delay || 1;
  const unit = config.unit || 'seconds';
  let delayMs = 0;

  switch (unit) {
    case 'seconds':
      delayMs = duration * 1000;
      break;
    case 'minutes':
      delayMs = duration * 60 * 1000;
      break;
    case 'hours':
      delayMs = duration * 60 * 60 * 1000;
      break;
    case 'days':
      delayMs = duration * 24 * 60 * 60 * 1000;
      break;
    default:
      logger.warn(`Unknown delay unit: ${unit}. Defaulting to seconds.`);
      delayMs = duration * 1000;
  }

  logger.info(`Delaying workflow for ${duration} ${unit} (${delayMs}ms)`);

  await new Promise(resolve => setTimeout(resolve, delayMs));

  logger.info(`Delay finished for node ${config.label}.`);

  return { status: 'success', delayedFor: `${duration} ${unit}` };
};

module.exports = {
  execute,
};
