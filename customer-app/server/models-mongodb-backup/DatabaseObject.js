const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * DatabaseObject Model
 * Stores object selection metadata for individual database objects
 * Links to services and tracks selection state
 */

const DatabaseObjectSchema = new Schema(
  {
    // Service relationship
    serviceId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Service',
      index: true,
    },

    // Object identification
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

    // Selection metadata
    selectionReason: {
      type: String,
      enum: ['user_selected', 'dependency', 'auto_included'],
      default: 'user_selected',
      index: true,
    },
    selectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Business intelligence metadata (copied from Template20Intelligence)
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
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.8,
    },

    // Selection grouping
    selectionGroup: {
      type: String,
      default: 'default',
      index: true,
    },
    selectionSession: {
      type: String,
      index: true,
    },

    // Schema intelligence linking
    schemaRetrieved: {
      type: Boolean,
      default: false,
      index: true,
    },
    schemaRetrievedAt: { type: Date },
    schemaVersion: { type: String },

    // Generation tracking
    aiGenerated: {
      type: Boolean,
      default: false,
      index: true,
    },
    aiGeneratedAt: { type: Date },
    generationVersion: { type: String },

    // Additional metadata
    notes: { type: String },
    tags: [{ type: String }],
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },

    // Status tracking
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastAccessed: { type: Date },
    accessCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    collection: 'databaseObjects',
  }
);

// Compound indexes for common queries
DatabaseObjectSchema.index({ serviceId: 1, objectType: 1 });
DatabaseObjectSchema.index({ serviceId: 1, selectionGroup: 1 });
DatabaseObjectSchema.index({ serviceId: 1, isActive: 1 });
DatabaseObjectSchema.index({ businessEntity: 1, businessImportance: 1 });
DatabaseObjectSchema.index({ schemaRetrieved: 1, aiGenerated: 1 });

// Unique constraint to prevent duplicate selections
DatabaseObjectSchema.index({ serviceId: 1, objectName: 1, objectType: 1 }, { unique: true });

// Instance methods
DatabaseObjectSchema.methods.markSchemaRetrieved = function (version = 'v1.0') {
  this.schemaRetrieved = true;
  this.schemaRetrievedAt = new Date();
  this.schemaVersion = version;
  return this.save();
};

DatabaseObjectSchema.methods.markAIGenerated = function (version = 'v1.0') {
  this.aiGenerated = true;
  this.aiGeneratedAt = new Date();
  this.generationVersion = version;
  return this.save();
};

DatabaseObjectSchema.methods.updateAccess = function () {
  this.lastAccessed = new Date();
  this.accessCount += 1;
  return this.save();
};

// Static methods for common queries
DatabaseObjectSchema.statics.getSelectionsByService = function (serviceId, options = {}) {
  const query = { serviceId, isActive: true };

  if (options.objectType) {
    query.objectType = options.objectType;
  }

  if (options.selectionGroup) {
    query.selectionGroup = options.selectionGroup;
  }

  if (options.businessEntity) {
    query.businessEntity = options.businessEntity;
  }

  return this.find(query).sort({ createdAt: -1 });
};

DatabaseObjectSchema.statics.getSelectionStats = function (serviceId) {
  return this.aggregate([
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
        stats: {
          $push: {
            type: '$_id',
            count: '$count',
            schemaRetrieved: '$schemaRetrieved',
            aiGenerated: '$aiGenerated',
          },
        },
        totalObjects: { $sum: '$count' },
        lastModified: { $max: '$lastModified' },
      },
    },
  ]);
};

DatabaseObjectSchema.statics.getBusinessEntityBreakdown = function (serviceId) {
  return this.aggregate([
    { $match: { serviceId: mongoose.Types.ObjectId(serviceId), isActive: true } },
    {
      $group: {
        _id: '$businessEntity',
        count: { $sum: 1 },
        types: { $addToSet: '$objectType' },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

DatabaseObjectSchema.statics.getPendingSchemaRetrieval = function (serviceId) {
  return this.find({
    serviceId,
    isActive: true,
    schemaRetrieved: false,
  }).sort({ priority: 1, createdAt: 1 });
};

DatabaseObjectSchema.statics.getPendingAIGeneration = function (serviceId) {
  return this.find({
    serviceId,
    isActive: true,
    schemaRetrieved: true,
    aiGenerated: false,
  }).sort({ priority: 1, createdAt: 1 });
};

// Pre-save middleware
DatabaseObjectSchema.pre('save', function (next) {
  // Generate selection session if not provided
  if (!this.selectionSession) {
    this.selectionSession = `session_${new Date().getTime()}`;
  }

  // Set business metadata from Template20Intelligence if available
  if (!this.businessEntity) {
    // This could be enhanced to automatically lookup from Template20Intelligence
    this.businessEntity = 'reference';
  }

  next();
});

// Post-save middleware for logging
DatabaseObjectSchema.post('save', function (doc) {
  console.log(
    `DatabaseObject saved: ${doc.objectType} ${doc.objectName} for service ${doc.serviceId}`
  );
});

// Virtual for full object identifier
DatabaseObjectSchema.virtual('fullIdentifier').get(function () {
  return `${this.objectType}:${this.objectName}`;
});

// Virtual for selection age
DatabaseObjectSchema.virtual('selectionAge').get(function () {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24)); // days
});

// Transform for JSON output
DatabaseObjectSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('DatabaseObject', DatabaseObjectSchema);
