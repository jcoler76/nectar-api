/**
 * Interface for script execution services (Node.js, Python, etc.)
 * All script runners must implement these methods
 */
class IScriptRunner {
  constructor(config) {
    if (new.target === IScriptRunner) {
      throw new Error('Cannot instantiate abstract class IScriptRunner directly');
    }
    this.config = config;
  }

  /**
   * Test the script execution environment
   * @returns {Promise<{success: boolean, message?: string, error?: string, version?: string}>}
   */
  async testEnvironment() {
    throw new Error('Method testEnvironment must be implemented');
  }

  /**
   * Execute a script
   * @param {Object} execution - Execution details
   * @param {string} execution.script - Script content or file path
   * @param {Object} [execution.args] - Script arguments/parameters
   * @param {Object} [execution.env] - Environment variables
   * @param {string} [execution.workingDir] - Working directory
   * @param {number} [execution.timeout] - Execution timeout in milliseconds
   * @param {Object} [execution.options] - Additional execution options
   * @returns {Promise<{success: boolean, output?: string, error?: string, exitCode?: number, duration?: number}>}
   */
  async executeScript(execution) {
    throw new Error('Method executeScript must be implemented');
  }

  /**
   * Execute multiple scripts in parallel
   * @param {Array<Object>} executions - Array of execution objects
   * @returns {Promise<Array<{success: boolean, output?: string, error?: string}>>}
   */
  async executeBatchScripts(executions) {
    throw new Error('Method executeBatchScripts must be implemented');
  }

  /**
   * Execute a script from a file
   * @param {string} filePath - Path to script file
   * @param {Object} [options] - Execution options
   * @returns {Promise<{success: boolean, output?: string, error?: string}>}
   */
  async executeScriptFile(filePath, options = {}) {
    throw new Error('Method executeScriptFile must be implemented');
  }

  /**
   * Validate script content/syntax
   * @param {string} script - Script content to validate
   * @returns {Promise<{valid: boolean, errors?: Array<string>}>}
   */
  async validateScript(script) {
    throw new Error('Method validateScript must be implemented');
  }

  /**
   * Get execution statistics
   * @param {Object} options - Query options
   * @returns {Promise<{executions: number, successes: number, failures: number, avgDuration: number}>}
   */
  async getStatistics(options = {}) {
    throw new Error('Method getStatistics must be implemented');
  }

  /**
   * Kill a running script execution
   * @param {string} executionId - Execution identifier
   * @returns {Promise<{success: boolean, message?: string}>}
   */
  async killExecution(executionId) {
    throw new Error('Method killExecution must be implemented');
  }

  /**
   * Get list of running executions
   * @returns {Promise<Array<{id: string, script: string, startTime: Date, status: string}>>}
   */
  async getRunningExecutions() {
    throw new Error('Method getRunningExecutions must be implemented');
  }

  /**
   * Get supported script file extensions
   * @returns {string[]} Array of supported file extensions
   */
  getSupportedExtensions() {
    throw new Error('Method getSupportedExtensions must be implemented');
  }

  /**
   * Get execution limits for this runner
   * @returns {Object} Execution limit information
   */
  getExecutionLimits() {
    throw new Error('Method getExecutionLimits must be implemented');
  }

  /**
   * Sanitize script content for security
   * @param {string} script - Script content to sanitize
   * @returns {string} Sanitized script content
   */
  sanitizeScript(script) {
    // Basic sanitization - remove dangerous patterns
    return script
      .replace(/require\s*\(\s*['"`]child_process['"`]\s*\)/g, '/* child_process disabled */')
      .replace(/require\s*\(\s*['"`]fs['"`]\s*\)/g, '/* fs disabled */')
      .replace(/require\s*\(\s*['"`]os['"`]\s*\)/g, '/* os disabled */')
      .replace(/process\.exit/g, '/* process.exit disabled */')
      .replace(/eval\s*\(/g, '/* eval disabled */(');
  }

  /**
   * Get runner information
   * @returns {Object}
   */
  static getRunnerInfo() {
    throw new Error('Static method getRunnerInfo must be implemented');
  }

  /**
   * Get configuration validation rules
   * @returns {Object}
   */
  static getConfigValidation() {
    throw new Error('Static method getConfigValidation must be implemented');
  }
}

module.exports = IScriptRunner;
