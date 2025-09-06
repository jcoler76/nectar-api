const express = require('express');
const router = express.Router();
const Template20Intelligence = require('../models/Template20Intelligence');
const Template20AnalysisService = require('../services/Template20AnalysisService');
const { logger } = require('../middleware/logger');

/**
 * Developer Intelligence API
 * Provides template20 database intelligence for building new features
 */

/**
 * GET /api/developer-intelligence/overview
 * Get high-level overview of template20 database for developers
 */
router.get('/overview', async (req, res) => {
  try {
    const intelligence = await Template20Intelligence.getLatestIntelligence();

    if (!intelligence) {
      return res.status(404).json({
        success: false,
        message: 'No template20 intelligence found. Run analysis first.',
      });
    }

    const overview = {
      summary: intelligence.getBusinessEntitySummary(),
      statistics: {
        totalTables: intelligence.schemaStats.totalTables,
        totalProcedures: intelligence.schemaStats.totalProcedures,
        totalViews: intelligence.schemaStats.totalViews,
        totalRelationships: intelligence.schemaStats.totalRelationships,
        businessEntities: intelligence.schemaStats.businessEntitiesDetected,
      },
      lastAnalyzed: intelligence.lastFullAnalysis,
      analysisVersion: intelligence.analysisVersion,
    };

    res.json({
      success: true,
      data: overview,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get developer overview',
      error: error.message,
    });
  }
});

/**
 * GET /api/developer-intelligence/business-entities
 * Get all business entities with their associated tables and procedures
 */
router.get('/business-entities', async (req, res) => {
  try {
    const intelligence = await Template20Intelligence.getLatestIntelligence();

    if (!intelligence) {
      return res.status(404).json({
        success: false,
        message: 'No intelligence data available',
      });
    }

    const entitiesWithDetails = intelligence.businessEntities.map(entity => ({
      entityType: entity.entityType,
      businessConcept: entity.businessConcept,
      primaryTable: entity.primaryTable,

      // Get related tables
      relatedTables: intelligence.getTablesForEntity(entity.entityType).map(table => ({
        tableName: table.tableName,
        businessImportance: table.businessImportance,
        columnCount: table.columns.length,
        estimatedRows: table.estimatedRowCount,
        primaryKeys: table.primaryKeys,
        foreignKeys: table.foreignKeys.map(fk => ({
          column: fk.columnName,
          references: `${fk.referencedTable}.${fk.referencedColumn}`,
        })),
      })),

      // Get related procedures
      procedures: intelligence.getProceduresForEntity(entity.entityType, 0.6).map(proc => ({
        procedureName: proc.procedureName,
        procedureType: proc.procedureType,
        confidence: proc.overallConfidence,
        isActive: proc.isActive,
        daysSinceModified: proc.daysSinceModified,
        parameters: proc.parameters.map(p => ({
          name: p.parameterName,
          type: p.dataType,
          isOutput: p.isOutput,
        })),
      })),

      // Get related views
      views: intelligence.views
        .filter(view => view.businessEntity === entity.entityType)
        .map(view => ({
          viewName: view.viewName,
          businessModule: view.businessModule,
          complexity: view.complexityScore,
          tablesUsed: view.tablesUsed,
        })),

      businessImportance: entity.businessImportance,
      confidence: entity.confidence,
    }));

    res.json({
      success: true,
      data: entitiesWithDetails,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get business entities',
      error: error.message,
    });
  }
});

/**
 * GET /api/developer-intelligence/entity/:entityType
 * Get detailed information about a specific business entity
 */
router.get('/entity/:entityType', async (req, res) => {
  try {
    const { entityType } = req.params;
    const intelligence = await Template20Intelligence.getLatestIntelligence();

    if (!intelligence) {
      return res.status(404).json({
        success: false,
        message: 'No intelligence data available',
      });
    }

    const entity = intelligence.businessEntities.find(e => e.entityType === entityType);
    if (!entity) {
      return res.status(404).json({
        success: false,
        message: `Business entity '${entityType}' not found`,
      });
    }

    const tables = intelligence.getTablesForEntity(entityType);
    const procedures = intelligence.getProceduresForEntity(entityType, 0.5);
    const relationships = intelligence.relationships.filter(rel =>
      tables.some(t => t.tableName === rel.fromTable || t.tableName === rel.toTable)
    );

    const detailedEntity = {
      entityInfo: {
        entityType: entity.entityType,
        businessConcept: entity.businessConcept,
        primaryTable: entity.primaryTable,
        businessImportance: entity.businessImportance,
        confidence: entity.confidence,
      },

      schema: {
        tables: tables.map(table => ({
          tableName: table.tableName,
          businessImportance: table.businessImportance,
          columns: table.columns.map(col => ({
            columnName: col.columnName,
            dataType: col.dataType,
            maxLength: col.maxLength,
            isNullable: col.isNullable,
            isPrimaryKey: col.isPrimaryKey,
            isForeignKey: col.isForeignKey,
            businessRole: col.businessRole,
            defaultValue: col.defaultValue,
          })),
          primaryKeys: table.primaryKeys,
          foreignKeys: table.foreignKeys,
          estimatedRowCount: table.estimatedRowCount,
        })),
      },

      procedures: {
        active: procedures
          .filter(p => p.isActive && p.overallConfidence > 0.7)
          .map(proc => ({
            procedureName: proc.procedureName,
            procedureType: proc.procedureType,
            confidence: proc.overallConfidence,
            recencyScore: proc.recencyScore,
            daysSinceModified: proc.daysSinceModified,
            parameters: proc.parameters,
          })),

        all: procedures.map(proc => ({
          procedureName: proc.procedureName,
          procedureType: proc.procedureType,
          confidence: proc.overallConfidence,
          isActive: proc.isActive,
        })),
      },

      relationships: relationships.map(rel => ({
        fromTable: rel.fromTable,
        toTable: rel.toTable,
        relationshipType: rel.relationshipType,
        joinColumn: rel.joinColumn,
        businessRule: rel.businessRule,
        confidence: rel.confidence,
        discoveredFrom: rel.discoveredFrom,
      })),

      developmentGuidance: this.generateDevelopmentGuidance(entity, tables, procedures),
    };

    res.json({
      success: true,
      data: detailedEntity,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to get entity details for ${req.params.entityType}`,
      error: error.message,
    });
  }
});

/**
 * GET /api/developer-intelligence/table/:tableName
 * Get detailed information about a specific table
 */
router.get('/table/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const intelligence = await Template20Intelligence.getLatestIntelligence();

    if (!intelligence) {
      return res.status(404).json({
        success: false,
        message: 'No intelligence data available',
      });
    }

    const table = intelligence.tables.find(t => t.tableName === tableName);
    if (!table) {
      return res.status(404).json({
        success: false,
        message: `Table '${tableName}' not found`,
      });
    }

    const relationships = intelligence.getRelationshipsForTable(tableName);
    const relatedProcedures = intelligence.procedures.filter(
      proc =>
        proc.procedureName.toLowerCase().includes(tableName.toLowerCase()) ||
        proc.procedureName.toLowerCase().includes(tableName.replace('gs', '').toLowerCase())
    );

    const tableDetails = {
      tableInfo: {
        tableName: table.tableName,
        schemaName: table.schemaName,
        businessEntity: table.businessEntity,
        businessImportance: table.businessImportance,
        estimatedRowCount: table.estimatedRowCount,
        confidence: table.confidence,
      },

      schema: {
        columns: table.columns.map(col => ({
          columnName: col.columnName,
          dataType: col.dataType,
          maxLength: col.maxLength,
          isNullable: col.isNullable,
          isPrimaryKey: col.isPrimaryKey,
          isForeignKey: col.isForeignKey,
          businessRole: col.businessRole,
          defaultValue: col.defaultValue,
          ordinalPosition: col.ordinalPosition,
        })),
        primaryKeys: table.primaryKeys,
        foreignKeys: table.foreignKeys.map(fk => ({
          columnName: fk.columnName,
          referencedTable: fk.referencedTable,
          referencedColumn: fk.referencedColumn,
          confidence: fk.confidence,
        })),
      },

      relationships: {
        outbound: relationships.filter(rel => rel.fromTable === tableName),
        inbound: relationships.filter(rel => rel.toTable === tableName),
      },

      procedures: relatedProcedures
        .filter(proc => proc.overallConfidence > 0.6)
        .map(proc => ({
          procedureName: proc.procedureName,
          procedureType: proc.procedureType,
          confidence: proc.overallConfidence,
          isActive: proc.isActive,
          parameters: proc.parameters.filter(
            p => p.parameterName && p.parameterName !== '@RETURN_VALUE'
          ),
        })),

      developmentTips: this.generateTableDevelopmentTips(table, relationships),
    };

    res.json({
      success: true,
      data: tableDetails,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to get table details for ${req.params.tableName}`,
      error: error.message,
    });
  }
});

/**
 * GET /api/developer-intelligence/procedure/:procedureName
 * Get detailed information about a specific procedure
 */
router.get('/procedure/:procedureName', async (req, res) => {
  try {
    const { procedureName } = req.params;
    const intelligence = await Template20Intelligence.getLatestIntelligence();

    if (!intelligence) {
      return res.status(404).json({
        success: false,
        message: 'No intelligence data available',
      });
    }

    const procedure = intelligence.procedures.find(p => p.procedureName === procedureName);
    if (!procedure) {
      return res.status(404).json({
        success: false,
        message: `Procedure '${procedureName}' not found`,
      });
    }

    const procedureDetails = {
      procedureInfo: {
        procedureName: procedure.procedureName,
        schemaName: procedure.schemaName,
        businessEntity: procedure.businessEntity,
        procedureType: procedure.procedureType,
        isActive: procedure.isActive,
        createDate: procedure.createDate,
        modifyDate: procedure.modifyDate,
        daysSinceModified: procedure.daysSinceModified,
      },

      confidence: {
        overall: procedure.overallConfidence,
        recency: procedure.recencyScore,
        pattern: procedure.patternScore,
        maintenance: procedure.maintenanceScore,
      },

      parameters: procedure.parameters.map(param => ({
        parameterName: param.parameterName,
        dataType: param.dataType,
        isOutput: param.isOutput,
        hasDefaultValue: param.hasDefaultValue,
        defaultValue: param.defaultValue,
        maxLength: param.maxLength,
      })),

      usage: {
        estimatedFrequency: procedure.estimatedUsageFrequency,
        lastAccessed: procedure.lastAccessed,
        businessContext: this.inferProcedureBusinessContext(procedure),
      },

      developmentGuidance: this.generateProcedureDevelopmentGuidance(procedure),
    };

    res.json({
      success: true,
      data: procedureDetails,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to get procedure details for ${req.params.procedureName}`,
      error: error.message,
    });
  }
});

/**
 * GET /api/developer-intelligence/relationships
 * Get all table relationships for understanding data flow
 */
router.get('/relationships', async (req, res) => {
  try {
    const { entityType, confidence } = req.query;
    const minConfidence = parseFloat(confidence) || 0.7;

    const intelligence = await Template20Intelligence.getLatestIntelligence();

    if (!intelligence) {
      return res.status(404).json({
        success: false,
        message: 'No intelligence data available',
      });
    }

    let relationships = intelligence.relationships.filter(rel => rel.confidence >= minConfidence);

    // Filter by entity type if specified
    if (entityType) {
      const entityTables = intelligence.getTablesForEntity(entityType).map(t => t.tableName);
      relationships = relationships.filter(
        rel => entityTables.includes(rel.fromTable) || entityTables.includes(rel.toTable)
      );
    }

    const relationshipData = {
      summary: {
        totalRelationships: relationships.length,
        byConfidence: {
          high: relationships.filter(r => r.confidence >= 0.9).length,
          medium: relationships.filter(r => r.confidence >= 0.7 && r.confidence < 0.9).length,
          low: relationships.filter(r => r.confidence < 0.7).length,
        },
        byDiscoveryMethod: {
          foreignKey: relationships.filter(r => r.discoveredFrom === 'foreign_key').length,
          viewAnalysis: relationships.filter(r => r.discoveredFrom === 'view_join').length,
          businessConfig: relationships.filter(r => r.discoveredFrom === 'business_config').length,
        },
      },

      relationships: relationships.map(rel => ({
        fromTable: rel.fromTable,
        toTable: rel.toTable,
        relationshipType: rel.relationshipType,
        joinColumn: rel.joinColumn,
        businessRule: rel.businessRule,
        businessImportance: rel.businessImportance,
        confidence: rel.confidence,
        discoveredFrom: rel.discoveredFrom,
        sourceView: rel.sourceView,
      })),
    };

    res.json({
      success: true,
      data: relationshipData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get relationships',
      error: error.message,
    });
  }
});

/**
 * POST /api/developer-intelligence/analyze
 * Trigger fresh analysis of template20 database
 */
router.post('/analyze', async (req, res) => {
  try {
    const analysisService = new Template20AnalysisService();

    logger.info('Starting fresh template20 analysis...');
    const result = await analysisService.performComprehensiveAnalysis();

    res.json({
      success: true,
      message: 'Analysis completed successfully',
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Analysis failed',
      error: error.message,
    });
  }
});

/**
 * GET /api/developer-intelligence/patterns
 * Get architectural and naming patterns for developers
 */
router.get('/patterns', async (req, res) => {
  try {
    const intelligence = await Template20Intelligence.getLatestIntelligence();

    if (!intelligence) {
      return res.status(404).json({
        success: false,
        message: 'No intelligence data available',
      });
    }

    const patterns = {
      naming: {
        tables: {
          pattern: 'gs{EntityName}',
          examples: intelligence.tables.slice(0, 5).map(t => t.tableName),
          description: 'All business tables use gs prefix followed by entity name',
        },
        procedures: {
          patterns: [
            {
              pattern: 'usp{Entity}Get',
              description: 'Retrieve single record',
              examples: ['uspContactGet', 'uspContractGet'],
            },
            {
              pattern: 'usp{Entity}Save',
              description: 'Insert or update record',
              examples: ['uspContactSave', 'uspInvoiceSave'],
            },
            {
              pattern: 'usp{Entity}ByCriteriaGet',
              description: 'Search with criteria',
              examples: ['uspContactByCriteriaGet'],
            },
            {
              pattern: 'uspReport{Entity}{Type}Get',
              description: 'Reporting procedures',
              examples: ['uspReportSalesByCriteriaGet'],
            },
          ],
        },
        columns: {
          primaryKeys: { pattern: 'gs{TableName}ID', description: 'Primary key naming convention' },
          foreignKeys: {
            pattern: 'gs{ReferencedTable}ID',
            description: 'Foreign key naming convention',
          },
          audit: {
            pattern: 'CreatedDate, CreatedBy, ModifiedDate, ModifiedBy',
            description: 'Standard audit fields',
          },
        },
      },

      relationships: {
        foreignKeys: intelligence.relationships.filter(r => r.discoveredFrom === 'foreign_key')
          .length,
        businessRules: intelligence.relationships
          .map(r => ({
            rule: r.businessRule,
            confidence: r.confidence,
          }))
          .slice(0, 10),
      },

      businessEntities: intelligence.businessEntities.map(entity => ({
        entityType: entity.entityType,
        primaryTable: entity.primaryTable,
        tableCount: intelligence.getTablesForEntity(entity.entityType).length,
        procedureCount: intelligence.getProceduresForEntity(entity.entityType).length,
        businessImportance: entity.businessImportance,
      })),
    };

    res.json({
      success: true,
      data: patterns,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get patterns',
      error: error.message,
    });
  }
});

// Helper methods for generating development guidance
function generateDevelopmentGuidance(entity, tables, procedures) {
  return {
    newFeatureTips: [
      `For ${entity.entityType} features, start with ${entity.primaryTable} table`,
      `Use existing procedures: ${procedures
        .slice(0, 3)
        .map(p => p.procedureName)
        .join(', ')}`,
      `Follow naming pattern: usp${entity.entityType}YourFeatureAction`,
    ],
    commonPatterns: [
      `Primary table: ${entity.primaryTable}`,
      `Related tables: ${tables.length}`,
      `Active procedures: ${procedures.filter(p => p.isActive).length}`,
    ],
    bestPractices: [
      'Follow gs{Entity} naming for new tables',
      'Include standard audit fields (CreatedDate, CreatedBy, etc.)',
      'Use stored procedures for all data access',
    ],
  };
}

function generateTableDevelopmentTips(table, relationships) {
  return {
    usage: `${table.tableName} is a ${table.businessImportance} table for ${table.businessEntity}`,
    relationships: `Has ${relationships.length} relationships with other tables`,
    naming: `Follows gs{Entity} pattern - new related tables should use similar naming`,
    procedures: `Look for usp${table.tableName.replace('gs', '')}* procedures for data access patterns`,
  };
}

function generateProcedureDevelopmentGuidance(procedure) {
  const guidance = {
    usage: `${procedure.procedureType} procedure for ${procedure.businessEntity}`,
    confidence: `Overall confidence: ${Math.round(procedure.overallConfidence * 100)}%`,
    recency:
      procedure.daysSinceModified < 90 ? 'Recently maintained' : 'Consider reviewing for updates',
    pattern: `Follows standard ${procedure.procedureType} pattern`,
  };

  if (procedure.procedureType === 'get') {
    guidance.developmentTip = 'Use as reference for building new Get procedures';
  } else if (procedure.procedureType === 'save') {
    guidance.developmentTip = 'Use as reference for building new Save procedures';
  }

  return guidance;
}

function inferProcedureBusinessContext(procedure) {
  const contexts = {
    get: 'Data retrieval and querying',
    save: 'Data persistence and updates',
    delete: 'Data removal operations',
    search: 'Complex filtering and search',
    report: 'Business reporting and analytics',
    validation: 'Data validation and business rules',
  };
  return contexts[procedure.procedureType] || 'General business operation';
}

// Add helper methods to router for access in route handlers
router.generateDevelopmentGuidance = generateDevelopmentGuidance;
router.generateTableDevelopmentTips = generateTableDevelopmentTips;
router.generateProcedureDevelopmentGuidance = generateProcedureDevelopmentGuidance;
router.inferProcedureBusinessContext = inferProcedureBusinessContext;

module.exports = router;
