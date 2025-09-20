const jwt = require('jsonwebtoken');
const prismaService = require('../services/prismaService');
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
          issuer: process.env.JWT_ISSUER || 'nectar-api',
          audience: process.env.JWT_AUDIENCE || 'nectar-client',
        });

        if (requireUser) {
          const user = await prismaService.findUserById(decoded.userId);
          if (!user || !user.isActive) {
            return res.status(401).json({
              success: false,
              message: 'User not found or inactive',
            });
          }

          // Update last login time
          try {
            await prismaService.updateUserLastLogin(decoded.userId);
          } catch (error) {
            logger.warn('Failed to update last login time:', error);
          }

          // Enhanced role detection for new RBAC system
          const hasOwnerRole = user.memberships?.some(m => m.role === 'OWNER') || false;
          const hasSuperAdminRole = user.memberships?.some(m => m.role === 'SUPER_ADMIN') || false;
          const hasOrgAdminRole =
            user.memberships?.some(m =>
              ['ADMIN', 'ORGANIZATION_ADMIN', 'ORGANIZATION_OWNER'].includes(m.role)
            ) || false;

          req.user = {
            ...user,
            userId: user.id, // Add userId for compatibility with existing code
            isAdmin: hasOwnerRole || hasSuperAdminRole || hasOrgAdminRole, // Legacy compatibility
            isSuperAdmin: user.isSuperAdmin || hasSuperAdminRole, // Platform-level access
            roles: user.memberships?.map(m => m.role) || [], // All user roles
            permissions: this.calculateUserPermissions(user), // Calculate permissions based on roles
          };
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
      keyHeader = 'x-nectarstudio-api-key',
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
        const developerKey = req.headers['x-nectarstudio-developer-key'];

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
        const universalKey = req.headers['x-nectarstudio-universal-key'];

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
    return (req, res, next) => {
      this.createJWTMiddleware()(req, res, err => {
        if (err) return next(err);

        if (!req.user?.isAdmin) {
          return res.status(403).json({
            success: false,
            message: 'Admin access required',
          });
        }
        next();
      });
    };
  }

  static requireSuperAdmin() {
    return (req, res, next) => {
      this.createJWTMiddleware()(req, res, err => {
        if (err) return next(err);

        if (!req.user?.isSuperAdmin) {
          return res.status(403).json({
            success: false,
            message: 'Super admin access required',
          });
        }
        next();
      });
    };
  }

  static requireRole(...roles) {
    return (req, res, next) => {
      this.createJWTMiddleware()(req, res, err => {
        if (err) return next(err);

        const userRoles = req.user?.roles || [];
        const hasRequiredRole = roles.some(role => userRoles.includes(role));

        if (!hasRequiredRole) {
          return res.status(403).json({
            success: false,
            message: `Required roles: ${roles.join(', ')}`,
          });
        }
        next();
      });
    };
  }

  static requireOrganizationAccess(allowedRoles = []) {
    return (req, res, next) => {
      this.createJWTMiddleware()(req, res, err => {
        if (err) return next(err);

        const organizationId = req.params.organizationId || req.body.organizationId;
        if (!organizationId) {
          return res.status(400).json({
            success: false,
            message: 'Organization ID required',
          });
        }

        // Super admins have access to all organizations
        if (req.user?.isSuperAdmin) {
          return next();
        }

        // Check if user has membership in the organization with allowed roles
        const orgMembership = req.user?.memberships?.find(m => m.organizationId === organizationId);

        if (!orgMembership) {
          return res.status(403).json({
            success: false,
            message: 'No access to this organization',
          });
        }

        if (allowedRoles.length > 0 && !allowedRoles.includes(orgMembership.role)) {
          return res.status(403).json({
            success: false,
            message: `Required organization roles: ${allowedRoles.join(', ')}`,
          });
        }

        next();
      });
    };
  }

  static calculateUserPermissions(user) {
    const permissions = new Set();

    // Platform-level permissions for super admins
    if (user.isSuperAdmin || user.memberships?.some(m => m.role === 'SUPER_ADMIN')) {
      permissions.add('platform:admin');
      permissions.add('organization:create');
      permissions.add('organization:delete');
      permissions.add('user:manage');
      permissions.add('billing:manage');
      permissions.add('system:admin');
    }

    // Organization-level permissions
    user.memberships?.forEach(membership => {
      switch (membership.role) {
        case 'OWNER':
        case 'ORGANIZATION_OWNER':
          permissions.add('organization:admin');
          permissions.add('organization:settings');
          permissions.add('member:invite');
          permissions.add('member:remove');
          permissions.add('api:manage');
          permissions.add('billing:view');
          break;
        case 'ADMIN':
        case 'ORGANIZATION_ADMIN':
          permissions.add('organization:settings');
          permissions.add('member:invite');
          permissions.add('api:manage');
          permissions.add('billing:view');
          break;
        case 'DEVELOPER':
          permissions.add('api:manage');
          permissions.add('api:keys');
          break;
        case 'MEMBER':
          permissions.add('api:use');
          break;
        case 'VIEWER':
          permissions.add('api:view');
          break;
      }
    });

    return Array.from(permissions);
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

  // Role-specific middleware methods
  static requireOrganizationOwner() {
    return (req, res, next) => {
      this.createJWTMiddleware()(req, res, err => {
        if (err) return next(err);

        // Super admins have all permissions
        if (req.user?.isSuperAdmin) {
          return next();
        }

        // Check if user has ORGANIZATION_OWNER or OWNER role in any organization
        const hasOwnerRole = req.user?.memberships?.some(
          m => m.role === 'ORGANIZATION_OWNER' || m.role === 'OWNER'
        );

        if (!hasOwnerRole) {
          return res.status(403).json({
            success: false,
            message: 'Organization owner access required',
          });
        }
        next();
      });
    };
  }

  static requireOrganizationAdmin() {
    return (req, res, next) => {
      this.createJWTMiddleware()(req, res, err => {
        if (err) return next(err);

        // Super admins have all permissions
        if (req.user?.isSuperAdmin) {
          return next();
        }

        // Check if user has admin level access (ORGANIZATION_ADMIN, ORGANIZATION_OWNER, ADMIN, OWNER)
        const hasAdminRole = req.user?.memberships?.some(m =>
          ['ORGANIZATION_ADMIN', 'ORGANIZATION_OWNER', 'ADMIN', 'OWNER'].includes(m.role)
        );

        if (!hasAdminRole) {
          return res.status(403).json({
            success: false,
            message: 'Organization admin access required',
          });
        }
        next();
      });
    };
  }

  static requireDeveloper() {
    return (req, res, next) => {
      this.createJWTMiddleware()(req, res, err => {
        if (err) return next(err);

        // Super admins have all permissions
        if (req.user?.isSuperAdmin) {
          return next();
        }

        // Check if user has developer level access or higher
        const hasDeveloperRole = req.user?.memberships?.some(m =>
          ['DEVELOPER', 'ORGANIZATION_ADMIN', 'ORGANIZATION_OWNER', 'ADMIN', 'OWNER'].includes(
            m.role
          )
        );

        if (!hasDeveloperRole) {
          return res.status(403).json({
            success: false,
            message: 'Developer access required',
          });
        }
        next();
      });
    };
  }

  static requireMember() {
    return (req, res, next) => {
      this.createJWTMiddleware()(req, res, err => {
        if (err) return next(err);

        // Super admins have all permissions
        if (req.user?.isSuperAdmin) {
          return next();
        }

        // Check if user has member level access or higher (all roles except VIEWER)
        const hasMemberRole = req.user?.memberships?.some(m =>
          [
            'MEMBER',
            'DEVELOPER',
            'ORGANIZATION_ADMIN',
            'ORGANIZATION_OWNER',
            'ADMIN',
            'OWNER',
          ].includes(m.role)
        );

        if (!hasMemberRole) {
          return res.status(403).json({
            success: false,
            message: 'Member access required',
          });
        }
        next();
      });
    };
  }

  static requireMinimumRole(minimumRole) {
    const roleHierarchy = {
      SUPER_ADMIN: 7,
      ORGANIZATION_OWNER: 6,
      OWNER: 6,
      ORGANIZATION_ADMIN: 5,
      ADMIN: 5,
      DEVELOPER: 4,
      MEMBER: 3,
      VIEWER: 1,
    };

    return (req, res, next) => {
      this.createJWTMiddleware()(req, res, err => {
        if (err) return next(err);

        // Super admins have all permissions
        if (req.user?.isSuperAdmin) {
          return next();
        }

        const minimumLevel = roleHierarchy[minimumRole] || 0;

        // Check if user has a role at or above the minimum level
        const hasRequiredRole = req.user?.memberships?.some(m => {
          const userLevel = roleHierarchy[m.role] || 0;
          return userLevel >= minimumLevel;
        });

        if (!hasRequiredRole) {
          return res.status(403).json({
            success: false,
            message: `Minimum role required: ${minimumRole}`,
          });
        }
        next();
      });
    };
  }
}

module.exports = AuthFactory;
