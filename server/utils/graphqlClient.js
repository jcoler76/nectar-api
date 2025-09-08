/**
 * GraphQL Client Service for Internal Route Integration
 * Provides a clean interface for REST routes to execute GraphQL operations
 */

const { execute, parse } = require('graphql');
const { schema } = require('../graphql/schema');
const { logger } = require('./logger');

class GraphQLClient {
  /**
   * Execute a GraphQL query with context
   * @param {string} query - GraphQL query string
   * @param {Object} variables - Query variables
   * @param {Object} context - GraphQL context (user, apiKey, etc.)
   * @returns {Promise<Object>} - Query result
   */
  async query(query, variables = {}, context = {}) {
    try {
      const document = parse(query);
      const result = await execute({
        schema,
        document,
        variableValues: variables,
        contextValue: context
      });

      if (result.errors) {
        logger.error('GraphQL execution errors', { 
          errors: result.errors,
          query: query.substring(0, 200) + '...'
        });
        throw new Error(`GraphQL Error: ${result.errors[0].message}`);
      }

      return result.data;
    } catch (error) {
      logger.error('GraphQL client error', { 
        error: error.message,
        query: query.substring(0, 200) + '...'
      });
      throw error;
    }
  }

  /**
   * Execute a GraphQL mutation with context
   * @param {string} mutation - GraphQL mutation string
   * @param {Object} variables - Mutation variables
   * @param {Object} context - GraphQL context (user, apiKey, etc.)
   * @returns {Promise<Object>} - Mutation result
   */
  async mutate(mutation, variables = {}, context = {}) {
    return this.query(mutation, variables, context);
  }
}

// Singleton instance
const graphqlClient = new GraphQLClient();

module.exports = { graphqlClient };