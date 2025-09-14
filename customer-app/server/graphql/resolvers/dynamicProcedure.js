const DatabaseService = require('../../services/databaseService');
const { logger } = require('../../middleware/logger');
const { GraphQLError } = require('graphql');
const graphqlFields = require('graphql-fields');
const {
  hasClientPermission,
  hasDeveloperPermission,
  hasMCPUniversalPermission,
  getServiceForApiKey,
} = require('../middleware/apiKeyAuth');

const dynamicProcedureResolvers = {
  Query: {
    // Single procedure execution
    procedure: async (parent, args, context, info) => {
      try {
        const { serviceName, procedureName, params = {}, select, environment } = args;
        const { jwtUser, apiKeyUser } = context;

        // Validate environment parameter
        if (environment && !['production', 'staging'].includes(environment)) {
          throw new GraphQLError(
            'Invalid environment parameter. Must be "production" or "staging"',
            {
              extensions: { code: 'BAD_REQUEST' },
            }
          );
        }

        // Get requested fields for optimization
        const fields = graphqlFields(info);
        const requestedFields = Object.keys(fields);

        logger.info('Dynamic procedure execution:', {
          service: serviceName,
          procedure: procedureName,
          params,
          select,
          requestedFields,
          apiKeyType: apiKeyUser?.type || (jwtUser ? 'jwt' : 'none'),
        });

        // Resolve service with environment awareness
        const service = await getServiceForApiKey(apiKeyUser || jwtUser, serviceName, environment);

        if (!service) {
          throw new GraphQLError(`Service '${serviceName}' not found`, {
            extensions: { code: 'SERVICE_NOT_FOUND' },
          });
        }

        // Client permission check
        if (apiKeyUser && apiKeyUser.type === 'client') {
          const allowed = hasClientPermission(apiKeyUser, service.name, procedureName, 'GET');
          if (!allowed) {
            throw new GraphQLError(`Access denied to ${procedureName} in service ${service.name}`, {
              extensions: { code: 'FORBIDDEN' },
            });
          }
        }

        // Execute stored procedure with environment awareness
        const result = await DatabaseService.executeStoredProcedure(
          service,
          procedureName,
          params,
          environment || 'production'
        );

        // Determine projection fields: prefer explicit select array, fallback to requested subfields
        const projection = Array.isArray(select) && select.length > 0 ? select : requestedFields;

        // Optimize response by only returning projected fields
        if (result && result.length > 0 && projection.length > 0) {
          return result.map(row => {
            const optimizedRow = {};
            projection.forEach(field => {
              if (row.hasOwnProperty(field)) {
                optimizedRow[field] = row[field];
              }
            });
            return optimizedRow;
          });
        }

        return result || [];
      } catch (error) {
        logger.error('Dynamic procedure execution error:', {
          error: error.message,
          serviceName: args.serviceName,
          procedureName: args.procedureName,
        });

        throw new GraphQLError(`Failed to execute procedure: ${error.message}`, {
          extensions: {
            code: 'PROCEDURE_EXECUTION_ERROR',
            originalError: error.message,
          },
        });
      }
    },

    // Batch procedure execution
    procedures: async (parent, args, context, info) => {
      try {
        const { requests } = args;
        const { jwtUser, apiKeyUser } = context;

        logger.info('Batch procedure execution:', {
          requestCount: requests.length,
          apiKeyType: apiKeyUser?.type || (jwtUser ? 'jwt' : 'none'),
        });

        const results = [];

        for (const request of requests) {
          const { serviceName, procedureName, params = {}, select, environment } = request;

          // Validate environment parameter for each request
          if (environment && !['production', 'staging'].includes(environment)) {
            results.push({
              serviceName,
              procedureName,
              success: false,
              error: 'Invalid environment parameter. Must be "production" or "staging"',
              data: null,
            });
            continue;
          }

          // Resolve service with environment awareness
          const service = await getServiceForApiKey(
            apiKeyUser || jwtUser,
            serviceName,
            environment
          );

          if (!service) {
            results.push({
              serviceName,
              procedureName,
              success: false,
              error: `Service '${serviceName}' not found`,
              data: null,
            });
            continue;
          }

          // Client permission check per request
          if (apiKeyUser && apiKeyUser.type === 'client') {
            const allowed = hasClientPermission(apiKeyUser, service.name, procedureName, 'GET');
            if (!allowed) {
              results.push({
                serviceName,
                procedureName,
                success: false,
                error: `Access denied to ${procedureName} in service ${service.name}`,
                data: null,
              });
              continue;
            }
          }

          try {
            const result = await DatabaseService.executeStoredProcedure(
              service,
              procedureName,
              params,
              environment || 'production'
            );

            // Apply projection if provided
            const projection = Array.isArray(select) && select.length > 0 ? select : [];
            const projected =
              projection.length > 0 && Array.isArray(result)
                ? result.map(row => {
                    const optimizedRow = {};
                    projection.forEach(field => {
                      if (row.hasOwnProperty(field)) {
                        optimizedRow[field] = row[field];
                      }
                    });
                    return optimizedRow;
                  })
                : result;

            results.push({
              serviceName,
              procedureName,
              success: true,
              error: null,
              data: projected || [],
            });
          } catch (error) {
            results.push({
              serviceName,
              procedureName,
              success: false,
              error: error.message,
              data: null,
            });
          }
        }

        return results;
      } catch (error) {
        logger.error('Batch procedure execution error:', { error: error.message });

        throw new GraphQLError(`Failed to execute batch procedures: ${error.message}`, {
          extensions: {
            code: 'BATCH_PROCEDURE_ERROR',
            originalError: error.message,
          },
        });
      }
    },

    // Get available procedures for a service
    serviceProcedures: async (parent, args, context) => {
      try {
        const { serviceName } = args;

        logger.info('Getting service procedures:', {
          service: serviceName,
          apiKeyType: context.apiKeyUser?.type || (context.jwtUser ? 'jwt' : 'none'),
        });

        const Service = require('../../models/Service');
        const service = await Service.findOne({ name: serviceName });

        if (!service) {
          throw new GraphQLError(`Service '${serviceName}' not found`, {
            extensions: { code: 'SERVICE_NOT_FOUND' },
          });
        }

        const { getDatabaseService } = require('../../services/databaseService');
        const dbService = await getDatabaseService(service, service.database);
        const procedures = await dbService.getProcedures();

        return {
          serviceName,
          procedures: procedures.map(name => ({ name })),
        };
      } catch (error) {
        logger.error('Service procedures error:', { error: error.message });

        throw new GraphQLError(`Failed to get service procedures: ${error.message}`, {
          extensions: {
            code: 'SERVICE_PROCEDURES_ERROR',
            originalError: error.message,
          },
        });
      }
    },

    // Typed resolver for issues (example of specific procedure)
    issues: async (parent, args, context, info) => {
      try {
        const { serviceName = 'modernluxury', issuesetID } = args;

        // Get requested fields for optimization
        const fields = graphqlFields(info);
        const requestedFields = Object.keys(fields);

        logger.info('Issues query:', {
          service: serviceName,
          issuesetID,
          requestedFields,
          apiKey: context.apiKey?.substring(0, 8) + '...',
        });

        // Find service by name
        const Service = require('../../models/Service');
        const service = await Service.findOne({ name: serviceName });

        if (!service) {
          throw new GraphQLError(`Service '${serviceName}' not found`, {
            extensions: { code: 'SERVICE_NOT_FOUND' },
          });
        }

        // Execute the api_GetIssues procedure
        const result = await DatabaseService.executeStoredProcedure(service, 'api_GetIssues', {
          issuesetID,
        });

        // Optimize response by only returning requested fields
        if (result && result.length > 0 && requestedFields.length > 0) {
          return result.map(row => {
            const optimizedRow = {};
            requestedFields.forEach(field => {
              if (row.hasOwnProperty(field)) {
                optimizedRow[field] = row[field];
              }
            });
            return optimizedRow;
          });
        }

        return result || [];
      } catch (error) {
        logger.error('Issues query error:', { error: error.message });

        throw new GraphQLError(`Failed to get issues: ${error.message}`, {
          extensions: {
            code: 'ISSUES_QUERY_ERROR',
            originalError: error.message,
          },
        });
      }
    },
  },
};

module.exports = dynamicProcedureResolvers;
