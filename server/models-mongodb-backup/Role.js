const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const roleSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    permissions: [
      {
        serviceId: {
          type: Schema.Types.ObjectId,
          ref: 'Service',
          required: true,
        },
        objectName: {
          type: String,
          required: true,
        },
        actions: {
          GET: Boolean,
          POST: Boolean,
          PUT: Boolean,
          DELETE: Boolean,
          PATCH: Boolean,
        },
        // Database schema information - using Mixed type for flexibility
        procedureSchema: {
          lastUpdated: Date,
          procedure: Schema.Types.Mixed, // Allow flexible object structure
          parameters: Schema.Types.Mixed, // Allow flexible array structure
        },
        // Keep old schema field for backward compatibility
        schema: Schema.Types.Mixed,
        // AI-generated documentation cache - make these fields optional and flexible
        aiDocumentation: {
          type: {
            lastGenerated: Date,
            modelUsed: { type: String, default: 'gpt-4o-mini' },
            businessPurpose: String,
            responseSchema: Schema.Types.Mixed, // JSON schema object
            responseExamples: { type: [Schema.Types.Mixed], default: [] }, // Array of example responses with default
            errorScenarios: {
              type: [
                {
                  status: Number,
                  description: String,
                },
              ],
              default: [],
            },
            usageGuidelines: String,
            performanceNotes: String,
            fullAnalysis: String, // Complete AI response
            schemaHash: String, // Hash of the procedure schema to detect changes
          },
          default: {},
        },
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Role', roleSchema);
