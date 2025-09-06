const DatabaseObject = require('../models/DatabaseObject');
const Template20Intelligence = require('../models/Template20Intelligence');
const SchemaIntelligence = require('../models/SchemaIntelligence');
const mongoose = require('mongoose');

/**
 * DatabaseObjectService
 * Manages object selection persistence, validation, and dependency resolution
 * Integrates with Template20Intelligence for object metadata
 */

class DatabaseObjectService {
  /**
   * Get all selections for a service with optional filtering
   */
  async getSelectionsByService(serviceId, options = {}) {
    try {
      const query = { serviceId, isActive: true };

      if (options.objectType) {
        query.objectType = options.objectType;
      }

      if (options.businessEntity) {
        query.businessEntity = options.businessEntity;
      }

      if (options.selectionGroup) {
        query.selectionGroup = options.selectionGroup;
      }

      const selections = await DatabaseObject.find(query)
        .populate('selectedBy', 'username email')
        .sort({ createdAt: -1 });

      return selections;
    } catch (error) {
      throw new Error(`Failed to get selections: ${error.message}`);
    }
  }

  /**
   * Get selection statistics for a service
   */
  async getSelectionStats(serviceId) {
    try {
      const stats = await DatabaseObject.aggregate([
        { $match: { serviceId: mongoose.Types.ObjectId(serviceId), isActive: true } },
        {
          $group: {
            _id: '$objectType',
            count: { $sum: 1 },
            schemaRetrieved: { $sum: { $cond: ['$schemaRetrieved', 1, 0] } },
            aiGenerated: { $sum: { $cond: ['$aiGenerated', 1, 0] } },
            lastModified: { $max: '$updatedAt' },
          },
        },
        {
          $group: {
            _id: null,
            typeStats: {
              $push: {
                type: '$_id',
                count: '$count',
                schemaRetrieved: '$schemaRetrieved',
                aiGenerated: '$aiGenerated',
              },
            },
            totalObjects: { $sum: '$count' },
            totalSchemaRetrieved: { $sum: '$schemaRetrieved' },
            totalAIGenerated: { $sum: '$aiGenerated' },
            lastModified: { $max: '$lastModified' },
          },
        },
      ]);

      if (stats.length === 0) {
        return {
          totalObjects: 0,
          totalSchemaRetrieved: 0,
          totalAIGenerated: 0,
          typeStats: [],
          lastModified: null,
        };
      }

      return stats[0];
    } catch (error) {
      throw new Error(`Failed to get selection stats: ${error.message}`);
    }
  }

  /**
   * Get business entity breakdown for selections
   */
  async getBusinessEntityBreakdown(serviceId) {
    try {
      const breakdown = await DatabaseObject.aggregate([
        { $match: { serviceId: mongoose.Types.ObjectId(serviceId), isActive: true } },
        {
          $group: {
            _id: '$businessEntity',
            count: { $sum: 1 },
            types: { $addToSet: '$objectType' },
            schemaRetrieved: { $sum: { $cond: ['$schemaRetrieved', 1, 0] } },
            aiGenerated: { $sum: { $cond: ['$aiGenerated', 1, 0] } },
          },
        },
        { $sort: { count: -1 } },
      ]);

      return breakdown;
    } catch (error) {
      throw new Error(`Failed to get business entity breakdown: ${error.message}`);
    }
  }

  /**
   * Create new object selections for a service
   */
  async createSelections(serviceId, selectedObjects, userId, options = {}) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { selectedTables = [], selectedViews = [], selectedProcedures = [] } = selectedObjects;
      const { selectionGroup = 'default', replaceExisting = false } = options;

      // Validate service exists
      await this.validateService(serviceId);

      // Get Template20Intelligence for metadata enrichment
      const intelligence = await Template20Intelligence.getLatestIntelligence();

      // Clear existing selections if requested
      if (replaceExisting) {
        await DatabaseObject.deleteMany({ serviceId, selectionGroup }, { session });
      }

      const objectsToCreate = [];

      // Process tables
      for (const tableName of selectedTables) {
        const metadata = this.getObjectMetadata(intelligence, 'tables', tableName);
        objectsToCreate.push({
          serviceId,
          objectName: tableName,
          objectType: 'table',
          selectionReason: 'user_selected',
          selectedBy: userId,
          selectionGroup,
          businessEntity: metadata?.businessEntity,
          businessImportance: metadata?.businessImportance,
          confidence: metadata?.confidence || 0.8,
        });
      }

      // Process views
      for (const viewName of selectedViews) {
        const metadata = this.getObjectMetadata(intelligence, 'views', viewName);
        objectsToCreate.push({
          serviceId,
          objectName: viewName,
          objectType: 'view',
          selectionReason: 'user_selected',
          selectedBy: userId,
          selectionGroup,
          businessEntity: metadata?.businessEntity,
          businessImportance: metadata?.businessImportance,
          confidence: metadata?.confidence || 0.8,
        });
      }

      // Process procedures
      for (const procedureName of selectedProcedures) {
        const metadata = this.getObjectMetadata(intelligence, 'procedures', procedureName);
        objectsToCreate.push({
          serviceId,
          objectName: procedureName,
          objectType: 'procedure',
          selectionReason: 'user_selected',
          selectedBy: userId,
          selectionGroup,
          businessEntity: metadata?.businessEntity,
          businessImportance: metadata?.businessImportance,
          confidence: metadata?.confidence || 0.8,
        });
      }

      // Create all selections
      const createdSelections = await DatabaseObject.insertMany(objectsToCreate, { session });

      // Add dependencies if requested
      if (options.includeDependencies) {
        const dependencies = await this.resolveDependencies(
          serviceId,
          objectsToCreate,
          intelligence
        );
        if (dependencies.length > 0) {
          await DatabaseObject.insertMany(dependencies, { session });
        }
      }

      await session.commitTransaction();

      return {
        success: true,
        created: createdSelections.length,
        selections: createdSelections,
      };
    } catch (error) {
      await session.abortTransaction();
      throw new Error(`Failed to create selections: ${error.message}`);
    } finally {
      await session.endSession();
    }
  }

  /**
   * Update existing selections
   */
  async updateSelections(serviceId, updates, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const results = [];

      for (const update of updates) {
        const { objectName, objectType, ...updateFields } = update;

        const updated = await DatabaseObject.findOneAndUpdate(
          { serviceId, objectName, objectType, isActive: true },
          { ...updateFields, updatedAt: new Date() },
          { new: true, session }
        );

        if (updated) {
          results.push(updated);
        }
      }

      await session.commitTransaction();
      return results;
    } catch (error) {
      await session.abortTransaction();
      throw new Error(`Failed to update selections: ${error.message}`);
    } finally {
      await session.endSession();
    }
  }

  /**
   * Remove specific object selections
   */
  async removeSelections(serviceId, objectsToRemove, options = {}) {
    try {
      const { softDelete = false } = options;
      const query = {
        serviceId,
        $or: objectsToRemove.map(obj => ({
          objectName: obj.objectName,
          objectType: obj.objectType,
        })),
      };

      let result;
      if (softDelete) {
        result = await DatabaseObject.updateMany(query, { isActive: false, updatedAt: new Date() });
      } else {
        result = await DatabaseObject.deleteMany(query);
      }

      return {
        success: true,
        removed: result.deletedCount || result.modifiedCount,
        softDelete,
      };
    } catch (error) {
      throw new Error(`Failed to remove selections: ${error.message}`);
    }
  }

  /**
   * Get objects pending schema retrieval
   */
  async getPendingSchemaRetrieval(serviceId, options = {}) {
    try {
      const { limit = 50, objectType } = options;
      const query = {
        serviceId,
        isActive: true,
        schemaRetrieved: false,
      };

      if (objectType) {
        query.objectType = objectType;
      }

      const pending = await DatabaseObject.find(query)
        .populate('selectedBy', 'username')
        .sort({ priority: 1, createdAt: 1 })
        .limit(limit);

      return pending;
    } catch (error) {
      throw new Error(`Failed to get pending schema retrieval: ${error.message}`);
    }
  }

  /**
   * Get objects pending AI generation
   */
  async getPendingAIGeneration(serviceId, options = {}) {
    try {
      const { limit = 50, objectType } = options;
      const query = {
        serviceId,
        isActive: true,
        schemaRetrieved: true,
        aiGenerated: false,
      };

      if (objectType) {
        query.objectType = objectType;
      }

      const pending = await DatabaseObject.find(query)
        .populate('selectedBy', 'username')
        .sort({ priority: 1, createdAt: 1 })
        .limit(limit);

      return pending;
    } catch (error) {
      throw new Error(`Failed to get pending AI generation: ${error.message}`);
    }
  }

  /**
   * Mark objects as having schema retrieved
   */
  async markSchemaRetrieved(objectIds, version = 'v1.0') {
    try {
      const result = await DatabaseObject.updateMany(
        { _id: { $in: objectIds }, isActive: true },
        {
          schemaRetrieved: true,
          schemaRetrievedAt: new Date(),
          schemaVersion: version,
          updatedAt: new Date(),
        }
      );

      return {
        success: true,
        updated: result.modifiedCount,
      };
    } catch (error) {
      throw new Error(`Failed to mark schema retrieved: ${error.message}`);
    }
  }

  /**
   * Mark objects as having AI generated artifacts
   */
  async markAIGenerated(objectIds, version = 'v1.0') {
    try {
      const result = await DatabaseObject.updateMany(
        { _id: { $in: objectIds }, isActive: true },
        {
          aiGenerated: true,
          aiGeneratedAt: new Date(),
          generationVersion: version,
          updatedAt: new Date(),
        }
      );

      return {
        success: true,
        updated: result.modifiedCount,
      };
    } catch (error) {
      throw new Error(`Failed to mark AI generated: ${error.message}`);
    }
  }

  /**
   * Resolve dependencies for selected objects
   */
  async resolveDependencies(serviceId, selectedObjects, intelligence) {
    try {
      const dependencies = [];
      const objectNames = selectedObjects.map(obj => obj.objectName);

      // For views, find dependent tables
      for (const obj of selectedObjects.filter(o => o.objectType === 'view')) {
        const viewInfo = intelligence?.views?.find(v => v.viewName === obj.objectName);
        if (viewInfo?.tablesUsed) {
          for (const tableName of viewInfo.tablesUsed) {
            if (!objectNames.includes(tableName)) {
              dependencies.push({
                serviceId,
                objectName: tableName,
                objectType: 'table',
                selectionReason: 'dependency',
                selectedBy: obj.selectedBy,
                selectionGroup: obj.selectionGroup,
                businessEntity: 'reference',
              });
              objectNames.push(tableName); // Prevent duplicates
            }
          }
        }
      }

      // For procedures, find referenced objects
      for (const obj of selectedObjects.filter(o => o.objectType === 'procedure')) {
        // This would require parsing the procedure definition
        // For now, we'll skip this but it could be enhanced
      }

      return dependencies;
    } catch (error) {
      console.error('Error resolving dependencies:', error);
      return [];
    }
  }

  /**
   * Get object metadata from Template20Intelligence
   */
  getObjectMetadata(intelligence, objectType, objectName) {
    if (!intelligence) return null;

    const objects = intelligence[objectType] || [];
    const nameField =
      objectType === 'tables' ? 'tableName' : objectType === 'views' ? 'viewName' : 'procedureName';

    return objects.find(obj => obj[nameField] === objectName);
  }

  /**
   * Validate that a service exists
   */
  async validateService(serviceId) {
    const Service = require('../models/Service');
    const service = await Service.findById(serviceId);
    if (!service) {
      throw new Error(`Service with ID ${serviceId} not found`);
    }
    return service;
  }

  /**
   * Get selection summary for export
   */
  async getSelectionSummary(serviceId) {
    try {
      const selections = await this.getSelectionsByService(serviceId);
      const stats = await this.getSelectionStats(serviceId);
      const entityBreakdown = await this.getBusinessEntityBreakdown(serviceId);

      return {
        serviceId,
        totalObjects: stats.totalObjects,
        schemaRetrievalProgress: stats.totalSchemaRetrieved,
        aiGenerationProgress: stats.totalAIGenerated,
        selections: selections.map(sel => ({
          objectName: sel.objectName,
          objectType: sel.objectType,
          businessEntity: sel.businessEntity,
          selectionReason: sel.selectionReason,
          schemaRetrieved: sel.schemaRetrieved,
          aiGenerated: sel.aiGenerated,
          selectedAt: sel.createdAt,
          selectedBy: sel.selectedBy?.username,
        })),
        entityBreakdown,
        generatedAt: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to get selection summary: ${error.message}`);
    }
  }

  /**
   * Validate object selections against Template20Intelligence
   */
  async validateSelections(serviceId, selectedObjects) {
    try {
      const intelligence = await Template20Intelligence.getLatestIntelligence();
      if (!intelligence) {
        throw new Error('No Template20Intelligence data available');
      }

      const validation = {
        valid: [],
        invalid: [],
        warnings: [],
      };

      const { selectedTables = [], selectedViews = [], selectedProcedures = [] } = selectedObjects;

      // Validate tables
      for (const tableName of selectedTables) {
        const metadata = this.getObjectMetadata(intelligence, 'tables', tableName);
        if (metadata) {
          validation.valid.push({ type: 'table', name: tableName, metadata });
          if (metadata.confidence < 0.7) {
            validation.warnings.push(
              `Table ${tableName} has low confidence score: ${metadata.confidence}`
            );
          }
        } else {
          validation.invalid.push({
            type: 'table',
            name: tableName,
            reason: 'Not found in Template20Intelligence',
          });
        }
      }

      // Validate views
      for (const viewName of selectedViews) {
        const metadata = this.getObjectMetadata(intelligence, 'views', viewName);
        if (metadata) {
          validation.valid.push({ type: 'view', name: viewName, metadata });
        } else {
          validation.invalid.push({
            type: 'view',
            name: viewName,
            reason: 'Not found in Template20Intelligence',
          });
        }
      }

      // Validate procedures
      for (const procedureName of selectedProcedures) {
        const metadata = this.getObjectMetadata(intelligence, 'procedures', procedureName);
        if (metadata) {
          validation.valid.push({ type: 'procedure', name: procedureName, metadata });
          if (metadata.overallConfidence < 0.7) {
            validation.warnings.push(
              `Procedure ${procedureName} has low confidence score: ${metadata.overallConfidence}`
            );
          }
        } else {
          validation.invalid.push({
            type: 'procedure',
            name: procedureName,
            reason: 'Not found in Template20Intelligence',
          });
        }
      }

      return validation;
    } catch (error) {
      throw new Error(`Failed to validate selections: ${error.message}`);
    }
  }
}

module.exports = new DatabaseObjectService();
