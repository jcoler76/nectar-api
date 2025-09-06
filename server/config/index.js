/**
 * Application Configuration Module
 * Handles environment setup, validation, and initial configuration
 */

const path = require('path');

/**
 * Initialize environment configuration
 */
const initializeEnvironment = () => {
  // Determine environment file path
  const envPath =
    process.env.NODE_ENV === 'production'
      ? path.resolve(__dirname, '..', '.env.production')
      : path.resolve(__dirname, '..', '.env');

  // Load environment variables
  require('dotenv').config({ path: envPath });

  // Enable loading of TypeScript files at runtime
  try {
    // Use transpileOnly to avoid type-check overhead in runtime
    require('ts-node').register({ transpileOnly: true });
  } catch (e) {
    // ts-node not installed; TypeScript files will not be supported
  }

  // Validate environment variables on startup
  const EnvironmentValidator = require('../utils/environmentValidator');
  const envValidator = EnvironmentValidator.createDefaultValidator();
  envValidator.validateAndExit();

  // Override console methods in production to prevent sensitive data leakage
  const { overrideConsole } = require('../utils/consoleOverride');
  overrideConsole();
};

/**
 * Get database connection configuration
 * @returns {Function} Database connection function
 */
const getDatabaseConfig = () => {
  return require('./database');
};

/**
 * Get session configuration
 * @returns {Function} Session service getter
 */
const getSessionConfig = () => {
  const { getSessionService } = require('../services/sessionService');
  return getSessionService;
};

/**
 * Initialize all core services
 * @returns {Promise<Object>} Service instances
 */
const initializeServices = async () => {
  const connectDB = getDatabaseConfig();
  const getSessionService = getSessionConfig();

  // Connect to MongoDB
  await connectDB();
  console.log('MongoDB connected successfully');

  // Initialize session service
  const sessionService = await getSessionService();
  console.log('Session service initialized successfully');

  return { sessionService };
};

module.exports = {
  initializeEnvironment,
  getDatabaseConfig,
  getSessionConfig,
  initializeServices,
};
