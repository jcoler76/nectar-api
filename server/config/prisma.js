const { PrismaClient } = require('@prisma/client/generated/client');

// Create a singleton instance of Prisma Client
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error', 'warn'],
    errorFormat: 'minimal',
  });
} else {
  // In development, use a global variable to preserve the client across hot reloads
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
      errorFormat: 'pretty',
    });
  }
  prisma = global.prisma;
}

// Middleware to set organization context for RLS
prisma.$use(async (params, next) => {
  // Skip for certain operations
  if (!params.args || !params.model) {
    return next(params);
  }

  // Get organization ID from context (will be set by auth middleware)
  const organizationId = params.args.__organizationId;
  const userId = params.args.__userId;

  // Remove our custom fields before sending to database
  if (params.args.__organizationId) {
    delete params.args.__organizationId;
  }
  if (params.args.__userId) {
    delete params.args.__userId;
  }

  // Set PostgreSQL session variables for RLS
  if (organizationId || userId) {
    await prisma.$executeRawUnsafe(
      `SET LOCAL app.current_organization_id = '${organizationId || ''}'`
    );
    await prisma.$executeRawUnsafe(`SET LOCAL app.current_user_id = '${userId || ''}'`);
  }

  // Automatically filter by organization for tenant-scoped models
  const tenantModels = [
    'DatabaseConnection',
    'Endpoint',
    'ApiKey',
    'UsageMetric',
    'Workflow',
    'Webhook',
    'AuditLog',
  ];

  if (tenantModels.includes(params.model) && organizationId) {
    // Add organization filter for queries
    if (['findUnique', 'findFirst', 'findMany', 'count'].includes(params.action)) {
      params.args.where = {
        ...params.args.where,
        organizationId,
      };
    }

    // Add organization ID for creates
    if (params.action === 'create') {
      params.args.data = {
        ...params.args.data,
        organizationId,
      };
    }

    // Add organization ID for updates
    if (['update', 'updateMany'].includes(params.action)) {
      params.args.where = {
        ...params.args.where,
        organizationId,
      };
    }

    // Add organization filter for deletes
    if (['delete', 'deleteMany'].includes(params.action)) {
      params.args.where = {
        ...params.args.where,
        organizationId,
      };
    }
  }

  return next(params);
});

// Helper function to get Prisma client with context
function getPrismaClient(context = {}) {
  // Return a proxy that adds context to all operations
  return new Proxy(prisma, {
    get(target, prop) {
      const original = target[prop];

      // If it's a model operation, wrap it to include context
      if (typeof original === 'object' && original !== null) {
        return new Proxy(original, {
          get(modelTarget, modelProp) {
            const modelMethod = modelTarget[modelProp];

            if (typeof modelMethod === 'function') {
              return function (...args) {
                // Add context to the arguments
                if (args[0] && typeof args[0] === 'object') {
                  args[0].__organizationId = context.organizationId;
                  args[0].__userId = context.userId;
                }
                return modelMethod.apply(modelTarget, args);
              };
            }

            return modelMethod;
          },
        });
      }

      return original;
    },
  });
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = {
  prisma,
  getPrismaClient,
};
