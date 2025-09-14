const mongoose = require('mongoose');

const rateLimitConfigSchema = new mongoose.Schema(
  {
    // Unique identifier for the rate limit configuration
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Display name for admin interface
    displayName: {
      type: String,
      required: true,
      trim: true,
    },

    // Description of what this rate limit protects
    description: {
      type: String,
      trim: true,
    },

    // Rate limit type (api, auth, upload, graphql, user, websocket, custom)
    type: {
      type: String,
      required: true,
      enum: ['api', 'auth', 'upload', 'graphql', 'user', 'websocket', 'custom'],
    },

    // Time window in milliseconds
    windowMs: {
      type: Number,
      required: true,
      min: 1000, // Minimum 1 second
      max: 86400000, // Maximum 24 hours
    },

    // Default maximum requests per window
    max: {
      type: Number,
      required: true,
      min: 1,
    },

    // Application-based limits (primary approach for internal system)
    applicationLimits: [
      {
        applicationId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Application',
          required: true,
        },
        max: {
          type: Number,
          required: true,
          min: 1,
        },
        windowMs: {
          type: Number, // Can override the default window
          min: 1000,
        },
      },
    ],

    // Role-based limits (secondary approach)
    roleLimits: [
      {
        roleId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Role',
          required: true,
        },
        max: {
          type: Number,
          required: true,
          min: 1,
        },
        windowMs: {
          type: Number,
          min: 1000,
        },
      },
    ],

    // Service+Component specific limits (for expensive operations)
    componentLimits: [
      {
        serviceId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Service',
          required: true,
        },
        procedureName: {
          type: String,
          required: true,
          trim: true,
        },
        max: {
          type: Number,
          required: true,
          min: 1,
        },
        windowMs: {
          type: Number,
          min: 1000,
        },
      },
    ],

    // Block duration after limit exceeded (in milliseconds)
    blockDurationMs: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Message to return when rate limit exceeded
    message: {
      type: String,
      default: 'Too many requests, please try again later.',
    },

    // Redis key prefix
    prefix: {
      type: String,
      required: true,
      trim: true,
    },

    // Whether to skip successful requests from count
    skipSuccessfulRequests: {
      type: Boolean,
      default: false,
    },

    // Whether to skip failed requests from count
    skipFailedRequests: {
      type: Boolean,
      default: false,
    },

    // Whether to distribute requests evenly across window
    execEvenly: {
      type: Boolean,
      default: false,
    },

    // Key generation strategy for internal system
    keyStrategy: {
      type: String,
      enum: ['ip', 'application', 'role', 'component', 'custom'],
      default: 'application',
    },

    // Custom key generator function (stored as string, evaluated when used)
    customKeyGenerator: {
      type: String,
      validate: {
        validator: function (v) {
          if (this.keyStrategy === 'custom' && !v) {
            return false;
          }
          return true;
        },
        message: 'Custom key generator is required when keyStrategy is "custom"',
      },
    },

    // Whether this configuration is active
    enabled: {
      type: Boolean,
      default: true,
    },

    // Environment-specific overrides
    environmentOverrides: {
      development: {
        max: Number,
        windowMs: Number,
        enabled: Boolean,
      },
      production: {
        max: Number,
        windowMs: Number,
        enabled: Boolean,
      },
    },

    // Audit fields
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Change history
    changeHistory: [
      {
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
        changes: {
          type: mongoose.Schema.Types.Mixed,
          required: true,
        },
        reason: {
          type: String,
          trim: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Add index for efficient lookups
rateLimitConfigSchema.index({ name: 1 });
rateLimitConfigSchema.index({ type: 1 });
rateLimitConfigSchema.index({ enabled: 1 });

// Pre-save middleware to track changes
rateLimitConfigSchema.pre('save', function (next) {
  if (this.isModified() && !this.isNew) {
    const changes = {};
    this.modifiedPaths().forEach(path => {
      if (path !== 'updatedAt' && path !== 'changeHistory') {
        changes[path] = {
          from: this._original ? this._original[path] : undefined,
          to: this[path],
        };
      }
    });

    if (Object.keys(changes).length > 0) {
      this.changeHistory.push({
        changedBy: this.updatedBy,
        changes: changes,
      });
    }
  }
  next();
});

// Post-init middleware to store original values
rateLimitConfigSchema.post('init', function () {
  this._original = this.toObject();
});

module.exports = mongoose.model('RateLimitConfig', rateLimitConfigSchema);
