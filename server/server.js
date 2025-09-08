/**
 * Nectar Studio Server
 * Streamlined server entry point with modular architecture
 */

// Initialize environment and configuration
const { initializeEnvironment, initializeServices } = require('./config');
initializeEnvironment();

// Import modular components
const { app, configureApp, addProductionMiddleware } = require('./app');
const { initializeGraphQL, initializeSubscriptions } = require('./graphql');
const { logger } = require('./middleware/logger');
const { initializeScheduler } = require('./services/scheduler');
const githubIssuePoller = require('./services/githubIssuePoller');
const { createServer } = require('http');

/**
 * Initialize and start the server
 */
const startServer = async () => {
  try {
    // Initialize core services (temporarily using Prisma only)
    const { prismaService } = await initializeServices();

    // Configure the Express app
    configureApp();

    // Skip session middleware for now (was MongoDB-based)
    logger.info('Skipping session middleware - using PostgreSQL transition mode');

    // Initialize GraphQL after database connection (optional)
    let graphqlEnabled = process.env.DISABLE_GRAPHQL !== 'true';
    if (graphqlEnabled) {
      try {
        await initializeGraphQL(app);
      } catch (error) {
        console.error('GraphQL initialization error:', error);
        if (process.env.STAGING_CONTINUE_ON_GRAPHQL_ERROR === 'true') {
          logger.warn(
            'Continuing startup despite GraphQL init error (STAGING_CONTINUE_ON_GRAPHQL_ERROR=true)'
          );
          graphqlEnabled = false;
        } else {
          throw error;
        }
      }
    } else {
      logger.info('GraphQL initialization disabled via DISABLE_GRAPHQL=true');
    }

    // Add production middleware and error handling
    addProductionMiddleware(app);

    // Create HTTP server for WebSocket support
    const PORT = process.env.PORT || 3001;
    const httpServer = createServer(app);

    // Initialize WebSocket subscriptions if GraphQL is enabled
    let subscriptionServer = null;
    if (graphqlEnabled) {
      try {
        subscriptionServer = initializeSubscriptions(httpServer);
      } catch (error) {
        console.error('Subscription server initialization error:', error);
        if (process.env.STAGING_CONTINUE_ON_GRAPHQL_ERROR === 'true') {
          logger.warn(
            'Continuing startup without subscriptions (STAGING_CONTINUE_ON_GRAPHQL_ERROR=true)'
          );
          subscriptionServer = null;
        } else {
          throw error;
        }
      }
    }

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('Received SIGTERM, shutting down gracefully...');
      githubIssuePoller.stop();
      if (subscriptionServer && typeof subscriptionServer.close === 'function') {
        subscriptionServer.close();
      }
      httpServer.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('Received SIGINT, shutting down gracefully...');
      githubIssuePoller.stop();
      if (subscriptionServer && typeof subscriptionServer.close === 'function') {
        subscriptionServer.close();
      }
      httpServer.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });

    // Start the server
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📡 GraphQL endpoint: http://localhost:${PORT}/graphql`);
      logger.info(`🔗 GraphQL Playground: http://localhost:${PORT}/playground`);
      logger.info(`📡 Subscriptions endpoint: ws://localhost:${PORT}/graphql-subscriptions`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Initialize scheduler after everything is set up (optional)
    if (process.env.DISABLE_SCHEDULER === 'true') {
      logger.info('Scheduler initialization disabled via DISABLE_SCHEDULER=true');
    } else {
      initializeScheduler();
      logger.info('Scheduler initialized successfully');
    }

    // Start GitHub issue polling service (development only)
    githubIssuePoller.start();
    const pollerStatus = githubIssuePoller.getStatus();
    if (pollerStatus.enabled) {
      logger.info(`🔄 GitHub issue polling enabled (${pollerStatus.pollInterval}s intervals)`);
    } else {
      logger.info('ℹ️  GitHub issue polling disabled (production mode or explicitly disabled)');
    }
  } catch (err) {
    console.error('Server initialization error:', err);
    process.exit(1);
  }
};

// Start the server
startServer();
