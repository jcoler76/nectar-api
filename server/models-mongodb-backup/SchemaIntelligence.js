const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * SchemaIntelligence Model
 * Stores retrieved table schemas, view definitions, and stored procedure code
 * Links to DatabaseObject selections and tracks data freshness
 */

// Sub-schemas for embedded documents
const ColumnDefinitionSchema = new Schema(
  {
    columnName: { type: String, required: true, index: true },
    ordinalPosition: { type: Number, required: true },
    dataType: { type: String, required: true },
    maxLength: { type: Number },
    precision: { type: Number },
    scale: { type: Number },
    isNullable: { type: Boolean, default: true },
    defaultValue: { type: String },
    isIdentity: { type: Boolean, default: false },
    isPrimaryKey: { type: Boolean, default: false },
    isForeignKey: { type: Boolean, default: false },

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

    // Foreign key details
    referencedTable: { type: String },
    referencedColumn: { type: String },
    foreignKeyConstraintName: { type: String },
  },
  { _id: false }
);

const IndexDefinitionSchema = new Schema(
  {
    indexName: { type: String, required: true },
    indexType: {
      type: String,
      enum: ['CLUSTERED', 'NONCLUSTERED', 'PRIMARY', 'UNIQUE'],
      required: true,
    },
    isUnique: { type: Boolean, default: false },
    isPrimaryKey: { type: Boolean, default: false },
    columns: [
      {
        columnName: { type: String, required: true },
        isDescending: { type: Boolean, default: false },
        keyOrdinal: { type: Number },
      },
    ],
    includedColumns: [{ type: String }],
    filterDefinition: { type: String },
  },
  { _id: false }
);

const ForeignKeyDefinitionSchema = new Schema(
  {
    constraintName: { type: String, required: true },
    fromColumn: { type: String, required: true },
    toTable: { type: String, required: true },
    toColumn: { type: String, required: true },
    deleteRule: {
      type: String,
      enum: ['CASCADE', 'SET NULL', 'SET DEFAULT', 'NO ACTION'],
      default: 'NO ACTION',
    },
    updateRule: {
      type: String,
      enum: ['CASCADE', 'SET NULL', 'SET DEFAULT', 'NO ACTION'],
      default: 'NO ACTION',
    },
    isEnabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const ParameterDefinitionSchema = new Schema(
  {
    parameterName: { type: String, required: true },
    ordinalPosition: { type: Number, required: true },
    dataType: { type: String, required: true },
    maxLength: { type: Number },
    precision: { type: Number },
    scale: { type: Number },
    isOutput: { type: Boolean, default: false },
    hasDefaultValue: { type: Boolean, default: false },
    defaultValue: { type: String },

    // Business context
    businessContext: { type: String }, // e.g., "customer identifier", "date range filter"
    isRequired: { type: Boolean, default: true },
  },
  { _id: false }
);

const ViewDependencySchema = new Schema(
  {
    dependentTable: { type: String, required: true },
    joinType: { type: String, enum: ['INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS'], default: 'INNER' },
    joinCondition: { type: String },
    aliasName: { type: String },
    isBaseTabe: { type: Boolean, default: false }, // The main table in FROM clause
  },
  { _id: false }
);

// Main Schema Definition
const SchemaIntelligenceSchema = new Schema(
  {
    // Link to DatabaseObject selection
    databaseObjectId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'DatabaseObject',
      index: true,
    },

    // Service and object identification
    serviceId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Service',
      index: true,
    },
    objectName: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    objectType: {
      type: String,
      required: true,
      enum: ['table', 'view', 'procedure'],
      index: true,
    },
    schemaName: {
      type: String,
      default: 'dbo',
      index: true,
    },

    // Retrieval metadata
    retrievedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    retrievedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    retrievalVersion: {
      type: String,
      default: 'v1.0',
    },

    // Data freshness tracking
    sourceLastModified: { type: Date }, // When the DB object was last modified
    isStale: {
      type: Boolean,
      default: false,
      index: true,
    },
    staleCheckLastRun: { type: Date },

    // === TABLE-SPECIFIC SCHEMA ===
    tableSchema: {
      // Basic table information
      tableType: { type: String, enum: ['BASE TABLE', 'VIEW'] },
      rowCount: { type: Number, default: 0 },
      createdDate: { type: Date },
      modifiedDate: { type: Date },

      // Column definitions
      columns: [ColumnDefinitionSchema],

      // Index definitions
      indexes: [IndexDefinitionSchema],

      // Foreign key relationships
      foreignKeys: [ForeignKeyDefinitionSchema],

      // Table statistics
      stats: {
        totalColumns: { type: Number, default: 0 },
        nullableColumns: { type: Number, default: 0 },
        identityColumns: { type: Number, default: 0 },
        foreignKeyColumns: { type: Number, default: 0 },
        indexCount: { type: Number, default: 0 },
        uniqueIndexCount: { type: Number, default: 0 },
      },
    },

    // === VIEW-SPECIFIC SCHEMA ===
    viewSchema: {
      // View definition
      viewDefinition: {
        type: String,
        required: function () {
          return this.objectType === 'view';
        },
      },
      isSchemabound: { type: Boolean, default: false },
      isCheckOption: { type: Boolean, default: false },
      isUpdatable: { type: Boolean, default: false },

      // Parsed view analysis
      complexityScore: {
        type: String,
        enum: ['simple', 'moderate', 'complex', 'very_complex'],
        default: 'moderate',
      },
      joinCount: { type: Number, default: 0 },
      subqueryCount: { type: Number, default: 0 },
      caseStatementCount: { type: Number, default: 0 },
      unionCount: { type: Number, default: 0 },
      cteCount: { type: Number, default: 0 }, // Common Table Expressions

      // Dependencies extracted from view
      dependencies: [ViewDependencySchema],

      // Column mappings from source tables
      columnMappings: [
        {
          viewColumn: { type: String, required: true },
          sourceTable: { type: String },
          sourceColumn: { type: String },
          expression: { type: String }, // Full column expression if computed
          dataType: { type: String },
          isComputed: { type: Boolean, default: false },
        },
      ],

      // View statistics
      stats: {
        totalColumns: { type: Number, default: 0 },
        computedColumns: { type: Number, default: 0 },
        dependentTables: { type: Number, default: 0 },
        estimatedRowCount: { type: Number, default: 0 },
      },
    },

    // === PROCEDURE-SPECIFIC SCHEMA ===
    procedureSchema: {
      // Procedure definition
      procedureDefinition: {
        type: String,
        required: function () {
          return this.objectType === 'procedure';
        },
      },
      returnType: { type: String },
      createdDate: { type: Date },
      modifiedDate: { type: Date },

      // Parameter definitions
      parameters: [ParameterDefinitionSchema],

      // Procedure analysis
      procedureType: {
        type: String,
        enum: [
          'get',
          'save',
          'delete',
          'search',
          'report',
          'validation',
          'calculation',
          'maintenance',
          'other',
        ],
        default: 'other',
      },

      // Code complexity analysis
      complexityMetrics: {
        lineCount: { type: Number, default: 0 },
        statementCount: { type: Number, default: 0 },
        ifStatementCount: { type: Number, default: 0 },
        whileLoopCount: { type: Number, default: 0 },
        cursorCount: { type: Number, default: 0 },
        tryBlockCount: { type: Number, default: 0 },
        tempTableCount: { type: Number, default: 0 },
      },

      // Database objects referenced
      referencedObjects: [
        {
          objectName: { type: String, required: true },
          objectType: { type: String, enum: ['table', 'view', 'procedure', 'function'] },
          accessType: { type: String, enum: ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'EXECUTE'] },
          schemaName: { type: String, default: 'dbo' },
        },
      ],

      // Procedure statistics
      stats: {
        totalParameters: { type: Number, default: 0 },
        inputParameters: { type: Number, default: 0 },
        outputParameters: { type: Number, default: 0 },
        referencedTableCount: { type: Number, default: 0 },
        estimatedExecutionComplexity: {
          type: String,
          enum: ['low', 'medium', 'high', 'very_high'],
          default: 'medium',
        },
      },
    },

    // === BUSINESS INTELLIGENCE INTEGRATION ===
    businessContext: {
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
          'reporting',
        ],
        index: true,
      },
      businessImportance: {
        type: String,
        enum: ['critical', 'important', 'reference', 'system'],
        default: 'reference',
      },
      businessDescription: { type: String },
      keyBusinessRules: [{ type: String }],
      commonUseCases: [{ type: String }],
      relatedEntities: [
        {
          entityName: { type: String },
          relationshipType: { type: String },
          description: { type: String },
        },
      ],
    },

    // === AI PROCESSING STATUS ===
    aiProcessing: {
      hasBeenAnalyzed: {
        type: Boolean,
        default: false,
        index: true,
      },
      analyzedAt: { type: Date },
      analysisVersion: { type: String },

      // AI-generated insights
      aiInsights: {
        dataQualityScore: { type: Number, min: 0, max: 1 },
        usabilityScore: { type: Number, min: 0, max: 1 },
        complexityAssessment: { type: String },
        recommendations: [{ type: String }],
        potentialIssues: [{ type: String }],
        optimizationSuggestions: [{ type: String }],
      },

      // Generated artifacts tracking
      generatedArtifacts: [
        {
          artifactType: {
            type: String,
            enum: [
              'graphql_schema',
              'graphql_resolvers',
              'prisma_schema',
              'typescript_types',
              'documentation',
            ],
            required: true,
          },
          artifactId: { type: Schema.Types.ObjectId, ref: 'GeneratedArtifact' },
          generatedAt: { type: Date, default: Date.now },
          isLatest: { type: Boolean, default: true },
        },
      ],
    },

    // === VERSIONING AND CHANGE TRACKING ===
    version: {
      type: Number,
      default: 1,
      index: true,
    },
    changeHistory: [
      {
        version: { type: Number, required: true },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        changeType: {
          type: String,
          enum: ['initial_retrieval', 'schema_update', 'metadata_update', 'ai_analysis'],
          required: true,
        },
        changeDescription: { type: String },
        previousVersion: { type: Number },
      },
    ],

    // === PERFORMANCE AND QUALITY METRICS ===
    qualityMetrics: {
      completenessScore: { type: Number, min: 0, max: 1, default: 1 }, // How complete is the retrieved schema
      confidenceScore: { type: Number, min: 0, max: 1, default: 0.9 }, // Confidence in the retrieval accuracy
      businessRelevanceScore: { type: Number, min: 0, max: 1 }, // How relevant for business use
      technicalComplexityScore: { type: Number, min: 0, max: 1 }, // Technical complexity assessment
    },

    // === STATUS AND FLAGS ===
    status: {
      type: String,
      enum: ['active', 'deprecated', 'archived', 'error'],
      default: 'active',
      index: true,
    },
    flags: {
      requiresReanalysis: { type: Boolean, default: false },
      hasErrors: { type: Boolean, default: false },
      isLargeObject: { type: Boolean, default: false }, // For objects with many columns/lines
      isPotentiallyUnsafe: { type: Boolean, default: false }, // For procedures with dynamic SQL, etc.
    },

    // === ERROR TRACKING ===
    errors: [
      {
        errorType: {
          type: String,
          enum: ['retrieval_error', 'parsing_error', 'analysis_error', 'connection_error'],
          required: true,
        },
        errorMessage: { type: String, required: true },
        errorDetails: { type: String },
        occurredAt: { type: Date, default: Date.now },
        isResolved: { type: Boolean, default: false },
        resolvedAt: { type: Date },
        resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    // === USAGE TRACKING ===
    usage: {
      accessCount: { type: Number, default: 0 },
      lastAccessed: { type: Date },
      lastAccessedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      generationCount: { type: Number, default: 0 }, // How many times used for AI generation
      lastGenerated: { type: Date },
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    collection: 'schemaIntelligence',
  }
);

// Compound indexes for performance
SchemaIntelligenceSchema.index({ serviceId: 1, objectType: 1 });
SchemaIntelligenceSchema.index({ serviceId: 1, objectName: 1 });
SchemaIntelligenceSchema.index({ objectType: 1, status: 1 });
SchemaIntelligenceSchema.index({
  'businessContext.businessEntity': 1,
  'businessContext.businessImportance': 1,
});
SchemaIntelligenceSchema.index({ 'aiProcessing.hasBeenAnalyzed': 1, status: 1 });
SchemaIntelligenceSchema.index({ retrievedAt: -1, isStale: 1 });

// Unique constraint to prevent duplicate schema records
SchemaIntelligenceSchema.index(
  { serviceId: 1, objectName: 1, objectType: 1, version: 1 },
  { unique: true }
);

// Instance methods
SchemaIntelligenceSchema.methods.markAsStale = function () {
  this.isStale = true;
  this.staleCheckLastRun = new Date();
  return this.save();
};

SchemaIntelligenceSchema.methods.updateUsageStats = function (userId) {
  this.usage.accessCount += 1;
  this.usage.lastAccessed = new Date();
  this.usage.lastAccessedBy = userId;
  return this.save();
};

SchemaIntelligenceSchema.methods.addChangeRecord = function (changeType, description, userId) {
  this.changeHistory.push({
    version: this.version,
    changedBy: userId,
    changeType,
    changeDescription: description,
    previousVersion: this.version > 1 ? this.version - 1 : null,
  });
  return this;
};

SchemaIntelligenceSchema.methods.createNewVersion = function (changeType, description, userId) {
  this.version += 1;
  this.addChangeRecord(changeType, description, userId);
  return this.save();
};

SchemaIntelligenceSchema.methods.addError = function (errorType, message, details = null) {
  this.errors.push({
    errorType,
    errorMessage: message,
    errorDetails: details,
  });
  this.flags.hasErrors = true;
  return this.save();
};

SchemaIntelligenceSchema.methods.resolveError = function (errorId, userId) {
  const error = this.errors.id(errorId);
  if (error) {
    error.isResolved = true;
    error.resolvedAt = new Date();
    error.resolvedBy = userId;

    // Check if all errors are resolved
    const unresolvedErrors = this.errors.filter(err => !err.isResolved);
    if (unresolvedErrors.length === 0) {
      this.flags.hasErrors = false;
    }
  }
  return this.save();
};

SchemaIntelligenceSchema.methods.getColumnByName = function (columnName) {
  if (this.objectType === 'table' && this.tableSchema.columns) {
    return this.tableSchema.columns.find(col => col.columnName === columnName);
  }
  return null;
};

SchemaIntelligenceSchema.methods.getPrimaryKeyColumns = function () {
  if (this.objectType === 'table' && this.tableSchema.columns) {
    return this.tableSchema.columns.filter(col => col.isPrimaryKey);
  }
  return [];
};

SchemaIntelligenceSchema.methods.getForeignKeyRelationships = function () {
  if (this.objectType === 'table' && this.tableSchema.foreignKeys) {
    return this.tableSchema.foreignKeys;
  }
  return [];
};

// Static methods for common queries
SchemaIntelligenceSchema.statics.getByService = function (serviceId, options = {}) {
  const query = { serviceId, status: 'active' };

  if (options.objectType) {
    query.objectType = options.objectType;
  }

  if (options.businessEntity) {
    query['businessContext.businessEntity'] = options.businessEntity;
  }

  if (options.onlyStale) {
    query.isStale = true;
  }

  return this.find(query).sort({ retrievedAt: -1 });
};

SchemaIntelligenceSchema.statics.getPendingAIAnalysis = function (serviceId) {
  return this.find({
    serviceId,
    status: 'active',
    'aiProcessing.hasBeenAnalyzed': false,
  }).sort({ 'businessContext.businessImportance': 1, retrievedAt: 1 });
};

SchemaIntelligenceSchema.statics.getSchemaStats = function (serviceId) {
  return this.aggregate([
    { $match: { serviceId: mongoose.Types.ObjectId(serviceId), status: 'active' } },
    {
      $group: {
        _id: '$objectType',
        count: { $sum: 1 },
        analyzed: { $sum: { $cond: ['$aiProcessing.hasBeenAnalyzed', 1, 0] } },
        stale: { $sum: { $cond: ['$isStale', 1, 0] } },
        errors: { $sum: { $cond: ['$flags.hasErrors', 1, 0] } },
        lastRetrieved: { $max: '$retrievedAt' },
      },
    },
  ]);
};

SchemaIntelligenceSchema.statics.findRelatedObjects = function (serviceId, tableName) {
  return this.find({
    serviceId,
    status: 'active',
    $or: [
      { 'tableSchema.foreignKeys.toTable': tableName },
      { 'viewSchema.dependencies.dependentTable': tableName },
      { 'procedureSchema.referencedObjects.objectName': tableName },
    ],
  });
};

// Pre-save middleware for calculations
SchemaIntelligenceSchema.pre('save', function (next) {
  // Calculate table statistics
  if (this.objectType === 'table' && this.tableSchema.columns) {
    const cols = this.tableSchema.columns;
    this.tableSchema.stats.totalColumns = cols.length;
    this.tableSchema.stats.nullableColumns = cols.filter(col => col.isNullable).length;
    this.tableSchema.stats.identityColumns = cols.filter(col => col.isIdentity).length;
    this.tableSchema.stats.foreignKeyColumns = cols.filter(col => col.isForeignKey).length;
  }

  // Calculate view statistics
  if (this.objectType === 'view' && this.viewSchema.columnMappings) {
    const mappings = this.viewSchema.columnMappings;
    this.viewSchema.stats.totalColumns = mappings.length;
    this.viewSchema.stats.computedColumns = mappings.filter(mapping => mapping.isComputed).length;
  }

  // Calculate procedure statistics
  if (this.objectType === 'procedure' && this.procedureSchema.parameters) {
    const params = this.procedureSchema.parameters;
    this.procedureSchema.stats.totalParameters = params.length;
    this.procedureSchema.stats.inputParameters = params.filter(param => !param.isOutput).length;
    this.procedureSchema.stats.outputParameters = params.filter(param => param.isOutput).length;
  }

  // Set large object flag
  if (this.objectType === 'table' && this.tableSchema.stats.totalColumns > 50) {
    this.flags.isLargeObject = true;
  } else if (
    this.objectType === 'procedure' &&
    this.procedureSchema.complexityMetrics.lineCount > 500
  ) {
    this.flags.isLargeObject = true;
  }

  next();
});

// Virtual for human-readable object identifier
SchemaIntelligenceSchema.virtual('fullObjectName').get(function () {
  return `${this.schemaName}.${this.objectName}`;
});

// Virtual for retrieval age in days
SchemaIntelligenceSchema.virtual('retrievalAge').get(function () {
  return Math.floor((Date.now() - this.retrievedAt) / (1000 * 60 * 60 * 24));
});

// Transform for JSON output
SchemaIntelligenceSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('SchemaIntelligence', SchemaIntelligenceSchema);
