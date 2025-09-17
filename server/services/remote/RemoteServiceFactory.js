const HTTPServiceConnector = require('./providers/HTTPServiceConnector');
const GraphQLServiceConnector = require('./providers/GraphQLServiceConnector');
const { logger } = require('../../utils/logger');

/**
 * Remote Service Factory
 * Creates appropriate remote service connector instances based on service type
 */
class RemoteServiceFactory {
  static services = new Map([
    ['HTTP', HTTPServiceConnector],
    ['GRAPHQL', GraphQLServiceConnector],
  ]);

  /**
   * Create a remote service connector instance
   * @param {string} serviceType - Type of remote service (HTTP, GRAPHQL, etc.)
   * @param {Object} config - Service configuration
   * @returns {IRemoteService} Remote service connector instance
   */
  static createService(serviceType, config) {
    const normalizedType = serviceType.toUpperCase();

    if (!this.services.has(normalizedType)) {
      throw new Error(
        `Unsupported remote service: ${serviceType}. Supported services: ${Array.from(this.services.keys()).join(', ')}`
      );
    }

    const ServiceClass = this.services.get(normalizedType);
    return new ServiceClass(config);
  }

  /**
   * Register a new remote service connector
   * @param {string} serviceType - Service type identifier
   * @param {class} ServiceClass - Service class that extends IRemoteService
   */
  static registerService(serviceType, ServiceClass) {
    const normalizedType = serviceType.toUpperCase();

    // Validate that the service extends IRemoteService
    const IRemoteService = require('./interfaces/IRemoteService');
    const testInstance = new ServiceClass({});
    if (!(testInstance instanceof IRemoteService)) {
      throw new Error(`Service for ${serviceType} must extend IRemoteService`);
    }

    this.services.set(normalizedType, ServiceClass);
    logger.info(`Registered remote service: ${normalizedType}`);
  }

  /**
   * Get all supported service types
   * @returns {string[]} Array of supported service types
   */
  static getSupportedTypes() {
    return Array.from(this.services.keys());
  }

  /**
   * Check if a service type is supported
   * @param {string} serviceType - Service type to check
   * @returns {boolean} True if supported
   */
  static isTypeSupported(serviceType) {
    return this.services.has(serviceType.toUpperCase());
  }

  /**
   * Get configuration validation rules for a service type
   * @param {string} serviceType - Service type
   * @returns {Object} Validation rules
   */
  static getValidationRules(serviceType) {
    const normalizedType = serviceType.toUpperCase();

    if (!this.services.has(normalizedType)) {
      throw new Error(`Unsupported remote service: ${serviceType}`);
    }

    const ServiceClass = this.services.get(normalizedType);
    return ServiceClass.getConfigValidation();
  }

  /**
   * Get service type info with display names and descriptions
   * @returns {Object[]} Array of service type information
   */
  static getServiceTypeInfo() {
    return Array.from(this.services.entries()).map(([type, ServiceClass]) => {
      const info = ServiceClass.getServiceInfo();
      return {
        type,
        ...info,
        validation: ServiceClass.getConfigValidation(),
      };
    });
  }

  /**
   * Test a remote service configuration
   * @param {string} serviceType - Service type
   * @param {Object} config - Service configuration
   * @returns {Promise<{success: boolean, message?: string, error?: string}>}
   */
  static async testService(serviceType, config) {
    try {
      const service = this.createService(serviceType, config);
      const result = await service.testConnection();
      return result;
    } catch (error) {
      logger.error('Remote service test failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create a unified remote service manager with multiple services
   * @param {Array<{type: string, config: Object, name: string}>} serviceConfigs
   * @returns {Object} Multi-service remote manager
   */
  static createMultiServiceManager(serviceConfigs) {
    const services = new Map();

    // Initialize all services
    for (const { type, config, name } of serviceConfigs) {
      try {
        const service = this.createService(type, config);
        services.set(name, service);
        logger.info(`Initialized remote service: ${name} (${type})`);
      } catch (error) {
        logger.error(`Failed to initialize remote service ${name}:`, error);
        throw error;
      }
    }

    return {
      /**
       * Get a specific service by name
       */
      getService(name) {
        if (!services.has(name)) {
          throw new Error(`Remote service '${name}' not found`);
        }
        return services.get(name);
      },

      /**
       * Get all service names
       */
      getServiceNames() {
        return Array.from(services.keys());
      },

      /**
       * Make request using specified service
       */
      async makeRequest(serviceName, request) {
        const service = this.getService(serviceName);
        return await service.makeRequest(request);
      },

      /**
       * Make batch requests using specified service
       */
      async makeBatchRequests(serviceName, requests) {
        const service = this.getService(serviceName);
        return await service.makeBatchRequests(requests);
      },

      /**
       * Get health status from specified service
       */
      async getHealth(serviceName) {
        const service = this.getService(serviceName);
        return await service.getHealth();
      },

      /**
       * Get metrics from specified service
       */
      async getMetrics(serviceName, options) {
        const service = this.getService(serviceName);
        return await service.getMetrics(options);
      },

      /**
       * Validate request using specified service
       */
      validateRequest(serviceName, request) {
        const service = this.getService(serviceName);
        return service.validateRequest(request);
      },

      /**
       * Get supported methods from specified service
       */
      getSupportedMethods(serviceName) {
        const service = this.getService(serviceName);
        return service.getSupportedMethods();
      },

      /**
       * Get rate limits from specified service
       */
      getRateLimits(serviceName) {
        const service = this.getService(serviceName);
        return service.getRateLimits();
      },

      /**
       * Test all services
       */
      async testAllServices() {
        const results = {};

        for (const [name, service] of services.entries()) {
          try {
            results[name] = await service.testConnection();
          } catch (error) {
            results[name] = {
              success: false,
              error: error.message,
            };
          }
        }

        return results;
      },

      /**
       * Get health status from all services
       */
      async getAllHealth() {
        const health = {};

        for (const [name, service] of services.entries()) {
          try {
            health[name] = await service.getHealth();
          } catch (error) {
            health[name] = {
              healthy: false,
              details: { error: error.message },
            };
          }
        }

        return health;
      },

      /**
       * Get metrics from all services
       */
      async getAllMetrics(options = {}) {
        const metrics = {};

        for (const [name, service] of services.entries()) {
          try {
            metrics[name] = await service.getMetrics(options);
          } catch (error) {
            metrics[name] = { error: error.message };
          }
        }

        return metrics;
      },

      /**
       * Make request with automatic failover
       */
      async makeRequestWithFailover(request, servicePriority = []) {
        const servicesToTry =
          servicePriority.length > 0 ? servicePriority : Array.from(services.keys());

        let lastError;

        for (const serviceName of servicesToTry) {
          try {
            if (services.has(serviceName)) {
              const result = await this.makeRequest(serviceName, request);
              if (result.success) {
                logger.info(`Request completed successfully using service: ${serviceName}`);
                return { ...result, usedService: serviceName };
              }
              lastError = result.error;
            }
          } catch (error) {
            lastError = error.message;
            logger.warn(`Service ${serviceName} failed, trying next service:`, error.message);
          }
        }

        throw new Error(`All remote services failed. Last error: ${lastError}`);
      },

      /**
       * Execute request with load balancing
       */
      async makeRequestWithLoadBalancing(request, strategy = 'round-robin') {
        const serviceNames = Array.from(services.keys());

        if (serviceNames.length === 0) {
          throw new Error('No services available');
        }

        let selectedService;

        switch (strategy) {
          case 'round-robin':
            // Simple round-robin implementation
            const index = Math.floor(Math.random() * serviceNames.length);
            selectedService = serviceNames[index];
            break;

          case 'random':
            selectedService = serviceNames[Math.floor(Math.random() * serviceNames.length)];
            break;

          default:
            selectedService = serviceNames[0];
        }

        return await this.makeRequest(selectedService, request);
      },
    };
  }

  /**
   * Get services by category (remote, api, etc.)
   * @param {string} category - Service category
   * @returns {Object[]} Array of services in the category
   */
  static getServicesByCategory(category) {
    return this.getServiceTypeInfo().filter(service => service.category === category);
  }

  /**
   * Get remote services specifically
   * @returns {Object[]} Array of remote services
   */
  static getRemoteServices() {
    return this.getServicesByCategory('remote');
  }
}

module.exports = RemoteServiceFactory;
