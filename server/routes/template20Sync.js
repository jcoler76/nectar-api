const express = require('express');
const router = express.Router();
const Template20SyncService = require('../services/Template20SyncService');
const Template20Intelligence = require('../models/Template20Intelligence');
const logger = require('../utils/logger');

/**
 * Template20 Sync Routes
 * MongoDB-focused schema synchronization endpoints
 */

/**
 * POST /api/template20-sync/run
 * Trigger MongoDB schema synchronization
 */
router.post('/run', async (req, res) => {
  try {
    const options = {
      skipViewAnalysis: req.body.skipViewAnalysis || false,
      skipRelationshipSync: req.body.skipRelationshipSync || false,
      updateExistingOnly: req.body.updateExistingOnly !== false, // default true
      triggerDownstream: req.body.triggerDownstream !== false, // default true
    };

    const syncService = new Template20SyncService();
    const result = await syncService.syncSchemaToMongoDB(options);

    res.json({
      success: true,
      message: 'MongoDB schema sync completed successfully',
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Template20 sync failed:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'MongoDB schema sync failed',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/template20-sync/status
 * Get current sync status and intelligence summary
 */
router.get('/status', async (req, res) => {
  try {
    const intelligence = await Template20Intelligence.getLatestIntelligence();

    if (!intelligence) {
      return res.json({
        success: true,
        status: 'no_intelligence',
        message: 'No Template20 intelligence found - run sync first',
        recommendation: 'POST /api/template20-sync/run',
      });
    }

    const summary = intelligence.getBusinessEntitySummary();
    const stats = {
      totalBusinessEntities: intelligence.businessEntities.length,
      totalTables: intelligence.tables.length,
      totalProcedures: intelligence.procedures.length,
      totalViews: intelligence.views.length,
      totalRelationships: intelligence.relationships.length,
      lastAnalysis: intelligence.lastFullAnalysis,
      analysisVersion: intelligence.analysisVersion,
    };

    const procedureStats = {
      highConfidence: intelligence.procedures.filter(p => p.overallConfidence >= 0.8).length,
      recentlyModified: intelligence.procedures.filter(p => p.daysSinceModified <= 90).length,
      byEntity: {},
    };

    // Group procedures by entity
    for (const entity of intelligence.businessEntities) {
      const entityProcs = intelligence.getProceduresForEntity(entity.entityType);
      procedureStats.byEntity[entity.entityType] = entityProcs.length;
    }

    res.json({
      success: true,
      status: 'intelligence_available',
      summary,
      stats,
      procedureStats,
      nextSteps: [
        { action: 'generate_prisma_schema', priority: 'high' },
        { action: 'generate_graphql_schema', priority: 'high' },
        { action: 'generate_ai_documentation', priority: 'medium' },
      ],
    });
  } catch (error) {
    logger.error('Status check failed:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get sync status',
      error: error.message,
    });
  }
});

/**
 * GET /api/template20-sync/entities
 * Get business entities with their associated procedures
 */
router.get('/entities', async (req, res) => {
  try {
    const intelligence = await Template20Intelligence.getLatestIntelligence();

    if (!intelligence) {
      return res.status(404).json({
        success: false,
        message: 'No Template20 intelligence found',
      });
    }

    const entities = intelligence.businessEntities.map(entity => {
      const procedures = intelligence.getProceduresForEntity(entity.entityType, 0.5).map(proc => ({
        name: proc.procedureName,
        confidence: proc.overallConfidence,
        type: proc.procedureType,
        daysSinceModified: proc.daysSinceModified,
        parameters: proc.parameters?.length || 0,
      }));

      const tables = intelligence.getTablesForEntity(entity.entityType).map(table => ({
        name: table.tableName,
        importance: table.businessImportance,
        columns: table.columns?.length || 0,
        relationships: intelligence.getRelationshipsForTable(table.tableName).length,
      }));

      return {
        entityType: entity.entityType,
        businessConcept: entity.businessConcept,
        primaryTable: entity.primaryTable,
        businessImportance: entity.businessImportance,
        confidence: entity.confidence,
        procedures: procedures,
        tables: tables,
        relationshipMap: entity.relationshipMap || [],
      };
    });

    res.json({
      success: true,
      entities,
      totalCount: entities.length,
      lastAnalysis: intelligence.lastFullAnalysis,
    });
  } catch (error) {
    logger.error('Entities query failed:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get entities',
      error: error.message,
    });
  }
});

/**
 * GET /api/template20-sync/procedures/:entity
 * Get procedures for specific business entity
 */
router.get('/procedures/:entity', async (req, res) => {
  try {
    const { entity } = req.params;
    const { minConfidence = 0.5 } = req.query;

    const intelligence = await Template20Intelligence.getLatestIntelligence();

    if (!intelligence) {
      return res.status(404).json({
        success: false,
        message: 'No Template20 intelligence found',
      });
    }

    const procedures = intelligence.getProceduresForEntity(entity, parseFloat(minConfidence));

    const formattedProcedures = procedures.map(proc => ({
      name: proc.procedureName,
      businessEntity: proc.businessEntity,
      procedureType: proc.procedureType,
      confidence: proc.overallConfidence,
      recencyScore: proc.recencyScore,
      daysSinceModified: proc.daysSinceModified,
      daysSinceCreated: proc.daysSinceCreated,
      parameters: proc.parameters || [],
      estimatedUsage: proc.estimatedUsageFrequency,
      isActive: proc.isActive,
      createDate: proc.createDate,
      modifyDate: proc.modifyDate,
    }));

    res.json({
      success: true,
      entity,
      procedures: formattedProcedures,
      totalCount: formattedProcedures.length,
      filters: {
        minConfidence: parseFloat(minConfidence),
        activeOnly: true,
      },
    });
  } catch (error) {
    logger.error('Procedures query failed:', { error: error.message });
    res.status(500).json({
      success: false,
      message: `Failed to get procedures for entity: ${req.params.entity}`,
      error: error.message,
    });
  }
});

/**
 * GET /api/template20-sync/relationships
 * Get relationship intelligence
 */
router.get('/relationships', async (req, res) => {
  try {
    const { table, minConfidence = 0.5 } = req.query;

    const intelligence = await Template20Intelligence.getLatestIntelligence();

    if (!intelligence) {
      return res.status(404).json({
        success: false,
        message: 'No Template20 intelligence found',
      });
    }

    let relationships = intelligence.relationships.filter(
      rel => rel.confidence >= parseFloat(minConfidence)
    );

    // Filter by specific table if requested
    if (table) {
      relationships = relationships.filter(rel => rel.fromTable === table || rel.toTable === table);
    }

    const formattedRelationships = relationships.map(rel => ({
      fromTable: rel.fromTable,
      toTable: rel.toTable,
      joinColumn: rel.joinColumn,
      relationshipType: rel.relationshipType,
      businessRule: rel.businessRule,
      businessImportance: rel.businessImportance,
      confidence: rel.confidence,
      discoveredFrom: rel.discoveredFrom,
      sourceView: rel.sourceView,
      lastVerified: rel.lastVerified,
    }));

    // Group by relationship importance
    const byImportance = {
      critical: formattedRelationships.filter(r => r.businessImportance === 'critical'),
      important: formattedRelationships.filter(r => r.businessImportance === 'important'),
      reference: formattedRelationships.filter(r => r.businessImportance === 'reference'),
    };

    res.json({
      success: true,
      relationships: formattedRelationships,
      byImportance,
      totalCount: formattedRelationships.length,
      filters: {
        table: table || 'all',
        minConfidence: parseFloat(minConfidence),
      },
    });
  } catch (error) {
    logger.error('Relationships query failed:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get relationships',
      error: error.message,
    });
  }
});

/**
 * POST /api/template20-sync/force-refresh
 * Force refresh intelligence from existing data (no database connection)
 */
router.post('/force-refresh', async (req, res) => {
  try {
    const syncService = new Template20SyncService();

    // Force a full refresh without database connections
    const result = await syncService.syncSchemaToMongoDB({
      skipViewAnalysis: false,
      skipRelationshipSync: false,
      updateExistingOnly: false,
      triggerDownstream: true,
    });

    res.json({
      success: true,
      message: 'Force refresh completed successfully',
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Force refresh failed:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Force refresh failed',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
