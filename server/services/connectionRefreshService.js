// Connection refresh service - migrated from MongoDB to Prisma

const prismaService = require('../services/prismaService');
const NotificationService = require('./notificationService');
const { decryptDatabasePassword } = require('../utils/encryption');
const sql = require('mssql');
const { logger } = require('../utils/logger');

/**
 * Service to handle automatic refresh of database lists for all connections
 * This replicates the exact logic from the manual refresh button functionality
 */

/**
 * Helper function to get database list for a single connection
 * This is extracted from the routes/connections.js getDatabaseList function
 */
const getDatabaseList = async connection => {
  let pool;
  try {
    const decryptedPassword = decryptDatabasePassword(connection.password);
    const config = {
      user: connection.username,
      password: decryptedPassword,
      server: connection.host,
      port: connection.port,
      options: {
        encrypt: true,
        trustServerCertificate: true,
        connectTimeout: 15000,
      },
    };

    pool = await sql.connect(config);
    const result = await pool
      .request()
      .query('SELECT name FROM sys.databases WHERE state = 0 ORDER BY name');
    return result.recordset.map(record => record.name);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
};

/**
 * Refreshes database list for a single connection
 * @param {Object} connection - Prisma connection object
 * @returns {Object} - Result object with success status and details
 */
const refreshSingleConnection = async connection => {
  const startTime = Date.now();

  try {
    logger.info(`Starting database refresh for connection: ${connection.name} (${connection.id})`);

    // Get fresh database list from SQL Server
    const databaseNames = await getDatabaseList(connection);

    // Update connection with fresh database list using proper RLS
    await prismaService.withTenantContext(connection.organizationId, async tx => {
      await tx.connection.update({
        where: { id: connection.id },
        data: {
          databases: databaseNames,
          updatedAt: new Date(),
        },
      });
    });

    const duration = Date.now() - startTime;
    logger.info(
      `Successfully refreshed ${databaseNames.length} databases for connection: ${connection.name} (${duration}ms)`
    );

    return {
      success: true,
      connectionId: connection.id,
      connectionName: connection.name,
      databaseCount: databaseNames.length,
      databases: databaseNames,
      duration: duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(
      `Failed to refresh databases for connection: ${connection.name} (${connection.id}) - ${error.message} (${duration}ms)`
    );

    return {
      success: false,
      connectionId: connection.id,
      connectionName: connection.name,
      error: error.message,
      duration: duration,
    };
  }
};

/**
 * Refreshes database lists for all active connections
 * This is the main function called by the scheduled task
 */
const refreshAllConnections = async () => {
  const startTime = Date.now();
  logger.info('🔄 Starting scheduled database refresh for all connections');

  try {
    // Get all active connections across all organizations (system-level operation)
    const connections = await prismaService.withTenantContext(null, async tx => {
      return await tx.connection.findMany({
        where: { isActive: true },
        include: {
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
      });
    });

    if (connections.length === 0) {
      logger.info('No active connections found to refresh');
      return {
        success: true,
        totalConnections: 0,
        successCount: 0,
        failureCount: 0,
        results: [],
        serviceMigrations: [],
      };
    }

    logger.info(`Found ${connections.length} active connections to refresh`);

    // Process each connection individually to isolate failures
    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (const connection of connections) {
      const result = await refreshSingleConnection(connection);
      results.push(result);

      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    // After refreshing connections, validate service database mappings
    logger.info('🔍 Starting service database mapping validation');
    const migrationResults = await validateServiceDatabaseMappings(connections);

    const totalDuration = Date.now() - startTime;
    const summary = {
      success: true,
      totalConnections: connections.length,
      successCount: successCount,
      failureCount: failureCount,
      totalDuration: totalDuration,
      results: results,
      serviceMigrations: migrationResults,
    };

    logger.info(
      `✅ Scheduled database refresh completed: ${successCount}/${connections.length} connections successful (${totalDuration}ms)`
    );

    if (migrationResults.migratedServices > 0) {
      logger.info(
        `📦 Database migrations detected: ${migrationResults.migratedServices} services updated`
      );
    }

    // Log detailed results for monitoring
    if (failureCount > 0) {
      const failedConnections = results.filter(r => !r.success).map(r => r.connectionName);
      logger.warn(`Failed connections: ${failedConnections.join(', ')}`);
    }

    return summary;
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    logger.error(`❌ Scheduled database refresh failed: ${error.message} (${totalDuration}ms)`);

    return {
      success: false,
      error: error.message,
      totalDuration: totalDuration,
    };
  }
};

/**
 * Validates that all services are still mapped to connections containing their databases
 * Detects database migrations and updates service mappings automatically
 * @param {Array} connections - Array of active connections with their current database lists
 * @returns {Object} - Migration results summary
 */
const validateServiceDatabaseMappings = async connections => {
  const validationStartTime = Date.now();

  try {
    // Get all active services with connection references (system-level operation)
    const services = await prismaService.withTenantContext(null, async tx => {
      return await tx.service.findMany({
        where: {
          isActive: true,
          connectionId: { not: null },
        },
        include: {
          createdBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
      });
    });

    if (services.length === 0) {
      logger.info('No active services with connection references found');
      return {
        totalServices: 0,
        validatedServices: 0,
        migratedServices: 0,
        orphanedServices: 0,
        migrations: [],
      };
    }

    logger.info(`Validating database mappings for ${services.length} services`);

    const results = {
      totalServices: services.length,
      validatedServices: 0,
      migratedServices: 0,
      orphanedServices: 0,
      migrations: [],
    };

    // Create lookup maps for efficiency
    const connectionMap = new Map();
    const databaseLocationMap = new Map(); // Maps database name to connection

    connections.forEach(conn => {
      connectionMap.set(conn.id, conn);
      if (conn.databases && conn.databases.length > 0) {
        conn.databases.forEach(dbName => {
          databaseLocationMap.set(dbName, conn);
        });
      }
    });

    // Validate each service
    for (const service of services) {
      const currentConnection = connectionMap.get(service.connectionId);

      if (!currentConnection) {
        logger.warn(
          `Service ${service.name} references non-existent connection ${service.connectionId}`
        );
        results.orphanedServices++;
        continue;
      }

      // Check if service's database still exists in current connection
      const databaseStillExists =
        currentConnection.databases && currentConnection.databases.includes(service.database);

      if (databaseStillExists) {
        results.validatedServices++;
        continue;
      }

      // Database not found in current connection - look for it elsewhere
      const newConnection = databaseLocationMap.get(service.database);

      if (!newConnection) {
        logger.warn(
          `Database ${service.database} for service ${service.name} not found in any connection`
        );
        results.orphanedServices++;
        continue;
      }

      if (newConnection.id === service.connectionId) {
        // This shouldn't happen, but just in case
        results.validatedServices++;
        continue;
      }

      // Database has migrated to a different connection - update the service
      logger.info(
        `Database migration detected: ${service.database} moved from ${currentConnection.name} to ${newConnection.name} for service ${service.name}`
      );

      const migrationResult = await updateServiceConnection(
        service,
        currentConnection,
        newConnection
      );

      if (migrationResult.success) {
        results.migratedServices++;
        results.migrations.push(migrationResult);

        // Send notifications if user exists
        if (service.createdBy) {
          await notifyDatabaseMigration(
            service.createdBy,
            service,
            currentConnection,
            newConnection
          );
        }
      } else {
        logger.error(`Failed to update service ${service.name}: ${migrationResult.error}`);
        results.orphanedServices++;
      }
    }

    const validationDuration = Date.now() - validationStartTime;
    logger.info(
      `Service validation completed: ${results.validatedServices} valid, ${results.migratedServices} migrated, ${results.orphanedServices} orphaned (${validationDuration}ms)`
    );

    return results;
  } catch (error) {
    const validationDuration = Date.now() - validationStartTime;
    logger.error(`Service validation failed: ${error.message} (${validationDuration}ms)`);

    return {
      error: error.message,
      validationDuration,
    };
  }
};

/**
 * Updates a service's connection mapping when database has migrated
 * @param {Object} service - Service document
 * @param {Object} oldConnection - Previous connection
 * @param {Object} newConnection - New connection containing the database
 * @returns {Object} - Update result
 */
const updateServiceConnection = async (service, oldConnection, newConnection) => {
  try {
    // Update service with new connection details using proper RLS
    await prismaService.withTenantContext(service.organizationId, async tx => {
      await tx.service.update({
        where: { id: service.id },
        data: {
          connectionId: newConnection.id,
          host: newConnection.host,
          port: newConnection.port,
          username: newConnection.username,
          password: newConnection.password, // Already encrypted
          failoverHost: newConnection.failoverHost,
          updatedAt: new Date(),
        },
      });
    });

    logger.info(
      `Successfully updated service ${service.name} to use connection ${newConnection.name}`
    );

    return {
      success: true,
      serviceName: service.name,
      serviceId: service.id,
      database: service.database,
      oldConnection: {
        id: oldConnection.id,
        name: oldConnection.name,
        host: oldConnection.host,
      },
      newConnection: {
        id: newConnection.id,
        name: newConnection.name,
        host: newConnection.host,
      },
      updatedAt: new Date(),
    };
  } catch (error) {
    logger.error(`Failed to update service ${service.name}: ${error.message}`);

    return {
      success: false,
      error: error.message,
      serviceName: service.name,
      serviceId: service.id,
    };
  }
};

/**
 * Sends notifications about database migration to affected users
 * @param {Object} user - User who owns the service
 * @param {Object} service - Service that was migrated
 * @param {Object} oldConnection - Previous connection
 * @param {Object} newConnection - New connection
 */
const notifyDatabaseMigration = async (user, service, oldConnection, newConnection) => {
  try {
    const title = 'Database Migration Detected';
    const message = `Your service "${service.name}" has been automatically updated due to a database migration. The database "${service.database}" has moved from "${oldConnection.name}" (${oldConnection.host}) to "${newConnection.name}" (${newConnection.host}). Your service configuration has been updated automatically and should continue to work normally.`;

    const metadata = {
      serviceId: service.id,
      serviceName: service.name,
      database: service.database,
      oldConnection: {
        name: oldConnection.name,
        host: oldConnection.host,
      },
      newConnection: {
        name: newConnection.name,
        host: newConnection.host,
      },
      migrationType: 'automatic_database_migration',
    };

    // Create high-priority system notification (will also send email)
    await NotificationService.createNotification({
      userId: user.id,
      type: 'system',
      priority: 'high',
      title,
      message,
      metadata,
      actionUrl: `/services/${service.id}`,
      actionText: 'View Service Details',
    });

    logger.info(`Sent migration notification to user ${user.email} for service ${service.name}`);
  } catch (error) {
    logger.error(
      `Failed to send migration notification for service ${service.name}: ${error.message}`
    );
    // Don't throw - notification failure shouldn't break the migration process
  }
};

/**
 * Get refresh status and statistics
 * Useful for monitoring and debugging
 */
const getRefreshStatus = async () => {
  try {
    // Get connection and service statistics using proper RLS (system-level operation)
    const [
      totalConnections,
      activeConnections,
      connectionsWithDatabases,
      totalServices,
      activeServices,
      servicesWithConnections,
    ] = await prismaService.withTenantContext(null, async tx => {
      return await Promise.all([
        tx.connection.count(),
        tx.connection.count({ where: { isActive: true } }),
        tx.connection.count({
          where: {
            AND: [{ databases: { not: null } }, { databases: { not: [] } }],
          },
        }),
        tx.service.count(),
        tx.service.count({ where: { isActive: true } }),
        tx.service.count({
          where: {
            AND: [{ connectionId: { not: null } }, { isActive: true }],
          },
        }),
      ]);
    });

    return {
      connections: {
        total: totalConnections,
        active: activeConnections,
        withDatabases: connectionsWithDatabases,
      },
      services: {
        total: totalServices,
        active: activeServices,
        withConnections: servicesWithConnections,
      },
      lastRefreshTime: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Error getting refresh status:', error);
    return {
      error: error.message,
    };
  }
};

module.exports = {
  refreshAllConnections,
  refreshSingleConnection,
  getRefreshStatus,
  getDatabaseList, // Export for potential reuse
  validateServiceDatabaseMappings,
  updateServiceConnection,
  notifyDatabaseMigration,
};
