const { ApolloServer } = require('apollo-server-express');
const { createServer } = require('http');
const { execute, subscribe } = require('graphql');
const { SubscriptionServer } = require('subscriptions-transport-ws');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { DateTimeResolver, JSONResolver } = require('graphql-scalars');
const _ = require('lodash');
const { getUser } = require('./middleware/auth');
const { getApiKeyUser } = require('./middleware/apiKeyAuth');
const graphqlRateLimiting = require('./middleware/rateLimiting');
const createDataLoaders = require('./dataloaders');
const csrfPlugin = require('./plugins/csrfPlugin');

// Import all type definitions
const commonTypeDefs = require('./typeDefs/common');
const userTypeDefs = require('./typeDefs/user');
const serviceTypeDefs = require('./typeDefs/service');
const applicationTypeDefs = require('./typeDefs/application');
const connectionTypeDefs = require('./typeDefs/connection');
const workflowTypeDefs = require('./typeDefs/workflow');
const roleTypeDefs = require('./typeDefs/role');
const endpointTypeDefs = require('./typeDefs/endpoint');
const productionJobJacketTypes = require('./typeDefs/productionJobJacketTypes');
const flexibleQueryTypeDefs = require('./typeDefs/flexibleQueryTypes');
const dynamicProcedureTypeDefs = require('./typeDefs/dynamicProcedure');
const organizationTypeDefs = require('./typeDefs/organization');
const subscriptionTypeDefs = require('./typeDefs/subscription');
const billingTypeDefs = require('./typeDefs/billing');
const adminAnalyticsTypeDefs = require('./typeDefs/adminAnalytics');
const dashboardTypeDefs = require('./typeDefs/dashboard');

// Import all resolvers
const userResolvers = require('./resolvers/user');
const serviceResolvers = require('./resolvers/service');
const applicationResolvers = require('./resolvers/application');
const connectionResolvers = require('./resolvers/connection');
const { workflowResolvers } = require('./resolvers/workflow');
const roleResolvers = require('./resolvers/role');
const endpointResolvers = require('./resolvers/endpoint');
const productionJobJacketResolvers = require('./resolvers/productionJobJacketResolvers');
const flexibleQueryResolvers = require('./resolvers/flexibleQueryResolvers');
const dynamicProcedureResolvers = require('./resolvers/dynamicProcedure');
const organizationResolvers = require('./resolvers/organization');
const subscriptionResolvers = require('./resolvers/subscription');
const billingResolvers = require('./resolvers/billing');
const adminAnalyticsResolvers = require('./resolvers/adminAnalytics');
const dashboardResolvers = require('./resolvers/dashboard');

// Manually merge type definitions
const typeDefs = [
  commonTypeDefs,
  userTypeDefs,
  serviceTypeDefs,
  applicationTypeDefs,
  connectionTypeDefs,
  workflowTypeDefs,
  roleTypeDefs,
  endpointTypeDefs,
  productionJobJacketTypes,
  flexibleQueryTypeDefs,
  dynamicProcedureTypeDefs,
  organizationTypeDefs,
  subscriptionTypeDefs,
  billingTypeDefs,
  adminAnalyticsTypeDefs,
  dashboardTypeDefs,
];

// Manually merge resolvers
const resolvers = _.merge(
  {
    // Custom scalar resolvers
    Date: DateTimeResolver,
    JSON: JSONResolver,
    ObjectId: {
      serialize: value => value.toString(),
      parseValue: value => value,
      parseLiteral: ast => ast.value,
    },
  },
  userResolvers,
  serviceResolvers,
  applicationResolvers,
  connectionResolvers,
  workflowResolvers,
  roleResolvers,
  endpointResolvers,
  productionJobJacketResolvers,
  flexibleQueryResolvers,
  dynamicProcedureResolvers,
  organizationResolvers,
  subscriptionResolvers,
  billingResolvers,
  adminAnalyticsResolvers,
  dashboardResolvers
);

// Create executable schema for subscriptions
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

// Plugin to wrap resolver execution in RLS context
const rlsPlugin = {
  async requestDidStart() {
    return {
      async executionDidStart({ context }) {
        // Set RLS context once per request
        if (context?.user?.organizationId) {
          const rlsContext = {
            organizationId: context.user.organizationId,
            userId: context.user.userId,
            email: context.user.email,
            isSuperAdmin: context.user.isSuperAdmin || false,
          };
        }
      },
    };
  },
};

const createApolloServer = () => {
  return new ApolloServer({
    schema,
    context: async ({ req, res, connection }) => {
      if (connection) {
        // WebSocket connection context for subscriptions
        return {
          user: connection.context.user,
          dataloaders: createDataLoaders(),
        };
      }

      // HTTP context for queries and mutations
      // Support both JWT authentication and API key authentication
      const jwtUser = await getUser(req);
      const apiKeyUser = await getApiKeyUser(req);

      // Determine which authentication method to use
      const user = jwtUser || apiKeyUser;

      const dataloaders = createDataLoaders();

      return {
        user,
        jwtUser, // JWT-authenticated user (for admin operations)
        apiKeyUser, // API key-authenticated application (for service operations)
        req,
        res,
        dataloaders,
      };
    },
    subscriptions: {
      path: '/graphql-subscriptions',
      onConnect: async (connectionParams, webSocket, context) => {
        console.log('GraphQL subscription connection initiated');

        // Extract auth token from connection params
        const token = connectionParams.Authorization || connectionParams.authorization;

        if (token) {
          try {
            const user = await getUser({ headers: { authorization: token } });
            return { user };
          } catch (error) {
            console.error('Subscription auth error:', error);
            throw new Error('Authentication failed');
          }
        }

        // Allow anonymous connections for some subscriptions
        return {};
      },
      onDisconnect: (webSocket, context) => {
        console.log('GraphQL subscription disconnected');
      },
    },
    validationRules: graphqlRateLimiting.getAllRules(),
    plugins: [rlsPlugin, csrfPlugin, ...graphqlRateLimiting.getAllPlugins()],
    introspection:
      process.env.NODE_ENV !== 'production' || process.env.ENABLE_GRAPHQL_INTROSPECTION === 'true',
    formatError: error => {
      console.error('GraphQL Error:', error);
      return {
        message: error.message,
        code: error.extensions?.code,
        path: error.path,
      };
    },
  });
};

// Export both server and schema for subscription setup
module.exports = { createApolloServer, schema };
