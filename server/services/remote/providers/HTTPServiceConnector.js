const axios = require('axios');
const IRemoteService = require('../interfaces/IRemoteService');
const { logger } = require('../../../utils/logger');

/**
 * HTTP Service Connector
 * Provides HTTP/REST API connectivity with advanced features
 */
class HTTPServiceConnector extends IRemoteService {
  constructor(config) {
    super(config);
    this.client = null;
    this.metrics = {
      requests: 0,
      errors: 0,
      totalResponseTime: 0,
    };

    this._initializeClient();
  }

  /**
   * Initialize Axios client with configuration
   * @private
   */
  _initializeClient() {
    const clientConfig = {
      baseURL: this.config.baseURL,
      timeout: this.config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': this.config.userAgent || 'Nectar-API-HTTPConnector/1.0',
        ...this.config.defaultHeaders,
      },
    };

    // Add authentication
    if (this.config.auth) {
      if (this.config.auth.type === 'bearer') {
        clientConfig.headers.Authorization = `Bearer ${this.config.auth.token}`;
      } else if (this.config.auth.type === 'basic') {
        clientConfig.auth = {
          username: this.config.auth.username,
          password: this.config.auth.password,
        };
      } else if (this.config.auth.type === 'apikey') {
        const headerName = this.config.auth.headerName || 'X-API-Key';
        clientConfig.headers[headerName] = this.config.auth.apiKey;
      }
    }

    // Add SSL/TLS configuration
    if (this.config.ssl) {
      clientConfig.httpsAgent = new require('https').Agent({
        rejectUnauthorized: this.config.ssl.rejectUnauthorized !== false,
        cert: this.config.ssl.cert,
        key: this.config.ssl.key,
        ca: this.config.ssl.ca,
      });
    }

    // Add proxy configuration
    if (this.config.proxy) {
      clientConfig.proxy = this.config.proxy;
    }

    this.client = axios.create(clientConfig);

    // Add request interceptor for logging and metrics
    this.client.interceptors.request.use(
      request => {
        request.metadata = { startTime: Date.now() };
        logger.debug('HTTP request starting', {
          method: request.method?.toUpperCase(),
          url: request.url,
          headers: this._sanitizeHeaders(request.headers),
        });
        return request;
      },
      error => {
        this.metrics.errors++;
        logger.error('HTTP request interceptor error:', error.message);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging and metrics
    this.client.interceptors.response.use(
      response => {
        const responseTime = Date.now() - response.config.metadata.startTime;
        this.metrics.requests++;
        this.metrics.totalResponseTime += responseTime;

        logger.debug('HTTP response received', {
          method: response.config.method?.toUpperCase(),
          url: response.config.url,
          status: response.status,
          responseTime: `${responseTime}ms`,
        });

        return response;
      },
      error => {
        const responseTime = error.config?.metadata
          ? Date.now() - error.config.metadata.startTime
          : 0;

        this.metrics.errors++;
        if (responseTime > 0) {
          this.metrics.requests++;
          this.metrics.totalResponseTime += responseTime;
        }

        logger.error('HTTP response error', {
          method: error.config?.method?.toUpperCase(),
          url: error.config?.url,
          status: error.response?.status,
          message: error.message,
          responseTime: responseTime > 0 ? `${responseTime}ms` : 'unknown',
        });

        return Promise.reject(error);
      }
    );
  }

  /**
   * Sanitize headers for logging (remove sensitive information)
   * @private
   */
  _sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'x-api-key', 'cookie', 'set-cookie'];

    Object.keys(sanitized).forEach(key => {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Test the HTTP service connection
   */
  async testConnection() {
    try {
      logger.debug('Testing HTTP service connection', {
        baseURL: this.config.baseURL,
        timeout: this.config.timeout,
      });

      const testPath = this.config.healthCheckPath || '/health';
      const response = await this.client.get(testPath);

      return {
        success: true,
        message: 'HTTP service connection successful',
        details: {
          status: response.status,
          responseTime: Date.now() - response.config.metadata.startTime,
          headers: this._sanitizeHeaders(response.headers),
        },
      };
    } catch (error) {
      logger.error('HTTP service connection test failed:', error.message);

      return {
        success: false,
        error: error.message,
        details: {
          status: error.response?.status,
          statusText: error.response?.statusText,
          code: error.code,
        },
      };
    }
  }

  /**
   * Make an HTTP request
   */
  async makeRequest(request) {
    try {
      if (!this.validateRequest(request)) {
        throw new Error('Invalid request format');
      }

      const transformedRequest = this.transformRequest(request);

      const axiosConfig = {
        method: transformedRequest.method || 'GET',
        url: transformedRequest.path || '/',
        headers: transformedRequest.headers || {},
        params: transformedRequest.params || {},
        ...transformedRequest.options,
      };

      // Add request data for POST, PUT, PATCH requests
      if (['POST', 'PUT', 'PATCH'].includes(axiosConfig.method.toUpperCase())) {
        axiosConfig.data = transformedRequest.data;
      }

      const response = await this.client.request(axiosConfig);
      const transformedResponse = this.transformResponse(response);

      logger.info('HTTP request completed successfully', {
        method: axiosConfig.method,
        url: axiosConfig.url,
        status: response.status,
      });

      return {
        success: true,
        data: transformedResponse.data,
        status: transformedResponse.status,
        headers: transformedResponse.headers,
        statusText: transformedResponse.statusText,
      };
    } catch (error) {
      logger.error('HTTP request failed:', {
        method: request.method,
        path: request.path,
        error: error.message,
        status: error.response?.status,
      });

      return {
        success: false,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers,
      };
    }
  }

  /**
   * Make multiple HTTP requests in parallel
   */
  async makeBatchRequests(requests) {
    try {
      const requestPromises = requests.map(async (request, index) => {
        try {
          const result = await this.makeRequest(request);
          return { index, result };
        } catch (error) {
          return {
            index,
            result: {
              success: false,
              error: error.message,
            },
          };
        }
      });

      const responses = await Promise.allSettled(requestPromises);
      const results = new Array(requests.length);

      responses.forEach((response, index) => {
        if (response.status === 'fulfilled') {
          results[response.value.index] = response.value.result;
        } else {
          results[index] = {
            success: false,
            error: response.reason.message,
          };
        }
      });

      const successCount = results.filter(r => r.success).length;

      logger.info('Batch HTTP requests completed', {
        total: requests.length,
        successful: successCount,
        failed: requests.length - successCount,
      });

      return results;
    } catch (error) {
      logger.error('Batch HTTP requests failed:', error.message);
      throw error;
    }
  }

  /**
   * Get service health status
   */
  async getHealth() {
    try {
      const healthCheck = await this.testConnection();
      return {
        healthy: healthCheck.success,
        details: {
          baseURL: this.config.baseURL,
          lastCheck: new Date().toISOString(),
          ...healthCheck.details,
        },
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          error: error.message,
          lastCheck: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Get service metrics
   */
  async getMetrics(options = {}) {
    const avgResponseTime =
      this.metrics.requests > 0
        ? Math.round(this.metrics.totalResponseTime / this.metrics.requests)
        : 0;

    return {
      requests: this.metrics.requests,
      errors: this.metrics.errors,
      avgResponseTime,
      successRate:
        this.metrics.requests > 0
          ? Math.round(
              ((this.metrics.requests - this.metrics.errors) / this.metrics.requests) * 100
            )
          : 0,
      uptime: process.uptime(),
    };
  }

  /**
   * Validate request format
   */
  validateRequest(request) {
    if (!request || typeof request !== 'object') {
      return false;
    }

    // Method is optional (defaults to GET)
    if (request.method && !this.getSupportedMethods().includes(request.method.toUpperCase())) {
      return false;
    }

    return true;
  }

  /**
   * Get supported HTTP methods
   */
  getSupportedMethods() {
    return ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
  }

  /**
   * Get rate limits
   */
  getRateLimits() {
    return {
      requestsPerSecond: this.config.rateLimits?.requestsPerSecond || 100,
      requestsPerMinute: this.config.rateLimits?.requestsPerMinute || 6000,
      concurrentRequests: this.config.rateLimits?.concurrentRequests || 50,
      timeWindow: '1m',
    };
  }

  /**
   * Transform request (can be overridden for custom transformations)
   */
  transformRequest(request) {
    // Apply global request transformations if configured
    if (this.config.requestTransform) {
      return this.config.requestTransform(request);
    }
    return request;
  }

  /**
   * Transform response (can be overridden for custom transformations)
   */
  transformResponse(response) {
    // Apply global response transformations if configured
    if (this.config.responseTransform) {
      return this.config.responseTransform(response);
    }
    return response;
  }

  /**
   * Get service information
   */
  static getServiceInfo() {
    return {
      type: 'HTTP',
      name: 'HTTP Service Connector',
      description: 'RESTful HTTP API connector with advanced features',
      features: [
        'RESTful API support',
        'Multiple authentication methods',
        'Request/Response transformations',
        'Batch request processing',
        'SSL/TLS support',
        'Proxy support',
        'Request/Response logging',
        'Metrics and monitoring',
        'Rate limiting',
        'Health checks',
      ],
      icon: '🌐',
      category: 'remote',
    };
  }

  /**
   * Get configuration validation rules
   */
  static getConfigValidation() {
    return {
      baseURL: {
        required: true,
        type: 'string',
        description: 'Base URL for the HTTP service',
      },
      timeout: {
        required: false,
        type: 'number',
        description: 'Request timeout in milliseconds',
        default: 30000,
      },
      auth: {
        required: false,
        type: 'object',
        description: 'Authentication configuration',
        properties: {
          type: {
            required: true,
            type: 'string',
            enum: ['bearer', 'basic', 'apikey'],
            description: 'Authentication type',
          },
        },
      },
      defaultHeaders: {
        required: false,
        type: 'object',
        description: 'Default headers to include with requests',
      },
      healthCheckPath: {
        required: false,
        type: 'string',
        description: 'Path for health check endpoint',
        default: '/health',
      },
      rateLimits: {
        required: false,
        type: 'object',
        description: 'Rate limiting configuration',
      },
      ssl: {
        required: false,
        type: 'object',
        description: 'SSL/TLS configuration',
      },
      proxy: {
        required: false,
        type: 'object',
        description: 'Proxy configuration',
      },
    };
  }
}

module.exports = HTTPServiceConnector;
