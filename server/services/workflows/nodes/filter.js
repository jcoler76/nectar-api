const get = require('lodash.get');
const { logger } = require('../../../utils/logger');

const checkCondition = (actualValue, operator, expectedValue) => {
  const numActual = parseFloat(actualValue);
  const numExpected = parseFloat(expectedValue);

  switch (operator) {
    case 'contains':
      return String(actualValue).includes(expectedValue);
    case 'notContains':
      return !String(actualValue).includes(expectedValue);
    case 'equals':
      // Use loose equality to handle "123" == 123
      // eslint-disable-next-line eqeqeq
      return actualValue == expectedValue;
    case 'notEquals':
      // eslint-disable-next-line eqeqeq
      return actualValue != expectedValue;
    case 'startsWith':
      return String(actualValue).startsWith(expectedValue);
    case 'endsWith':
      return String(actualValue).endsWith(expectedValue);
    case 'isEmpty':
      return actualValue === '' || actualValue === null || actualValue === undefined;
    case 'isNotEmpty':
      return actualValue !== '' && actualValue !== null && actualValue !== undefined;
    case 'isGreaterThan':
      return !isNaN(numActual) && !isNaN(numExpected) && numActual > numExpected;
    case 'isLessThan':
      return !isNaN(numActual) && !isNaN(numExpected) && numActual < numExpected;
    default:
      return false;
  }
};

const execute = async (config, context) => {
  const { conditions = [], logic = 'AND' } = config;

  logger.info(`Executing Filter Node: "${config.label}" with logic: ${logic}`);

  if (conditions.length === 0) {
    return { success: true, passed: true, nextPath: 'pass' };
  }

  const results = [];
  for (const condition of conditions) {
    const { field, operator, value } = condition;
    const actualValue = get(context, field);

    const result = checkCondition(actualValue, operator, value);
    logger.info(
      `- Condition: [${actualValue}] (${condition.operator}) [${condition.value}] -> ${result}`
    );

    results.push(result);
  }

  const passes = logic === 'AND' ? results.every(r => r) : results.some(r => r);

  logger.info(`Filter result: ${passes ? 'PASSED' : 'FAILED'}`);

  return {
    success: true,
    passed: passes,
    nextPath: passes ? 'pass' : 'fail',
  };
};

module.exports = {
  execute,
};
