const mongoose = require('mongoose');
const { generateStandardApiKey } = require('../utils/apiKeyGenerator');

const endpointSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    apiKey: {
      type: String,
      required: true,
      unique: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Pre-save middleware to generate API key if not provided
endpointSchema.pre('validate', function (next) {
  if (this.isNew && !this.apiKey) {
    // Generate a standard 64-character hex API key if not provided
    this.apiKey = generateStandardApiKey();
  }
  next();
});

module.exports = mongoose.model('Endpoint', endpointSchema);
