const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Application = require('../models/Application');
const Service = require('../models/Service');
const logger = require('../config/winston');
const tokenService = require('../utils/tokenService');

class AuthFactory {
  static createJWTMiddleware(options = {}) {
    const { allowRefresh = false, requireUser = true, skipBlacklist = false } = options;

    return async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            success: false,
            message: 'Authorization token required',
          });
        }

        const token = authHeader.substring(7);

        if (!skipBlacklist && tokenService.isTokenBlacklisted(token)) {
          return res.status(401).json({
            success: false,
            message: 'Token has been revoked',
          });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
          issuer: process.env.JWT_ISSUER || 'mirabel-api',
          audience: process.env.JWT_AUDIENCE || 'mirabel-users',
        });

        if (requireUser) {
          const user = await User.findById(decoded.userId);
          if (!user || !user.isActive) {
            return res.status(401).json({
              success: false,
              message: 'User not found or inactive',
            });
          }
          req.user = user;
        }

        req.token = token;
        req.tokenData = decoded;
        next();
      } catch (error) {
        if (error.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            message: 'Token expired',
          });
        }

        logger.error('JWT verification failed:', error);
        return res.status(401).json({
          success: false,
          message: 'Invalid token',
        });
      }
    };
  }

  static createAPIKeyMiddleware(options = {}) {
    const {
      keyHeader = 'x-mirabel-api-key',
      requirePermissions = true,
      allowedRoles = [],
    } = options;

    return async (req, res, next) => {
      try {
        const apiKey = req.headers[keyHeader];

        if (!apiKey) {
          return res.status(401).json({
            success: false,
            message: 'API key required',
          });
        }

        const application = await Application.findOne({
          apiKey,
          isActive: true,
        }).populate('defaultRole');

        if (!application) {
          return res.status(401).json({
            success: false,
            message: 'Invalid API key',
          });
        }

        if (allowedRoles.length > 0 && !allowedRoles.includes(application.defaultRole.name)) {
          return res.status(403).json({
            success: false,
            message: 'Insufficient permissions',
          });
        }

        if (requirePermissions && req.params.serviceName && req.params.procedureName) {
          const hasPermission = await this.validateServicePermission(
            application,
            req.params.serviceName,
            req.params.procedureName,
            req.method
          );

          if (!hasPermission) {
            return res.status(403).json({
              success: false,
              message: 'Access denied for this service/procedure',
            });
          }
        }

        req.application = application;
        req.apiKey = apiKey;
        next();
      } catch (error) {
        logger.error('API key validation failed:', error);
        return res.status(500).json({
          success: false,
          message: 'Authentication error',
        });
      }
    };
  }

  static createDeveloperKeyMiddleware() {
    return async (req, res, next) => {
      try {
        const developerKey = req.headers['x-mirabel-developer-key'];

        if (!developerKey || developerKey !== process.env.MCP_DEVELOPER_KEY) {
          return res.status(401).json({
            success: false,
            message: 'Valid developer key required',
          });
        }

        req.isDeveloper = true;
        next();
      } catch (error) {
        logger.error('Developer key validation failed:', error);
        return res.status(500).json({
          success: false,
          message: 'Authentication error',
        });
      }
    };
  }

  static createUniversalKeyMiddleware() {
    return async (req, res, next) => {
      try {
        const universalKey = req.headers['x-mirabel-universal-key'];

        if (!universalKey || universalKey !== process.env.MCP_UNIVERSAL_KEY) {
          return res.status(401).json({
            success: false,
            message: 'Valid universal key required',
          });
        }

        req.isUniversal = true;
        next();
      } catch (error) {
        logger.error('Universal key validation failed:', error);
        return res.status(500).json({
          success: false,
          message: 'Authentication error',
        });
      }
    };
  }

  static createMultiAuthMiddleware(authTypes = ['jwt']) {
    return async (req, res, next) => {
      const authResults = [];

      for (const authType of authTypes) {
        try {
          let middleware;

          switch (authType) {
            case 'jwt':
              middleware = this.createJWTMiddleware({ requireUser: false });
              break;
            case 'apikey':
              middleware = this.createAPIKeyMiddleware({ requirePermissions: false });
              break;
            case 'developer':
              middleware = this.createDeveloperKeyMiddleware();
              break;
            case 'universal':
              middleware = this.createUniversalKeyMiddleware();
              break;
            default:
              continue;
          }

          await new Promise((resolve, reject) => {
            middleware(req, res, err => {
              if (err) reject(err);
              else {
                authResults.push(authType);
                resolve();
              }
            });
          });

          return next();
        } catch (error) {
          continue;
        }
      }

      return res.status(401).json({
        success: false,
        message: 'Authentication failed for all methods',
      });
    };
  }

  static async validateServicePermission(application, serviceName, procedureName, method) {
    try {
      const service = await Service.findOne({ name: serviceName });
      if (!service) return false;

      const hasPermission = application.defaultRole.permissions.some(
        perm =>
          perm.serviceId.toString() === service._id.toString() &&
          (perm.objectName === procedureName || perm.objectName === `/proc/${procedureName}`) &&
          perm.actions &&
          perm.actions[method]
      );

      return hasPermission;
    } catch (error) {
      logger.error('Permission validation error:', error);
      return false;
    }
  }

  static requireAdmin() {
    return this.createJWTMiddleware().concat((req, res, next) => {
      if (!req.user?.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
      }
      next();
    });
  }

  static optional(middleware) {
    return (req, res, next) => {
      middleware(req, res, err => {
        if (err) {
          logger.debug('Optional auth failed:', err.message);
        }
        next();
      });
    };
  }
}

module.exports = AuthFactory;
