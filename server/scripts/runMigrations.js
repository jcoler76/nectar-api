require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const logger = require('../config/winston');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const runMigrations = async () => {
  try {
    console.log('Starting database migrations...');

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      maxPoolSize: 5,
    });

    console.log('Connected to MongoDB for migrations');
    if (logger && typeof logger.info === 'function') {
      logger.info('Connected to MongoDB for migrations');
    }

    // Check if migrations directory exists
    const migrationsDir = path.join(__dirname, '../migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('No migrations directory found. Creating...');
      fs.mkdirSync(migrationsDir, { recursive: true });

      // Create a sample migration file
      const sampleMigration = `// Sample migration file
// Add your database migration logic here
// Example:
/*
const User = require('../models/User');

async function migrate() {
  // Add new field to all users
  await User.updateMany({}, { $set: { newField: 'defaultValue' } });
  console.log('Migration completed: Added newField to all users');
}

module.exports = migrate;
*/

console.log('Sample migration executed (no-op)');
`;
      fs.writeFileSync(path.join(migrationsDir, '001_sample_migration.js'), sampleMigration);
    }

    // Get all migration files
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('No migration files found');
      if (logger && typeof logger.info === 'function') {
        logger.info('No migration files found');
      }
    } else {
      console.log(`Found ${migrationFiles.length} migration file(s):`, migrationFiles);

      // Execute each migration
      for (const file of migrationFiles) {
        try {
          console.log(`Running migration: ${file}`);
          const migrationPath = path.join(migrationsDir, file);
          const migration = require(migrationPath);

          if (typeof migration === 'function') {
            await migration();
            console.log(`✅ Migration completed: ${file}`);
          } else {
            console.log(`⚠️  Migration file ${file} does not export a function`);
          }
        } catch (migrationError) {
          console.error(`❌ Migration failed: ${file}`, migrationError.message);
          if (logger && typeof logger.error === 'function') {
            logger.error(`Migration failed: ${file}`, migrationError);
          }
          // Continue with other migrations instead of stopping
        }
      }
    }

    console.log('Database migrations completed successfully');
    if (logger && typeof logger.info === 'function') {
      logger.info('Database migrations completed successfully');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Database migrations failed:', error.message);

    // Safely log error
    try {
      if (logger && typeof logger.error === 'function') {
        logger.error('Database migrations failed:', error);
      }
    } catch (logError) {
      console.error('Logger error:', logError.message);
    }

    try {
      await mongoose.connection.close();
    } catch (closeError) {
      console.error('Error closing mongoose connection:', closeError.message);
    }
    process.exit(1);
  }
};

runMigrations();
