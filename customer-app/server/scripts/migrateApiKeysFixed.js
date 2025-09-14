const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config({ path: __dirname + '/../.env' });

// Define Application schema inline to handle both old and new structure
const applicationSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    apiKey: { type: String, unique: false }, // Remove unique constraint for migration
    apiKeyHash: String,
    apiKeyPrefix: String,
    apiKeyHint: String,
    defaultRole: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
    isActive: Boolean,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: Date,
    updatedAt: Date,
  },
  { strict: false }
); // Allow flexible schema during migration

const Application = mongoose.model('Application', applicationSchema);

async function migrateApiKeys() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Drop the unique index on apiKey if it exists
    try {
      await Application.collection.dropIndex('apiKey_1');
      console.log('Dropped unique index on apiKey field');
    } catch (err) {
      console.log('No unique index to drop or already dropped');
    }

    // Find all applications
    const applications = await Application.find({});
    console.log(`Found ${applications.length} applications to check`);

    let migrated = 0;
    let alreadyMigrated = 0;
    const migratedApps = [];

    for (const app of applications) {
      // Check if already migrated
      if (app.apiKeyHash && !app.apiKey) {
        alreadyMigrated++;
        console.log(`Application "${app.name}" already migrated`);
        continue;
      }

      // If has old apiKey field, migrate it
      if (app.apiKey) {
        console.log(`Migrating application: ${app.name}`);

        // Save original key for output
        const originalKey = app.apiKey;

        // Generate hash from existing API key
        const salt = await bcrypt.genSalt(10);
        const apiKeyHash = await bcrypt.hash(app.apiKey, salt);

        // Create hint (show first 8 and last 4 characters)
        let apiKeyHint = app.apiKey;
        if (app.apiKey.length > 12) {
          const prefix = app.apiKey.substring(0, 8);
          const suffix = app.apiKey.substring(app.apiKey.length - 4);
          const hiddenLength = app.apiKey.length - 12;
          apiKeyHint = `${prefix}${'•'.repeat(hiddenLength)}${suffix}`;
        }

        // Get prefix (first 4 characters)
        const apiKeyPrefix = app.apiKey.substring(0, 4);

        // Update the application - set apiKey to a temporary unique value first
        await Application.updateOne(
          { _id: app._id },
          {
            $set: {
              apiKey: `temp_${app._id}`, // Temporary unique value
              apiKeyHash,
              apiKeyHint,
              apiKeyPrefix,
            },
          }
        );

        // Now remove the apiKey field
        await Application.updateOne(
          { _id: app._id },
          {
            $unset: { apiKey: 1 },
          }
        );

        migrated++;
        migratedApps.push({
          name: app.name,
          originalKey: originalKey,
          hint: apiKeyHint,
        });
        console.log(`✓ Migrated API key for: ${app.name}`);
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total applications: ${applications.length}`);
    console.log(`Migrated: ${migrated}`);
    console.log(`Already migrated: ${alreadyMigrated}`);
    console.log(`No API key: ${applications.length - migrated - alreadyMigrated}`);

    if (migratedApps.length > 0) {
      console.log('\n=== IMPORTANT: Save these API keys now! ===');
      console.log('These are the original API keys for reference:');
      console.log('After migration, only hashed versions are stored.\n');

      migratedApps.forEach(app => {
        console.log(`Application: ${app.name}`);
        console.log(`Original API Key: ${app.originalKey}`);
        console.log(`New Hint: ${app.hint}`);
        console.log('---');
      });
    }

    console.log('\nMigration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateApiKeys();
