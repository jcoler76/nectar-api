const mongoose = require('mongoose');
const { toEasternTimeStart } = require('../utils/dateUtils');

const apiActivityLogSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    requestId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Request Details
    method: {
      type: String,
      required: true,
      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    },
    url: {
      type: String,
      required: true,
    },
    endpoint: {
      type: String,
      required: true,
      index: true,
    },
    procedureName: {
      type: String,
      index: true,
    },
    normalizedEndpoint: {
      type: String,
      index: true,
    },
    userAgent: String,
    ipAddress: {
      type: String,
      index: true,
    },

    // User Context
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    userEmail: {
      type: String,
      index: true,
    },
    role: {
      type: String,
      index: true,
    },
    application: {
      type: String,
      index: true,
    },

    // Classification
    category: {
      type: String,
      required: true,
      enum: ['api', 'workflow', 'webhook', 'admin', 'auth'],
      index: true,
    },
    endpointType: {
      type: String,
      required: true,
      enum: ['client', 'developer', 'internal', 'public'],
      index: true,
    },
    importance: {
      type: String,
      required: true,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
      index: true,
    },

    // Request/Response Data (sanitized)
    requestHeaders: {
      type: Object,
      default: {},
    },
    requestBody: {
      type: mongoose.Schema.Types.Mixed,
    },
    requestSize: {
      type: Number,
      default: 0,
    },
    responseStatus: {
      type: Number,
      required: true,
      index: true,
    },
    responseHeaders: {
      type: Object,
      default: {},
    },
    responseBody: {
      type: mongoose.Schema.Types.Mixed,
    },
    responseSize: {
      type: Number,
      default: 0,
    },

    // Performance & Errors
    duration: {
      type: Number,
      required: true,
      index: true,
    },
    success: {
      type: Boolean,
      required: true,
      index: true,
    },
    errorType: {
      type: String,
      enum: ['auth', 'validation', 'server', 'timeout', 'network', 'permission', 'rate_limit'],
      index: true,
    },
    errorMessage: String,
    errorCode: String,
    errorStack: String,

    // Workflow Context (when applicable)
    workflowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workflow',
      sparse: true,
      index: true,
    },
    workflowRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkflowRun',
      sparse: true,
      index: true,
    },
    nodeType: String,

    // Additional Context
    referer: String,
    sessionId: String,
    correlationId: String,
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: false, // Using custom timestamp field
  }
);

// Compound indexes for common queries
apiActivityLogSchema.index({ timestamp: -1, success: 1 });
apiActivityLogSchema.index({ timestamp: -1, category: 1 });
apiActivityLogSchema.index({ timestamp: -1, userId: 1 });
apiActivityLogSchema.index({ timestamp: -1, endpoint: 1 });
apiActivityLogSchema.index({ timestamp: -1, responseStatus: 1 });
apiActivityLogSchema.index({ timestamp: -1, importance: 1 });
apiActivityLogSchema.index({ importance: 1, timestamp: -1 });
apiActivityLogSchema.index({ userId: 1, timestamp: -1 });
apiActivityLogSchema.index({ endpoint: 1, timestamp: -1 });
apiActivityLogSchema.index({ procedureName: 1, timestamp: -1 });
apiActivityLogSchema.index({ success: 1, timestamp: -1 });
apiActivityLogSchema.index({ errorType: 1, timestamp: -1 });

// TTL index to auto-delete old logs (configurable retention period)
apiActivityLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 }); // 1 year (365 days)

// Static methods for common queries
apiActivityLogSchema.statics.findByDateRange = function (startDate, endDate, filters = {}) {
  const query = {
    timestamp: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
    ...filters,
  };
  return this.find(query).sort({ timestamp: -1 });
};

apiActivityLogSchema.statics.findErrors = function (timeframe = '24h') {
  const now = new Date();
  const timeframeMap = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
  };

  const startTime = new Date(now.getTime() - (timeframeMap[timeframe] || timeframeMap['24h']));

  return this.find({
    timestamp: { $gte: startTime },
    success: false,
  }).sort({ timestamp: -1 });
};

apiActivityLogSchema.statics.getActivitySummary = function (
  timeframe = '24h',
  onlyImportant = true
) {
  const now = new Date();
  const timeframeMap = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
  };

  let startTime;
  if (timeframe === '24h') {
    // For 24h timeframe, use Eastern Time start of today
    startTime = toEasternTimeStart(now);
  } else {
    // For other timeframes, use the standard UTC-based calculation
    startTime = new Date(now.getTime() - (timeframeMap[timeframe] || timeframeMap['24h']));
  }

  const matchCriteria = {
    timestamp: { $gte: startTime },
    category: { $in: ['api', 'workflow'] },
    endpointType: { $in: ['client', 'public'] },
  };

  // Default to only important API calls
  if (onlyImportant) {
    matchCriteria.importance = { $in: ['critical', 'high'] };
  }

  return this.aggregate([
    {
      $match: matchCriteria,
    },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        successfulRequests: {
          $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] },
        },
        failedRequests: {
          $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] },
        },
        averageResponseTime: { $avg: '$duration' },
        totalDataTransferred: { $sum: { $add: ['$requestSize', '$responseSize'] } },
      },
    },
  ]);
};

module.exports = mongoose.model('ApiActivityLog', apiActivityLogSchema);
