// MongoDB models replaced with Prisma for PostgreSQL migration
// const DatabaseObject = require('../models/DatabaseObject');
// const SchemaIntelligence = require('../models/SchemaIntelligence');
// const mongoose = require('mongoose');

// SECURITY FIX: Use proper prismaService for tenant isolation
const prismaService = require('../services/prismaService');

/**
 * DatabaseObjectService
 * Manages object selection persistence, validation, and dependency resolution
 * Integrates with schema intelligence for object metadata
 */

class DatabaseObjectService {
  /**
   * Get all selections for a service with optional filtering
   * SECURITY: Now requires organizationId for proper tenant isolation
   */
  async getSelectionsByService(serviceId, organizationId, options = {}) {
    try {
      if (!organizationId) {
        throw new Error('Organization ID is required for tenant isolation');
      }

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

      // TODO: Replace with Prisma query for PostgreSQL migration using proper RLS
      // const selections = await prismaService.withTenantContext(organizationId, async (tx) => {
      //   return await tx.databaseObject.findMany({
      //     where: { ...query },
      //     include: {
      //       selectedBy: {
      //         select: { username: true, email: true }
      //       }
      //     },
      //     orderBy: { createdAt: 'desc' }
      //   });
      // });
      const selections = []; // Placeholder

      return selections;
    } catch (error) {
      throw new Error(`Failed to get selections: ${error.message}`);
    }
  }

  /**
   * Get selection statistics for a service
   * SECURITY: Now requires organizationId for proper tenant isolation
   */
  async getSelectionStats(serviceId, organizationId) {
    try {
      if (!organizationId) {
        throw new Error('Organization ID is required for tenant isolation');
      }

      // TODO: Replace with Prisma query for PostgreSQL migration using proper RLS
      // const stats = await prismaService.withTenantContext(organizationId, async (tx) => {
      //   return await tx.databaseObject.aggregate({
      //     where: { serviceId, isActive: true },
      //     _count: { id: true },
      //     // Add other aggregation logic
      //   });
      // });
      const stats = []; // Placeholder

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
   * SECURITY: Now requires organizationId for proper tenant isolation
   */
  async getBusinessEntityBreakdown(serviceId, organizationId) {
    try {
      if (!organizationId) {
        throw new Error('Organization ID is required for tenant isolation');
      }

      // TODO: Replace with Prisma query for PostgreSQL migration using proper RLS
      // const breakdown = await prismaService.withTenantContext(organizationId, async (tx) => {
      //   return await tx.databaseObject.groupBy({
      //     by: ['businessEntity'],
      //     where: { serviceId, isActive: true },
      //     _count: { id: true }
      //   });
      // });
      const breakdown = []; // Placeholder

      return breakdown;
    } catch (error) {
      throw new Error(`Failed to get business entity breakdown: ${error.message}`);
    }
  }

  /**
   * Create new object selections for a service
   * SECURITY: Now requires organizationId for proper tenant isolation
   */
  async createSelections(serviceId, organizationId, selectedObjects, userId, options = {}) {
    // TODO: Replace with Prisma transaction for PostgreSQL migration
    // const session = await mongoose.startSession();
    // session.startTransaction();

    try {
      if (!organizationId) {
        throw new Error('Organization ID is required for tenant isolation');
      }

      const { selectedTables = [], selectedViews = [], selectedProcedures = [] } = selectedObjects;
      const { selectionGroup = 'default', replaceExisting = false } = options;

      // Validate service exists
      await this.validateService(serviceId, organizationId);

      // TODO: Replace with Prisma query for PostgreSQL migration
      // Get schema intelligence for metadata enrichment
      const intelligence = null; // Placeholder

      // TODO: Replace with Prisma transaction for PostgreSQL migration using proper RLS
      // const result = await prismaService.withTenantContext(organizationId, async (tx) => {
      //   // Clear existing selections if requested
      //   if (replaceExisting) {
      //     await tx.databaseObject.deleteMany({
      //       where: { serviceId, selectionGroup }
      //     });
      //   }

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
          organizationId, // SECURITY: Include organizationId for RLS
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
          organizationId, // SECURITY: Include organizationId for RLS
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
          organizationId, // SECURITY: Include organizationId for RLS
          businessEntity: metadata?.businessEntity,
          businessImportance: metadata?.businessImportance,
          confidence: metadata?.confidence || 0.8,
        });
      }

      // TODO: Continue with Prisma transaction for PostgreSQL migration
      //   const createdSelections = await tx.databaseObject.createMany({
      //     data: objectsToCreate
      //   });

      //   // Add dependencies if requested
      //   if (options.includeDependencies) {
      //     const dependencies = await this.resolveDependencies(
      //       serviceId, objectsToCreate, intelligence
      //     );
      //     if (dependencies.length > 0) {
      //       await tx.databaseObject.createMany({ data: dependencies });
      //     }
      //   }

      //   return createdSelections;
      // });
      const createdSelections = []; // Placeholder

      // Add dependencies if requested
      if (options.includeDependencies) {
        const dependencies = await this.resolveDependencies(
          serviceId,
          objectsToCreate,
          intelligence
        );
        // Dependencies will be handled in the transaction above when implemented
      }

      return {
        success: true,
        created: createdSelections.length,
        selections: createdSelections,
      };
    } catch (error) {
      // await session.abortTransaction();
      throw new Error(`Failed to create selections: ${error.message}`);
    } finally {
      // await session.endSession();
    }
  }

  /**
   * Update existing selections
   * SECURITY: Now requires organizationId for proper tenant isolation
   */
  async updateSelections(serviceId, organizationId, updates, userId) {
    // TODO: Replace with Prisma transaction for PostgreSQL migration
    // const session = await mongoose.startSession();
    // session.startTransaction();

    try {
      if (!organizationId) {
        throw new Error('Organization ID is required for tenant isolation');
      }

      const results = [];

      // TODO: Replace with Prisma transaction for PostgreSQL migration using proper RLS
      // const results = await prismaService.withTenantContext(organizationId, async (tx) => {
      //   const updateResults = [];
      //   for (const update of updates) {
      //     const { objectName, objectType, ...updateFields } = update;
      //     const updated = await tx.databaseObject.updateMany({
      //       where: { serviceId, objectName, objectType, isActive: true },
      //       data: { ...updateFields, updatedAt: new Date() }
      //     });
      //     if (updated.count > 0) {
      //       updateResults.push(updated);
      //     }
      //   }
      //   return updateResults;
      // });

      for (const update of updates) {
        const { objectName, objectType, ...updateFields } = update;

        // TODO: Replace with Prisma query for PostgreSQL migration
        const updated = null; // Placeholder

        if (updated) {
          results.push(updated);
        }
      }

      return results;
    } catch (error) {
      // await session.abortTransaction();
      throw new Error(`Failed to update selections: ${error.message}`);
    } finally {
      // await session.endSession();
    }
  }

  /**
   * Remove specific object selections
   * SECURITY: Now requires organizationId for proper tenant isolation
   */
  async removeSelections(serviceId, organizationId, objectsToRemove, options = {}) {
    try {
      if (!organizationId) {
        throw new Error('Organization ID is required for tenant isolation');
      }

      const { softDelete = false } = options;
      const objectFilters = objectsToRemove.map(obj => ({
        objectName: obj.objectName,
        objectType: obj.objectType,
      }));

      // TODO: Replace with Prisma query for PostgreSQL migration using proper RLS
      // const result = await prismaService.withTenantContext(organizationId, async (tx) => {
      //   if (softDelete) {
      //     return await tx.databaseObject.updateMany({
      //       where: {
      //         serviceId,
      //         OR: objectFilters
      //       },
      //       data: { isActive: false, updatedAt: new Date() }
      //     });
      //   } else {
      //     return await tx.databaseObject.deleteMany({
      //       where: {
      //         serviceId,
      //         OR: objectFilters
      //       }
      //     });
      //   }
      // });
      let result = { deletedCount: 0, modifiedCount: 0 }; // Placeholder

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

      // TODO: Replace with Prisma query for PostgreSQL migration
      // const pending = await DatabaseObject.find(query)
      //   .populate('selectedBy', 'username')
      //   .sort({ priority: 1, createdAt: 1 })
      //   .limit(limit);
      const pending = []; // Placeholder

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

      // TODO: Replace with Prisma query for PostgreSQL migration
      // const pending = await DatabaseObject.find(query)
      //   .populate('selectedBy', 'username')
      //   .sort({ priority: 1, createdAt: 1 })
      //   .limit(limit);
      const pending = []; // Placeholder

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
      // TODO: Replace with Prisma query for PostgreSQL migration
      // const result = await DatabaseObject.updateMany(
      //   { _id: { $in: objectIds }, isActive: true },
      //   {
      //     schemaRetrieved: true,
      //     schemaRetrievedAt: new Date(),
      //     schemaVersion: version,
      //     updatedAt: new Date(),
      //   }
      // );
      const result = { modifiedCount: 0 }; // Placeholder

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
      // TODO: Replace with Prisma query for PostgreSQL migration
      // const result = await DatabaseObject.updateMany(
      //   { _id: { $in: objectIds }, isActive: true },
      //   {
      //     aiGenerated: true,
      //     aiGeneratedAt: new Date(),
      //     generationVersion: version,
      //     updatedAt: new Date(),
      //   }
      // );
      const result = { modifiedCount: 0 }; // Placeholder

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
   * Get object metadata from schema intelligence
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
   * SECURITY: Now requires organizationId for proper tenant isolation
   */
  async validateService(serviceId, organizationId) {
    if (!organizationId) {
      throw new Error('Organization ID is required for tenant isolation');
    }

    // TODO: Replace with Prisma query for PostgreSQL migration using proper RLS
    // const service = await prismaService.withTenantContext(organizationId, async (tx) => {
    //   return await tx.service.findFirst({
    //     where: { id: serviceId, isActive: true }
    //   });
    // });
    // if (!service) {
    //   throw new Error(`Service with ID ${serviceId} not found or not accessible`);
    // }
    // return service;
    return { id: serviceId, organizationId }; // Placeholder
  }

  /**
   * Get selection summary for export
   * SECURITY: Now requires organizationId for proper tenant isolation
   */
  async getSelectionSummary(serviceId, organizationId) {
    try {
      if (!organizationId) {
        throw new Error('Organization ID is required for tenant isolation');
      }

      const selections = await this.getSelectionsByService(serviceId, organizationId);
      const stats = await this.getSelectionStats(serviceId, organizationId);
      const entityBreakdown = await this.getBusinessEntityBreakdown(serviceId, organizationId);

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
   * Validate object selections against schema intelligence
   */
  async validateSelections(serviceId, selectedObjects) {
    try {
      // TODO: Replace with Prisma query for PostgreSQL migration
      // const intelligence = await getLatestSchemaIntelligence();
      // if (!intelligence) {
      //   throw new Error('No schema intelligence data available');
      // }
      const intelligence = null; // Placeholder
      if (!intelligence) {
        throw new Error('No schema intelligence data available');
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
            reason: 'Not found in schema intelligence',
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
            reason: 'Not found in schema intelligence',
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
            reason: 'Not found in schema intelligence',
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
