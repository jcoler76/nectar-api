const sql = require('mssql');
const { logger } = require('../middleware/logger');

class SQLConnectionManager {
  constructor() {
    this.pools = new Map();
    this.configKeyCache = new WeakMap();
    this.poolHealthChecks = new Map();
  }

  getConfigKey(config) {
    // Use cached key if available
    if (this.configKeyCache.has(config)) {
      return this.configKeyCache.get(config);
    }

    const key = `${config.server}_${config.database}`;
    this.configKeyCache.set(config, key);
    return key;
  }

  async getPool(config) {
    const configKey = this.getConfigKey(config);

    // Check if pool exists and is healthy
    if (this.pools.has(configKey)) {
      const pool = this.pools.get(configKey);

      // Perform health check if enough time has passed
      const lastCheck = this.poolHealthChecks.get(configKey) || 0;
      const now = Date.now();

      if (now - lastCheck > 30000) {
        // Check every 30 seconds
        try {
          // Quick health check query
          await pool.request().query('SELECT 1 as health');
          this.poolHealthChecks.set(configKey, now);
        } catch (error) {
          logger.warn('Pool health check failed, recreating pool', {
            key: configKey,
            error: error.message,
          });

          // Close unhealthy pool and remove from cache
          try {
            await pool.close();
          } catch (closeError) {
            // Ignore close errors
          }
          this.pools.delete(configKey);
          this.poolHealthChecks.delete(configKey);
        }
      }
    }

    if (!this.pools.has(configKey)) {
      const pool = new sql.ConnectionPool({
        ...config,
        pool: {
          max: 15, // Reasonable max per server
          min: 2, // Keep minimum connections
          idleTimeoutMillis: 60000,
        },
      });

      await pool.connect();

      // Warm up the pool by creating min connections
      const warmupPromises = [];
      for (let i = 0; i < 2; i++) {
        warmupPromises.push(
          pool
            .request()
            .query('SELECT 1')
            .catch(err => {
              logger.debug('Pool warmup query failed', { error: err.message });
            })
        );
      }
      await Promise.all(warmupPromises);

      this.pools.set(configKey, pool);
      this.poolHealthChecks.set(configKey, Date.now());

      logger.info('Created and warmed SQL pool', {
        key: configKey,
        totalPools: this.pools.size,
      });
    }

    return this.pools.get(configKey);
  }

  async closeAll() {
    for (const pool of this.pools.values()) {
      await pool.close();
    }
    this.pools.clear();
    logger.info('Closed all SQL pools');
  }
}

module.exports = new SQLConnectionManager();
