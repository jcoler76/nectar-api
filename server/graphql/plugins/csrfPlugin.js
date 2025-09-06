const { GraphQLError } = require('graphql');
const { validateCSRFToken } = require('../../middleware/csrf');

// GraphQL plugin to add CSRF protection
const csrfPlugin = {
  requestDidStart() {
    return {
      async willSendResponse(requestContext) {
        const { request, response } = requestContext;

        // Skip CSRF for introspection queries
        if (request.operationName === 'IntrospectionQuery') {
          return;
        }

        // Skip CSRF for GET requests (queries)
        if (request.http && request.http.method === 'GET') {
          return;
        }

        // Only apply CSRF to mutations
        const operationType = requestContext.operation?.operation;
        if (operationType !== 'mutation') {
          return;
        }

        // Get user from context
        const user = requestContext.contextValue?.user;
        if (!user || !user.userId) {
          // User not authenticated, let auth middleware handle it
          return;
        }

        // Get CSRF token from headers
        const csrfToken = request.http?.headers?.get('x-csrf-token');

        if (!csrfToken) {
          throw new GraphQLError('CSRF token missing', {
            extensions: {
              code: 'FORBIDDEN',
              http: { status: 403 },
            },
          });
        }

        // Validate CSRF token
        if (!validateCSRFToken(user.userId, csrfToken)) {
          throw new GraphQLError('Invalid CSRF token', {
            extensions: {
              code: 'FORBIDDEN',
              http: { status: 403 },
            },
          });
        }
      },
    };
  },
};

module.exports = csrfPlugin;
