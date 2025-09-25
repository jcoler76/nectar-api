const express = require('express');
const router = express.Router();
const SchemaIntelligenceService = require('../services/SchemaIntelligenceService');
const DatabaseObjectService = require('../services/DatabaseObjectService');
// MongoDB models replaced with Prisma for PostgreSQL migration
// const SchemaIntelligence = require('../models/SchemaIntelligence');
// const DatabaseObject = require('../models/DatabaseObject');

const prismaService = require('../services/prismaService');
const prisma = prismaService.getRLSClient();
const logger = require('../utils/logger');
// Auth middleware not needed - handled at app level
const { body, param, query, validationResult } = require('express-validator');

// Apply authentication middleware to all routes
// Authentication is already handled at app level in server.js

/**
 * POST /api/schema-intelligence/:serviceId/retrieve
 * Trigger schema retrieval for selected objects
 */
router.post(
  '/:serviceId/retrieve',
  [
    param('serviceId').isMongoId().withMessage('Invalid service ID'),
    body('objectTypes').optional().isArray().withMessage('Object types must be an array'),
    body('batchSize')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Batch size must be between 1 and 50'),
    body('force').optional().isBoolean().withMessage('Force must be a boolean'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { serviceId } = req.params;
      const {
        objectTypes = ['table', 'view', 'procedure'],
        batchSize = 10,
        force = false,
      } = req.body;

      // Check if there are objects pending retrieval
      const pendingCount = await DatabaseObject.countDocuments({
        serviceId,
        isActive: true,
        schemaRetrieved: force ? undefined : false,
        objectType: { $in: objectTypes },
      });

      if (pendingCount === 0) {
        return res.json({
          success: true,
          message: 'No objects pending schema retrieval',
          processed: 0,
          errors: 0,
          objects: [],
        });
      }

      // Start schema retrieval process
      const result = await SchemaIntelligenceService.retrieveSchemaForSelections(
        serviceId,
        req.user.id,
        { objectTypes, batchSize }
      );

      res.json({
        success: true,
        message: `Schema retrieval completed. Processed ${result.processed} objects with ${result.errors} errors.`,
        ...result,
      });
    } catch (error) {
      logger.error('Schema retrieval error:', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve schemas',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/schema-intelligence/:serviceId/status
 * Check retrieval status and progress
 */
router.get(
  '/:serviceId/status',
  [param('serviceId').isMongoId().withMessage('Invalid service ID')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { serviceId } = req.params;

      // Get overall statistics
      const selectionStats = await DatabaseObjectService.getSelectionStats(serviceId);
      const schemaStats = await SchemaIntelligence.getSchemaStats(serviceId);

      // Get pending counts
      const pendingRetrieval = await DatabaseObject.countDocuments({
        serviceId,
        isActive: true,
        schemaRetrieved: false,
      });

      const pendingAIAnalysis = await SchemaIntelligence.countDocuments({
        serviceId,
        status: 'active',
        'aiProcessing.hasBeenAnalyzed': false,
      });

      // Get recent activity
      const recentRetrievals = await SchemaIntelligence.find({
        serviceId,
        status: 'active',
      })
        .sort({ retrievedAt: -1 })
        .limit(5)
        .select('objectName objectType retrievedAt')
        .populate('retrievedBy', 'username');

      // Get error summary
      const errorCount = await SchemaIntelligence.countDocuments({
        serviceId,
        'flags.hasErrors': true,
      });

      const response = {
        success: true,
        serviceId,
        status: {
          totalSelected: selectionStats.totalObjects || 0,
          schemaRetrieved: selectionStats.totalSchemaRetrieved || 0,
          aiAnalyzed: selectionStats.totalAIGenerated || 0,
          pendingRetrieval,
          pendingAIAnalysis,
          errorCount,
          lastActivity: selectionStats.lastModified,
        },
        progress: {
          retrievalProgress:
            selectionStats.totalObjects > 0
              ? Math.round(
                  (selectionStats.totalSchemaRetrieved / selectionStats.totalObjects) * 100
                )
              : 0,
          analysisProgress:
            selectionStats.totalSchemaRetrieved > 0
              ? Math.round(
                  (selectionStats.totalAIGenerated / selectionStats.totalSchemaRetrieved) * 100
                )
              : 0,
        },
        breakdown: {
          byType: selectionStats.typeStats || [],
          byObjectType: schemaStats || [],
        },
        recentActivity: recentRetrievals,
      };

      res.json(response);
    } catch (error) {
      logger.error('Status check error:', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to get status',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/schema-intelligence/:serviceId/schemas
 * Get retrieved schema data with filtering and pagination
 */
router.get(
  '/:serviceId/schemas',
  [
    param('serviceId').isMongoId().withMessage('Invalid service ID'),
    query('objectType')
      .optional()
      .isIn(['table', 'view', 'procedure'])
      .withMessage('Invalid object type'),
    query('businessEntity').optional().isString().withMessage('Business entity must be a string'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('search').optional().isString().withMessage('Search must be a string'),
    query('includeStale').optional().isBoolean().withMessage('Include stale must be a boolean'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { serviceId } = req.params;
      const {
        objectType,
        businessEntity,
        page = 1,
        limit = 20,
        search,
        includeStale = false,
      } = req.query;

      // Build query
      const query = {
        serviceId,
        status: 'active',
      };

      if (objectType) {
        query.objectType = objectType;
      }

      if (businessEntity) {
        query['businessContext.businessEntity'] = businessEntity;
      }

      if (search) {
        query.objectName = { $regex: search, $options: 'i' };
      }

      if (!includeStale) {
        query.isStale = { $ne: true };
      }

      // Execute query with pagination
      const skip = (page - 1) * limit;
      const [schemas, total] = await Promise.all([
        SchemaIntelligence.find(query)
          .populate('retrievedBy', 'username email')
          .populate('databaseObjectId')
          .sort({ retrievedAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        SchemaIntelligence.countDocuments(query),
      ]);

      // Transform data for response
      const transformedSchemas = schemas.map(schema => ({
        id: schema._id,
        objectName: schema.objectName,
        objectType: schema.objectType,
        retrievedAt: schema.retrievedAt,
        retrievedBy: schema.retrievedBy?.username,
        isStale: schema.isStale,
        hasErrors: schema.flags?.hasErrors,
        businessEntity: schema.businessContext?.businessEntity,
        businessImportance: schema.businessContext?.businessImportance,
        qualityMetrics: schema.qualityMetrics,
        aiProcessed: schema.aiProcessing?.hasBeenAnalyzed,
        // Include basic schema info based on type
        schemaInfo:
          schema.objectType === 'table'
            ? {
                columnCount: schema.tableSchema?.stats?.totalColumns,
                indexCount: schema.tableSchema?.stats?.indexCount,
                foreignKeyCount: schema.tableSchema?.stats?.foreignKeyColumns,
                rowCount: schema.tableSchema?.rowCount,
              }
            : schema.objectType === 'view'
              ? {
                  columnCount: schema.viewSchema?.stats?.totalColumns,
                  complexityScore: schema.viewSchema?.complexityScore,
                  dependentTables: schema.viewSchema?.stats?.dependentTables,
                }
              : {
                  parameterCount: schema.procedureSchema?.stats?.totalParameters,
                  complexityScore: schema.procedureSchema?.stats?.estimatedExecutionComplexity,
                  referencedTables: schema.procedureSchema?.stats?.referencedTableCount,
                },
      }));

      const response = {
        success: true,
        data: transformedSchemas,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
        filters: {
          objectType,
          businessEntity,
          search,
          includeStale,
        },
      };

      res.json(response);
    } catch (error) {
      logger.error('Schema fetch error:', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch schemas',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/schema-intelligence/:serviceId/schemas/:objectId
 * Get detailed schema for a specific object
 */
router.get(
  '/:serviceId/schemas/:objectId',
  [
    param('serviceId').isMongoId().withMessage('Invalid service ID'),
    param('objectId').isMongoId().withMessage('Invalid object ID'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { serviceId, objectId } = req.params;

      const schema = await SchemaIntelligence.findOne({
        _id: objectId,
        serviceId,
        status: 'active',
      })
        .populate('retrievedBy', 'username email')
        .populate('databaseObjectId')
        .lean();

      if (!schema) {
        return res.status(404).json({
          success: false,
          message: 'Schema not found',
        });
      }

      // Update usage statistics
      await SchemaIntelligence.findByIdAndUpdate(objectId, {
        $inc: { 'usage.accessCount': 1 },
        $set: {
          'usage.lastAccessed': new Date(),
          'usage.lastAccessedBy': req.user.id,
        },
      });

      res.json({
        success: true,
        data: schema,
      });
    } catch (error) {
      logger.error('Schema detail fetch error:', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch schema details',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/schema-intelligence/:serviceId/views
 * Get view definitions with dependency analysis
 */
router.get(
  '/:serviceId/views',
  [
    param('serviceId').isMongoId().withMessage('Invalid service ID'),
    query('includeDependencies')
      .optional()
      .isBoolean()
      .withMessage('Include dependencies must be a boolean'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { serviceId } = req.params;
      const { includeDependencies = true } = req.query;

      const views = await SchemaIntelligence.find({
        serviceId,
        objectType: 'view',
        status: 'active',
      })
        .select('objectName viewSchema businessContext retrievedAt')
        .lean();

      const transformedViews = views.map(view => ({
        objectName: view.objectName,
        complexityScore: view.viewSchema?.complexityScore,
        joinCount: view.viewSchema?.joinCount,
        subqueryCount: view.viewSchema?.subqueryCount,
        dependencies: includeDependencies ? view.viewSchema?.dependencies : undefined,
        columnMappings: view.viewSchema?.columnMappings?.map(mapping => ({
          viewColumn: mapping.viewColumn,
          sourceTable: mapping.sourceTable,
          sourceColumn: mapping.sourceColumn,
          isComputed: mapping.isComputed,
        })),
        businessEntity: view.businessContext?.businessEntity,
        retrievedAt: view.retrievedAt,
      }));

      res.json({
        success: true,
        data: transformedViews,
        total: transformedViews.length,
      });
    } catch (error) {
      logger.error('Views fetch error:', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch views',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/schema-intelligence/:serviceId/procedures
 * Get procedure definitions with complexity analysis
 */
router.get(
  '/:serviceId/procedures',
  [
    param('serviceId').isMongoId().withMessage('Invalid service ID'),
    query('includeDefinitions')
      .optional()
      .isBoolean()
      .withMessage('Include definitions must be a boolean'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { serviceId } = req.params;
      const { includeDefinitions = false } = req.query;

      const selectFields = includeDefinitions
        ? 'objectName procedureSchema businessContext retrievedAt'
        : 'objectName procedureSchema.parameters procedureSchema.complexityMetrics procedureSchema.stats businessContext retrievedAt';

      const procedures = await SchemaIntelligence.find({
        serviceId,
        objectType: 'procedure',
        status: 'active',
      })
        .select(selectFields)
        .lean();

      const transformedProcedures = procedures.map(proc => ({
        objectName: proc.objectName,
        parameters: proc.procedureSchema?.parameters?.map(param => ({
          parameterName: param.parameterName,
          dataType: param.dataType,
          isOutput: param.isOutput,
          hasDefaultValue: param.hasDefaultValue,
        })),
        complexityMetrics: proc.procedureSchema?.complexityMetrics,
        stats: proc.procedureSchema?.stats,
        referencedObjects: proc.procedureSchema?.referencedObjects,
        businessEntity: proc.businessContext?.businessEntity,
        retrievedAt: proc.retrievedAt,
        ...(includeDefinitions && {
          definition: proc.procedureSchema?.procedureDefinition,
        }),
      }));

      res.json({
        success: true,
        data: transformedProcedures,
        total: transformedProcedures.length,
      });
    } catch (error) {
      logger.error('Procedures fetch error:', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch procedures',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * DELETE /api/schema-intelligence/:serviceId/clear
 * Clear stored schema data
 */
router.delete(
  '/:serviceId/clear',
  [
    param('serviceId').isMongoId().withMessage('Invalid service ID'),
    body('objectType')
      .optional()
      .isIn(['table', 'view', 'procedure'])
      .withMessage('Invalid object type'),
    body('confirmClear').isBoolean().withMessage('Confirm clear is required'),
    body('resetSelections')
      .optional()
      .isBoolean()
      .withMessage('Reset selections must be a boolean'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { serviceId } = req.params;
      const { objectType, confirmClear, resetSelections = false } = req.body;

      if (!confirmClear) {
        return res.status(400).json({
          success: false,
          message: 'Clear operation must be confirmed',
        });
      }

      // Build deletion query
      const query = { serviceId };
      if (objectType) {
        query.objectType = objectType;
      }

      // Delete schema intelligence records
      const schemaResult = await SchemaIntelligence.deleteMany(query);

      // Reset DatabaseObject flags if requested
      let selectionResult = null;
      if (resetSelections) {
        const updateQuery = { serviceId };
        if (objectType) {
          updateQuery.objectType = objectType;
        }

        selectionResult = await DatabaseObject.updateMany(updateQuery, {
          $set: {
            schemaRetrieved: false,
            aiGenerated: false,
            schemaRetrievedAt: null,
            aiGeneratedAt: null,
            schemaVersion: null,
            generationVersion: null,
          },
        });
      }

      res.json({
        success: true,
        message: `Cleared schema data for ${objectType || 'all object types'}`,
        deletedSchemas: schemaResult.deletedCount,
        resetSelections: resetSelections ? selectionResult.modifiedCount : 0,
      });
    } catch (error) {
      logger.error('Schema clear error:', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to clear schema data',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/schema-intelligence/:serviceId/refresh/:objectId
 * Refresh schema for a specific object
 */
router.post(
  '/:serviceId/refresh/:objectId',
  [
    param('serviceId').isMongoId().withMessage('Invalid service ID'),
    param('objectId').isMongoId().withMessage('Invalid object ID'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { serviceId, objectId } = req.params;

      // Get the database object
      const databaseObject = await DatabaseObject.findOne({
        _id: objectId,
        serviceId,
        isActive: true,
      });

      if (!databaseObject) {
        return res.status(404).json({
          success: false,
          message: 'Database object not found',
        });
      }

      // Mark existing schema as stale
      await SchemaIntelligence.updateMany(
        { databaseObjectId: objectId },
        { isStale: true, staleCheckLastRun: new Date() }
      );

      // Reset database object schema flags
      databaseObject.schemaRetrieved = false;
      databaseObject.aiGenerated = false;
      databaseObject.schemaRetrievedAt = null;
      databaseObject.aiGeneratedAt = null;
      await databaseObject.save();

      // Trigger fresh retrieval
      const result = await SchemaIntelligenceService.retrieveSchemaForSelections(
        serviceId,
        req.user.id,
        { objectTypes: [databaseObject.objectType], batchSize: 1 }
      );

      res.json({
        success: true,
        message: `Schema refreshed for ${databaseObject.objectName}`,
        result,
      });
    } catch (error) {
      logger.error('Schema refresh error:', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to refresh schema',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

module.exports = router;
