const ActiveDirectoryService = require('./ActiveDirectoryService');
const LDAPService = require('./LDAPService');
const { logger } = require('../../utils/logger');

/**
 * LDAP Service Factory
 * Creates and manages LDAP and Active Directory service instances
 */
class LDAPServiceFactory {
  static services = new Map([
    ['ACTIVE_DIRECTORY', ActiveDirectoryService],
    ['LDAP', LDAPService],
  ]);

  /**
   * Create an LDAP service instance
   * @param {string} serviceType - Type of LDAP service (ACTIVE_DIRECTORY, LDAP)
   * @param {Object} configuration - Service configuration
   * @returns {ActiveDirectoryService|LDAPService} LDAP service instance
   */
  static createService(serviceType, configuration) {
    const normalizedType = serviceType.toUpperCase();

    if (!this.services.has(normalizedType)) {
      throw new Error(
        `Unsupported LDAP service type: ${serviceType}. Supported types: ${Array.from(this.services.keys()).join(', ')}`
      );
    }

    const ServiceClass = this.services.get(normalizedType);
    return new ServiceClass(configuration);
  }

  /**
   * Register a new LDAP service
   * @param {string} serviceType - Service type identifier
   * @param {class} ServiceClass - Service class
   */
  static registerService(serviceType, ServiceClass) {
    const normalizedType = serviceType.toUpperCase();
    this.services.set(normalizedType, ServiceClass);
    logger.info(`Registered LDAP service: ${normalizedType}`);
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
   * Get validation rules for a service type
   * @param {string} serviceType - Service type
   * @returns {Object} Validation rules
   */
  static getValidationRules(serviceType) {
    const normalizedType = serviceType.toUpperCase();

    if (!this.services.has(normalizedType)) {
      throw new Error(`Unsupported LDAP service type: ${serviceType}`);
    }

    const ServiceClass = this.services.get(normalizedType);
    return ServiceClass.getConfigurationValidation();
  }

  /**
   * Get service type information with display names and descriptions
   * @returns {Object[]} Array of service type information
   */
  static getServiceTypeInfo() {
    const serviceTypes = [];

    for (const [type, ServiceClass] of this.services.entries()) {
      try {
        const serviceInfo = ServiceClass.getServiceInfo();
        serviceTypes.push({
          type,
          displayName: serviceInfo.name,
          description: serviceInfo.description,
          category: serviceInfo.category || 'ldap',
          features: serviceInfo.features || [],
          icon: this._getIconForType(type),
        });
      } catch (error) {
        // Fallback for services without getServiceInfo
        serviceTypes.push({
          type,
          displayName: type,
          description: `${type} service`,
          category: 'ldap',
          features: [],
          icon: this._getIconForType(type),
        });
      }
    }

    return serviceTypes;
  }

  /**
   * Get icon for service type
   * @private
   */
  static _getIconForType(type) {
    const icons = {
      ACTIVE_DIRECTORY: '🏢',
      LDAP: '📁',
    };
    return icons[type] || '🔐';
  }

  /**
   * Create multiple service instances from configuration array
   * @param {Array} configurations - Array of service configurations
   * @returns {Map} Map of service instances keyed by name
   */
  static createMultipleServices(configurations) {
    const services = new Map();

    for (const config of configurations) {
      try {
        const service = this.createService(config.type, config);
        const serviceName = config.name || `${config.type}_${services.size}`;
        services.set(serviceName, service);

        logger.info('LDAP service created', {
          name: serviceName,
          type: config.type,
        });
      } catch (error) {
        logger.error('Failed to create LDAP service', {
          type: config.type,
          name: config.name,
          error: error.message,
        });
      }
    }

    return services;
  }

  /**
   * Test connection for multiple services
   * @param {Map} services - Map of service instances
   * @returns {Object} Test results for each service
   */
  static async testMultipleConnections(services) {
    const results = {};

    for (const [name, service] of services) {
      try {
        results[name] = await service.testConnection();
        logger.debug('LDAP service connection tested', {
          name,
          success: results[name].success,
        });
      } catch (error) {
        results[name] = {
          success: false,
          error: error.message,
        };
        logger.error('LDAP service connection test failed', {
          name,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Authenticate user across multiple LDAP services
   * @param {Map} services - Map of service instances
   * @param {string} username - Username to authenticate
   * @param {string} password - Password to authenticate
   * @param {Object} options - Authentication options
   * @returns {Object} Authentication result
   */
  static async authenticateUserAcrossServices(services, username, password, options = {}) {
    const attempts = [];
    let successfulAuth = null;

    for (const [name, service] of services) {
      try {
        logger.debug('Attempting authentication', {
          service: name,
          username,
        });

        const result = await service.authenticateUser(username, password);
        attempts.push({
          service: name,
          success: result.success,
          message: result.message,
        });

        if (result.success) {
          successfulAuth = {
            service: name,
            user: result.user,
            ...result,
          };

          // Stop on first successful authentication unless configured otherwise
          if (!options.tryAllServices) {
            break;
          }
        }
      } catch (error) {
        attempts.push({
          service: name,
          success: false,
          error: error.message,
        });

        logger.warn('Authentication attempt failed', {
          service: name,
          username,
          error: error.message,
        });
      }
    }

    logger.info('Multi-service authentication completed', {
      username,
      successful: !!successfulAuth,
      attempts: attempts.length,
    });

    return {
      success: !!successfulAuth,
      result: successfulAuth,
      attempts,
      totalServices: services.size,
    };
  }

  /**
   * Synchronize users from multiple LDAP services
   * @param {Map} services - Map of service instances
   * @param {Object} options - Synchronization options
   * @returns {Object} Synchronization results
   */
  static async synchronizeUsersFromServices(services, options = {}) {
    const results = {};
    let totalUsers = 0;

    for (const [name, service] of services) {
      try {
        logger.info('Starting user synchronization', {
          service: name,
        });

        const syncResult = await service.synchronizeUsers(options);
        results[name] = syncResult;
        totalUsers += syncResult.statistics?.total || 0;

        logger.info('User synchronization completed', {
          service: name,
          users: syncResult.statistics?.total || 0,
        });
      } catch (error) {
        results[name] = {
          success: false,
          error: error.message,
        };

        logger.error('User synchronization failed', {
          service: name,
          error: error.message,
        });
      }
    }

    return {
      success: Object.values(results).some(r => r.success),
      results,
      totalUsers,
      totalServices: services.size,
    };
  }

  /**
   * Synchronize groups from multiple LDAP services
   * @param {Map} services - Map of service instances
   * @param {Object} options - Synchronization options
   * @returns {Object} Synchronization results
   */
  static async synchronizeGroupsFromServices(services, options = {}) {
    const results = {};
    let totalGroups = 0;

    for (const [name, service] of services) {
      try {
        logger.info('Starting group synchronization', {
          service: name,
        });

        const syncResult = await service.synchronizeGroups(options);
        results[name] = syncResult;
        totalGroups += syncResult.statistics?.total || 0;

        logger.info('Group synchronization completed', {
          service: name,
          groups: syncResult.statistics?.total || 0,
        });
      } catch (error) {
        results[name] = {
          success: false,
          error: error.message,
        };

        logger.error('Group synchronization failed', {
          service: name,
          error: error.message,
        });
      }
    }

    return {
      success: Object.values(results).some(r => r.success),
      results,
      totalGroups,
      totalServices: services.size,
    };
  }

  /**
   * Get status for multiple services
   * @param {Map} services - Map of service instances
   * @returns {Object} Status for each service
   */
  static getMultipleServiceStatus(services) {
    const statuses = {};

    for (const [name, service] of services) {
      try {
        statuses[name] = service.getStatus();
      } catch (error) {
        statuses[name] = {
          error: error.message,
        };
      }
    }

    return statuses;
  }

  /**
   * Disconnect multiple services
   * @param {Map} services - Map of service instances
   */
  static async disconnectMultipleServices(services) {
    const promises = [];

    for (const [name, service] of services) {
      promises.push(
        service.disconnect().catch(error => {
          logger.warn('Failed to disconnect LDAP service', {
            name,
            error: error.message,
          });
        })
      );
    }

    await Promise.allSettled(promises);
    logger.info('All LDAP services disconnected');
  }

  /**
   * Clear cache for multiple services
   * @param {Map} services - Map of service instances
   */
  static clearMultipleServiceCache(services) {
    for (const [name, service] of services) {
      try {
        if (typeof service.clearCache === 'function') {
          service.clearCache();
        }
      } catch (error) {
        logger.warn('Failed to clear cache for LDAP service', {
          name,
          error: error.message,
        });
      }
    }

    logger.info('Cache cleared for all LDAP services');
  }

  /**
   * Create service configuration template
   * @param {string} serviceType - Service type
   * @returns {Object} Configuration template
   */
  static createConfigurationTemplate(serviceType) {
    const normalizedType = serviceType.toUpperCase();

    if (!this.services.has(normalizedType)) {
      throw new Error(`Unsupported LDAP service type: ${serviceType}`);
    }

    const ServiceClass = this.services.get(normalizedType);
    const validation = ServiceClass.getConfigurationValidation();
    const template = {};

    for (const [key, rules] of Object.entries(validation)) {
      template[key] = rules.default || (rules.required ? '' : null);
    }

    return {
      type: serviceType,
      name: `${serviceType.toLowerCase()}_service`,
      ...template,
    };
  }

  /**
   * Validate service configuration
   * @param {Object} config - Service configuration
   * @returns {Object} Validation result
   */
  static validateConfiguration(config) {
    if (!config.type) {
      return {
        valid: false,
        errors: ['Service type is required'],
      };
    }

    try {
      const validation = this.getValidationRules(config.type);
      const errors = [];

      for (const [key, rules] of Object.entries(validation)) {
        if (rules.required && !config[key]) {
          errors.push(`${key} is required for ${config.type} service`);
        }

        if (config[key] && rules.type) {
          const actualType = typeof config[key];
          if (actualType !== rules.type) {
            errors.push(`${key} should be of type ${rules.type}, got ${actualType}`);
          }
        }

        if (config[key] && rules.enum && !rules.enum.includes(config[key])) {
          errors.push(`${key} should be one of: ${rules.enum.join(', ')}`);
        }
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error.message],
      };
    }
  }
}

module.exports = LDAPServiceFactory;
