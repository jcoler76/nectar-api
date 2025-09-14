import { logger } from '../../../utils/logger.js';

export interface GraphQLExecuteConfig {
  label?: string;
  query: string;
  variables?: Record<string, any> | string;
  operationName?: string;
}

export const execute = async (config: GraphQLExecuteConfig, _context: any) => {
  try {
    const { graphql } = require('graphql');
    const { schema } = require('../../graphql/schema');

    if (!config.query || typeof config.query !== 'string') {
      throw new Error('query is required');
    }

    let variables: Record<string, any> | undefined;
    if (typeof config.variables === 'string') {
      try {
        variables = JSON.parse(config.variables);
      } catch (e) {
        throw new Error('variables must be valid JSON');
      }
    } else if (config.variables && typeof config.variables === 'object') {
      variables = config.variables;
    }

    const start = Date.now();
    const result = await graphql({
      schema,
      source: config.query,
      variableValues: variables,
      operationName: config.operationName,
    });
    const durationMs = Date.now() - start;

    const errorCount = Array.isArray(result.errors) ? result.errors.length : 0;
    logger.info('GraphQL execute node completed', {
      durationMs,
      errorCount,
    });

    return {
      success: errorCount === 0,
      durationMs,
      data: result.data,
      errors: result.errors?.map((e: any) => e.message) || [],
    };
  } catch (error: any) {
    logger.error('GraphQL execute node failed', { error: error.message });
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
};
