const Template20Intelligence = require('../models/Template20Intelligence');
const AdvancedViewParser = require('./AdvancedViewParser');
const fs = require('fs').promises;
const path = require('path');

/**
 * Template20 Sync Service
 * MongoDB-based schema synchronization without straining live database
 * Focuses on enhancing existing intelligence data and triggering downstream updates
 */
class Template20SyncService {
  constructor() {
    this.viewParser = new AdvancedViewParser();
    this.syncVersion = 'v2.1-mongodb-focused';
  }

  /**
   * Synchronize schema intelligence to MongoDB
   * Uses existing Template20AnalysisService data + enhancements
   */
  async syncSchemaToMongoDB(options = {}) {
    console.log('🔄 Starting MongoDB-focused schema sync...');

    const {
      skipViewAnalysis = false,
      skipRelationshipSync = false,
      updateExistingOnly = true,
      triggerDownstream = true,
    } = options;

    try {
      const startTime = Date.now();

      // Step 1: Get or create base intelligence
      let intelligence = await this.getOrCreateBaseIntelligence();

      // Step 2: Enhance view relationships (if not skipping)
      if (!skipViewAnalysis) {
        console.log('🔗 Enhancing view relationship discovery...');
        intelligence = await this.enhanceViewRelationships(intelligence);
      }

      // Step 3: Sync relationships (if not skipping)
      if (!skipRelationshipSync) {
        console.log('🏗️ Syncing relationship intelligence...');
        intelligence = await this.syncRelationshipMaps(intelligence);
      }

      // Step 4: Update modification tracking
      console.log('📊 Updating modification tracking...');
      intelligence = await this.updateModificationTracking(intelligence);

      // Step 5: Enhance business entity classification
      console.log('🧠 Enhancing business entity classification...');
      intelligence = await this.enhanceBusinessEntityClassification(intelligence);

      // Step 6: Save enhanced intelligence
      console.log('💾 Saving enhanced intelligence to MongoDB...');
      const savedIntelligence = await this.saveEnhancedIntelligence(intelligence);

      // Step 7: Trigger downstream updates
      if (triggerDownstream) {
        console.log('⚡ Triggering downstream updates...');
        await this.triggerDownstreamUpdates(savedIntelligence);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ MongoDB sync completed in ${duration}ms`);

      return {
        success: true,
        intelligenceId: savedIntelligence._id,
        duration,
        stats: this.generateSyncStats(savedIntelligence),
        nextSteps: await this.getRecommendedNextSteps(savedIntelligence),
      };
    } catch (error) {
      console.error('❌ MongoDB sync failed:', error);
      throw new Error(`Template20 sync failed: ${error.message}`);
    }
  }

  /**
   * Get existing Template20 intelligence or create baseline
   */
  async getOrCreateBaseIntelligence() {
    // Try to get latest intelligence
    let intelligence = await Template20Intelligence.getLatestIntelligence();

    if (!intelligence) {
      console.log('📋 No existing intelligence found, creating baseline...');
      intelligence = await this.createBaselineIntelligence();
    } else {
      console.log(
        `📋 Found existing intelligence (${intelligence.analysisVersion}) - enhancing...`
      );
    }

    return intelligence;
  }

  /**
   * Create baseline intelligence structure (without live DB connection)
   */
  async createBaselineIntelligence() {
    const baseIntelligence = new Template20Intelligence({
      templateSource: 'template20',
      databaseServer: 'AWSSQL1',
      analysisVersion: this.syncVersion,
      lastFullAnalysis: new Date(),

      // Initialize with known core business entities
      businessEntities: [
        {
          entityType: 'customer',
          primaryTable: 'gsCustomers',
          keyTables: ['gsCustomers', 'tblContact'],
          businessConcept: 'Customer and contact management',
          businessImportance: 10,
          confidence: 0.95,
          discoveryMethod: ['business_config', 'naming_patterns'],
        },
        {
          entityType: 'contract',
          primaryTable: 'gsContracts',
          keyTables: ['gsContracts', 'tblSalesOpportunity'],
          businessConcept: 'Sales contracts and opportunities',
          businessImportance: 10,
          confidence: 0.95,
          discoveryMethod: ['business_config', 'naming_patterns'],
        },
        {
          entityType: 'invoice',
          primaryTable: 'tblInvoice',
          keyTables: ['tblInvoice', 'tblInvoiceDetail'],
          businessConcept: 'Billing and invoicing',
          businessImportance: 10,
          confidence: 0.95,
          discoveryMethod: ['business_config', 'naming_patterns'],
        },
        {
          entityType: 'payment',
          primaryTable: 'tblPayment',
          keyTables: ['tblPayment', 'tblPaymentDetail'],
          businessConcept: 'Payment processing and tracking',
          businessImportance: 9,
          confidence: 0.9,
          discoveryMethod: ['business_config', 'naming_patterns'],
        },
        {
          entityType: 'opportunity',
          primaryTable: 'tblSalesOpportunity',
          keyTables: ['tblSalesOpportunity', 'tblOpportunityActivity'],
          businessConcept: 'Sales pipeline and opportunity tracking',
          businessImportance: 9,
          confidence: 0.9,
          discoveryMethod: ['business_config', 'naming_patterns'],
        },
      ],

      analysisConfig: {
        includeTables: true,
        includeViews: true,
        includeProcedures: true,
        includeSystemObjects: false,
        confidenceThreshold: 0.7,
        viewParsingEnabled: true,
        dateBasedScoringEnabled: true,
      },
    });

    return baseIntelligence;
  }

  /**
   * Enhance view relationship discovery using MongoDB intelligence + file system
   */
  async enhanceViewRelationships(intelligence) {
    try {
      // Try to parse views from file system (if available)
      const viewsPath = path.join(__dirname, '../../mirabel-api-library/views');
      let viewFiles = [];

      try {
        const files = await fs.readdir(viewsPath);
        viewFiles = files.filter(file => file.endsWith('.sql') && file.includes('vwCustomReport'));
      } catch (fsError) {
        console.log('📁 Views directory not found, using MongoDB intelligence only');
      }

      // Process view files for relationship extraction
      for (const viewFile of viewFiles) {
        try {
          const viewPath = path.join(viewsPath, viewFile);
          const viewSQL = await fs.readFile(viewPath, 'utf8');

          const viewAnalysis = await this.viewParser.parseViewFile(viewPath, viewSQL);

          if (viewAnalysis.success) {
            // Add or update view intelligence
            const existingViewIndex = intelligence.views.findIndex(
              v => v.viewName === viewAnalysis.viewName
            );

            if (existingViewIndex >= 0) {
              intelligence.views[existingViewIndex] = {
                ...intelligence.views[existingViewIndex],
                ...viewAnalysis.intelligence,
                lastAnalyzed: new Date(),
              };
            } else {
              intelligence.views.push({
                ...viewAnalysis.intelligence,
                lastAnalyzed: new Date(),
              });
            }

            // Extract relationships from view
            for (const relationship of viewAnalysis.relationships) {
              const existingRelIndex = intelligence.relationships.findIndex(
                r =>
                  r.fromTable === relationship.fromTable &&
                  r.toTable === relationship.toTable &&
                  r.joinColumn === relationship.joinColumn
              );

              if (existingRelIndex >= 0) {
                // Update confidence if view-based relationship has higher confidence
                if (
                  relationship.confidence > intelligence.relationships[existingRelIndex].confidence
                ) {
                  intelligence.relationships[existingRelIndex].confidence = relationship.confidence;
                  intelligence.relationships[existingRelIndex].discoveredFrom = 'view_join';
                  intelligence.relationships[existingRelIndex].sourceView = viewAnalysis.viewName;
                }
              } else {
                intelligence.relationships.push({
                  ...relationship,
                  discoveredFrom: 'view_join',
                  sourceView: viewAnalysis.viewName,
                  lastVerified: new Date(),
                });
              }
            }
          }
        } catch (viewError) {
          console.warn(`⚠️ Failed to parse view ${viewFile}:`, viewError.message);
        }
      }

      console.log(
        `✅ Enhanced ${viewFiles.length} views, extracted ${intelligence.relationships.length} relationships`
      );
    } catch (error) {
      console.warn('⚠️ View enhancement failed:', error.message);
    }

    return intelligence;
  }

  /**
   * Sync relationship maps between business entities
   */
  async syncRelationshipMaps(intelligence) {
    // Build comprehensive relationship maps for each business entity
    for (const entity of intelligence.businessEntities) {
      entity.relationshipMap = [];

      // Find all relationships involving this entity's tables
      const entityTables = entity.keyTables || [entity.primaryTable];

      for (const table of entityTables) {
        const tableRelationships = intelligence.relationships.filter(
          rel => rel.fromTable === table || rel.toTable === table
        );

        for (const rel of tableRelationships) {
          const relatedTable = rel.fromTable === table ? rel.toTable : rel.fromTable;
          const relatedEntity = this.findEntityByTable(intelligence.businessEntities, relatedTable);

          if (relatedEntity && relatedEntity.entityType !== entity.entityType) {
            const existingMap = entity.relationshipMap.find(
              rm => rm.relatedEntity === relatedEntity.entityType
            );

            if (!existingMap) {
              entity.relationshipMap.push({
                relatedEntity: relatedEntity.entityType,
                relationshipType: rel.relationshipType || 'related',
                businessContext: this.generateBusinessContext(
                  entity.entityType,
                  relatedEntity.entityType
                ),
                importance: this.calculateRelationshipImportance(entity, relatedEntity, rel),
              });
            }
          }
        }
      }
    }

    return intelligence;
  }

  /**
   * Update modification tracking for procedures and other objects
   */
  async updateModificationTracking(intelligence) {
    const now = new Date();

    // Update procedure modification tracking
    for (const procedure of intelligence.procedures) {
      if (procedure.modifyDate) {
        procedure.daysSinceModified = Math.floor(
          (now - new Date(procedure.modifyDate)) / (1000 * 60 * 60 * 24)
        );

        // Update recency score based on modification date
        if (procedure.daysSinceModified <= 30) procedure.recencyScore = 1.0;
        else if (procedure.daysSinceModified <= 90) procedure.recencyScore = 0.9;
        else if (procedure.daysSinceModified <= 365) procedure.recencyScore = 0.7;
        else if (procedure.daysSinceModified <= 1095) procedure.recencyScore = 0.5;
        else procedure.recencyScore = 0.3;

        // Recalculate overall confidence
        procedure.overallConfidence = Math.min(
          (procedure.recencyScore +
            (procedure.patternScore || 0.5) +
            (procedure.maintenanceScore || 1.0) -
            1.0) /
            2.2,
          1.0
        );
      }
    }

    return intelligence;
  }

  /**
   * Enhance business entity classification
   */
  async enhanceBusinessEntityClassification(intelligence) {
    // Add missing business entities based on existing table patterns
    const knownEntityTypes = intelligence.businessEntities.map(e => e.entityType);

    // Check for production/operational entities
    if (!knownEntityTypes.includes('production')) {
      const productionTables = intelligence.tables.filter(
        t =>
          t.tableName.toLowerCase().includes('production') ||
          t.tableName.toLowerCase().includes('job') ||
          t.tableName.toLowerCase().includes('stage')
      );

      if (productionTables.length > 0) {
        intelligence.businessEntities.push({
          entityType: 'production',
          primaryTable: productionTables[0].tableName,
          keyTables: productionTables.map(t => t.tableName),
          businessConcept: 'Production workflow and job tracking',
          businessImportance: 8,
          confidence: 0.85,
          discoveryMethod: ['pattern_analysis'],
          commonAnalytics: [
            'cycle time analysis',
            'production stage tracking',
            'resource utilization',
          ],
          keyMetrics: ['cycle_time', 'on_time_delivery', 'resource_efficiency'],
        });
      }
    }

    // Check for reporting entities
    if (!knownEntityTypes.includes('reporting')) {
      const reportTables = intelligence.tables.filter(
        t =>
          t.tableName.toLowerCase().includes('report') || t.tableName.toLowerCase().startsWith('vw')
      );

      if (reportTables.length > 0) {
        intelligence.businessEntities.push({
          entityType: 'reporting',
          primaryTable: reportTables[0].tableName,
          keyTables: reportTables.map(t => t.tableName),
          businessConcept: 'Business intelligence and reporting',
          businessImportance: 7,
          confidence: 0.8,
          discoveryMethod: ['pattern_analysis'],
          commonAnalytics: ['dashboard data', 'business metrics', 'trend analysis'],
          keyMetrics: ['data_freshness', 'report_accuracy', 'query_performance'],
        });
      }
    }

    return intelligence;
  }

  /**
   * Save enhanced intelligence to MongoDB
   */
  async saveEnhancedIntelligence(intelligence) {
    intelligence.analysisVersion = this.syncVersion;
    intelligence.lastFullAnalysis = new Date();

    const saved = await intelligence.save();
    console.log(
      `💾 Saved intelligence with ${saved.businessEntities.length} entities, ${saved.procedures.length} procedures, ${saved.relationships.length} relationships`
    );

    return saved;
  }

  /**
   * Trigger downstream updates (Prisma, GraphQL, documentation)
   */
  async triggerDownstreamUpdates(intelligence) {
    const updates = [];

    try {
      // Trigger Prisma schema generation
      console.log('📋 Triggering Prisma schema generation...');
      try {
        const PrismaSchemaGenerator = require('./PrismaSchemaGenerator');
        const prismaGenerator = new PrismaSchemaGenerator();

        const prismaResult = await prismaGenerator.generateSchemaFromIntelligence({
          includeRelationships: true,
          includeComments: true,
          generateMultipleSchemas: true,
          optimizeForAI: true,
        });

        updates.push({
          type: 'prisma',
          status: prismaResult.success ? 'completed' : 'failed',
          message: prismaResult.success
            ? 'Prisma schema generated successfully'
            : 'Prisma generation failed',
          result: prismaResult,
        });
      } catch (error) {
        console.warn('⚠️ Prisma generation failed:', error.message);
        updates.push({
          type: 'prisma',
          status: 'failed',
          message: `Prisma generation failed: ${error.message}`,
        });
      }

      // Trigger GraphQL schema generation
      console.log('🔗 Triggering GraphQL schema generation...');
      try {
        const GraphQLSchemaGenerator = require('./GraphQLSchemaGenerator');
        const graphqlGenerator = new GraphQLSchemaGenerator();

        const graphqlResult = await graphqlGenerator.generateFromIntelligence({
          generateResolvers: true,
          generateFederation: false,
          includeDocumentation: true,
          optimizeForAI: true,
          includeProcedureResolvers: true,
        });

        updates.push({
          type: 'graphql',
          status: graphqlResult.success ? 'completed' : 'failed',
          message: graphqlResult.success
            ? 'GraphQL schema generated successfully'
            : 'GraphQL generation failed',
          result: graphqlResult,
        });
      } catch (error) {
        console.warn('⚠️ GraphQL generation failed:', error.message);
        updates.push({
          type: 'graphql',
          status: 'failed',
          message: `GraphQL generation failed: ${error.message}`,
        });
      }

      // Trigger AI documentation pipeline (skip for automatic sync to avoid API costs)
      console.log('📚 Queueing AI documentation pipeline...');
      updates.push({
        type: 'documentation',
        status: 'queued',
        message: 'AI documentation queued (run manually via API to avoid OpenAI costs)',
        recommendation: 'POST /api/ai-schema/documentation/generate',
      });

      console.log(`⚡ Triggered ${updates.length} downstream updates`);
    } catch (error) {
      console.warn('⚠️ Some downstream updates failed:', error.message);
    }

    return updates;
  }

  /**
   * Generate sync statistics
   */
  generateSyncStats(intelligence) {
    return {
      totalBusinessEntities: intelligence.businessEntities.length,
      totalTables: intelligence.tables.length,
      totalProcedures: intelligence.procedures.length,
      totalViews: intelligence.views.length,
      totalRelationships: intelligence.relationships.length,
      highConfidenceProcedures: intelligence.procedures.filter(p => p.overallConfidence >= 0.8)
        .length,
      recentlyModifiedProcedures: intelligence.procedures.filter(p => p.daysSinceModified <= 90)
        .length,
      businessCriticalEntities: intelligence.businessEntities.filter(e => e.businessImportance >= 9)
        .length,
    };
  }

  /**
   * Get recommended next steps
   */
  async getRecommendedNextSteps(intelligence) {
    const steps = [];

    // Check if Prisma generation is needed
    steps.push({
      priority: 'high',
      action: 'generate_prisma_schema',
      description: 'Generate Prisma schema for type-safe database access',
      estimatedTime: '5-10 minutes',
    });

    // Check if GraphQL generation is needed
    steps.push({
      priority: 'high',
      action: 'generate_graphql_schema',
      description: 'Generate GraphQL schema for AI coding assistants',
      estimatedTime: '5-10 minutes',
    });

    // Check if AI documentation is needed
    if (intelligence.procedures.length > 0) {
      steps.push({
        priority: 'medium',
        action: 'generate_ai_documentation',
        description: `Generate AI documentation for ${intelligence.procedures.length} stored procedures`,
        estimatedTime: '10-15 minutes',
      });
    }

    return steps;
  }

  // Helper methods
  findEntityByTable(entities, tableName) {
    return entities.find(
      entity =>
        entity.primaryTable === tableName ||
        (entity.keyTables && entity.keyTables.includes(tableName))
    );
  }

  generateBusinessContext(entityType1, entityType2) {
    const contexts = {
      'customer-contract': 'Customers can have multiple contracts',
      'customer-invoice': 'Customers receive invoices for services',
      'contract-invoice': 'Contracts generate invoices',
      'invoice-payment': 'Invoices are paid through payments',
      'customer-opportunity': 'Customers are associated with sales opportunities',
      'opportunity-contract': 'Opportunities convert to contracts',
    };

    const key1 = `${entityType1}-${entityType2}`;
    const key2 = `${entityType2}-${entityType1}`;

    return contexts[key1] || contexts[key2] || `${entityType1} relates to ${entityType2}`;
  }

  calculateRelationshipImportance(entity1, entity2, relationship) {
    // Business critical relationships
    if (
      (entity1.entityType === 'customer' && entity2.entityType === 'invoice') ||
      (entity1.entityType === 'invoice' && entity2.entityType === 'payment') ||
      (entity1.entityType === 'opportunity' && entity2.entityType === 'contract')
    ) {
      return 'critical';
    }

    // Important business relationships
    if (entity1.businessImportance >= 8 && entity2.businessImportance >= 8) {
      return 'important';
    }

    return 'reference';
  }
}

module.exports = Template20SyncService;
