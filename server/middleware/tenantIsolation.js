const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');

// Middleware to ensure all database queries are organization-scoped
const enforceTenantIsolation = (req, res, next) => {
  // Skip for non-authenticated routes
  if (!req.user || !req.user.organizationId) {
    return next();
  }

  // Store original Prisma client
  const originalPrisma = req.prisma || global.prisma;

  // Create a wrapper that automatically adds organization filters
  req.prisma = new Proxy(originalPrisma, {
    get(target, prop) {
      const originalMethod = target[prop];
      
      // Models that should be organization-scoped
      const scopedModels = [
        'connection',
        'service', 
        'application',
        'workflow',
        'workflowRun',
        'apiKey',
        'endpoint',
        'usageMetric'
      ];

      if (scopedModels.includes(prop)) {
        return new Proxy(originalMethod, {
          get(modelTarget, modelProp) {
            const originalModelMethod = modelTarget[modelProp];

            // Methods that need organization filtering
            const queryMethods = [
              'findMany',
              'findFirst', 
              'findUnique',
              'count',
              'aggregate',
              'update',
              'updateMany',
              'delete',
              'deleteMany'
            ];

            if (queryMethods.includes(modelProp)) {
              return function(args = {}) {
                // Automatically add organization filter
                const modifiedArgs = {
                  ...args,
                  where: {
                    organizationId: req.user.organizationId,
                    ...args.where,
                  },
                };

                logger.debug('Tenant-scoped query', {
                  model: prop,
                  method: modelProp,
                  organizationId: req.user.organizationId,
                  originalWhere: args.where,
                  modifiedWhere: modifiedArgs.where,
                });

                return originalModelMethod.call(modelTarget, modifiedArgs);
              };
            }

            // For create operations, automatically add organizationId
            if (modelProp === 'create') {
              return function(args = {}) {
                const modifiedArgs = {
                  ...args,
                  data: {
                    organizationId: req.user.organizationId,
                    ...args.data,
                  },
                };

                logger.debug('Tenant-scoped create', {
                  model: prop,
                  organizationId: req.user.organizationId,
                  originalData: args.data,
                  modifiedData: modifiedArgs.data,
                });

                return originalModelMethod.call(modelTarget, modifiedArgs);
              };
            }

            return originalModelMethod;
          }
        });
      }

      return originalMethod;
    }
  });

  next();
};

module.exports = { enforceTenantIsolation };