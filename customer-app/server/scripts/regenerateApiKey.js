const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config({ path: __dirname + '/../.env' });

// Application model with all fields
const applicationSchema = new mongoose.Schema({
  name: String,
  description: String,
  apiKey: String,
  apiKeyHash: String,
  apiKeyPrefix: String,
  apiKeyHint: String,
  defaultRole: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
  isActive: Boolean,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: Date,
  updatedAt: Date,
});

// Static methods
applicationSchema.statics.generateApiKey = function () {
  const prefix = 'mapi';
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `${prefix}_${randomBytes}`;
};

applicationSchema.statics.hashApiKey = async function (apiKey) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(apiKey, salt);
};

applicationSchema.statics.getApiKeyHint = function (apiKey) {
  if (apiKey.length <= 12) return apiKey;
  const prefix = apiKey.substring(0, 8);
  const suffix = apiKey.substring(apiKey.length - 4);
  const hiddenLength = apiKey.length - 12;
  return `${prefix}${'•'.repeat(hiddenLength)}${suffix}`;
};

const Application = mongoose.model('Application', applicationSchema);

async function regenerateApiKey() {
  try {
    const appName = process.argv[2];

    if (!appName) {
      console.log('Usage: node regenerateApiKey.js <application-name>');
      console.log('Example: node regenerateApiKey.js "My Application"');
      process.exit(1);
    }

    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Find application
    const application = await Application.findOne({ name: appName });

    if (!application) {
      console.error(`Application "${appName}" not found`);
      console.log('\nAvailable applications:');
      const apps = await Application.find({}, 'name');
      apps.forEach(app => console.log(`  - ${app.name}`));
      process.exit(1);
    }

    console.log(`Found application: ${application.name}`);
    console.log(`Current hint: ${application.apiKeyHint || 'N/A'}`);

    // Generate new API key
    const newApiKey = Application.generateApiKey();
    const apiKeyHash = await Application.hashApiKey(newApiKey);
    const apiKeyHint = Application.getApiKeyHint(newApiKey);
    const apiKeyPrefix = newApiKey.substring(0, 4);

    // Update application
    await Application.updateOne(
      { _id: application._id },
      {
        $set: {
          apiKeyHash,
          apiKeyPrefix,
          apiKeyHint,
          updatedAt: new Date(),
        },
        $unset: { apiKey: 1 }, // Remove old plain text field if it exists
      }
    );

    console.log('\n✅ API Key regenerated successfully!');
    console.log('=====================================');
    console.log(`Application: ${application.name}`);
    console.log(`New API Key: ${newApiKey}`);
    console.log('=====================================');
    console.log('\n⚠️  IMPORTANT: Save this API key now! It cannot be retrieved later.');
    console.log('⚠️  This is the ONLY time you will see the full API key.');
    console.log('⚠️  Do not share this key or commit it to version control.');
    console.log('🔒 The API key has been securely hashed in the database.');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
regenerateApiKey();
