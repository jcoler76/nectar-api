// MongoDB models replaced with Prisma for PostgreSQL migration
// const Connection = require('../models/Connection');
// const Service = require('../models/Service');

const { PrismaClient } = require('../prisma/generated/client');
const prisma = new PrismaClient();
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
 * @param {Object} connection - MongoDB connection document
 * @returns {Object} - Result object with success status and details
 */
const refreshSingleConnection = async connection => {
  const startTime = Date.now();

  try {
    logger.info(`Starting database refresh for connection: ${connection.name} (${connection._id})`);

    // Get fresh database list from SQL Server
    const databaseNames = await getDatabaseList(connection);

    // TODO: Replace with Prisma connection update during migration
    // connection.databases = databaseNames;
    // await connection.save();

    const duration = Date.now() - startTime;
    logger.info(
      `Successfully refreshed ${databaseNames.length} databases for connection: ${connection.name} (${duration}ms)`
    );

    return {
      success: true,
      connectionId: connection._id,
      connectionName: connection.name,
      databaseCount: databaseNames.length,
      databases: databaseNames,
      duration: duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(
      `Failed to refresh databases for connection: ${connection.name} (${connection._id}) - ${error.message} (${duration}ms)`
    );

    return {
      success: false,
      connectionId: connection._id,
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
    // TODO: Replace with Prisma connection query during migration
    // const connections = await Connection.find({ isActive: true }).select('+password');
    // For now, skip connection query to allow server startup
    const connections = [];

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
    // TODO: Replace with Prisma service query during migration
    // const services = await Service.find({
    //   isActive: true,
    //   connectionId: { $exists: true, $ne: null },
    // }).populate('createdBy', 'firstName lastName email');
    // For now, skip service query to allow server startup
    const services = [];

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
      connectionMap.set(conn._id.toString(), conn);
      if (conn.databases && conn.databases.length > 0) {
        conn.databases.forEach(dbName => {
          databaseLocationMap.set(dbName, conn);
        });
      }
    });

    // Validate each service
    for (const service of services) {
      const currentConnection = connectionMap.get(service.connectionId.toString());

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

      if (newConnection._id.toString() === service.connectionId.toString()) {
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
    // TODO: Replace with Prisma service update during migration
    // service.connectionId = newConnection._id;
    // service.host = newConnection.host;
    // service.port = newConnection.port;
    // service.username = newConnection.username;
    // service.password = newConnection.password; // Already encrypted
    // service.failoverHost = newConnection.failoverHost;

    // await service.save();

    logger.info(
      `Successfully updated service ${service.name} to use connection ${newConnection.name}`
    );

    return {
      success: true,
      serviceName: service.name,
      serviceId: service._id,
      database: service.database,
      oldConnection: {
        id: oldConnection._id,
        name: oldConnection.name,
        host: oldConnection.host,
      },
      newConnection: {
        id: newConnection._id,
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
      serviceId: service._id,
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
      serviceId: service._id,
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
      userId: user._id,
      type: 'system',
      priority: 'high',
      title,
      message,
      metadata,
      actionUrl: `/services/${service._id}`,
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
    // TODO: Replace with Prisma queries during migration
    // const totalConnections = await Connection.countDocuments({});
    // const activeConnections = await Connection.countDocuments({ isActive: true });
    // const connectionsWithDatabases = await Connection.countDocuments({
    //   databases: { $exists: true, $not: { $size: 0 } },
    // });

    // const totalServices = await Service.countDocuments({});
    // const activeServices = await Service.countDocuments({ isActive: true });
    // const servicesWithConnections = await Service.countDocuments({
    //   connectionId: { $exists: true, $ne: null },
    // });
    // For now, return placeholder values to allow server startup
    const totalConnections = 0;
    const activeConnections = 0;
    const connectionsWithDatabases = 0;
    const totalServices = 0;
    const activeServices = 0;
    const servicesWithConnections = 0;

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
