const { PrismaClient } = require('../prisma/generated/client');

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

// For now, comment out the middleware/extension logic to get the server running
// TODO: Reimplement using Prisma Client Extensions when needed
/*
// Create client extension for organization context (replaces $use middleware in Prisma 5+)
prisma = prisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        // Implementation for tenant isolation would go here
        return query(args);
      }
    }
  }
});
*/

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
