require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const logger = require('../config/winston');
const User = require('../models/User');
const Service = require('../models/Service');
const Role = require('../models/Role');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Add timeout to prevent hanging
const DB_VALIDATION_TIMEOUT = 30000; // 30 seconds

const validateDatabase = async () => {
  const timeout = setTimeout(() => {
    console.error('Database validation timed out after 30 seconds');
    process.exit(1);
  }, DB_VALIDATION_TIMEOUT);

  try {
    console.log('Starting database validation...');

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 second timeout for server selection
      connectTimeoutMS: 10000, // 10 second timeout for initial connection
      maxPoolSize: 5, // Limit connection pool
    });

    console.log('Connected to MongoDB for validation');
    if (logger && typeof logger.info === 'function') {
      logger.info('Connected to MongoDB for validation');
    }

    // Validate collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);

    console.log('Existing collections:', collectionNames);
    if (logger && typeof logger.info === 'function') {
      logger.info('Existing collections:', collectionNames);
    }

    // Validate indexes
    const userIndexes = await User.collection.indexes();
    const serviceIndexes = await Service.collection.indexes();
    const roleIndexes = await Role.collection.indexes();

    console.log('Index validation completed');
    if (logger && typeof logger.info === 'function') {
      logger.info('User indexes:', userIndexes);
      logger.info('Service indexes:', serviceIndexes);
      logger.info('Role indexes:', roleIndexes);
    }

    // Validate admin user
    const adminUser = await User.findOne({ email: 'admin@nectarstudio.ai' });
    if (!adminUser) {
      console.log('Admin user not found');
      if (logger && typeof logger.error === 'function') {
        logger.error('Admin user not found');
      }
    } else {
      console.log('Admin user exists');
      if (logger && typeof logger.info === 'function') {
        logger.info('Admin user exists');
      }
    }

    console.log('Database validation completed successfully');
    if (logger && typeof logger.info === 'function') {
      logger.info('Database validation completed');
    }

    clearTimeout(timeout);
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Database validation failed:', error.message);

    // Safely log error with better error handling
    try {
      if (logger && typeof logger.error === 'function') {
        logger.error('Database validation failed:', error);
      }
    } catch (logError) {
      console.error('Logger error:', logError.message);
    }

    clearTimeout(timeout);
    try {
      await mongoose.connection.close();
    } catch (closeError) {
      console.error('Error closing mongoose connection:', closeError.message);
    }
    process.exit(1);
  }
};

validateDatabase();
