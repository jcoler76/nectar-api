/**
 * GraphQL Configuration Module
 * Handles Apollo Server setup and GraphQL schema initialization
 */

const { createApolloServer, schema } = require('./schema');
const { logger } = require('../middleware/logger');
const { graphqlLimiter } = require('../middleware/dynamicRateLimiter');

/**
 * Initialize GraphQL server and configure middleware
 * @param {Express} app - Express application instance
 * @returns {Promise<ApolloServer>} - Configured Apollo Server instance
 */
const initializeGraphQL = async app => {
  try {
    // Mount playground route BEFORE GraphQL
    const playgroundRouter = require('../routes/playground');
    app.use('/playground', playgroundRouter);

    // Apply GraphQL-specific rate limiting
    app.use('/graphql', graphqlLimiter);

    // Create and start Apollo Server
    const server = createApolloServer();
    await server.start();

    // Apply GraphQL middleware to Express
    server.applyMiddleware({
      app,
      path: '/graphql',
      cors: {
        origin:
          process.env.NODE_ENV === 'development'
            ? true
            : [
                'https://app.nectarstudio.ai',
                'http://app.nectarstudio.ai',
                'http://localhost:3000',
                'http://localhost:4000',
                'http://localhost:8000',
              ],
        credentials: true,
      },
    });

    logger.info(
      `GraphQL Server ready at http://localhost:${process.env.PORT || 3001}${server.graphqlPath}`
    );
    return server;
  } catch (error) {
    console.error('GraphQL initialization error:', error);
    throw error;
  }
};

/**
 * Set up WebSocket subscription server with timeout protection
 * @param {http.Server} httpServer - HTTP server instance
 * @returns {Promise<SubscriptionServer|null>} - WebSocket subscription server or null if failed
 */
const initializeSubscriptions = httpServer => {
  return new Promise((resolve, reject) => {
    // Set a timeout to prevent hanging
    const timeout = setTimeout(() => {
      logger.warn('WebSocket subscription initialization timed out, skipping...');
      resolve(null);
    }, 5000); // 5 second timeout

    try {
      const { SubscriptionServer } = require('subscriptions-transport-ws');
      const { execute, subscribe } = require('graphql');

      // Create subscription server with error handling
      const subscriptionServer = SubscriptionServer.create(
        {
          schema,
          execute,
          subscribe,
          onConnect: async (connectionParams, webSocket, context) => {
            logger.info('WebSocket subscription connection initiated');

            // Extract auth token from connection params
            const token = connectionParams.Authorization || connectionParams.authorization;

            if (token) {
              try {
                const { getUser } = require('./middleware/auth');
                const user = await getUser({ headers: { authorization: token } });
                return { user };
              } catch (error) {
                logger.error('Subscription auth error', { error: error.message });
                throw new Error('Authentication failed');
              }
            }

            return {};
          },
          onDisconnect: (webSocket, context) => {
            logger.info('WebSocket subscription disconnected');
          },
        },
        {
          server: httpServer,
          path: '/graphql-subscriptions',
        }
      );

      clearTimeout(timeout);
      logger.info(
        `📡 Subscriptions endpoint: ws://localhost:${process.env.PORT || 3001}/graphql-subscriptions`
      );
      resolve(subscriptionServer);
    } catch (error) {
      clearTimeout(timeout);
      logger.error('Failed to initialize WebSocket subscriptions', { error: error.message });
      resolve(null); // Continue without subscriptions instead of failing
    }
  });
};

module.exports = {
  initializeGraphQL,
  initializeSubscriptions,
};
