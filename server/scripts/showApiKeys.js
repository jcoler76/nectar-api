const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });

// Define Application schema
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

const Application = mongoose.model('Application', applicationSchema);

async function showApiKeys() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Find all applications
    const applications = await Application.find({}).select('+apiKey'); // Include apiKey field if it exists

    console.log('=== API Key Information ===\n');

    for (const app of applications) {
      console.log(`Application: ${app.name}`);
      console.log(`Description: ${app.description || 'N/A'}`);
      console.log(`Default Role ID: ${app.defaultRole || 'N/A'}`);
      console.log(`Active: ${app.isActive}`);

      if (app.apiKey) {
        // Old structure - plain text API key
        // Only show first 8 and last 4 characters for security
        const maskedKey =
          app.apiKey.substring(0, 8) + '...' + app.apiKey.substring(app.apiKey.length - 4);
        console.log(`API Key (MASKED): ${maskedKey}`);
        console.log('⚠️  WARNING: This API key is stored in plain text and needs migration!');
        console.log('⚠️  Full key available in database - migrate immediately');
      } else if (app.apiKeyHash) {
        // New structure - hashed API key
        console.log(`API Key Hint: ${app.apiKeyHint}`);
        console.log(`API Key Prefix: ${app.apiKeyPrefix}`);
        console.log('✅ API key is securely hashed');
        console.log(
          'ℹ️  To get the full API key, regenerate it from the application management page'
        );
      } else {
        console.log('❌ No API key found');
      }

      console.log('---\n');
    }

    console.log(`Total applications: ${applications.length}`);

    // Check for migration status
    const plainTextKeys = applications.filter(app => app.apiKey).length;
    const hashedKeys = applications.filter(app => app.apiKeyHash && !app.apiKey).length;

    console.log(`\n=== Migration Status ===`);
    console.log(`Plain text API keys: ${plainTextKeys}`);
    console.log(`Hashed API keys: ${hashedKeys}`);

    if (plainTextKeys > 0) {
      console.log('\n⚠️  WARNING: You have API keys stored in plain text!');
      console.log('Run the migration script to secure them: node scripts/migrateApiKeys.js');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
showApiKeys();
