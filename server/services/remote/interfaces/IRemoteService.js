/**
 * Interface for remote service connectors (HTTP, SOAP, GraphQL)
 * All remote service connectors must implement these methods
 */
class IRemoteService {
  constructor(config) {
    if (new.target === IRemoteService) {
      throw new Error('Cannot instantiate abstract class IRemoteService directly');
    }
    this.config = config;
  }

  /**
   * Test the remote service connection
   * @returns {Promise<{success: boolean, message?: string, error?: string}>}
   */
  async testConnection() {
    throw new Error('Method testConnection must be implemented');
  }

  /**
   * Make a request to the remote service
   * @param {Object} request - Request details
   * @param {string} request.method - HTTP method (GET, POST, etc.)
   * @param {string} [request.path] - API path/endpoint
   * @param {Object} [request.headers] - Request headers
   * @param {Object|string} [request.data] - Request body/data
   * @param {Object} [request.params] - Query parameters
   * @param {Object} [request.options] - Additional request options
   * @returns {Promise<{success: boolean, data?: any, status?: number, headers?: Object, error?: string}>}
   */
  async makeRequest(request) {
    throw new Error('Method makeRequest must be implemented');
  }

  /**
   * Make multiple requests in parallel
   * @param {Array<Object>} requests - Array of request objects
   * @returns {Promise<Array<{success: boolean, data?: any, error?: string}>>}
   */
  async makeBatchRequests(requests) {
    throw new Error('Method makeBatchRequests must be implemented');
  }

  /**
   * Get service health/status
   * @returns {Promise<{healthy: boolean, details?: Object}>}
   */
  async getHealth() {
    throw new Error('Method getHealth must be implemented');
  }

  /**
   * Get service metrics/statistics
   * @param {Object} options - Query options
   * @returns {Promise<{requests: number, errors: number, avgResponseTime: number}>}
   */
  async getMetrics(options = {}) {
    throw new Error('Method getMetrics must be implemented');
  }

  /**
   * Validate request format
   * @param {Object} request - Request to validate
   * @returns {boolean}
   */
  validateRequest(request) {
    throw new Error('Method validateRequest must be implemented');
  }

  /**
   * Get supported request methods
   * @returns {string[]} Array of supported HTTP methods
   */
  getSupportedMethods() {
    throw new Error('Method getSupportedMethods must be implemented');
  }

  /**
   * Get rate limits for this service
   * @returns {Object} Rate limit information
   */
  getRateLimits() {
    throw new Error('Method getRateLimits must be implemented');
  }

  /**
   * Transform request before sending
   * @param {Object} request - Original request
   * @returns {Object} Transformed request
   */
  transformRequest(request) {
    return request;
  }

  /**
   * Transform response after receiving
   * @param {Object} response - Original response
   * @returns {Object} Transformed response
   */
  transformResponse(response) {
    return response;
  }

  /**
   * Get service information
   * @returns {Object}
   */
  static getServiceInfo() {
    throw new Error('Static method getServiceInfo must be implemented');
  }

  /**
   * Get configuration validation rules
   * @returns {Object}
   */
  static getConfigValidation() {
    throw new Error('Static method getConfigValidation must be implemented');
  }
}

module.exports = IRemoteService;
