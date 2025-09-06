const express = require('express');
const router = express.Router();
const AISchemaGeneratorService = require('../services/AISchemaGeneratorService');
const DatabaseObjectService = require('../services/DatabaseObjectService');
const SchemaIntelligence = require('../models/SchemaIntelligence');
const GeneratedArtifact = require('../models/GeneratedArtifact');
// Auth middleware not needed - handled at app level
const { body, param, query, validationResult } = require('express-validator');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

// Apply authentication middleware to all routes
// Authentication is already handled at app level in server.js

/**
 * POST /api/ai-generation/:serviceId/generate
 * Trigger AI schema generation for selected objects
 */
router.post(
  '/:serviceId/generate',
  [
    param('serviceId').isMongoId().withMessage('Invalid service ID'),
    body('artifactTypes').optional().isArray().withMessage('Artifact types must be an array'),
    body('artifactTypes.*')
      .optional()
      .isIn([
        'graphql_schema',
        'graphql_resolvers',
        'prisma_schema',
        'typescript_types',
        'documentation',
      ])
      .withMessage('Invalid artifact type'),
    body('regenerate').optional().isBoolean().withMessage('Regenerate must be a boolean'),
    body('includeBusinessContext')
      .optional()
      .isBoolean()
      .withMessage('Include business context must be a boolean'),
    body('options').optional().isObject().withMessage('Options must be an object'),
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
        artifactTypes = [
          'graphql_schema',
          'graphql_resolvers',
          'prisma_schema',
          'typescript_types',
          'documentation',
        ],
        regenerate = false,
        includeBusinessContext = true,
        options = {},
      } = req.body;

      // Check if OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({
          success: false,
          message:
            'AI generation service is not configured. Please set OPENAI_API_KEY environment variable.',
        });
      }

      // Check if schemas are available for generation
      const schemaCount = await SchemaIntelligence.countDocuments({
        serviceId,
        status: 'active',
      });

      if (schemaCount === 0) {
        return res.status(400).json({
          success: false,
          message: 'No schemas available for generation. Please retrieve schemas first.',
        });
      }

      // Start generation process
      const result = await AISchemaGeneratorService.generateArtifactsForService(
        serviceId,
        req.user.id,
        {
          artifactTypes,
          regenerate,
          businessContext: includeBusinessContext,
          ...options,
        }
      );

      res.json({
        success: result.success,
        message: `AI generation completed. Generated ${result.generated} artifacts with ${result.errors} errors.`,
        ...result,
      });
    } catch (error) {
      logger.error('AI generation error:', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to generate artifacts',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/ai-generation/:serviceId/status
 * Check AI generation progress and status
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

      // Get generation statistics
      const stats = await GeneratedArtifact.getGenerationStats(serviceId);

      // Get recent generations
      const recentGenerations = await GeneratedArtifact.find({
        serviceId,
        status: 'active',
      })
        .sort({ generatedAt: -1 })
        .limit(10)
        .select('artifactType artifactName generatedAt version status usage.downloadCount')
        .populate('generatedBy', 'username');

      // Get pending AI analysis count
      const pendingAnalysis = await SchemaIntelligence.countDocuments({
        serviceId,
        status: 'active',
        'aiProcessing.hasBeenAnalyzed': false,
      });

      // Get artifact breakdown by type
      const artifactBreakdown = {};
      const artifactTypes = [
        'graphql_schema',
        'graphql_resolvers',
        'prisma_schema',
        'typescript_types',
        'documentation',
      ];

      for (const type of artifactTypes) {
        const latest = await GeneratedArtifact.findLatestByType(serviceId, type);
        artifactBreakdown[type] = {
          hasArtifact: !!latest,
          latestVersion: latest?.version,
          generatedAt: latest?.generatedAt,
          downloadCount: latest?.usage?.downloadCount || 0,
        };
      }

      const response = {
        success: true,
        serviceId,
        status: {
          totalArtifacts: stats.reduce((sum, s) => sum + s.count, 0),
          totalDownloads: stats.reduce((sum, s) => sum + s.totalDownloads, 0),
          totalDeployments: stats.reduce((sum, s) => sum + s.totalDeployments, 0),
          pendingAnalysis,
          lastGeneration: stats.reduce(
            (latest, s) => (s.latestGeneration > latest ? s.latestGeneration : latest),
            new Date(0)
          ),
        },
        artifactBreakdown,
        statistics: stats.reduce((acc, stat) => {
          acc[stat._id] = {
            count: stat.count,
            latestGeneration: stat.latestGeneration,
            totalDownloads: stat.totalDownloads,
            totalDeployments: stat.totalDeployments,
          };
          return acc;
        }, {}),
        recentGenerations,
      };

      res.json(response);
    } catch (error) {
      logger.error('Status check error:', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to get generation status',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/ai-generation/:serviceId/artifacts
 * Get all generated artifacts with filtering
 */
router.get(
  '/:serviceId/artifacts',
  [
    param('serviceId').isMongoId().withMessage('Invalid service ID'),
    query('artifactType')
      .optional()
      .isIn([
        'graphql_schema',
        'graphql_resolvers',
        'prisma_schema',
        'typescript_types',
        'documentation',
      ])
      .withMessage('Invalid artifact type'),
    query('status')
      .optional()
      .isIn(['active', 'deprecated', 'archived', 'draft'])
      .withMessage('Invalid status'),
    query('latestOnly').optional().isBoolean().withMessage('Latest only must be a boolean'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
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
        artifactType,
        status = 'active',
        latestOnly = false,
        page = 1,
        limit = 20,
      } = req.query;

      // Build query
      const query = { serviceId, status };

      if (artifactType) {
        query.artifactType = artifactType;
      }

      if (latestOnly) {
        query.isLatest = true;
      }

      // Execute query with pagination
      const skip = (page - 1) * limit;
      const [artifacts, total] = await Promise.all([
        GeneratedArtifact.find(query)
          .populate('generatedBy', 'username email')
          .populate('sourceSchemas', 'objectName objectType')
          .sort({ generatedAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        GeneratedArtifact.countDocuments(query),
      ]);

      // Transform for response
      const transformedArtifacts = artifacts.map(artifact => ({
        id: artifact._id,
        artifactType: artifact.artifactType,
        artifactName: artifact.artifactName,
        description: artifact.description,
        version: artifact.version,
        generatedAt: artifact.generatedAt,
        generatedBy: artifact.generatedBy?.username,
        status: artifact.status,
        isLatest: artifact.isLatest,
        contentPreview: artifact.content.primary?.substring(0, 200) + '...',
        metadata: {
          lineCount: artifact.metadata.lineCount,
          typeCount: artifact.metadata.typeCount,
          fieldCount: artifact.metadata.fieldCount,
        },
        usage: {
          downloadCount: artifact.usage.downloadCount,
          deploymentCount: artifact.usage.deploymentCount,
          lastDownloaded: artifact.usage.lastDownloaded,
        },
        validation: {
          isValid: artifact.validation.isValid,
          errorCount: artifact.validation.errors?.length || 0,
          warningCount: artifact.validation.warnings?.length || 0,
        },
      }));

      const response = {
        success: true,
        data: transformedArtifacts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
        filters: {
          artifactType,
          status,
          latestOnly,
        },
      };

      res.json(response);
    } catch (error) {
      logger.error('Artifact fetch error:', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch artifacts',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/ai-generation/:serviceId/artifacts/:artifactId
 * Get detailed artifact information
 */
router.get(
  '/:serviceId/artifacts/:artifactId',
  [
    param('serviceId').isMongoId().withMessage('Invalid service ID'),
    param('artifactId').isMongoId().withMessage('Invalid artifact ID'),
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

      const { serviceId, artifactId } = req.params;

      const artifact = await GeneratedArtifact.findOne({
        _id: artifactId,
        serviceId,
      })
        .populate('generatedBy', 'username email')
        .populate('sourceSchemas', 'objectName objectType')
        .populate('sourceDatabaseObjects', 'objectName objectType')
        .populate('previousVersion', 'version generatedAt')
        .lean();

      if (!artifact) {
        return res.status(404).json({
          success: false,
          message: 'Artifact not found',
        });
      }

      // Increment download count
      await GeneratedArtifact.findByIdAndUpdate(artifactId, {
        $inc: { 'usage.downloadCount': 1 },
        $set: {
          'usage.lastDownloaded': new Date(),
          'usage.lastDownloadedBy': req.user.id,
        },
      });

      res.json({
        success: true,
        data: artifact,
      });
    } catch (error) {
      logger.error('Artifact detail fetch error:', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch artifact details',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/ai-generation/:serviceId/download/:artifactType
 * Download specific artifact type
 */
router.get(
  '/:serviceId/download/:artifactType',
  [
    param('serviceId').isMongoId().withMessage('Invalid service ID'),
    param('artifactType')
      .isIn([
        'graphql_schema',
        'graphql_resolvers',
        'prisma_schema',
        'typescript_types',
        'documentation',
      ])
      .withMessage('Invalid artifact type'),
    query('version')
      .optional()
      .matches(/^\d+\.\d+\.\d+$/)
      .withMessage('Invalid version format'),
    query('format')
      .optional()
      .isIn(['raw', 'json', 'yaml', 'markdown'])
      .withMessage('Invalid format'),
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

      const { serviceId, artifactType } = req.params;
      const { version, format = 'raw' } = req.query;

      // Find the artifact
      const query = {
        serviceId,
        artifactType,
        status: 'active',
      };

      if (version) {
        query.version = version;
      } else {
        query.isLatest = true;
      }

      const artifact = await GeneratedArtifact.findOne(query);

      if (!artifact) {
        return res.status(404).json({
          success: false,
          message: `No ${artifactType} artifact found`,
        });
      }

      // Get content based on format
      let content;
      let contentType;
      let fileExtension;

      switch (format) {
        case 'json':
          content =
            artifact.content.formatted?.json ||
            JSON.stringify(
              {
                artifactType: artifact.artifactType,
                version: artifact.version,
                generatedAt: artifact.generatedAt,
                content: artifact.content.primary,
              },
              null,
              2
            );
          contentType = 'application/json';
          fileExtension = 'json';
          break;

        case 'yaml':
          content = artifact.content.formatted?.yaml || artifact.content.primary;
          contentType = 'text/yaml';
          fileExtension = 'yaml';
          break;

        case 'markdown':
          content =
            artifact.content.formatted?.markdown ||
            `# ${artifact.artifactName}\n\n` +
              `Version: ${artifact.version}\n` +
              `Generated: ${artifact.generatedAt}\n\n` +
              `\`\`\`\n${artifact.content.primary}\n\`\`\``;
          contentType = 'text/markdown';
          fileExtension = 'md';
          break;

        default: // raw
          content = artifact.content.primary;
          contentType = 'text/plain';
          fileExtension =
            artifactType === 'graphql_schema'
              ? 'graphql'
              : artifactType === 'prisma_schema'
                ? 'prisma'
                : artifactType === 'typescript_types'
                  ? 'ts'
                  : artifactType === 'documentation'
                    ? 'md'
                    : 'txt';
      }

      // Update download count
      await artifact.incrementDownloadCount(req.user.id);

      // Set response headers
      const fileName = `${artifactType}_v${artifact.version}.${fileExtension}`;
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('X-Artifact-Version', artifact.version);
      res.setHeader('X-Generated-At', artifact.generatedAt);

      res.send(content);
    } catch (error) {
      logger.error('Download error:', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to download artifact',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * PUT /api/ai-generation/:serviceId/regenerate
 * Regenerate artifacts with new parameters
 */
router.put(
  '/:serviceId/regenerate',
  [
    param('serviceId').isMongoId().withMessage('Invalid service ID'),
    body('artifactTypes').isArray().withMessage('Artifact types must be an array'),
    body('artifactTypes.*')
      .isIn([
        'graphql_schema',
        'graphql_resolvers',
        'prisma_schema',
        'typescript_types',
        'documentation',
      ])
      .withMessage('Invalid artifact type'),
    body('options').optional().isObject().withMessage('Options must be an object'),
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
      const { artifactTypes, options = {} } = req.body;

      // Mark existing artifacts as deprecated
      await GeneratedArtifact.updateMany(
        {
          serviceId,
          artifactType: { $in: artifactTypes },
          isLatest: true,
        },
        {
          $set: { isLatest: false },
        }
      );

      // Regenerate artifacts
      const result = await AISchemaGeneratorService.generateArtifactsForService(
        serviceId,
        req.user.id,
        {
          artifactTypes,
          regenerate: true,
          ...options,
        }
      );

      res.json({
        success: result.success,
        message: `Regeneration completed. Generated ${result.generated} artifacts with ${result.errors} errors.`,
        ...result,
      });
    } catch (error) {
      logger.error('Regeneration error:', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to regenerate artifacts',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * DELETE /api/ai-generation/:serviceId/artifacts
 * Clear generated artifacts
 */
router.delete(
  '/:serviceId/artifacts',
  [
    param('serviceId').isMongoId().withMessage('Invalid service ID'),
    body('artifactType')
      .optional()
      .isIn([
        'graphql_schema',
        'graphql_resolvers',
        'prisma_schema',
        'typescript_types',
        'documentation',
      ])
      .withMessage('Invalid artifact type'),
    body('confirmDelete').isBoolean().withMessage('Confirm delete is required'),
    body('keepLatest').optional().isBoolean().withMessage('Keep latest must be a boolean'),
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
      const { artifactType, confirmDelete, keepLatest = false } = req.body;

      if (!confirmDelete) {
        return res.status(400).json({
          success: false,
          message: 'Delete operation must be confirmed',
        });
      }

      // Build deletion query
      const query = { serviceId };

      if (artifactType) {
        query.artifactType = artifactType;
      }

      if (keepLatest) {
        query.isLatest = false;
      }

      // Delete artifacts
      const result = await GeneratedArtifact.deleteMany(query);

      res.json({
        success: true,
        message: `Deleted ${result.deletedCount} artifacts`,
        deletedCount: result.deletedCount,
      });
    } catch (error) {
      logger.error('Delete error:', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to delete artifacts',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/ai-generation/:serviceId/artifacts/:artifactId/validate
 * Validate a generated artifact
 */
router.post(
  '/:serviceId/artifacts/:artifactId/validate',
  [
    param('serviceId').isMongoId().withMessage('Invalid service ID'),
    param('artifactId').isMongoId().withMessage('Invalid artifact ID'),
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

      const { serviceId, artifactId } = req.params;

      const artifact = await GeneratedArtifact.findOne({
        _id: artifactId,
        serviceId,
      });

      if (!artifact) {
        return res.status(404).json({
          success: false,
          message: 'Artifact not found',
        });
      }

      // Perform validation
      const validationResult = await artifact.validate();

      // Update validation metadata
      artifact.validation.validatedBy = req.user.id;
      await artifact.save();

      res.json({
        success: true,
        message: `Validation completed with ${validationResult.errors.length} errors and ${validationResult.warnings.length} warnings`,
        validation: validationResult,
      });
    } catch (error) {
      logger.error('Validation error:', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to validate artifact',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/ai-generation/:serviceId/artifacts/:artifactId/deploy
 * Record deployment of an artifact
 */
router.post(
  '/:serviceId/artifacts/:artifactId/deploy',
  [
    param('serviceId').isMongoId().withMessage('Invalid service ID'),
    param('artifactId').isMongoId().withMessage('Invalid artifact ID'),
    body('environment').notEmpty().withMessage('Environment is required'),
    body('projectName').optional().isString().withMessage('Project name must be a string'),
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

      const { serviceId, artifactId } = req.params;
      const { environment, projectName } = req.body;

      const artifact = await GeneratedArtifact.findOne({
        _id: artifactId,
        serviceId,
      });

      if (!artifact) {
        return res.status(404).json({
          success: false,
          message: 'Artifact not found',
        });
      }

      // Record deployment
      await artifact.recordDeployment(environment, req.user.id);

      // Add integration record if project name provided
      if (projectName) {
        artifact.usage.integratedInProjects.push({
          projectName,
          integratedAt: new Date(),
          integratedBy: req.user.id,
        });
        await artifact.save();
      }

      res.json({
        success: true,
        message: `Deployment recorded for ${environment} environment`,
        deployment: {
          environment,
          deploymentCount: artifact.usage.deploymentCount,
          deploymentEnvironments: artifact.usage.deploymentEnvironments,
        },
      });
    } catch (error) {
      logger.error('Deployment recording error:', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to record deployment',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

module.exports = router;
