const Template20Intelligence = require('../models/Template20Intelligence');
const AdvancedViewParser = require('./AdvancedViewParser');
const ProcedureConfidenceScorer = require('./ProcedureConfidenceScorer');
const DatabaseService = require('./databaseService');
const fs = require('fs').promises;
const path = require('path');

/**
 * Template20 Analysis Service
 * Comprehensive analysis of template20 database for developer reference
 * Creates MongoDB-based intelligence for building new features and microservices
 */
class Template20AnalysisService {
  constructor() {
    this.viewParser = new AdvancedViewParser();
    this.confidenceScorer = new ProcedureConfidenceScorer();
    this.analysisVersion = 'v2.0-developer-focused';
  }

  /**
   * Perform comprehensive analysis of template20 database
   * Creates developer-focused intelligence stored in MongoDB
   */
  async performComprehensiveAnalysis() {
    console.log('🔍 Starting comprehensive template20 analysis for developer reference...');

    try {
      const startTime = Date.now();

      // Step 1: Extract raw schema metadata
      console.log('📊 Step 1: Extracting schema metadata...');
      const schemaData = await this.extractSchemaMetadata();

      // Step 2: Analyze stored procedures with confidence scoring
      console.log('⚙️ Step 2: Analyzing stored procedures...');
      const procedureIntelligence = await this.analyzeProcedures(schemaData.procedures);

      // Step 3: Parse views for relationship intelligence
      console.log('🔗 Step 3: Parsing views for relationships...');
      const viewIntelligence = await this.analyzeViews();

      // Step 4: Extract table relationships and business logic
      console.log('🏗️ Step 4: Building relationship intelligence...');
      const relationshipIntelligence = await this.buildRelationshipIntelligence(
        schemaData.tables,
        viewIntelligence
      );

      // Step 5: Classify business entities and patterns
      console.log('🧠 Step 5: Classifying business entities...');
      const businessIntelligence = await this.classifyBusinessEntities(
        schemaData,
        procedureIntelligence,
        viewIntelligence
      );

      // Step 6: Generate developer documentation
      console.log('📚 Step 6: Generating developer documentation...');
      const developerDocs = await this.generateDeveloperDocumentation(businessIntelligence);

      // Step 7: Save to MongoDB
      console.log('💾 Step 7: Saving intelligence to MongoDB...');
      const savedIntelligence = await this.saveIntelligenceToMongoDB({
        schemaData,
        procedureIntelligence,
        viewIntelligence,
        relationshipIntelligence,
        businessIntelligence,
        developerDocs,
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Analysis completed in ${duration}ms`);

      return {
        success: true,
        intelligenceId: savedIntelligence._id,
        summary: this.generateAnalysisSummary(savedIntelligence),
        duration,
      };
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      throw error;
    }
  }

  /**
   * Extract comprehensive schema metadata from template20
   */
  async extractSchemaMetadata() {
    const connection = await this.getTemplate20Connection();

    try {
      // Extract tables with detailed metadata
      const tablesQuery = `
        SELECT 
          t.TABLE_SCHEMA,
          t.TABLE_NAME,
          t.TABLE_TYPE,
          c.COLUMN_NAME,
          c.DATA_TYPE,
          c.CHARACTER_MAXIMUM_LENGTH,
          c.IS_NULLABLE,
          c.COLUMN_DEFAULT,
          c.ORDINAL_POSITION,
          -- Primary key information
          CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END as IS_PRIMARY_KEY,
          -- Foreign key information
          CASE WHEN fk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END as IS_FOREIGN_KEY,
          fk.REFERENCED_TABLE_NAME,
          fk.REFERENCED_COLUMN_NAME,
          -- Table statistics
          ISNULL(p.rows, 0) as ESTIMATED_ROW_COUNT
        FROM INFORMATION_SCHEMA.TABLES t
        INNER JOIN INFORMATION_SCHEMA.COLUMNS c ON t.TABLE_NAME = c.TABLE_NAME AND t.TABLE_SCHEMA = c.TABLE_SCHEMA
        LEFT JOIN (
          SELECT ku.TABLE_SCHEMA, ku.TABLE_NAME, ku.COLUMN_NAME
          FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS tc
          INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS ku
            ON tc.CONSTRAINT_TYPE = 'PRIMARY KEY' 
            AND tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
        ) pk ON c.TABLE_NAME = pk.TABLE_NAME AND c.COLUMN_NAME = pk.COLUMN_NAME
        LEFT JOIN (
          SELECT 
            ku.TABLE_SCHEMA,
            ku.TABLE_NAME, 
            ku.COLUMN_NAME,
            ccu.TABLE_NAME AS REFERENCED_TABLE_NAME,
            ccu.COLUMN_NAME AS REFERENCED_COLUMN_NAME
          FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS AS rc
          INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS ku
            ON ku.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
          INNER JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE AS ccu
            ON ccu.CONSTRAINT_NAME = rc.UNIQUE_CONSTRAINT_NAME
        ) fk ON c.TABLE_NAME = fk.TABLE_NAME AND c.COLUMN_NAME = fk.COLUMN_NAME
        LEFT JOIN sys.dm_db_partition_stats p ON p.object_id = OBJECT_ID(t.TABLE_SCHEMA + '.' + t.TABLE_NAME)
        WHERE t.TABLE_SCHEMA = 'dbo' 
          AND t.TABLE_TYPE = 'BASE TABLE'
          AND t.TABLE_NAME NOT LIKE 'sys%'
        ORDER BY t.TABLE_NAME, c.ORDINAL_POSITION
      `;

      const tablesResult = await connection.request().query(tablesQuery);

      // Extract stored procedures with metadata
      const proceduresQuery = `
        SELECT 
          SCHEMA_NAME(p.schema_id) as SCHEMA_NAME,
          p.name as PROCEDURE_NAME,
          p.create_date,
          p.modify_date,
          p.type_desc,
          -- Parameter information
          pr.parameter_id,
          pr.name as PARAMETER_NAME,
          TYPE_NAME(pr.user_type_id) as PARAMETER_DATA_TYPE,
          pr.max_length,
          pr.is_output,
          pr.has_default_value,
          pr.default_value
        FROM sys.procedures p
        LEFT JOIN sys.parameters pr ON p.object_id = pr.object_id
        WHERE p.is_ms_shipped = 0
          AND SCHEMA_NAME(p.schema_id) = 'dbo'
        ORDER BY p.name, pr.parameter_id
      `;

      const proceduresResult = await connection.request().query(proceduresQuery);

      // Extract views
      const viewsQuery = `
        SELECT 
          TABLE_SCHEMA,
          TABLE_NAME as VIEW_NAME,
          VIEW_DEFINITION
        FROM INFORMATION_SCHEMA.VIEWS
        WHERE TABLE_SCHEMA = 'dbo'
        ORDER BY TABLE_NAME
      `;

      const viewsResult = await connection.request().query(viewsQuery);

      return {
        tables: this.processTableMetadata(tablesResult.recordset),
        procedures: this.processProcedureMetadata(proceduresResult.recordset),
        views: this.processViewMetadata(viewsResult.recordset),
      };
    } finally {
      await connection.close();
    }
  }

  /**
   * Process raw table metadata into structured format
   */
  processTableMetadata(rawTables) {
    const tablesMap = new Map();

    rawTables.forEach(row => {
      const tableName = row.TABLE_NAME;

      if (!tablesMap.has(tableName)) {
        tablesMap.set(tableName, {
          tableName,
          schemaName: row.TABLE_SCHEMA,
          columns: [],
          primaryKeys: [],
          foreignKeys: [],
          estimatedRowCount: row.ESTIMATED_ROW_COUNT || 0,
          businessClassification: this.classifyTableByName(tableName),
        });
      }

      const table = tablesMap.get(tableName);

      // Add column information
      table.columns.push({
        columnName: row.COLUMN_NAME,
        dataType: row.DATA_TYPE,
        maxLength: row.CHARACTER_MAXIMUM_LENGTH,
        isNullable: row.IS_NULLABLE === 'YES',
        isPrimaryKey: row.IS_PRIMARY_KEY === 1,
        isForeignKey: row.IS_FOREIGN_KEY === 1,
        defaultValue: row.COLUMN_DEFAULT,
        ordinalPosition: row.ORDINAL_POSITION,
        businessRole: this.classifyColumnRole(row.COLUMN_NAME, row.DATA_TYPE),
      });

      // Track primary keys
      if (row.IS_PRIMARY_KEY === 1) {
        table.primaryKeys.push(row.COLUMN_NAME);
      }

      // Track foreign keys
      if (row.IS_FOREIGN_KEY === 1) {
        table.foreignKeys.push({
          columnName: row.COLUMN_NAME,
          referencedTable: row.REFERENCED_TABLE_NAME,
          referencedColumn: row.REFERENCED_COLUMN_NAME,
          confidence: 1.0, // High confidence from system constraints
        });
      }
    });

    return Array.from(tablesMap.values());
  }

  /**
   * Process raw procedure metadata into structured format
   */
  processProcedureMetadata(rawProcedures) {
    const proceduresMap = new Map();

    rawProcedures.forEach(row => {
      const procName = row.PROCEDURE_NAME;

      if (!proceduresMap.has(procName)) {
        proceduresMap.set(procName, {
          procedureName: procName,
          schemaName: row.SCHEMA_NAME,
          createDate: row.create_date,
          modifyDate: row.modify_date,
          typeDesc: row.type_desc,
          parameters: [],
          businessClassification: this.classifyProcedureByName(procName),
        });
      }

      const procedure = proceduresMap.get(procName);

      // Add parameter information if exists
      if (row.PARAMETER_NAME) {
        procedure.parameters.push({
          parameterId: row.parameter_id,
          parameterName: row.PARAMETER_NAME,
          dataType: row.PARAMETER_DATA_TYPE,
          maxLength: row.max_length,
          isOutput: row.is_output,
          hasDefaultValue: row.has_default_value,
          defaultValue: row.default_value,
        });
      }
    });

    return Array.from(proceduresMap.values());
  }

  /**
   * Process raw view metadata
   */
  processViewMetadata(rawViews) {
    return rawViews.map(row => ({
      viewName: row.VIEW_NAME,
      schemaName: row.TABLE_SCHEMA,
      definition: row.VIEW_DEFINITION,
      businessClassification: this.classifyViewByName(row.VIEW_NAME),
    }));
  }

  /**
   * Analyze stored procedures using confidence scoring
   */
  async analyzeProcedures(procedures) {
    console.log(`Analyzing ${procedures.length} stored procedures...`);

    return this.confidenceScorer.batchCalculateConfidence(
      procedures.map(proc => ({
        ...proc,
        daysSinceModified: proc.modifyDate
          ? Math.floor((new Date() - new Date(proc.modifyDate)) / (1000 * 60 * 60 * 24))
          : null,
        daysSinceCreated: proc.createDate
          ? Math.floor((new Date() - new Date(proc.createDate)) / (1000 * 60 * 60 * 24))
          : null,
      }))
    );
  }

  /**
   * Analyze views for relationship and business intelligence
   */
  async analyzeViews() {
    console.log('Analyzing views for business intelligence...');

    // Get view files from the library directory
    const viewsDir = path.join(process.cwd(), 'mirabel-api-library', 'views');
    const viewIntelligence = [];

    try {
      const viewFiles = await fs.readdir(viewsDir);
      const customReportViews = viewFiles.filter(
        file => file.startsWith('vwCustomReport_') && file.endsWith('.sql')
      );

      for (const viewFile of customReportViews) {
        try {
          const viewPath = path.join(viewsDir, viewFile);
          const viewContent = await fs.readFile(viewPath, 'utf8');
          const viewName = path.basename(viewFile, '.sql');

          const intelligence = await this.viewParser.parseViewDefinition(viewName, viewContent);
          viewIntelligence.push(intelligence);
        } catch (error) {
          console.warn(`Warning: Could not parse view ${viewFile}:`, error.message);
        }
      }
    } catch (error) {
      console.warn('Could not access views directory:', error.message);
    }

    return viewIntelligence;
  }

  /**
   * Build comprehensive relationship intelligence
   */
  async buildRelationshipIntelligence(tables, viewIntelligence) {
    const relationships = [];

    // Extract relationships from foreign key constraints
    tables.forEach(table => {
      table.foreignKeys.forEach(fk => {
        relationships.push({
          fromTable: table.tableName,
          toTable: fk.referencedTable,
          joinColumn: fk.columnName,
          relationshipType: 'many-to-one', // FK relationships are typically many-to-one
          businessRule: `${table.tableName} references ${fk.referencedTable}`,
          discoveredFrom: 'foreign_key',
          confidence: 1.0,
          businessImportance: this.assessRelationshipImportance(
            table.tableName,
            fk.referencedTable
          ),
        });
      });
    });

    // Extract relationships from view analysis
    viewIntelligence.forEach(view => {
      if (view.relationships) {
        view.relationships.forEach(rel => {
          relationships.push({
            ...rel,
            sourceView: view.viewName,
            businessImportance: this.assessRelationshipImportance(rel.fromTable, rel.toTable),
          });
        });
      }
    });

    return this.deduplicateRelationships(relationships);
  }

  /**
   * Classify business entities based on comprehensive analysis
   */
  async classifyBusinessEntities(schemaData, procedureIntelligence, viewIntelligence) {
    const businessEntities = new Map();

    // Analyze table patterns for business entities
    schemaData.tables.forEach(table => {
      const entityType = table.businessClassification.entityType;
      if (entityType && entityType !== 'unknown') {
        if (!businessEntities.has(entityType)) {
          businessEntities.set(entityType, {
            entityType,
            primaryTable: table.tableName,
            keyTables: [],
            keyProcedures: [],
            keyViews: [],
            businessConcept: this.getBusinessConcept(entityType),
            confidence: 0,
            businessImportance: table.businessClassification.importance || 5,
          });
        }

        const entity = businessEntities.get(entityType);
        entity.keyTables.push(table.tableName);
        entity.confidence = Math.max(
          entity.confidence,
          table.businessClassification.confidence || 0.5
        );
      }
    });

    // Map procedures to business entities
    procedureIntelligence.forEach(proc => {
      if (proc.confidence && proc.confidence.componentScores.business > 0.5) {
        const entityType = this.inferEntityFromProcedure(proc.procedureName);
        if (entityType && businessEntities.has(entityType)) {
          businessEntities.get(entityType).keyProcedures.push(proc.procedureName);
        }
      }
    });

    // Map views to business entities
    viewIntelligence.forEach(view => {
      if (view.businessEntity && businessEntities.has(view.businessEntity)) {
        businessEntities.get(view.businessEntity).keyViews.push(view.viewName);
      }
    });

    return Array.from(businessEntities.values());
  }

  /**
   * Generate developer-focused documentation
   */
  async generateDeveloperDocumentation(businessIntelligence) {
    return {
      overview: {
        purpose: 'Template20 Database Intelligence for Developer Reference',
        generatedAt: new Date(),
        version: this.analysisVersion,
        summary: `Comprehensive analysis of template20 database for building new features and microservices`,
      },

      businessEntities: businessIntelligence.map(entity => ({
        entityType: entity.entityType,
        description: entity.businessConcept,
        primaryTable: entity.primaryTable,
        relatedTables: entity.keyTables,
        coreProcedures: entity.keyProcedures.slice(0, 10), // Top 10 procedures
        reportingViews: entity.keyViews,
        developerTips: this.generateDeveloperTips(entity),
        commonPatterns: this.generateCommonPatterns(entity),
      })),

      architecturalPatterns: this.extractArchitecturalPatterns(businessIntelligence),
      namingConventions: this.extractNamingConventions(businessIntelligence),
      relationshipPatterns: this.extractRelationshipPatterns(businessIntelligence),
    };
  }

  /**
   * Save comprehensive intelligence to MongoDB
   */
  async saveIntelligenceToMongoDB(analysisData) {
    const intelligence = new Template20Intelligence({
      templateSource: 'template20',
      databaseServer: 'AWSSQL1',
      analysisVersion: this.analysisVersion,
      lastFullAnalysis: new Date(),

      tables: analysisData.schemaData.tables.map(table => ({
        ...table,
        businessEntity: table.businessClassification.entityType,
        businessImportance: this.mapImportanceLevel(table.businessClassification.importance),
        importanceScore: table.businessClassification.importance || 5,
        confidence: table.businessClassification.confidence || 0.8,
        discoveredFrom: ['system_tables'],
        lastAnalyzed: new Date(),
      })),

      procedures: analysisData.procedureIntelligence.map(proc => ({
        procedureName: proc.procedureName,
        schemaName: proc.schemaName,
        createDate: proc.createDate,
        modifyDate: proc.modifyDate,
        parameters: proc.parameters || [],
        businessEntity: this.inferEntityFromProcedure(proc.procedureName),
        procedureType: proc.procedureType,
        isActive: proc.isPrimary,
        recencyScore: proc.confidence?.componentScores?.temporal || 0.5,
        patternScore: proc.confidence?.componentScores?.pattern || 0.5,
        overallConfidence: proc.confidence?.overallConfidence || 0.5,
        discoveredFrom: ['system_procedures'],
        analysisVersion: this.analysisVersion,
      })),

      views: analysisData.viewIntelligence.map(view => ({
        viewName: view.viewName,
        businessModule: view.businessModule,
        businessEntity: view.businessEntity,
        complexityScore: view.complexity?.level || 'moderate',
        joinCount: view.complexity?.factors?.join || 0,
        tablesUsed: view.tables?.map(t => t.tableName) || [],
        primaryTable: view.tables?.[0]?.tableName,
        confidence: view.confidence || 0.9,
        lastAnalyzed: new Date(),
      })),

      relationships: analysisData.relationshipIntelligence,
      businessEntities: analysisData.businessIntelligence,

      analysisConfig: {
        includeTables: true,
        includeViews: true,
        includeProcedures: true,
        includeSystemObjects: false,
        confidenceThreshold: 0.7,
        viewParsingEnabled: true,
        dateBasedScoringEnabled: true,
      },

      appliesToDatabases: 'developer_reference',

      performanceMetrics: {
        lastAnalysisDuration: 0, // Will be updated after save
        memoryUsage: process.memoryUsage().heapUsed,
      },
    });

    return await intelligence.save();
  }

  // Helper methods for classification and mapping
  classifyTableByName(tableName) {
    const patterns = {
      customer: { regex: /customer|contact|client|account/i, importance: 10, confidence: 0.95 },
      contract: { regex: /contract|agreement|deal|opportunity/i, importance: 9, confidence: 0.9 },
      invoice: { regex: /invoice|bill|payment|receipt/i, importance: 9, confidence: 0.9 },
      production: { regex: /production|job|workflow/i, importance: 8, confidence: 0.85 },
      reference: { regex: /state|country|type|category|lookup/i, importance: 4, confidence: 0.7 },
      system: { regex: /audit|log|system|temp/i, importance: 2, confidence: 0.6 },
    };

    for (const [entityType, config] of Object.entries(patterns)) {
      if (config.regex.test(tableName)) {
        return { entityType, importance: config.importance, confidence: config.confidence };
      }
    }

    return { entityType: 'unknown', importance: 5, confidence: 0.3 };
  }

  classifyColumnRole(columnName, dataType) {
    if (columnName.toLowerCase().endsWith('id')) return 'id';
    if (columnName.toLowerCase().includes('name') || columnName.toLowerCase().includes('title'))
      return 'name';
    if (columnName.toLowerCase().includes('date') || columnName.toLowerCase().includes('time'))
      return 'date';
    if (columnName.toLowerCase().includes('amount') || columnName.toLowerCase().includes('total'))
      return 'amount';
    if (columnName.toLowerCase().includes('status') || columnName.toLowerCase().includes('state'))
      return 'status';
    if (
      columnName.toLowerCase().includes('description') ||
      columnName.toLowerCase().includes('comment')
    )
      return 'description';
    if (
      columnName.toLowerCase().includes('created') ||
      columnName.toLowerCase().includes('modified')
    )
      return 'audit';
    return 'other';
  }

  classifyProcedureByName(procedureName) {
    // Implementation similar to ProcedureConfidenceScorer
    return { entityType: 'unknown', confidence: 0.5 };
  }

  classifyViewByName(viewName) {
    // Extract business entity from view name
    return { entityType: 'unknown', confidence: 0.5 };
  }

  // Additional helper methods...
  getBusinessConcept(entityType) {
    const concepts = {
      customer: 'Customer relationship management and acquisition',
      contract: 'Sales agreements and contract lifecycle',
      invoice: 'Billing and accounts receivable',
      payment: 'Payment processing and reconciliation',
      production: 'Production workflow and job management',
      reference: 'Lookup tables and data validation',
    };
    return concepts[entityType] || 'Business data entity';
  }

  generateDeveloperTips(entity) {
    return [
      `Primary table: ${entity.primaryTable}`,
      `Related tables: ${entity.keyTables.length}`,
      `Core procedures: ${entity.keyProcedures.length}`,
      `Business importance: ${entity.businessImportance}/10`,
    ];
  }

  generateCommonPatterns(entity) {
    return {
      tableNaming: `${entity.entityType} entities follow gs* prefix pattern`,
      procedureNaming: `Use usp${entity.entityType}* for new procedures`,
      keyColumns: `Standard ID column: gs${entity.primaryTable}ID`,
    };
  }

  generateAnalysisSummary(intelligence) {
    return {
      totalTables: intelligence.tables.length,
      totalProcedures: intelligence.procedures.length,
      totalViews: intelligence.views.length,
      totalRelationships: intelligence.relationships.length,
      businessEntitiesFound: intelligence.businessEntities.length,
      highConfidenceProcedures: intelligence.procedures.filter(p => p.overallConfidence > 0.8)
        .length,
    };
  }

  async getTemplate20Connection() {
    return await DatabaseService.createConnection({
      host: 'AWSSQL1',
      database: 'template20',
      username: process.env.TEMPLATE_DB_USER,
      password: process.env.TEMPLATE_DB_PASSWORD,
    });
  }

  // Implement remaining helper methods...
  inferEntityFromProcedure(procedureName) {
    const name = procedureName.toLowerCase();
    if (name.includes('contact') || name.includes('customer')) return 'customer';
    if (name.includes('contract') || name.includes('opportunity')) return 'contract';
    if (name.includes('invoice') || name.includes('payment')) return 'invoice';
    if (name.includes('production') || name.includes('job')) return 'production';
    return 'unknown';
  }

  mapImportanceLevel(importance) {
    if (importance >= 9) return 'critical';
    if (importance >= 7) return 'important';
    if (importance >= 5) return 'reference';
    return 'system';
  }

  assessRelationshipImportance(fromTable, toTable) {
    // Assess business importance of relationships
    const criticalTables = ['gsCustomers', 'gsContracts', 'gsInvoices'];
    if (criticalTables.includes(fromTable) || criticalTables.includes(toTable)) {
      return 'critical';
    }
    return 'reference';
  }

  deduplicateRelationships(relationships) {
    const seen = new Set();
    return relationships.filter(rel => {
      const key = `${rel.fromTable}-${rel.toTable}-${rel.joinColumn}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  extractArchitecturalPatterns(businessIntelligence) {
    return {
      entityPattern: 'gs{Entity} naming convention for core tables',
      procedurePattern: 'usp{Entity}{Action} for stored procedures',
      auditPattern: 'CreatedDate, CreatedBy, ModifiedDate, ModifiedBy standard fields',
    };
  }

  extractNamingConventions(businessIntelligence) {
    return {
      tables: 'gs prefix for all business tables',
      procedures: 'usp prefix for user stored procedures',
      views: 'vwCustomReport_ prefix for business reporting views',
      columns: 'PascalCase with descriptive names',
    };
  }

  extractRelationshipPatterns(businessIntelligence) {
    return {
      foreignKeys: 'gs{Entity}ID pattern for foreign key references',
      lookupTables: 'Type/Category suffix for lookup tables',
      auditTables: 'Consistent audit trail relationships',
    };
  }
}

module.exports = Template20AnalysisService;
