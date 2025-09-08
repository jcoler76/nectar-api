const crypto = require('crypto');
const logger = require('../config/winston');

class EnvironmentValidator {
  constructor() {
    this.requiredVars = new Map();
    this.validationRules = new Map();
    this.warnings = [];
    this.errors = [];
  }

  require(varName, options = {}) {
    this.requiredVars.set(varName, {
      required: true,
      ...options,
    });
    return this;
  }

  optional(varName, options = {}) {
    this.requiredVars.set(varName, {
      required: false,
      ...options,
    });
    return this;
  }

  addRule(varName, ruleName, validator, message) {
    if (!this.validationRules.has(varName)) {
      this.validationRules.set(varName, []);
    }

    this.validationRules.get(varName).push({
      name: ruleName,
      validator,
      message,
    });

    return this;
  }

  minLength(varName, length) {
    return this.addRule(
      varName,
      'minLength',
      value => value && value.length >= length,
      `must be at least ${length} characters long`
    );
  }

  isURL(varName, protocols = ['http', 'https']) {
    return this.addRule(
      varName,
      'isURL',
      value => {
        if (!value) return true;

        // Special handling for MongoDB URIs which may have replica set format
        if (protocols.includes('mongodb') || protocols.includes('mongodb+srv')) {
          return this.isValidMongoDBURI(value, protocols);
        }

        try {
          const url = new URL(value);
          return protocols.includes(url.protocol.replace(':', ''));
        } catch {
          return false;
        }
      },
      `must be a valid URL with protocol: ${protocols.join(', ')}`
    );
  }

  isValidMongoDBURI(value, allowedProtocols) {
    // Check if it starts with allowed MongoDB protocols
    const hasValidProtocol = allowedProtocols.some(protocol => value.startsWith(`${protocol}://`));

    if (!hasValidProtocol) return false;

    // For replica set URIs, the standard URL constructor fails
    // So we do a basic validation for MongoDB connection strings
    const mongodbPattern = /^mongodb(\+srv)?:\/\/[^\/]+\/[^?]*(\?.*)?$/;
    return mongodbPattern.test(value);
  }

  isEmail(varName) {
    return this.addRule(
      varName,
      'isEmail',
      value => {
        if (!value) return true;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
      },
      'must be a valid email address'
    );
  }

  isNumber(varName, min, max) {
    return this.addRule(
      varName,
      'isNumber',
      value => {
        if (!value) return true;
        const num = Number(value);
        if (isNaN(num)) return false;
        if (min !== undefined && num < min) return false;
        if (max !== undefined && num > max) return false;
        return true;
      },
      `must be a number${min !== undefined ? ` >= ${min}` : ''}${max !== undefined ? ` <= ${max}` : ''}`
    );
  }

  isBoolean(varName) {
    return this.addRule(
      varName,
      'isBoolean',
      value => {
        if (!value) return true;
        return ['true', 'false', '1', '0'].includes(value.toLowerCase());
      },
      'must be a boolean value (true/false/1/0)'
    );
  }

  isSecureSecret(varName, minEntropy = 32) {
    return this.addRule(
      varName,
      'isSecureSecret',
      value => {
        if (!value) return true;

        const entropy = this.calculateEntropy(value);
        const hasWeakPatterns = this.detectWeakPatterns(value);

        return entropy >= minEntropy && !hasWeakPatterns;
      },
      `must be a secure secret with minimum entropy of ${minEntropy} bits and no weak patterns`
    );
  }

  oneOf(varName, allowedValues) {
    return this.addRule(
      varName,
      'oneOf',
      value => {
        if (!value) return true;
        return allowedValues.includes(value);
      },
      `must be one of: ${allowedValues.join(', ')}`
    );
  }

  calculateEntropy(str) {
    const frequencies = {};
    for (const char of str) {
      frequencies[char] = (frequencies[char] || 0) + 1;
    }

    let entropy = 0;
    for (const freq of Object.values(frequencies)) {
      const probability = freq / str.length;
      entropy -= probability * Math.log2(probability);
    }

    return entropy * str.length;
  }

  detectWeakPatterns(value) {
    const weakPatterns = [
      /^(password|secret|key|admin|test|temp|default)/i,
      /^(.)\1{3,}$/,
      /^123+|abc+|qwerty/i,
      /^(admin|root|user|guest)123/i,
    ];

    return weakPatterns.some(pattern => pattern.test(value));
  }

  validate() {
    this.errors = [];
    this.warnings = [];

    for (const [varName, config] of this.requiredVars) {
      const value = process.env[varName];

      if (config.required && !value) {
        this.errors.push(`Required environment variable ${varName} is not set`);
        continue;
      }

      if (!value && config.default) {
        process.env[varName] = config.default;
        this.warnings.push(`Using default value for ${varName}`);
      }

      if (value && this.validationRules.has(varName)) {
        const rules = this.validationRules.get(varName);

        for (const rule of rules) {
          if (!rule.validator(value)) {
            const message = `Environment variable ${varName} ${rule.message}`;

            if (config.strict !== false) {
              this.errors.push(message);
            } else {
              this.warnings.push(message);
            }
          }
        }
      }
    }

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  validateAndExit() {
    const result = this.validate();

    if (result.warnings.length > 0) {
      result.warnings.forEach(warning => logger.warn(warning));
    }

    if (!result.isValid) {
      logger.error('Environment validation failed:');
      result.errors.forEach(error => logger.error(`  - ${error}`));

      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      } else {
        logger.warn('Continuing in development mode despite validation errors');
      }
    } else {
      logger.info('Environment validation passed');
    }

    return result;
  }

  static createDefaultValidator() {
    return new EnvironmentValidator()
      .require('NODE_ENV')
      .oneOf('NODE_ENV', ['development', 'staging', 'production'])

      .require('MONGODB_URI')
      .isURL('MONGODB_URI', ['mongodb', 'mongodb+srv'])

      .require('JWT_SECRET')
      .minLength('JWT_SECRET', 32)
      .isSecureSecret('JWT_SECRET')

      .require('ENCRYPTION_KEY')
      .minLength('ENCRYPTION_KEY', 32)
      .isSecureSecret('ENCRYPTION_KEY')

      .optional('JWT_ISSUER', { default: 'nectar-api' })
      .optional('JWT_AUDIENCE', { default: 'mirabel-users' })
      .optional('JWT_EXPIRES_IN', { default: '4h' })
      .optional('JWT_REFRESH_EXPIRES_IN', { default: '7d' })

      .optional('REDIS_HOST', { default: 'localhost' })
      .optional('REDIS_PORT', { default: '6379' })
      .isNumber('REDIS_PORT', 1, 65535)

      .optional('CORS_ORIGIN')

      .optional('RATE_LIMIT_WINDOW_MS', { default: '900000' })
      .isNumber('RATE_LIMIT_WINDOW_MS', 1000)

      .optional('RATE_LIMIT_MAX_REQUESTS', { default: '100' })
      .isNumber('RATE_LIMIT_MAX_REQUESTS', 1)

      .optional('RATE_LIMIT_AUTH_MAX', { default: '10' })
      .isNumber('RATE_LIMIT_AUTH_MAX', 1)

      .optional('EMAIL_USER')
      .isEmail('EMAIL_USER')

      .optional('EMAIL_PASS')

      .optional('MCP_DEVELOPER_KEY')
      .minLength('MCP_DEVELOPER_KEY', 16)

      .optional('MCP_UNIVERSAL_KEY')
      .minLength('MCP_UNIVERSAL_KEY', 16)

      .optional('TEMP_ADMIN_PASSWORD')
      .minLength('TEMP_ADMIN_PASSWORD', 8);
  }
}

module.exports = EnvironmentValidator;
