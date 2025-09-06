const express = require('express');
const router = express.Router();
const Template20Intelligence = require('../models/Template20Intelligence');
const { body, validationResult } = require('express-validator');

/**
 * Schema Selection Management Routes
 * Handles selective table/view/procedure selection for code generation
 */

// Get all available database objects for selection
router.get('/available', async (req, res) => {
  try {
    const {
      search = '',
      type = 'all', // all, tables, views, procedures
      businessEntity = 'all',
      page = 1,
      limit = 100,
    } = req.query;

    const intelligence = await Template20Intelligence.getLatestIntelligence();

    if (!intelligence) {
      return res.status(404).json({
        success: false,
        message: 'No schema intelligence found. Please run schema analysis first.',
      });
    }

    let allItems = [];

    // Collect tables
    if (type === 'all' || type === 'tables') {
      const tables = intelligence.tables
        .filter(table => {
          const matchesSearch =
            !search || table.tableName.toLowerCase().includes(search.toLowerCase());
          const matchesEntity = businessEntity === 'all' || table.businessEntity === businessEntity;
          return matchesSearch && matchesEntity;
        })
        .map(table => ({
          type: 'table',
          name: table.tableName,
          businessEntity: table.businessEntity,
          businessImportance: table.businessImportance,
          importanceScore: table.importanceScore,
          columns: table.columns?.length || 0,
          estimatedRowCount: table.estimatedRowCount,
          hasAuditFields: table.hasAuditFields,
        }));
      allItems.push(...tables);
    }

    // Collect views
    if (type === 'all' || type === 'views') {
      const views = intelligence.views
        .filter(view => {
          const matchesSearch =
            !search || view.viewName.toLowerCase().includes(search.toLowerCase());
          const matchesEntity = businessEntity === 'all' || view.businessEntity === businessEntity;
          return matchesSearch && matchesEntity;
        })
        .map(view => ({
          type: 'view',
          name: view.viewName,
          businessEntity: view.businessEntity,
          businessImportance: view.businessImportance,
          confidence: view.confidence,
          hasRelationships: view.relationships?.length > 0,
          relatedTables: view.relatedTables?.length || 0,
        }));
      allItems.push(...views);
    }

    // Collect procedures
    if (type === 'all' || type === 'procedures') {
      const procedures = intelligence.procedures
        .filter(proc => {
          const matchesSearch =
            !search || proc.procedureName.toLowerCase().includes(search.toLowerCase());
          const matchesEntity = businessEntity === 'all' || proc.businessEntity === businessEntity;
          return matchesSearch && matchesEntity;
        })
        .map(proc => ({
          type: 'procedure',
          name: proc.procedureName,
          businessEntity: proc.businessEntity,
          procedureType: proc.procedureType,
          overallConfidence: proc.overallConfidence,
          parameters: proc.parameters?.length || 0,
          daysSinceModified: proc.daysSinceModified,
          estimatedUsageFrequency: proc.estimatedUsageFrequency,
        }));
      allItems.push(...procedures);
    }

    // Sort by importance score and name
    allItems.sort((a, b) => {
      const scoreA = a.importanceScore || a.overallConfidence || a.confidence || 0;
      const scoreB = b.importanceScore || b.overallConfidence || b.confidence || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return a.name.localeCompare(b.name);
    });

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedItems = allItems.slice(startIndex, endIndex);

    // Get business entities for filtering
    const businessEntities = [...new Set(intelligence.businessEntities.map(e => e.entityType))];

    res.json({
      success: true,
      data: {
        items: paginatedItems,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: allItems.length,
          totalPages: Math.ceil(allItems.length / limit),
          hasNext: endIndex < allItems.length,
          hasPrev: page > 1,
        },
        filters: {
          search,
          type,
          businessEntity,
          availableBusinessEntities: businessEntities,
        },
        summary: {
          totalTables: intelligence.tables.length,
          totalViews: intelligence.views.length,
          totalProcedures: intelligence.procedures.length,
          lastAnalysis: intelligence.lastFullAnalysis,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching available objects:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available database objects',
      error: error.message,
    });
  }
});

// Get all selections
router.get('/selections', async (req, res) => {
  try {
    const intelligence = await Template20Intelligence.getLatestIntelligence();

    if (!intelligence) {
      return res.status(404).json({
        success: false,
        message: 'No schema intelligence found',
      });
    }

    const selections = intelligence.selections.map(sel => ({
      selectionName: sel.selectionName,
      description: sel.description,
      createdAt: sel.createdAt,
      lastModified: sel.lastModified,
      stats: sel.stats,
      generationSettings: sel.generationSettings,
      lastGeneration:
        sel.generationHistory.length > 0
          ? sel.generationHistory[sel.generationHistory.length - 1]
          : null,
    }));

    res.json({
      success: true,
      data: {
        selections,
        activeSelection: intelligence.activeSelection,
        totalSelections: selections.length,
      },
    });
  } catch (error) {
    logger.error('Error fetching selections:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch selections',
      error: error.message,
    });
  }
});

// Get specific selection details
router.get('/selections/:selectionName', async (req, res) => {
  try {
    const { selectionName } = req.params;
    const intelligence = await Template20Intelligence.getLatestIntelligence();

    if (!intelligence) {
      return res.status(404).json({
        success: false,
        message: 'No schema intelligence found',
      });
    }

    const selection = intelligence.getSelection(selectionName);

    if (!selection) {
      return res.status(404).json({
        success: false,
        message: 'Selection not found',
      });
    }

    res.json({
      success: true,
      data: selection,
    });
  } catch (error) {
    logger.error('Error fetching selection:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch selection',
      error: error.message,
    });
  }
});

// Create new selection
router.post(
  '/selections',
  [
    body('selectionName').notEmpty().withMessage('Selection name is required'),
    body('description').optional(),
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

      const { selectionName, description } = req.body;

      const intelligence = await Template20Intelligence.getLatestIntelligence();

      if (!intelligence) {
        return res.status(404).json({
          success: false,
          message: 'No schema intelligence found. Please run schema analysis first.',
        });
      }

      // Check if selection already exists
      const existingSelection = intelligence.getSelection(selectionName);
      if (existingSelection) {
        return res.status(409).json({
          success: false,
          message: 'Selection with this name already exists',
        });
      }

      const newSelection = intelligence.createSelection(selectionName, description);
      await intelligence.save();

      res.status(201).json({
        success: true,
        data: newSelection,
        message: 'Selection created successfully',
      });
    } catch (error) {
      logger.error('Error creating selection:', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to create selection',
        error: error.message,
      });
    }
  }
);

// Update selection items
router.put(
  '/selections/:selectionName/items',
  [
    body('selectedTables').isArray().withMessage('selectedTables must be an array'),
    body('selectedViews').isArray().withMessage('selectedViews must be an array'),
    body('selectedProcedures').isArray().withMessage('selectedProcedures must be an array'),
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

      const { selectionName } = req.params;
      const {
        selectedTables,
        selectedViews,
        selectedProcedures,
        includeDependencies = true,
      } = req.body;

      const intelligence = await Template20Intelligence.getLatestIntelligence();

      if (!intelligence) {
        return res.status(404).json({
          success: false,
          message: 'No schema intelligence found',
        });
      }

      const updated = intelligence.updateSelectionItems(
        selectionName,
        selectedTables,
        selectedViews,
        selectedProcedures
      );

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Selection not found',
        });
      }

      // Add dependencies if requested
      if (includeDependencies) {
        const dependentTables = [];
        const dependentViews = [];

        // Find related tables based on relationships
        selectedTables.forEach(tableName => {
          const relationships = intelligence.getRelationshipsForTable(tableName);
          relationships.forEach(rel => {
            if (rel.fromTable !== tableName && !selectedTables.includes(rel.fromTable)) {
              dependentTables.push(rel.fromTable);
            }
            if (rel.toTable !== tableName && !selectedTables.includes(rel.toTable)) {
              dependentTables.push(rel.toTable);
            }
          });
        });

        if (dependentTables.length > 0 || dependentViews.length > 0) {
          intelligence.addDependenciesToSelection(selectionName, dependentTables, dependentViews);
        }
      }

      await intelligence.save();

      const updatedSelection = intelligence.getSelection(selectionName);

      res.json({
        success: true,
        data: updatedSelection,
        message: `Selection updated with ${updatedSelection.stats.totalTables} tables, ${updatedSelection.stats.totalViews} views, and ${updatedSelection.stats.totalProcedures} procedures`,
      });
    } catch (error) {
      logger.error('Error updating selection:', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to update selection',
        error: error.message,
      });
    }
  }
);

// Delete selection
router.delete('/selections/:selectionName', async (req, res) => {
  try {
    const { selectionName } = req.params;

    const intelligence = await Template20Intelligence.getLatestIntelligence();

    if (!intelligence) {
      return res.status(404).json({
        success: false,
        message: 'No schema intelligence found',
      });
    }

    const selection = intelligence.getSelection(selectionName);
    if (!selection) {
      return res.status(404).json({
        success: false,
        message: 'Selection not found',
      });
    }

    intelligence.deleteSelection(selectionName);
    await intelligence.save();

    res.json({
      success: true,
      message: 'Selection deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting selection:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to delete selection',
      error: error.message,
    });
  }
});

// Set active selection
router.put(
  '/active-selection',
  [body('selectionName').notEmpty().withMessage('Selection name is required')],
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

      const { selectionName } = req.body;

      const intelligence = await Template20Intelligence.getLatestIntelligence();

      if (!intelligence) {
        return res.status(404).json({
          success: false,
          message: 'No schema intelligence found',
        });
      }

      const selection = intelligence.getSelection(selectionName);
      if (!selection) {
        return res.status(404).json({
          success: false,
          message: 'Selection not found',
        });
      }

      intelligence.activeSelection = selectionName;
      await intelligence.save();

      res.json({
        success: true,
        data: { activeSelection: selectionName },
        message: 'Active selection updated',
      });
    } catch (error) {
      logger.error('Error setting active selection:', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to set active selection',
        error: error.message,
      });
    }
  }
);

// Generate code for selection
router.post(
  '/selections/:selectionName/generate',
  [
    body('generationType')
      .isIn(['graphql', 'prisma', 'documentation', 'all'])
      .withMessage('Invalid generation type'),
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

      const { selectionName } = req.params;
      const { generationType, options = {} } = req.body;

      const intelligence = await Template20Intelligence.getLatestIntelligence();

      if (!intelligence) {
        return res.status(404).json({
          success: false,
          message: 'No schema intelligence found',
        });
      }

      const selection = intelligence.getSelection(selectionName);
      if (!selection) {
        return res.status(404).json({
          success: false,
          message: 'Selection not found',
        });
      }

      // Set as active selection for generation
      intelligence.activeSelection = selectionName;

      // Call appropriate generation service based on type
      let result;
      const outputFiles = [];

      try {
        if (generationType === 'graphql' || generationType === 'all') {
          const GraphQLSchemaGenerator = require('../services/GraphQLSchemaGenerator');
          const generator = new GraphQLSchemaGenerator();
          const graphqlResult = await generator.generateSelectiveSchema(selection, options);
          outputFiles.push(...graphqlResult.outputFiles);
        }

        if (generationType === 'prisma' || generationType === 'all') {
          const PrismaSchemaGenerator = require('../services/PrismaSchemaGenerator');
          const generator = new PrismaSchemaGenerator();
          const prismaResult = await generator.generateSelectiveSchema(selection, options);
          outputFiles.push(...prismaResult.outputFiles);
        }

        if (generationType === 'documentation' || generationType === 'all') {
          const AIDocumentationService = require('../services/AIDocumentationService');
          const logger = require('../utils/logger');
          const service = new AIDocumentationService();
          const docResult = await service.generateSelectiveDocumentation(selection, options);
          outputFiles.push(...docResult.outputFiles);
        }

        // Record successful generation
        intelligence.recordGeneration(
          selectionName,
          generationType,
          selection.stats.totalTables +
            selection.stats.totalViews +
            selection.stats.totalProcedures,
          true,
          outputFiles
        );

        await intelligence.save();

        res.json({
          success: true,
          data: {
            generationType,
            itemsGenerated:
              selection.stats.totalTables +
              selection.stats.totalViews +
              selection.stats.totalProcedures,
            outputFiles,
            selection: selection.stats,
          },
          message: `${generationType} generation completed successfully for ${selectionName}`,
        });
      } catch (generationError) {
        // Record failed generation
        intelligence.recordGeneration(
          selectionName,
          generationType,
          0,
          false,
          [],
          generationError.message
        );

        await intelligence.save();
        throw generationError;
      }
    } catch (error) {
      logger.error('Error generating code for selection:', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to generate code for selection',
        error: error.message,
      });
    }
  }
);

module.exports = router;
