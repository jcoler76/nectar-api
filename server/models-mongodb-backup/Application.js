const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { encryptApiKey, decryptApiKey } = require('../utils/encryption');
const { generateStandardApiKey } = require('../utils/apiKeyGenerator');

const applicationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  description: String,
  apiKeyHash: {
    type: String,
    required: true,
    select: false, // Don't return by default
  },
  apiKeyEncrypted: {
    type: String,
    required: true,
    select: false, // Don't return by default - admin access only
  },
  apiKeyPrefix: {
    type: String,
    required: true,
  },
  apiKeyHint: {
    type: String,
    required: true,
  },
  defaultRole: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  lastKeyRevealedAt: {
    type: Date,
  },
  lastKeyRevealedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
});

// Generate a secure API key (64 character hex string)
applicationSchema.statics.generateApiKey = function () {
  return generateStandardApiKey();
};

// Hash API key for storage
applicationSchema.statics.hashApiKey = async function (apiKey) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(apiKey, salt);
};

// Validate API key against hash
applicationSchema.statics.validateApiKey = async function (apiKey, hash) {
  return bcrypt.compare(apiKey, hash);
};

// Get API key hint (show first 8 and last 4 characters)
applicationSchema.statics.getApiKeyHint = function (apiKey) {
  if (apiKey.length <= 12) return apiKey; // Don't hide if too short
  const prefix = apiKey.substring(0, 8);
  const suffix = apiKey.substring(apiKey.length - 4);
  const hiddenLength = apiKey.length - 12;
  return `${prefix}${'•'.repeat(hiddenLength)}${suffix}`;
};

// Encrypt API key for admin access
applicationSchema.statics.encryptApiKey = function (apiKey) {
  return encryptApiKey(apiKey);
};

// Decrypt API key for admin access
applicationSchema.statics.decryptApiKey = function (encryptedApiKey) {
  return decryptApiKey(encryptedApiKey);
};

// Check if API key already exists
applicationSchema.statics.isApiKeyUnique = async function (apiKey) {
  const prefix = apiKey.substring(0, 4);
  const apps = await this.find({ apiKeyPrefix: prefix }).select('+apiKeyHash');

  for (const app of apps) {
    const isMatch = await this.validateApiKey(apiKey, app.apiKeyHash);
    if (isMatch) {
      return false;
    }
  }
  return true;
};

// Virtual field for backward compatibility
applicationSchema.virtual('apiKey').get(function () {
  // Return hint for display purposes
  return this.apiKeyHint;
});

module.exports = mongoose.model('Application', applicationSchema);
