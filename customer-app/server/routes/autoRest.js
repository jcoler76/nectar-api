const express = require('express');
const router = express.Router();

const { apiKeyServiceMiddleware } = require('../middleware/apiKeyServiceMiddleware');
const { logger } = require('../middleware/logger');
const Auto = require('../services/autoRest/autoRestService');
const DatabaseService = require('../services/database/DatabaseService');

// Discover all tables/collections in database
router.get('/:serviceName/_discover', apiKeyServiceMiddleware, async (req, res) => {
  try {
    const { service, connectionConfig } = await Auto.getServiceAndConnection(
      req.params.serviceName,
      req.application.organizationId
    );

    const tables = await Auto.discoverTables({
      connectionConfig,
      serviceId: service.id,
    });

    res.json({
      data: tables,
      total: tables.length,
      exposed: tables.filter(t => t.isExposed).length,
      _meta: {
        apiVersion: 'v1',
        timestamp: new Date().toISOString(),
        message: 'Use POST /:serviceName/_expose to auto-expose tables',
        supportedDatabases: ['POSTGRESQL', 'MSSQL', 'MYSQL', 'MONGODB'],
      },
    });
  } catch (e) {
    logger.error('auto-rest discover error', { error: e.message });
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: e.message } });
  }
});

// Auto-expose tables (make them available via REST API)
router.post('/:serviceName/_expose', apiKeyServiceMiddleware, async (req, res) => {
  try {
    const { tables } = req.body; // Array of table names to expose
    const { service, connectionConfig } = await Auto.getServiceAndConnection(
      req.params.serviceName,
      req.application.organizationId
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
router.get('/:serviceName/_table', apiKeyServiceMiddleware, async (req, res) => {
  try {
    const entities = await Auto.listExposedEntities(req.service.id);
    res.json({ data: entities });
  } catch (e) {
    logger.error('auto-rest list entities error', { error: e.message });
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: e.message } });
  }
});

// Schema for an entity
router.get('/:serviceName/_table/:entity/_schema', apiKeyServiceMiddleware, async (req, res) => {
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
});

// Count only
router.get('/:serviceName/_table/:entity/_count', apiKeyServiceMiddleware, async (req, res) => {
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
});

// List with filtering/pagination
router.get('/:serviceName/_table/:entity', apiKeyServiceMiddleware, async (req, res) => {
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
});

// Get by id
router.get('/:serviceName/_table/:entity/:id', apiKeyServiceMiddleware, async (req, res) => {
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
});

module.exports = router;
