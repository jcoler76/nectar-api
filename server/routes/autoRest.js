const express = require('express');
const router = express.Router();

const { apiKeyServiceMiddleware } = require('../middleware/apiKeyServiceMiddleware');
const { authMiddleware } = require('../middleware/auth');
const { logger } = require('../middleware/logger');
const { apiRateLimiter, userRateLimiter } = require('../middleware/rateLimiter');
const trackApiUsage = require('../middleware/apiUsageTracker');
const Auto = require('../services/autoRest/autoRestService');
const DatabaseService = require('../services/database/DatabaseService');

// Discover all tables/collections in database (from stored schema data) - for UI use
router.get('/:serviceName/_discover', authMiddleware, async (req, res) => {
  try {
    logger.info(
      `🔍 Discover tables request for service: ${req.params.serviceName}, org: ${req.user.organizationId}`
    );

    const { PrismaClient } = require('../prisma/generated/client');
    const prisma = new PrismaClient();

    // Find the service by name for this organization
    const service = await prisma.service.findFirst({
      where: {
        name: req.params.serviceName,
        organizationId: req.user.organizationId,
        isActive: true,
      },
    });

    logger.info(`📋 Service found:`, service ? { id: service.id, name: service.name } : 'null');

    if (!service) {
      return res.status(404).json({
        error: { code: 'SERVICE_NOT_FOUND', message: 'Service not found or inactive' },
      });
    }

    // Get stored database objects for this service
    const databaseObjects = await prisma.databaseObject.findMany({
      where: {
        serviceId: service.id,
        organizationId: req.user.organizationId,
        // Get all types: tables, views, procedures
      },
      select: {
        name: true,
        schema: true,
        type: true,
        metadata: true,
      },
    });

    logger.info(
      `📊 Found ${databaseObjects.length} database objects:`,
      databaseObjects.slice(0, 5)
    );

    // Get exposed entities to mark which tables are already exposed
    const exposedEntities = await prisma.exposedEntity.findMany({
      where: {
        serviceId: service.id,
        organizationId: req.user.organizationId,
      },
      select: {
        name: true,
        schema: true,
      },
    });

    logger.info(
      `✅ Found ${exposedEntities.length} exposed entities:`,
      exposedEntities.slice(0, 5)
    );

    // Create exposed lookup for quick checking
    const exposedLookup = new Set();
    exposedEntities.forEach(e => {
      const key = e.schema ? `${e.schema}.${e.name}` : e.name;
      exposedLookup.add(key);
    });

    // Format the response to match the expected structure
    const objects = databaseObjects.map(obj => {
      const key = obj.schema ? `${obj.schema}.${obj.name}` : obj.name;
      return {
        name: obj.name,
        schema: obj.schema,
        type: obj.type.toUpperCase(),
        isExposed: exposedLookup.has(key),
        metadata: obj.metadata || {},
        suggestedPathSlug: obj.name
          .toLowerCase()
          .replace(/^(gs|tbl|sp_|fn_)_?/, '') // Remove common prefixes
          .replace(/_/g, '-'), // Replace underscores with hyphens for URLs
      };
    });

    // Group by type for easier frontend handling
    const groupedObjects = {
      tables: objects.filter(obj => obj.type === 'USER_TABLE'),
      views: objects.filter(obj => obj.type === 'VIEW'),
      procedures: objects.filter(obj => obj.type === 'SQL_STORED_PROCEDURE'),
    };

    res.json({
      data: groupedObjects,
      total: objects.length,
      exposed: objects.filter(obj => obj.isExposed).length,
      counts: {
        tables: groupedObjects.tables.length,
        views: groupedObjects.views.length,
        procedures: groupedObjects.procedures.length,
      },
      _meta: {
        apiVersion: 'v1',
        timestamp: new Date().toISOString(),
        message: 'Use POST /:serviceName/_expose to auto-expose database objects',
        source: 'stored_schema_data', // Indicate this comes from stored data, not live discovery
        supportedDatabases: ['POSTGRESQL', 'MSSQL', 'MYSQL', 'MONGODB'],
      },
    });
  } catch (e) {
    logger.error('auto-rest discover error', { error: e.message });
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: e.message } });
  }
});

// Auto-expose tables (make them available via REST API) - for UI use
router.post('/:serviceName/_expose', authMiddleware, async (req, res) => {
  try {
    const { tables } = req.body; // Array of table names to expose
    const { service, connectionConfig } = await Auto.getServiceAndConnection(
      req.params.serviceName,
      req.user.organizationId
    );

    if (!Array.isArray(tables) || tables.length === 0) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'tables array is required' },
      });
    }

    // Discover all available tables first
    const discoveredTables = await Auto.discoverTables({
      connectionConfig,
      serviceId: service.id,
    });

    const exposedEntities = [];
    const errors = [];

    for (const tableName of tables) {
      try {
        const tableInfo = discoveredTables.find(t => t.name === tableName);
        if (!tableInfo) {
          errors.push(`Table '${tableName}' not found`);
          continue;
        }

        if (tableInfo.isExposed) {
          errors.push(`Table '${tableName}' is already exposed`);
          continue;
        }

        const entity = await Auto.autoExposeTable({
          serviceId: service.id,
          organizationId: req.application.organizationId,
          connectionId: service.connectionId,
          database: connectionConfig.database,
          tableName: tableInfo.name,
          schema: tableInfo.schema,
          type: tableInfo.type,
          pathSlug: tableInfo.suggestedPathSlug,
        });

        exposedEntities.push({
          id: entity.id,
          name: entity.name,
          pathSlug: entity.pathSlug,
          endpoint: `/api/v2/${req.params.serviceName}/_table/${entity.pathSlug}`,
        });
      } catch (error) {
        errors.push(`Failed to expose '${tableName}': ${error.message}`);
      }
    }

    res.json({
      exposed: exposedEntities,
      errors: errors,
      total: exposedEntities.length,
      _meta: {
        apiVersion: 'v1',
        timestamp: new Date().toISOString(),
        message: `${exposedEntities.length} tables exposed successfully`,
      },
    });
  } catch (e) {
    logger.error('auto-rest expose error', { error: e.message });
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: e.message } });
  }
});

// List exposed entities
router.get(
  '/:serviceName/_table',
  apiRateLimiter,
  trackApiUsage,
  apiKeyServiceMiddleware,
  async (req, res) => {
    try {
      const entities = await Auto.listExposedEntities(req.service.id);
      res.json({ data: entities });
    } catch (e) {
      logger.error('auto-rest list entities error', { error: e.message });
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: e.message } });
    }
  }
);

// Schema for an entity
router.get(
  '/:serviceName/_table/:entity/_schema',
  apiRateLimiter,
  trackApiUsage,
  apiKeyServiceMiddleware,
  async (req, res) => {
    try {
      const { serviceName, entity } = req.params;
      const { service, connectionConfig } = await Auto.getServiceAndConnection(
        serviceName,
        req.application.organizationId
      );
      const exposed = await Auto.handleList({
        req,
        serviceName,
        entityParam: entity,
        page: 1,
        pageSize: 1,
      });
      // get entity by name to resolve database/schema
      const prisma = require('../prisma/generated/client');
      const { PrismaClient } = prisma;
      const p = new PrismaClient();
      const exposedEntity = await p.exposedEntity.findFirst({
        where: { serviceId: service.id, OR: [{ pathSlug: entity }, { name: entity }] },
      });
      if (!exposedEntity)
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Entity not found' } });

      const cols = await DatabaseService.getTableColumns(
        { ...connectionConfig, database: exposedEntity.database },
        exposedEntity.database,
        exposedEntity.name
      );
      res.json({ data: cols });
    } catch (e) {
      logger.error('auto-rest schema error', { error: e.message });
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: e.message } });
    }
  }
);

// Count only
router.get(
  '/:serviceName/_table/:entity/_count',
  apiRateLimiter,
  trackApiUsage,
  apiKeyServiceMiddleware,
  async (req, res) => {
    try {
      const { serviceName, entity } = req.params;
      const page = 1;
      const pageSize = 1;
      const result = await Auto.handleList({
        req,
        serviceName,
        entityParam: entity,
        page,
        pageSize,
        fieldsParam: req.query.fields,
        sortParam: req.query.sort,
        filterParam: req.query.filter,
      });
      res.json({ total: result.total });
    } catch (e) {
      logger.error('auto-rest count error', { error: e.message });
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: e.message } });
    }
  }
);

// List with filtering/pagination
router.get(
  '/:serviceName/_table/:entity',
  apiRateLimiter,
  trackApiUsage,
  apiKeyServiceMiddleware,
  async (req, res) => {
    try {
      const { serviceName, entity } = req.params;
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || Number(req.query.limit) || 25;
      const result = await Auto.handleList({
        req,
        serviceName,
        entityParam: entity,
        page,
        pageSize,
        fieldsParam: req.query.fields,
        sortParam: req.query.sort,
        filterParam: req.query.filter,
      });
      res.json(result);
    } catch (e) {
      logger.error('auto-rest list error', { error: e.message });
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: e.message } });
    }
  }
);

// Get by id
router.get(
  '/:serviceName/_table/:entity/:id',
  apiRateLimiter,
  trackApiUsage,
  apiKeyServiceMiddleware,
  async (req, res) => {
    try {
      const { serviceName, entity, id } = req.params;
      const row = await Auto.handleById({
        req,
        serviceName,
        entityParam: entity,
        id,
        fieldsParam: req.query.fields,
      });
      if (!row)
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Row not found' } });
      res.json(row);
    } catch (e) {
      logger.error('auto-rest byId error', { error: e.message });
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: e.message } });
    }
  }
);

module.exports = router;
