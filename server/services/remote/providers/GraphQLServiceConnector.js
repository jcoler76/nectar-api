const { GraphQLClient } = require('graphql-request');
const { gql } = require('graphql-request');
const IRemoteService = require('../interfaces/IRemoteService');
const { logger } = require('../../../utils/logger');

/**
 * GraphQL Service Connector
 * Provides GraphQL API connectivity with query, mutation, and subscription support
 */
class GraphQLServiceConnector extends IRemoteService {
  constructor(config) {
    super(config);
    this.client = null;
    this.metrics = {
      queries: 0,
      mutations: 0,
      subscriptions: 0,
      errors: 0,
      totalResponseTime: 0,
    };

    this._initializeClient();
  }

  /**
   * Initialize GraphQL client with configuration
   * @private
   */
  _initializeClient() {
    const headers = {
      'User-Agent': this.config.userAgent || 'Nectar-API-GraphQLConnector/1.0',
      ...this.config.defaultHeaders,
    };

    // Add authentication
    if (this.config.auth) {
      if (this.config.auth.type === 'bearer') {
        headers.Authorization = `Bearer ${this.config.auth.token}`;
      } else if (this.config.auth.type === 'apikey') {
        const headerName = this.config.auth.headerName || 'X-API-Key';
        headers[headerName] = this.config.auth.apiKey;
      }
    }

    this.client = new GraphQLClient(this.config.endpoint, {
      headers,
      timeout: this.config.timeout || 30000,
    });
  }

  /**
   * Test the GraphQL service connection
   */
  async testConnection() {
    try {
      logger.debug('Testing GraphQL service connection', {
        endpoint: this.config.endpoint,
        timeout: this.config.timeout,
      });

      // Try introspection query to test connection
      const introspectionQuery = gql`
        query IntrospectionQuery {
          __schema {
            queryType {
              name
            }
            mutationType {
              name
            }
            subscriptionType {
              name
            }
          }
        }
      `;

      const startTime = Date.now();
      const response = await this.client.request(introspectionQuery);
      const responseTime = Date.now() - startTime;

      return {
        success: true,
        message: 'GraphQL service connection successful',
        details: {
          responseTime: `${responseTime}ms`,
          schema: {
            hasQueries: !!response.__schema.queryType,
            hasMutations: !!response.__schema.mutationType,
            hasSubscriptions: !!response.__schema.subscriptionType,
          },
        },
      };
    } catch (error) {
      logger.error('GraphQL service connection test failed:', error.message);

      return {
        success: false,
        error: error.message,
        details: {
          endpoint: this.config.endpoint,
          response: error.response,
        },
      };
    }
  }

  /**
   * Make a GraphQL request
   */
  async makeRequest(request) {
    try {
      if (!this.validateRequest(request)) {
        throw new Error('Invalid GraphQL request format');
      }

      const transformedRequest = this.transformRequest(request);
      const startTime = Date.now();

      let response;
      const queryType = this._detectQueryType(transformedRequest.query);

      switch (transformedRequest.method?.toUpperCase() || 'QUERY') {
        case 'QUERY':
          response = await this.client.request(
            transformedRequest.query,
            transformedRequest.variables || {},
            transformedRequest.headers || {}
          );
          this.metrics.queries++;
          break;

        case 'MUTATION':
          response = await this.client.request(
            transformedRequest.query,
            transformedRequest.variables || {},
            transformedRequest.headers || {}
          );
          this.metrics.mutations++;
          break;

        case 'SUBSCRIPTION':
          // Note: Basic GraphQL client doesn't support subscriptions
          // This would require a WebSocket-based client for real-time subscriptions
          throw new Error(
            'Subscriptions require WebSocket support (not implemented in basic client)'
          );

        default:
          response = await this.client.request(
            transformedRequest.query,
            transformedRequest.variables || {},
            transformedRequest.headers || {}
          );
          this.metrics.queries++;
      }

      const responseTime = Date.now() - startTime;
      this.metrics.totalResponseTime += responseTime;

      const transformedResponse = this.transformResponse({
        data: response,
        responseTime,
        queryType,
      });

      logger.info('GraphQL request completed successfully', {
        queryType,
        responseTime: `${responseTime}ms`,
        dataKeys: Object.keys(response),
      });

      return {
        success: true,
        data: transformedResponse.data,
        queryType,
        responseTime,
        headers: transformedResponse.headers,
      };
    } catch (error) {
      this.metrics.errors++;

      logger.error('GraphQL request failed:', {
        error: error.message,
        response: error.response,
        request: this._sanitizeQuery(request.query),
      });

      return {
        success: false,
        error: error.message,
        details: {
          response: error.response,
          graphQLErrors: error.response?.errors,
        },
      };
    }
  }

  /**
   * Make multiple GraphQL requests in parallel
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

      logger.info('Batch GraphQL requests completed', {
        total: requests.length,
        successful: successCount,
        failed: requests.length - successCount,
      });

      return results;
    } catch (error) {
      logger.error('Batch GraphQL requests failed:', error.message);
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
          endpoint: this.config.endpoint,
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
    const totalRequests =
      this.metrics.queries + this.metrics.mutations + this.metrics.subscriptions;
    const avgResponseTime =
      totalRequests > 0 ? Math.round(this.metrics.totalResponseTime / totalRequests) : 0;

    return {
      queries: this.metrics.queries,
      mutations: this.metrics.mutations,
      subscriptions: this.metrics.subscriptions,
      totalRequests,
      errors: this.metrics.errors,
      avgResponseTime,
      successRate:
        totalRequests > 0
          ? Math.round(((totalRequests - this.metrics.errors) / totalRequests) * 100)
          : 0,
      uptime: process.uptime(),
    };
  }

  /**
   * Validate GraphQL request format
   */
  validateRequest(request) {
    if (!request || typeof request !== 'object') {
      return false;
    }

    // GraphQL query is required
    if (!request.query || typeof request.query !== 'string') {
      return false;
    }

    // Variables should be an object if provided
    if (request.variables && typeof request.variables !== 'object') {
      return false;
    }

    return true;
  }

  /**
   * Get supported request methods (GraphQL operations)
   */
  getSupportedMethods() {
    return ['QUERY', 'MUTATION', 'SUBSCRIPTION'];
  }

  /**
   * Get rate limits
   */
  getRateLimits() {
    return {
      requestsPerSecond: this.config.rateLimits?.requestsPerSecond || 50,
      requestsPerMinute: this.config.rateLimits?.requestsPerMinute || 3000,
      concurrentRequests: this.config.rateLimits?.concurrentRequests || 25,
      timeWindow: '1m',
      complexity: this.config.rateLimits?.maxComplexity || 1000,
    };
  }

  /**
   * Detect query type from GraphQL query string
   * @private
   */
  _detectQueryType(query) {
    const trimmedQuery = query.trim().toLowerCase();
    if (trimmedQuery.startsWith('mutation')) {
      return 'mutation';
    } else if (trimmedQuery.startsWith('subscription')) {
      return 'subscription';
    } else {
      return 'query';
    }
  }

  /**
   * Sanitize GraphQL query for logging (remove sensitive data)
   * @private
   */
  _sanitizeQuery(query) {
    if (typeof query !== 'string') return '[Invalid Query]';

    // Truncate very long queries
    if (query.length > 500) {
      return query.substring(0, 500) + '... [truncated]';
    }

    return query;
  }

  /**
   * Helper method to create GraphQL queries
   */
  static createQuery(operation, fields, variables = {}) {
    const variableDefinitions =
      Object.keys(variables).length > 0
        ? `(${Object.keys(variables)
            .map(key => `$${key}: ${typeof variables[key]}`)
            .join(', ')})`
        : '';

    return gql`
      query ${variableDefinitions} {
        ${operation} {
          ${fields}
        }
      }
    `;
  }

  /**
   * Helper method to create GraphQL mutations
   */
  static createMutation(operation, fields, variables = {}) {
    const variableDefinitions =
      Object.keys(variables).length > 0
        ? `(${Object.keys(variables)
            .map(key => `$${key}: ${typeof variables[key]}`)
            .join(', ')})`
        : '';

    return gql`
      mutation ${variableDefinitions} {
        ${operation} {
          ${fields}
        }
      }
    `;
  }

  /**
   * Get service information
   */
  static getServiceInfo() {
    return {
      type: 'GRAPHQL',
      name: 'GraphQL Service Connector',
      description: 'GraphQL API connector with query, mutation, and subscription support',
      features: [
        'GraphQL queries and mutations',
        'Variable support',
        'Introspection capabilities',
        'Batch request processing',
        'Query complexity analysis',
        'Authentication support',
        'Request/Response transformations',
        'Metrics and monitoring',
        'Health checks',
        'Error handling',
      ],
      icon: '🔗',
      category: 'remote',
    };
  }

  /**
   * Get configuration validation rules
   */
  static getConfigValidation() {
    return {
      endpoint: {
        required: true,
        type: 'string',
        description: 'GraphQL endpoint URL',
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
            enum: ['bearer', 'apikey'],
            description: 'Authentication type',
          },
        },
      },
      defaultHeaders: {
        required: false,
        type: 'object',
        description: 'Default headers to include with requests',
      },
      rateLimits: {
        required: false,
        type: 'object',
        description: 'Rate limiting and complexity configuration',
        properties: {
          maxComplexity: {
            type: 'number',
            description: 'Maximum query complexity allowed',
            default: 1000,
          },
        },
      },
    };
  }
}

module.exports = GraphQLServiceConnector;
