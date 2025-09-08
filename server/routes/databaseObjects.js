const express = require('express');
const router = express.Router();
// MongoDB models replaced with Prisma for PostgreSQL migration
// const Template20Intelligence = require('../models/Template20Intelligence');
// const DatabaseObject = require('../models/DatabaseObject');

const { PrismaClient } = require('../prisma/generated/client');
const prisma = new PrismaClient();
// Auth middleware not needed - handled at app level
const { body, param, validationResult } = require('express-validator');
const { logger } = require('../utils/logger');

// Apply authentication middleware to all routes
// Authentication is already handled at app level in server.js

/**
 * GET /api/database-objects/:serviceId
 * Fetch available database objects from Template20Intelligence for a service
 */
router.get(
  '/:serviceId',
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

      // TODO: Replace with Prisma query for PostgreSQL migration
      // Get the latest Template20Intelligence data
      // const intelligence = await Template20Intelligence.getLatestIntelligence();
      const intelligence = null; // Placeholder

      if (!intelligence) {
        return res.status(404).json({
          success: false,
          message: 'No Template20 intelligence data available. Please run schema analysis first.',
        });
      }

      // Return available objects organized by type
      const response = {
        success: true,
        data: {
          tables: intelligence.tables || [],
          views: intelligence.views || [],
          procedures: intelligence.procedures || [],
          lastAnalyzed: intelligence.lastFullAnalysis,
          analysisVersion: intelligence.analysisVersion,
        },
      };

      res.json(response.data);
    } catch (error) {
      logger.error('Error fetching database objects:', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch database objects',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/database-objects/:serviceId/select
 * Save object selections for a service
 */
router.post(
  '/:serviceId/select',
  [
    param('serviceId').isMongoId().withMessage('Invalid service ID'),
    body('selectedTables').optional().isArray().withMessage('Selected tables must be an array'),
    body('selectedViews').optional().isArray().withMessage('Selected views must be an array'),
    body('selectedProcedures')
      .optional()
      .isArray()
      .withMessage('Selected procedures must be an array'),
    body('selectionName').optional().isString().withMessage('Selection name must be a string'),
    body('description').optional().isString().withMessage('Description must be a string'),
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
        selectedTables = [],
        selectedViews = [],
        selectedProcedures = [],
        selectionName = 'default',
        description = '',
      } = req.body;

      // Validate that at least one object is selected
      const totalSelected =
        selectedTables.length + selectedViews.length + selectedProcedures.length;
      if (totalSelected === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one database object must be selected',
        });
      }

      // TODO: Replace with Prisma query for PostgreSQL migration
      // Get or create intelligence document
      // let intelligence = await Template20Intelligence.getLatestIntelligence();
      let intelligence = null; // Placeholder
      if (!intelligence) {
        return res.status(404).json({
          success: false,
          message: 'No Template20 intelligence data available. Please run schema analysis first.',
        });
      }

      // TODO: Replace with Prisma logic for PostgreSQL migration
      // Find or create selection
      // let selection = intelligence.getSelection(selectionName);
      // if (!selection) {
      //   selection = intelligence.createSelection(selectionName, description);
      // }
      //
      // Update selection with new objects
      // intelligence.updateSelectionItems(
      //   selectionName,
      //   selectedTables,
      //   selectedViews,
      //   selectedProcedures
      // );
      //
      // Save the updated intelligence
      // await intelligence.save();

      // Create/update individual DatabaseObject records for tracking
      await saveDatabaseObjectSelections(
        serviceId,
        selectedTables,
        selectedViews,
        selectedProcedures,
        req.user.id
      );

      const response = {
        success: true,
        message: 'Object selections saved successfully',
        data: {
          selectionName,
          totalObjects: totalSelected,
          selectedTables: selectedTables.length,
          selectedViews: selectedViews.length,
          selectedProcedures: selectedProcedures.length,
          lastModified: new Date(),
        },
      };

      res.json(response);
    } catch (error) {
      logger.error('Error saving object selections:', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to save object selections',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/database-objects/:serviceId/selections
 * Get current selections for a service
 */
router.get(
  '/:serviceId/selections',
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

      // TODO: Replace with Prisma query for PostgreSQL migration
      // Get selections from DatabaseObject model
      // const selections = await DatabaseObject.find({ serviceId }).sort({ createdAt: -1 });
      const selections = []; // Placeholder

      if (selections.length === 0) {
        return res.json({
          success: true,
          selectedTables: [],
          selectedViews: [],
          selectedProcedures: [],
          totalObjects: 0,
        });
      }

      // Group selections by object type
      const selectedTables = selections
        .filter(sel => sel.objectType === 'table')
        .map(sel => ({
          tableName: sel.objectName,
          businessEntity: sel.businessEntity,
          reason: sel.selectionReason,
          addedAt: sel.createdAt,
        }));

      const selectedViews = selections
        .filter(sel => sel.objectType === 'view')
        .map(sel => ({
          viewName: sel.objectName,
          businessEntity: sel.businessEntity,
          reason: sel.selectionReason,
          addedAt: sel.createdAt,
        }));

      const selectedProcedures = selections
        .filter(sel => sel.objectType === 'procedure')
        .map(sel => ({
          procedureName: sel.objectName,
          businessEntity: sel.businessEntity,
          reason: sel.selectionReason,
          addedAt: sel.createdAt,
        }));

      const response = {
        success: true,
        selectedTables,
        selectedViews,
        selectedProcedures,
        totalObjects: selections.length,
        lastModified: selections[0]?.updatedAt,
        selectionName: 'default',
      };

      res.json(response);
    } catch (error) {
      logger.error('Error fetching object selections:', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to fetch object selections',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * PUT /api/database-objects/:serviceId/selections
 * Update existing selections for a service
 */
router.put(
  '/:serviceId/selections',
  [
    param('serviceId').isMongoId().withMessage('Invalid service ID'),
    body('selectedTables').optional().isArray().withMessage('Selected tables must be an array'),
    body('selectedViews').optional().isArray().withMessage('Selected views must be an array'),
    body('selectedProcedures')
      .optional()
      .isArray()
      .withMessage('Selected procedures must be an array'),
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
      const { selectedTables = [], selectedViews = [], selectedProcedures = [] } = req.body;

      // TODO: Replace with Prisma query for PostgreSQL migration
      // Clear existing selections
      // await DatabaseObject.deleteMany({ serviceId });

      // Save new selections
      await saveDatabaseObjectSelections(
        serviceId,
        selectedTables,
        selectedViews,
        selectedProcedures,
        req.user.id
      );

      const totalObjects = selectedTables.length + selectedViews.length + selectedProcedures.length;

      res.json({
        success: true,
        message: 'Object selections updated successfully',
        data: {
          totalObjects,
          selectedTables: selectedTables.length,
          selectedViews: selectedViews.length,
          selectedProcedures: selectedProcedures.length,
          lastModified: new Date(),
        },
      });
    } catch (error) {
      logger.error('Error updating object selections:', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to update object selections',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * DELETE /api/database-objects/:serviceId/selections/:objectName
 * Remove a specific object from selections
 */
router.delete(
  '/:serviceId/selections/:objectName',
  [
    param('serviceId').isMongoId().withMessage('Invalid service ID'),
    param('objectName').notEmpty().withMessage('Object name is required'),
    body('objectType')
      .isIn(['table', 'view', 'procedure'])
      .withMessage('Valid object type is required'),
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

      const { serviceId, objectName } = req.params;
      const { objectType } = req.body;

      // TODO: Replace with Prisma query for PostgreSQL migration
      // const deleted = await DatabaseObject.findOneAndDelete({
      //   serviceId,
      //   objectName,
      //   objectType,
      // });
      const deleted = null; // Placeholder

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Object selection not found',
        });
      }

      res.json({
        success: true,
        message: `${objectName} removed from selections`,
        data: {
          objectName,
          objectType,
          removedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Error removing object selection:', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to remove object selection',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * DELETE /api/database-objects/:serviceId/selections/bulk-remove
 * Remove multiple objects of the same type
 */
router.delete(
  '/:serviceId/selections/bulk-remove',
  [
    param('serviceId').isMongoId().withMessage('Invalid service ID'),
    body('objectType')
      .isIn(['tables', 'views', 'procedures'])
      .withMessage('Valid object type is required'),
    body('objectNames').isArray().withMessage('Object names must be an array'),
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
      const { objectType, objectNames } = req.body;

      // Convert plural to singular for database query
      const singularType = objectType.slice(0, -1); // tables -> table, views -> view, procedures -> procedure

      // TODO: Replace with Prisma query for PostgreSQL migration
      // const result = await DatabaseObject.deleteMany({
      //   serviceId,
      //   objectType: singularType,
      //   objectName: { $in: objectNames },
      // });
      const result = { deletedCount: 0 }; // Placeholder

      res.json({
        success: true,
        message: `${result.deletedCount} ${objectType} removed from selections`,
        data: {
          objectType,
          removedCount: result.deletedCount,
          removedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Error bulk removing object selections:', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to bulk remove object selections',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * Helper function to save database object selections
 */
async function saveDatabaseObjectSelections(
  serviceId,
  selectedTables,
  selectedViews,
  selectedProcedures,
  userId
) {
  const selections = [];

  // Add tables
  for (const tableName of selectedTables) {
    selections.push({
      serviceId,
      objectName: tableName,
      objectType: 'table',
      selectionReason: 'user_selected',
      selectedBy: userId,
    });
  }

  // Add views
  for (const viewName of selectedViews) {
    selections.push({
      serviceId,
      objectName: viewName,
      objectType: 'view',
      selectionReason: 'user_selected',
      selectedBy: userId,
    });
  }

  // Add procedures
  for (const procedureName of selectedProcedures) {
    selections.push({
      serviceId,
      objectName: procedureName,
      objectType: 'procedure',
      selectionReason: 'user_selected',
      selectedBy: userId,
    });
  }

  // TODO: Replace with Prisma query for PostgreSQL migration
  // Bulk insert selections
  // if (selections.length > 0) {
  //   await DatabaseObject.insertMany(selections);
  // }
}

module.exports = router;
