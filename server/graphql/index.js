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
 * Set up WebSocket subscription server
 * @param {http.Server} httpServer - HTTP server instance
 * @returns {SubscriptionServer} - WebSocket subscription server
 */
const initializeSubscriptions = httpServer => {
  const { SubscriptionServer } = require('subscriptions-transport-ws');
  const { execute, subscribe } = require('graphql');

  // Create subscription server
  const subscriptionServer = SubscriptionServer.create(
    {
      schema,
      execute,
      subscribe,
      onConnect: async (connectionParams, webSocket, context) => {
        console.log('WebSocket subscription connection initiated');

        // Extract auth token from connection params
        const token = connectionParams.Authorization || connectionParams.authorization;

        if (token) {
          try {
            const { getUser } = require('./middleware/auth');
            const user = await getUser({ headers: { authorization: token } });
            return { user };
          } catch (error) {
            console.error('Subscription auth error:', error);
            throw new Error('Authentication failed');
          }
        }

        return {};
      },
      onDisconnect: (webSocket, context) => {
        console.log('WebSocket subscription disconnected');
      },
    },
    {
      server: httpServer,
      path: '/graphql-subscriptions',
    }
  );

  logger.info(
    `📡 Subscriptions endpoint: ws://localhost:${process.env.PORT || 3001}/graphql-subscriptions`
  );

  return subscriptionServer;
};

module.exports = {
  initializeGraphQL,
  initializeSubscriptions,
};
