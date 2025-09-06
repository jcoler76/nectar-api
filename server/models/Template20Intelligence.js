const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Template20 Intelligence Model
 * Centralized schema intelligence for 800+ identical databases
 * Single source of truth derived from template20 analysis
 */

// Sub-schemas for embedded documents
const TableIntelligenceSchema = new Schema(
  {
    tableName: { type: String, required: true, index: true },
    schemaName: { type: String, default: 'dbo' },

    // Business classification
    businessEntity: {
      type: String,
      enum: [
        'customer',
        'contract',
        'invoice',
        'payment',
        'opportunity',
        'production',
        'reference',
        'system',
        'operational',
      ],
      index: true,
    },
    businessImportance: {
      type: String,
      enum: ['critical', 'important', 'reference', 'system'],
      default: 'reference',
      index: true,
    },
    importanceScore: { type: Number, min: 0, max: 10, default: 5 },

    // Table metadata
    estimatedRowCount: { type: Number, default: 0 },
    hasAuditFields: { type: Boolean, default: false },
    hasSoftDelete: { type: Boolean, default: false },

    // Column intelligence
    columns: [
      {
        columnName: { type: String, required: true },
        dataType: { type: String, required: true },
        maxLength: { type: Number },
        isNullable: { type: Boolean, default: true },
        isPrimaryKey: { type: Boolean, default: false },
        isForeignKey: { type: Boolean, default: false },
        defaultValue: { type: String },

        // Business context
        businessRole: {
          type: String,
          enum: [
            'id',
            'name',
            'description',
            'date',
            'amount',
            'status',
            'reference',
            'audit',
            'other',
          ],
          default: 'other',
        },
        isBusinessKey: { type: Boolean, default: false },
      },
    ],

    // Relationship metadata
    primaryKeys: [{ type: String }],
    foreignKeys: [
      {
        columnName: { type: String, required: true },
        referencedTable: { type: String, required: true },
        referencedColumn: { type: String, required: true },
        confidence: { type: Number, min: 0, max: 1, default: 0.9 },
      },
    ],

    // Discovery metadata
    discoveredFrom: [
      {
        type: String,
        enum: ['system_tables', 'view_analysis', 'business_config', 'pattern_detection'],
      },
    ],
    confidence: { type: Number, min: 0, max: 1, default: 0.8 },
    lastAnalyzed: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ProcedureIntelligenceSchema = new Schema(
  {
    procedureName: { type: String, required: true, index: true },
    schemaName: { type: String, default: 'dbo' },

    // Temporal intelligence
    createDate: { type: Date, required: true },
    modifyDate: { type: Date, required: true },
    daysSinceModified: { type: Number, index: true }, // Calculated field
    daysSinceCreated: { type: Number },

    // Confidence scoring based on dates and patterns
    recencyScore: { type: Number, min: 0, max: 1, default: 0.5 }, // Based on modify date
    maintenanceScore: { type: Number, min: 0, max: 1.2, default: 1.0 }, // Based on create vs modify
    patternScore: { type: Number, min: 0, max: 1, default: 0.5 }, // Based on naming patterns
    overallConfidence: { type: Number, min: 0, max: 1, default: 0.5, index: true },

    // Business classification
    businessEntity: {
      type: String,
      enum: [
        'customer',
        'contract',
        'invoice',
        'payment',
        'opportunity',
        'production',
        'system',
        'reporting',
      ],
      index: true,
    },
    procedureType: {
      type: String,
      enum: ['get', 'save', 'delete', 'search', 'report', 'validation', 'calculation', 'other'],
      default: 'other',
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true }, // Based on recent usage/modifications

    // Parameter intelligence
    parameters: [
      {
        parameterName: { type: String, required: true },
        dataType: { type: String, required: true },
        isOutput: { type: Boolean, default: false },
        defaultValue: { type: String },
        businessContext: { type: String }, // e.g., "customer identifier", "date range filter"
      },
    ],

    // Usage patterns (to be populated from usage analytics)
    estimatedUsageFrequency: {
      type: String,
      enum: ['very_high', 'high', 'medium', 'low', 'very_low', 'unknown'],
      default: 'unknown',
    },
    lastAccessed: { type: Date }, // If available from monitoring

    // Discovery metadata
    discoveredFrom: [
      {
        type: String,
        enum: ['system_procedures', 'business_config', 'file_system'],
      },
    ],
    analysisVersion: { type: String, default: 'v1.0' },
  },
  { _id: false }
);

const ViewIntelligenceSchema = new Schema(
  {
    viewName: { type: String, required: true, index: true },
    schemaName: { type: String, default: 'dbo' },

    // Business classification
    businessModule: { type: String, index: true }, // Extracted from vwCustomReport_XXX
    businessEntity: { type: String, index: true },

    // SQL analysis results
    complexityScore: {
      type: String,
      enum: ['simple', 'moderate', 'complex', 'very_complex'],
      default: 'moderate',
    },
    joinCount: { type: Number, default: 0 },
    subqueryCount: { type: Number, default: 0 },
    caseStatementCount: { type: Number, default: 0 },

    // Table relationships extracted from view
    tablesUsed: [{ type: String }],
    primaryTable: { type: String }, // Main table in FROM clause

    // Column intelligence
    selectColumns: [
      {
        columnExpression: { type: String, required: true },
        columnAlias: { type: String },
        sourceTable: { type: String },
        businessContext: { type: String },
      },
    ],

    // Discovery metadata
    confidence: { type: Number, min: 0, max: 1, default: 0.9 }, // Views have high confidence
    lastAnalyzed: { type: Date, default: Date.now },
  },
  { _id: false }
);

const RelationshipIntelligenceSchema = new Schema(
  {
    fromTable: { type: String, required: true, index: true },
    toTable: { type: String, required: true, index: true },
    joinColumn: { type: String, required: true },

    // Relationship metadata
    relationshipType: {
      type: String,
      enum: ['one-to-one', 'one-to-many', 'many-to-one', 'many-to-many'],
      required: true,
    },
    cardinality: { type: String }, // e.g., "1:M", "M:N"

    // Business context
    businessRule: { type: String }, // Human-readable business rule
    businessImportance: {
      type: String,
      enum: ['critical', 'important', 'reference', 'system'],
      default: 'reference',
    },

    // Discovery context
    discoveredFrom: {
      type: String,
      enum: ['foreign_key', 'view_join', 'business_config', 'pattern_analysis'],
      required: true,
      index: true,
    },
    sourceView: { type: String }, // If discovered from view analysis
    joinCondition: { type: String }, // Full SQL join condition

    // Confidence and validation
    confidence: { type: Number, min: 0, max: 1, required: true, index: true },
    isValidated: { type: Boolean, default: false }, // Manual validation flag

    // Analysis metadata
    analysisVersion: { type: String, default: 'v1.0' },
    lastVerified: { type: Date, default: Date.now },
  },
  { _id: false }
);

const BusinessEntityIntelligenceSchema = new Schema(
  {
    entityType: {
      type: String,
      required: true,
      enum: [
        'customer',
        'contract',
        'invoice',
        'payment',
        'opportunity',
        'production',
        'reference',
        'system',
      ],
      index: true,
    },

    // Core entity information
    primaryTable: { type: String, required: true },
    keyTables: [{ type: String }], // Related tables for this entity
    keyProcedures: [{ type: String }], // Main procedures for this entity
    keyViews: [{ type: String }], // Views that focus on this entity

    // Business intelligence
    businessConcept: { type: String, required: true },
    commonAnalytics: [{ type: String }], // Common business questions
    keyMetrics: [{ type: String }], // Important business metrics
    businessRules: [{ type: String }], // Known business rules

    // Relationship mapping
    relationshipMap: [
      {
        relatedEntity: { type: String },
        relationshipType: { type: String },
        businessContext: { type: String },
        importance: { type: String, enum: ['critical', 'important', 'reference'] },
      },
    ],

    // Intelligence scores
    dataQuality: { type: Number, min: 0, max: 1, default: 0.8 },
    businessImportance: { type: Number, min: 0, max: 10, required: true },
    confidence: { type: Number, min: 0, max: 1, required: true },

    // Discovery metadata
    discoveryMethod: [{ type: String }],
    lastAnalyzed: { type: Date, default: Date.now },
  },
  { _id: false }
);

// Main Schema Definition
const Template20IntelligenceSchema = new Schema(
  {
    // Template metadata
    templateSource: {
      type: String,
      required: true,
      default: 'template20',
      index: true,
    },
    databaseServer: {
      type: String,
      required: true,
      default: 'AWSSQL1',
    },

    // Analysis metadata
    analysisVersion: { type: String, required: true, default: 'v1.0' },
    lastFullAnalysis: { type: Date, required: true, default: Date.now },
    nextAnalysisScheduled: { type: Date },

    // Schema statistics
    schemaStats: {
      totalTables: { type: Number, default: 0 },
      totalViews: { type: Number, default: 0 },
      totalProcedures: { type: Number, default: 0 },
      totalRelationships: { type: Number, default: 0 },
      businessEntitiesDetected: { type: Number, default: 0 },
    },

    // Intelligence collections
    tables: [TableIntelligenceSchema],
    procedures: [ProcedureIntelligenceSchema],
    views: [ViewIntelligenceSchema],
    relationships: [RelationshipIntelligenceSchema],
    businessEntities: [BusinessEntityIntelligenceSchema],

    // Analysis configuration
    analysisConfig: {
      includeTables: { type: Boolean, default: true },
      includeViews: { type: Boolean, default: true },
      includeProcedures: { type: Boolean, default: true },
      includeSystemObjects: { type: Boolean, default: false },
      confidenceThreshold: { type: Number, default: 0.7 },
      viewParsingEnabled: { type: Boolean, default: true },
      dateBasedScoringEnabled: { type: Boolean, default: true },
    },

    // Application scope
    appliesToDatabases: {
      type: String,
      default: 'all_customer_databases',
      enum: ['all_customer_databases', 'specific_list', 'pattern_match'],
    },
    databasePattern: { type: String }, // For pattern matching if needed

    // Performance tracking
    performanceMetrics: {
      lastAnalysisDuration: { type: Number }, // milliseconds
      averageQueryTime: { type: Number }, // milliseconds
      cacheHitRate: { type: Number }, // percentage
      memoryUsage: { type: Number }, // bytes
    },

    // AI Analysis results
    lastAIAnalysis: { type: Date },
    businessLogicInsights: [
      {
        procedureName: { type: String },
        operations: [{ type: String }], // create, read, update, delete
        referencedTables: [{ type: String }],
        businessRules: [{ type: String }],
      },
    ],

    // Selection management for code generation
    selections: [
      {
        selectionName: { type: String, required: true },
        description: { type: String },
        createdAt: { type: Date, default: Date.now },
        lastModified: { type: Date, default: Date.now },

        // Selected database objects
        selectedTables: [
          {
            tableName: String,
            reason: { type: String, default: 'user_selected' }, // user_selected, dependency, auto_included
            addedAt: { type: Date, default: Date.now },
          },
        ],
        selectedViews: [
          {
            viewName: String,
            reason: { type: String, default: 'user_selected' },
            addedAt: { type: Date, default: Date.now },
          },
        ],
        selectedProcedures: [
          {
            procedureName: String,
            reason: { type: String, default: 'user_selected' },
            addedAt: { type: Date, default: Date.now },
          },
        ],

        // Generation settings
        generationSettings: {
          includeDependencies: { type: Boolean, default: true },
          includeRelatedTables: { type: Boolean, default: true },
          generateGraphQL: { type: Boolean, default: true },
          generatePrisma: { type: Boolean, default: true },
          generateDocumentation: { type: Boolean, default: true },
          confidenceThreshold: { type: Number, default: 0.7 },
        },

        // Generation history
        generationHistory: [
          {
            generatedAt: { type: Date, default: Date.now },
            generationType: { type: String, enum: ['graphql', 'prisma', 'documentation', 'all'] },
            itemsGenerated: { type: Number, default: 0 },
            success: { type: Boolean, default: true },
            errorMessage: { type: String },
            outputFiles: [String], // List of generated file paths
          },
        ],

        // Selection statistics
        stats: {
          totalTables: { type: Number, default: 0 },
          totalViews: { type: Number, default: 0 },
          totalProcedures: { type: Number, default: 0 },
          lastGenerated: { type: Date },
          timesGenerated: { type: Number, default: 0 },
        },
      },
    ],

    // Active selection for current session
    activeSelection: { type: String }, // Name of currently active selection
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    collection: 'template20Intelligence',

    // Indexing strategy
    index: {
      templateSource: 1,
      analysisVersion: 1,
      lastFullAnalysis: -1,
    },
  }
);

// Compound indexes for common queries
Template20IntelligenceSchema.index({
  'businessEntities.entityType': 1,
  'businessEntities.confidence': -1,
});
Template20IntelligenceSchema.index({ 'tables.businessEntity': 1, 'tables.businessImportance': 1 });
Template20IntelligenceSchema.index({
  'procedures.businessEntity': 1,
  'procedures.overallConfidence': -1,
});
Template20IntelligenceSchema.index({
  'relationships.confidence': -1,
  'relationships.discoveredFrom': 1,
});

// Instance methods
Template20IntelligenceSchema.methods.getTablesForEntity = function (entityType) {
  return this.tables.filter(table => table.businessEntity === entityType);
};

Template20IntelligenceSchema.methods.getProceduresForEntity = function (
  entityType,
  minConfidence = 0.7
) {
  return this.procedures.filter(
    proc => proc.businessEntity === entityType && proc.overallConfidence >= minConfidence
  );
};

Template20IntelligenceSchema.methods.getRelationshipsForTable = function (tableName) {
  return this.relationships.filter(rel => rel.fromTable === tableName || rel.toTable === tableName);
};

Template20IntelligenceSchema.methods.getBusinessEntitySummary = function () {
  return this.businessEntities.map(entity => ({
    entityType: entity.entityType,
    primaryTable: entity.primaryTable,
    tableCount: this.getTablesForEntity(entity.entityType).length,
    procedureCount: this.getProceduresForEntity(entity.entityType).length,
    confidence: entity.confidence,
    businessImportance: entity.businessImportance,
  }));
};

// Selection management methods
Template20IntelligenceSchema.methods.createSelection = function (selectionName, description = '') {
  const selection = {
    selectionName,
    description,
    selectedTables: [],
    selectedViews: [],
    selectedProcedures: [],
    generationSettings: {
      includeDependencies: true,
      includeRelatedTables: true,
      generateGraphQL: true,
      generatePrisma: true,
      generateDocumentation: true,
      confidenceThreshold: 0.7,
    },
    generationHistory: [],
    stats: {
      totalTables: 0,
      totalViews: 0,
      totalProcedures: 0,
      timesGenerated: 0,
    },
  };

  this.selections.push(selection);
  this.activeSelection = selectionName;
  return selection;
};

Template20IntelligenceSchema.methods.getSelection = function (selectionName) {
  return this.selections.find(sel => sel.selectionName === selectionName);
};

Template20IntelligenceSchema.methods.deleteSelection = function (selectionName) {
  this.selections = this.selections.filter(sel => sel.selectionName !== selectionName);
  if (this.activeSelection === selectionName) {
    this.activeSelection = this.selections.length > 0 ? this.selections[0].selectionName : null;
  }
};

Template20IntelligenceSchema.methods.updateSelectionItems = function (
  selectionName,
  selectedTables = [],
  selectedViews = [],
  selectedProcedures = []
) {
  const selection = this.getSelection(selectionName);
  if (!selection) return false;

  // Update selected items with metadata
  selection.selectedTables = selectedTables.map(tableName => ({
    tableName,
    reason: 'user_selected',
    addedAt: new Date(),
  }));

  selection.selectedViews = selectedViews.map(viewName => ({
    viewName,
    reason: 'user_selected',
    addedAt: new Date(),
  }));

  selection.selectedProcedures = selectedProcedures.map(procedureName => ({
    procedureName,
    reason: 'user_selected',
    addedAt: new Date(),
  }));

  // Update stats
  selection.stats.totalTables = selectedTables.length;
  selection.stats.totalViews = selectedViews.length;
  selection.stats.totalProcedures = selectedProcedures.length;
  selection.lastModified = new Date();

  return true;
};

Template20IntelligenceSchema.methods.addDependenciesToSelection = function (
  selectionName,
  dependentTables = [],
  dependentViews = []
) {
  const selection = this.getSelection(selectionName);
  if (!selection) return false;

  // Add dependent tables
  dependentTables.forEach(tableName => {
    if (!selection.selectedTables.find(t => t.tableName === tableName)) {
      selection.selectedTables.push({
        tableName,
        reason: 'dependency',
        addedAt: new Date(),
      });
    }
  });

  // Add dependent views
  dependentViews.forEach(viewName => {
    if (!selection.selectedViews.find(v => v.viewName === viewName)) {
      selection.selectedViews.push({
        viewName,
        reason: 'dependency',
        addedAt: new Date(),
      });
    }
  });

  // Update stats
  selection.stats.totalTables = selection.selectedTables.length;
  selection.stats.totalViews = selection.selectedViews.length;
  selection.lastModified = new Date();

  return true;
};

Template20IntelligenceSchema.methods.recordGeneration = function (
  selectionName,
  generationType,
  itemsGenerated,
  success,
  outputFiles = [],
  errorMessage = null
) {
  const selection = this.getSelection(selectionName);
  if (!selection) return false;

  selection.generationHistory.push({
    generatedAt: new Date(),
    generationType,
    itemsGenerated,
    success,
    errorMessage,
    outputFiles,
  });

  if (success) {
    selection.stats.lastGenerated = new Date();
    selection.stats.timesGenerated++;
  }

  return true;
};

// Static methods for analysis operations
Template20IntelligenceSchema.statics.getLatestIntelligence = function () {
  return this.findOne({ templateSource: 'template20' }).sort({
    analysisVersion: -1,
    lastFullAnalysis: -1,
  });
};

Template20IntelligenceSchema.statics.getEntityIntelligence = function (
  entityType,
  minConfidence = 0.7
) {
  return this.aggregate([
    { $match: { templateSource: 'template20' } },
    { $sort: { analysisVersion: -1, lastFullAnalysis: -1 } },
    { $limit: 1 },
    { $unwind: '$businessEntities' },
    {
      $match: {
        'businessEntities.entityType': entityType,
        'businessEntities.confidence': { $gte: minConfidence },
      },
    },
    { $replaceRoot: { newRoot: '$businessEntities' } },
  ]);
};

// Pre-save middleware for calculated fields
Template20IntelligenceSchema.pre('save', function (next) {
  const now = new Date();

  // Calculate days since modified/created for procedures
  this.procedures.forEach(proc => {
    if (proc.modifyDate) {
      proc.daysSinceModified = Math.floor((now - proc.modifyDate) / (1000 * 60 * 60 * 24));
    }
    if (proc.createDate) {
      proc.daysSinceCreated = Math.floor((now - proc.createDate) / (1000 * 60 * 60 * 24));
    }

    // Calculate recency score
    if (proc.daysSinceModified !== undefined) {
      if (proc.daysSinceModified <= 30) proc.recencyScore = 1.0;
      else if (proc.daysSinceModified <= 90) proc.recencyScore = 0.9;
      else if (proc.daysSinceModified <= 365) proc.recencyScore = 0.7;
      else if (proc.daysSinceModified <= 1095) proc.recencyScore = 0.5;
      else proc.recencyScore = 0.3;
    }

    // Calculate maintenance score
    if (proc.modifyDate && proc.createDate && proc.modifyDate > proc.createDate) {
      proc.maintenanceScore = 1.2;
    }

    // Calculate overall confidence
    proc.overallConfidence = Math.min(
      (proc.recencyScore + proc.patternScore + (proc.maintenanceScore - 1.0)) / 2.2,
      1.0
    );
  });

  // Update schema statistics
  this.schemaStats.totalTables = this.tables.length;
  this.schemaStats.totalViews = this.views.length;
  this.schemaStats.totalProcedures = this.procedures.length;
  this.schemaStats.totalRelationships = this.relationships.length;
  this.schemaStats.businessEntitiesDetected = this.businessEntities.length;

  next();
});

module.exports = mongoose.model('Template20Intelligence', Template20IntelligenceSchema);
