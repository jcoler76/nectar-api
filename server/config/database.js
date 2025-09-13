/**
 * Database Configuration - PostgreSQL/Prisma
 * MongoDB has been migrated to PostgreSQL with Prisma ORM
 */

const { logger } = require('../middleware/logger');

const connectDB = async () => {
  try {
    logger.info('Skipping MongoDB connection - using PostgreSQL with Prisma');
    // Database connection is handled by Prisma Client
    // No explicit connection needed
    return Promise.resolve();
  } catch (error) {
    logger.error('Database configuration error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
