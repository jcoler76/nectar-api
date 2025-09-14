const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config({ path: __dirname + '/../.env' });

// Define Application schema inline to handle both old and new structure
const applicationSchema = new mongoose.Schema({
  name: String,
  description: String,
  apiKey: String, // Old field
  apiKeyHash: String, // New field
  apiKeyPrefix: String, // New field
  apiKeyHint: String, // New field
  defaultRole: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
  isActive: Boolean,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: Date,
  updatedAt: Date,
});

const Application = mongoose.model('Application', applicationSchema);

async function migrateApiKeys() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all applications
    const applications = await Application.find({});
    console.log(`Found ${applications.length} applications to check`);

    let migrated = 0;
    let alreadyMigrated = 0;

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

        // Update the application
        await Application.updateOne(
          { _id: app._id },
          {
            $set: {
              apiKeyHash,
              apiKeyHint,
              apiKeyPrefix,
            },
            $unset: { apiKey: 1 }, // Remove old field
          }
        );

        migrated++;
        console.log(`✓ Migrated API key for: ${app.name}`);
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total applications: ${applications.length}`);
    console.log(`Migrated: ${migrated}`);
    console.log(`Already migrated: ${alreadyMigrated}`);
    console.log(`No API key: ${applications.length - migrated - alreadyMigrated}`);

    console.log('\nMigration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateApiKeys();
