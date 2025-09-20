/**
 * Real-time Service
 * Provides Socket.IO based real-time data synchronization
 * DEFAULT: Polling-based (no database triggers required)
 * OPTIONAL: Database triggers for advanced use cases
 */

const { logger } = require('../middleware/logger');
const { getServiceAndConnection } = require('./autoRest/autoRestService');

class RealtimeService {
  constructor() {
    this.io = null;
    this.activeChannels = new Map(); // Track subscribed channels
    this.pollingIntervals = new Map(); // Track polling intervals
    this.defaultPollingInterval = 5000; // 5 seconds default
  }

  /**
   * Initialize Socket.IO server
   * @param {http.Server} httpServer - HTTP server instance
   */
  initialize(httpServer) {
    const socketIO = require('socket.io');

    this.io = socketIO(httpServer, {
      cors: {
        origin: [
          'http://localhost:3000',
          'https://app.nectarstudio.ai',
          process.env.CLIENT_URL,
        ].filter(Boolean),
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupSocketHandlers();
    logger.info('Real-time service initialized with Socket.IO');
  }

  /**
   * Setup Socket.IO event handlers
   */
  setupSocketHandlers() {
    this.io.on('connection', socket => {
      logger.info(`Client connected: ${socket.id}`);

      // Handle real-time subscription requests
      socket.on('subscribe_table', async data => {
        try {
          await this.handleTableSubscription(socket, data);
        } catch (error) {
          logger.error('Subscription error:', error);
          socket.emit('subscription_error', {
            error: error.message,
            channelId: data.channelId,
          });
        }
      });

      // Handle unsubscribe requests
      socket.on('unsubscribe_table', data => {
        this.handleTableUnsubscription(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
        this.cleanupSocketSubscriptions(socket);
      });
    });
  }

  /**
   * Handle table subscription with polling-based approach
   * @param {Socket} socket - Socket.IO socket
   * @param {Object} subscriptionData - Subscription details
   */
  async handleTableSubscription(socket, subscriptionData) {
    const {
      serviceName,
      entityName,
      channelId,
      filters = {},
      pollingInterval = this.defaultPollingInterval,
      enableDatabaseTriggers = false, // OPTIONAL: Advanced feature
    } = subscriptionData;

    // Validate service access
    const organizationId = socket.handshake.auth?.organizationId;
    if (!organizationId) {
      throw new Error('Authentication required for real-time subscriptions');
    }

    // Join socket room for this channel
    socket.join(channelId);

    // Store subscription metadata
    const subscriptionKey = `${socket.id}_${channelId}`;
    this.activeChannels.set(subscriptionKey, {
      socket,
      channelId,
      serviceName,
      entityName,
      filters,
      organizationId,
      enableDatabaseTriggers,
      lastKnownData: null,
      lastChecksum: null,
    });

    if (enableDatabaseTriggers) {
      // ADVANCED: Setup database triggers (optional)
      await this.setupDatabaseTriggers(serviceName, entityName, organizationId);
    } else {
      // DEFAULT: Start polling-based monitoring
      this.startPollingForTable(subscriptionKey, pollingInterval);
    }

    socket.emit('subscription_confirmed', {
      channelId,
      method: enableDatabaseTriggers ? 'database_triggers' : 'polling',
      pollingInterval: enableDatabaseTriggers ? null : pollingInterval,
    });

    logger.info(
      `Real-time subscription created: ${channelId} (${enableDatabaseTriggers ? 'triggers' : 'polling'})`
    );
  }

  /**
   * Start polling-based monitoring for a table
   * DEFAULT METHOD - No database modifications required
   */
  startPollingForTable(subscriptionKey, interval) {
    if (this.pollingIntervals.has(subscriptionKey)) {
      clearInterval(this.pollingIntervals.get(subscriptionKey));
    }

    const pollInterval = setInterval(async () => {
      try {
        await this.checkTableChanges(subscriptionKey);
      } catch (error) {
        logger.error(`Polling error for ${subscriptionKey}:`, error);
      }
    }, interval);

    this.pollingIntervals.set(subscriptionKey, pollInterval);
  }

  /**
   * Check for table changes using polling
   * Compares current data with last known state
   */
  async checkTableChanges(subscriptionKey) {
    const subscription = this.activeChannels.get(subscriptionKey);
    if (!subscription) return;

    const { serviceName, entityName, filters, organizationId, socket, channelId } = subscription;

    try {
      // Import here to avoid circular dependencies
      const { handleList } = require('./autoRest/autoRestService');

      // Create mock request object for handleList
      const mockReq = {
        application: { organizationId },
        user: socket.handshake.auth?.user || {},
        organization: { id: organizationId },
      };

      // Fetch current data
      const currentData = await handleList({
        req: mockReq,
        serviceName,
        entityParam: entityName,
        page: 1,
        pageSize: 100, // Reasonable limit for real-time
        fieldsParam: filters.fields,
        sortParam: filters.sort,
        filterParam: filters.filter,
      });

      // Create checksum of current data
      const currentChecksum = this.createDataChecksum(currentData.data);

      // Compare with last known state
      if (subscription.lastChecksum && subscription.lastChecksum !== currentChecksum) {
        // Data has changed - broadcast update
        this.io.to(channelId).emit('table_update', {
          channelId,
          serviceName,
          entityName,
          data: currentData.data,
          total: currentData.total,
          timestamp: new Date().toISOString(),
          updateType: 'polling_refresh',
        });

        logger.debug(`Data change detected for ${channelId}`);
      }

      // Update subscription state
      subscription.lastKnownData = currentData.data;
      subscription.lastChecksum = currentChecksum;
    } catch (error) {
      logger.error(`Error checking table changes for ${channelId}:`, error);
      socket.emit('polling_error', {
        channelId,
        error: error.message,
      });
    }
  }

  /**
   * Create a simple checksum for data comparison
   */
  createDataChecksum(data) {
    const crypto = require('crypto');
    const dataString = JSON.stringify(data);
    return crypto.createHash('md5').update(dataString).digest('hex');
  }

  /**
   * OPTIONAL: Setup database triggers for advanced real-time
   * Only runs if explicitly requested by client
   */
  async setupDatabaseTriggers(serviceName, entityName, organizationId) {
    logger.info(
      `Setting up database triggers for ${serviceName}/${entityName} (OPTIONAL ADVANCED FEATURE)`
    );

    try {
      const { service, connectionConfig } = await getServiceAndConnection(
        serviceName,
        organizationId
      );
      if (!service) throw new Error('Service not found');

      const DatabaseDriverFactory = require('./database/DatabaseDriverFactory');
      const dbType = String(connectionConfig.type).toUpperCase();

      if (dbType === 'POSTGRESQL') {
        await this.setupPostgreSQLTriggers(connectionConfig, entityName, serviceName);
      } else if (dbType === 'MYSQL') {
        await this.setupMySQLTriggers(connectionConfig, entityName, serviceName);
      } else {
        logger.warn(`Database triggers not supported for ${dbType}, falling back to polling`);
        return false;
      }

      logger.info(`Database triggers successfully created for ${serviceName}/${entityName}`);
      return true;
    } catch (error) {
      logger.error('Failed to setup database triggers:', error);
      throw new Error(`Database trigger setup failed: ${error.message}`);
    }
  }

  /**
   * Setup PostgreSQL triggers and notification listeners
   */
  async setupPostgreSQLTriggers(connectionConfig, entityName, serviceName) {
    const DatabaseDriverFactory = require('./database/DatabaseDriverFactory');
    const driver = DatabaseDriverFactory.createDriver('POSTGRESQL', connectionConfig);
    const conn = await driver.createConnection();

    try {
      const channelName = `nectar_rt_${serviceName}_${entityName}`;

      // Create notification function
      const functionSQL = `
        CREATE OR REPLACE FUNCTION notify_${serviceName}_${entityName}_changes()
        RETURNS TRIGGER AS $$
        BEGIN
          PERFORM pg_notify(
            '${channelName}',
            json_build_object(
              'table', '${entityName}',
              'service', '${serviceName}',
              'operation', TG_OP,
              'data', CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE row_to_json(NEW) END,
              'timestamp', extract(epoch from now())
            )::text
          );
          RETURN NULL;
        END;
        $$ LANGUAGE plpgsql;
      `;

      // Create trigger
      const triggerSQL = `
        DROP TRIGGER IF EXISTS ${entityName}_nectar_rt_trigger ON ${entityName};
        CREATE TRIGGER ${entityName}_nectar_rt_trigger
          AFTER INSERT OR UPDATE OR DELETE ON ${entityName}
          FOR EACH ROW EXECUTE FUNCTION notify_${serviceName}_${entityName}_changes();
      `;

      await driver.executeQuery(conn, functionSQL);
      await driver.executeQuery(conn, triggerSQL);

      // Setup listener for this channel
      await this.setupPostgreSQLListener(connectionConfig, channelName, serviceName, entityName);
    } finally {
      await driver.closeConnection(conn);
    }
  }

  /**
   * Setup PostgreSQL LISTEN for trigger notifications
   */
  async setupPostgreSQLListener(connectionConfig, channelName, serviceName, entityName) {
    const { Client } = require('pg');
    const client = new Client(connectionConfig);

    await client.connect();
    await client.query(`LISTEN ${channelName}`);

    client.on('notification', msg => {
      try {
        const change = JSON.parse(msg.payload);

        // Broadcast to all subscribers of this table
        const roomName = `${serviceName}_${entityName}`;
        this.io.to(roomName).emit('table_update', {
          channelId: roomName,
          serviceName: change.service,
          entityName: change.table,
          operation: change.operation,
          data: change.data,
          timestamp: new Date(change.timestamp * 1000).toISOString(),
          updateType: 'database_trigger',
        });

        logger.debug(`Database trigger notification: ${change.operation} on ${change.table}`);
      } catch (error) {
        logger.error('Error processing database notification:', error);
      }
    });

    // Store client for cleanup
    if (!this.dbListeners) this.dbListeners = new Map();
    this.dbListeners.set(channelName, client);
  }

  /**
   * Handle table unsubscription
   */
  handleTableUnsubscription(socket, data) {
    const { channelId } = data;
    const subscriptionKey = `${socket.id}_${channelId}`;

    // Leave socket room
    socket.leave(channelId);

    // Clean up polling interval
    if (this.pollingIntervals.has(subscriptionKey)) {
      clearInterval(this.pollingIntervals.get(subscriptionKey));
      this.pollingIntervals.delete(subscriptionKey);
    }

    // Remove from active channels
    this.activeChannels.delete(subscriptionKey);

    logger.info(`Unsubscribed from ${channelId}`);
  }

  /**
   * Clean up all subscriptions for a disconnected socket
   */
  cleanupSocketSubscriptions(socket) {
    const keysToRemove = [];

    for (const [key, subscription] of this.activeChannels.entries()) {
      if (subscription.socket.id === socket.id) {
        keysToRemove.push(key);

        // Clean up polling interval
        if (this.pollingIntervals.has(key)) {
          clearInterval(this.pollingIntervals.get(key));
          this.pollingIntervals.delete(key);
        }
      }
    }

    keysToRemove.forEach(key => this.activeChannels.delete(key));
    logger.info(`Cleaned up ${keysToRemove.length} subscriptions for disconnected socket`);
  }

  /**
   * Get real-time connection info for API responses
   */
  getRealtimeInfo(serviceName, entityName) {
    return {
      enabled: true,
      socketUrl: process.env.WEBSOCKET_URL || `ws://localhost:${process.env.PORT || 3001}`,
      channelId: `${serviceName}_${entityName}`,
      supportedMethods: ['polling', 'database_triggers'],
      defaultMethod: 'polling',
    };
  }

  /**
   * Check if real-time is available for a service
   */
  isRealtimeAvailable(serviceName, entityName) {
    return true; // Always available via polling
  }
}

// Export singleton instance
const realtimeService = new RealtimeService();
module.exports = realtimeService;
