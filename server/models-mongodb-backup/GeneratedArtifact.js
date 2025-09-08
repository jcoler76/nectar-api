const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * GeneratedArtifact Model
 * Stores AI-generated GraphQL schemas, resolvers, Prisma models, and documentation
 * Links to source SchemaIntelligence records
 */

const GeneratedArtifactSchema = new Schema(
  {
    // Service association
    serviceId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Service',
      index: true,
    },

    // Artifact identification
    artifactType: {
      type: String,
      required: true,
      enum: [
        'graphql_schema',
        'graphql_resolvers',
        'prisma_schema',
        'typescript_types',
        'documentation',
        'api_client',
        'migration_script',
      ],
      index: true,
    },
    artifactName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },

    // Generation metadata
    generatedBy: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    generatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    generationDuration: {
      type: Number, // milliseconds
    },

    // Source schemas used for generation
    sourceSchemas: [
      {
        type: Schema.Types.ObjectId,
        ref: 'SchemaIntelligence',
      },
    ],
    sourceDatabaseObjects: [
      {
        type: Schema.Types.ObjectId,
        ref: 'DatabaseObject',
      },
    ],

    // AI generation details
    aiModel: {
      type: String,
      required: true,
      default: 'gpt-4',
    },
    aiProvider: {
      type: String,
      default: 'openai',
    },
    prompt: {
      type: String,
      required: true,
    },
    temperature: {
      type: Number,
      default: 0.3,
    },
    maxTokens: {
      type: Number,
      default: 4000,
    },

    // Generated content
    content: {
      // Main artifact content
      primary: {
        type: String,
        required: true,
      },

      // Additional related content (e.g., type definitions with schema)
      secondary: {
        type: String,
      },

      // Formatted versions
      formatted: {
        json: { type: String },
        yaml: { type: String },
        markdown: { type: String },
      },

      // Extracted sections for easy access
      sections: [
        {
          name: { type: String },
          content: { type: String },
          startLine: { type: Number },
          endLine: { type: Number },
        },
      ],
    },

    // Metadata about the generated artifact
    metadata: {
      // Statistics
      lineCount: { type: Number },
      characterCount: { type: Number },
      tokenCount: { type: Number },

      // Content analysis
      typeCount: { type: Number }, // For schemas: number of types/models
      fieldCount: { type: Number }, // For schemas: total fields
      relationCount: { type: Number }, // Number of relationships

      // Quality metrics
      completenessScore: {
        type: Number,
        min: 0,
        max: 1,
      },
      validationScore: {
        type: Number,
        min: 0,
        max: 1,
      },

      // Generation context
      sourceTableCount: { type: Number },
      sourceViewCount: { type: Number },
      sourceProcedureCount: { type: Number },

      // Custom metadata based on artifact type
      custom: Schema.Types.Mixed,
    },

    // Versioning
    version: {
      type: String,
      default: '1.0.0',
      index: true,
    },
    previousVersion: {
      type: Schema.Types.ObjectId,
      ref: 'GeneratedArtifact',
    },
    isLatest: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Validation and quality
    validation: {
      isValid: {
        type: Boolean,
        default: true,
      },
      errors: [
        {
          type: { type: String },
          message: { type: String },
          line: { type: Number },
          column: { type: Number },
          severity: {
            type: String,
            enum: ['error', 'warning', 'info'],
          },
        },
      ],
      warnings: [
        {
          type: { type: String },
          message: { type: String },
          suggestion: { type: String },
        },
      ],

      // Validation timestamps
      lastValidated: { type: Date },
      validatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },

    // Usage tracking
    usage: {
      downloadCount: {
        type: Number,
        default: 0,
      },
      lastDownloaded: { type: Date },
      lastDownloadedBy: { type: Schema.Types.ObjectId, ref: 'User' },

      deploymentCount: {
        type: Number,
        default: 0,
      },
      lastDeployed: { type: Date },
      deploymentEnvironments: [{ type: String }],

      // Integration tracking
      integratedInProjects: [
        {
          projectName: { type: String },
          integratedAt: { type: Date },
          integratedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        },
      ],
    },

    // File storage (if artifact is saved as file)
    fileStorage: {
      hasFile: {
        type: Boolean,
        default: false,
      },
      fileName: { type: String },
      filePath: { type: String },
      fileSize: { type: Number }, // bytes
      mimeType: { type: String },
      encoding: {
        type: String,
        default: 'utf-8',
      },
      checksum: { type: String }, // For integrity verification
    },

    // Status and lifecycle
    status: {
      type: String,
      enum: ['active', 'deprecated', 'archived', 'draft'],
      default: 'active',
      index: true,
    },

    deprecationInfo: {
      deprecatedAt: { type: Date },
      deprecatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      deprecationReason: { type: String },
      replacedBy: { type: Schema.Types.ObjectId, ref: 'GeneratedArtifact' },
    },

    // Tags and categorization
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    category: {
      type: String,
      enum: ['schema', 'api', 'documentation', 'client', 'migration', 'other'],
      default: 'schema',
    },

    // Business context
    businessContext: {
      businessEntities: [
        {
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
        },
      ],
      businessImportance: {
        type: String,
        enum: ['critical', 'important', 'reference', 'system'],
        default: 'reference',
      },
      intendedAudience: [
        {
          type: String,
          enum: ['developers', 'architects', 'business_analysts', 'qa_engineers', 'devops'],
        },
      ],
    },

    // Comments and collaboration
    comments: [
      {
        author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        isResolved: { type: Boolean, default: false },
      },
    ],

    // Approval workflow
    approval: {
      isRequired: { type: Boolean, default: false },
      approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      approvedAt: { type: Date },
      approvalNotes: { type: String },
      rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      rejectedAt: { type: Date },
      rejectionReason: { type: String },
    },

    // Custom fields for extensibility
    customFields: Schema.Types.Mixed,
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    collection: 'generatedArtifacts',
  }
);

// Indexes for performance
GeneratedArtifactSchema.index({ serviceId: 1, artifactType: 1, status: 1 });
GeneratedArtifactSchema.index({ serviceId: 1, isLatest: 1 });
GeneratedArtifactSchema.index({ generatedAt: -1 });
GeneratedArtifactSchema.index({ 'businessContext.businessEntities': 1 });
GeneratedArtifactSchema.index({ tags: 1 });
GeneratedArtifactSchema.index({ sourceSchemas: 1 });

// Compound index for finding latest version
GeneratedArtifactSchema.index(
  { serviceId: 1, artifactType: 1, artifactName: 1, isLatest: 1 },
  { unique: true, partialFilterExpression: { isLatest: true } }
);

// Instance methods
GeneratedArtifactSchema.methods.incrementDownloadCount = function (userId) {
  this.usage.downloadCount += 1;
  this.usage.lastDownloaded = new Date();
  this.usage.lastDownloadedBy = userId;
  return this.save();
};

GeneratedArtifactSchema.methods.recordDeployment = function (environment, userId) {
  this.usage.deploymentCount += 1;
  this.usage.lastDeployed = new Date();
  if (!this.usage.deploymentEnvironments.includes(environment)) {
    this.usage.deploymentEnvironments.push(environment);
  }
  return this.save();
};

GeneratedArtifactSchema.methods.deprecate = function (reason, replacementId, userId) {
  this.status = 'deprecated';
  this.deprecationInfo = {
    deprecatedAt: new Date(),
    deprecatedBy: userId,
    deprecationReason: reason,
    replacedBy: replacementId,
  };
  this.isLatest = false;
  return this.save();
};

GeneratedArtifactSchema.methods.validate = async function () {
  const errors = [];
  const warnings = [];

  // Perform validation based on artifact type
  switch (this.artifactType) {
    case 'graphql_schema':
      // Validate GraphQL schema syntax
      try {
        // This would use a GraphQL parser
        // const { parse } = require('graphql');
        // parse(this.content.primary);
      } catch (error) {
        errors.push({
          type: 'syntax_error',
          message: error.message,
          severity: 'error',
        });
      }
      break;

    case 'prisma_schema':
      // Validate Prisma schema syntax
      // Would use Prisma validation tools
      break;

    case 'typescript_types':
      // Validate TypeScript syntax
      // Would use TypeScript compiler API
      break;
  }

  // Update validation status
  this.validation = {
    isValid: errors.length === 0,
    errors,
    warnings,
    lastValidated: new Date(),
  };

  return this.validation;
};

GeneratedArtifactSchema.methods.createNewVersion = async function (newContent, userId) {
  // Mark current as not latest
  this.isLatest = false;
  await this.save();

  // Create new version
  const newVersion = new this.constructor({
    ...this.toObject(),
    _id: undefined,
    content: newContent,
    version: this.incrementVersion(this.version),
    previousVersion: this._id,
    isLatest: true,
    generatedBy: userId,
    generatedAt: new Date(),
    createdAt: undefined,
    updatedAt: undefined,
  });

  return await newVersion.save();
};

GeneratedArtifactSchema.methods.incrementVersion = function (version) {
  const parts = version.split('.');
  parts[2] = (parseInt(parts[2]) + 1).toString();
  return parts.join('.');
};

GeneratedArtifactSchema.methods.addComment = function (userId, content) {
  this.comments.push({
    author: userId,
    content,
    createdAt: new Date(),
  });
  return this.save();
};

// Static methods
GeneratedArtifactSchema.statics.findLatestByType = function (serviceId, artifactType) {
  return this.findOne({
    serviceId,
    artifactType,
    isLatest: true,
    status: 'active',
  });
};

GeneratedArtifactSchema.statics.findBySourceSchema = function (schemaId) {
  return this.find({
    sourceSchemas: schemaId,
    status: 'active',
  }).sort({ generatedAt: -1 });
};

GeneratedArtifactSchema.statics.getGenerationStats = function (serviceId) {
  return this.aggregate([
    { $match: { serviceId: mongoose.Types.ObjectId(serviceId) } },
    {
      $group: {
        _id: '$artifactType',
        count: { $sum: 1 },
        latestGeneration: { $max: '$generatedAt' },
        totalDownloads: { $sum: '$usage.downloadCount' },
        totalDeployments: { $sum: '$usage.deploymentCount' },
      },
    },
  ]);
};

GeneratedArtifactSchema.statics.findPendingApproval = function (serviceId) {
  return this.find({
    serviceId,
    'approval.isRequired': true,
    'approval.approvedAt': { $exists: false },
    'approval.rejectedAt': { $exists: false },
    status: 'active',
  }).populate('generatedBy', 'username email');
};

// Pre-save middleware
GeneratedArtifactSchema.pre('save', function (next) {
  // Auto-generate artifact name if not provided
  if (!this.artifactName) {
    const timestamp = new Date().toISOString().split('T')[0];
    this.artifactName = `${this.artifactType}_${timestamp}`;
  }

  // Calculate content metrics
  if (this.content && this.content.primary) {
    this.metadata.lineCount = this.content.primary.split('\n').length;
    this.metadata.characterCount = this.content.primary.length;
    // Token count would be calculated using tiktoken or similar
  }

  // Set category based on artifact type
  const categoryMap = {
    graphql_schema: 'schema',
    graphql_resolvers: 'api',
    prisma_schema: 'schema',
    typescript_types: 'schema',
    documentation: 'documentation',
    api_client: 'client',
    migration_script: 'migration',
  };
  this.category = categoryMap[this.artifactType] || 'other';

  next();
});

// Virtual for age in days
GeneratedArtifactSchema.virtual('ageInDays').get(function () {
  return Math.floor((Date.now() - this.generatedAt) / (1000 * 60 * 60 * 24));
});

// Virtual for formatted file size
GeneratedArtifactSchema.virtual('formattedFileSize').get(function () {
  if (!this.fileStorage.fileSize) return 'N/A';
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (this.fileStorage.fileSize === 0) return '0 Bytes';
  const i = parseInt(Math.floor(Math.log(this.fileStorage.fileSize) / Math.log(1024)));
  return Math.round(this.fileStorage.fileSize / Math.pow(1024, i), 2) + ' ' + sizes[i];
});

// Transform for JSON output
GeneratedArtifactSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v;
    // Optionally hide sensitive information
    if (ret.prompt && ret.prompt.length > 500) {
      ret.prompt = ret.prompt.substring(0, 500) + '...';
    }
    return ret;
  },
});

module.exports = mongoose.model('GeneratedArtifact', GeneratedArtifactSchema);
