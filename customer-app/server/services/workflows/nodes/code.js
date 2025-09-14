const ivm = require('isolated-vm');
const { logger } = require('../../../utils/logger');
const {
  getFilteredEnv,
  validateCode,
  getSafeModules,
  SAFE_FUNCTIONS,
  VALIDATION_RULES,
} = require('../../../config/codeNodeSecurity');

/**
 * Helper to get previous node output from workflow context
 */
const getPreviousNodeOutput = context => {
  const contextKeys = Object.keys(context);
  if (contextKeys.length > 1) {
    const lastResultKey = contextKeys[contextKeys.length - 1];
    return context[lastResultKey];
  }
  return context.trigger || {};
};

/**
 * Create a secure isolated VM context with limited access
 */
const createSecureContext = async (workflowContext, userInput, timeout) => {
  // Create isolated VM with memory limit
  const isolate = new ivm.Isolate({
    memoryLimit: VALIDATION_RULES.MAX_MEMORY_MB,
  });

  try {
    // Create a new context within the isolate
    const context = await isolate.createContext();
    const jail = context.global;

    // Set basic globals that are safe
    await jail.set('global', jail.deref());

    // Add safe built-in objects
    await jail.set('Object', Object);
    await jail.set('Array', Array);
    await jail.set('String', String);
    await jail.set('Number', Number);
    await jail.set('Boolean', Boolean);
    await jail.set('Math', Math);
    await jail.set('Date', Date);
    await jail.set('RegExp', RegExp);
    await jail.set('Error', Error);
    await jail.set('Promise', Promise);

    // Add safe JSON methods
    await jail.set('JSON', SAFE_FUNCTIONS.JSON);

    // Add safe console
    await jail.set('console', new ivm.Reference(SAFE_FUNCTIONS.console));

    // Add safe setTimeout
    await jail.set('setTimeout', new ivm.Reference(SAFE_FUNCTIONS.setTimeout(timeout)));

    // Add workflow context data (deep copy to prevent mutation of original)
    await jail.set(
      'context',
      new ivm.ExternalCopy(JSON.parse(JSON.stringify(workflowContext))).copyInto()
    );
    await jail.set('input', new ivm.ExternalCopy(JSON.parse(JSON.stringify(userInput))).copyInto());

    // Add filtered environment variables
    const filteredEnv = getFilteredEnv();
    await jail.set('env', new ivm.ExternalCopy(filteredEnv).copyInto());

    // Add safe modules (these need special handling in isolated-vm)
    const safeModules = getSafeModules();
    for (const [name, module] of Object.entries(safeModules)) {
      try {
        // Create a safe wrapper for each module
        await jail.set(name, new ivm.Reference(module));
        logger.debug(`Code Node: Added safe module ${name}`);
      } catch (error) {
        logger.warn(`Code Node: Could not add module ${name} to sandbox:`, error.message);
      }
    }

    // Add result placeholder
    await jail.set('result', undefined);

    return { isolate, context };
  } catch (error) {
    isolate.dispose();
    throw error;
  }
};

/**
 * Execute user code in a secure isolated environment
 */
const executeCodeNodeSecure = async (config, workflowContext) => {
  const { label, code, timeout = VALIDATION_RULES.MAX_EXECUTION_TIME } = config;

  logger.info('Executing Secure Code Node:', label);

  // Validate timeout
  if (timeout > VALIDATION_RULES.MAX_EXECUTION_TIME) {
    return {
      status: 'error',
      error: `Timeout ${timeout}ms exceeds maximum allowed ${VALIDATION_RULES.MAX_EXECUTION_TIME}ms`,
    };
  }

  // Validate code for security issues
  const validationErrors = validateCode(code);
  if (validationErrors.length > 0) {
    logger.warn('Code Node validation failed:', validationErrors);
    return {
      status: 'error',
      error: `Code validation failed: ${validationErrors.join(', ')}`,
    };
  }

  let isolate = null;
  let context = null;

  try {
    // Get previous node output
    const userInput = getPreviousNodeOutput(workflowContext);

    // Create secure execution context
    const vm = await createSecureContext(workflowContext, userInput, timeout);
    isolate = vm.isolate;
    context = vm.context;

    // Wrap user code to capture result
    const wrappedCode = `
      (function() {
        try {
          // User code execution
          ${code}
          
          // Return result (either explicit return or result variable)
          if (typeof result !== 'undefined') {
            return result;
          } else {
            return undefined;
          }
        } catch (error) {
          throw new Error('Code execution error: ' + error.message);
        }
      })();
    `;

    // Compile the code
    const script = await isolate.compileScript(wrappedCode);

    // Execute with timeout
    const result = await script.run(context, { timeout });

    logger.info('Secure Code Node executed successfully');

    // Convert result back to regular JavaScript object
    let finalResult;
    if (result && typeof result.copyInto === 'function') {
      finalResult = result.copyInto();
    } else {
      finalResult = result;
    }

    return {
      status: 'success',
      result: finalResult,
    };
  } catch (error) {
    logger.error('Secure Code Node execution failed:', error);

    // Sanitize error message to avoid information disclosure
    let errorMessage = 'Code execution failed';

    if (error.message.includes('Script execution timed out')) {
      errorMessage = `Code execution timed out after ${timeout}ms`;
    } else if (error.message.includes('Code validation failed')) {
      errorMessage = error.message;
    } else if (error.message.includes('Code execution error')) {
      errorMessage = error.message;
    } else if (error.message.includes('Memory limit exceeded')) {
      errorMessage = `Code execution exceeded memory limit of ${VALIDATION_RULES.MAX_MEMORY_MB}MB`;
    } else {
      // Generic error for security
      errorMessage = 'Code execution failed due to an internal error';
    }

    return {
      status: 'error',
      error: errorMessage,
    };
  } finally {
    // Always clean up the isolate
    if (isolate) {
      isolate.dispose();
    }
  }
};

module.exports = {
  execute: executeCodeNodeSecure,
};
