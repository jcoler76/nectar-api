/**
 * Route Helper Utilities for GraphQL Integration
 * Common patterns and utilities for converting REST routes to GraphQL
 */

const { graphqlClient } = require('./graphqlClient');
const { logger } = require('./logger');

/**
 * Create GraphQL context from Express request
 * @param {Object} req - Express request object
 * @returns {Object} - GraphQL context
 */
const createGraphQLContext = (req) => {
  // Create minimal dataloaders for compatibility
  const createDataLoaders = require('../graphql/dataloaders');
  
  return {
    user: req.user,
    jwtUser: req.user,
    apiKeyUser: req.apiKeyUser,
    req,
    dataloaders: createDataLoaders(),
    // Add any other context properties needed
  };
};

/**
 * Handle GraphQL errors and convert to HTTP responses
 * @param {Object} res - Express response object
 * @param {Error} error - GraphQL or execution error
 * @param {string} operation - Operation name for logging
 */
const handleGraphQLError = (res, error, operation = 'GraphQL operation') => {
  logger.error(`Route ${operation} error`, {
    error: error.message,
    stack: error.stack
  });

  // Check for specific GraphQL error types
  if (error.message.includes('Authentication required')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (error.message.includes('Access denied') || error.message.includes('Forbidden')) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  if (error.message.includes('not found') || error.message.includes('Not found')) {
    return res.status(404).json({
      success: false,
      message: error.message
    });
  }

  if (error.message.includes('already exists') || error.message.includes('unique')) {
    return res.status(409).json({
      success: false,
      message: error.message
    });
  }

  if (error.message.includes('validation') || error.message.includes('Invalid')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  // Default server error
  return res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
};

/**
 * Execute GraphQL query with error handling
 * @param {Object} res - Express response object
 * @param {string} query - GraphQL query string
 * @param {Object} variables - Query variables
 * @param {Object} context - GraphQL context
 * @param {string} operation - Operation name for logging
 * @returns {Promise<Object|null>} - Query result or null if error handled
 */
const executeGraphQLQuery = async (res, query, variables, context, operation) => {
  try {
    const result = await graphqlClient.query(query, variables, context);
    return result;
  } catch (error) {
    handleGraphQLError(res, error, operation);
    return null;
  }
};

/**
 * Execute GraphQL mutation with error handling
 * @param {Object} res - Express response object
 * @param {string} mutation - GraphQL mutation string
 * @param {Object} variables - Mutation variables
 * @param {Object} context - GraphQL context
 * @param {string} operation - Operation name for logging
 * @returns {Promise<Object|null>} - Mutation result or null if error handled
 */
const executeGraphQLMutation = async (res, mutation, variables, context, operation) => {
  try {
    const result = await graphqlClient.mutate(mutation, variables, context);
    return result;
  } catch (error) {
    handleGraphQLError(res, error, operation);
    return null;
  }
};

/**
 * Convert Express query parameters to GraphQL filters and pagination
 * @param {Object} query - Express req.query object
 * @returns {Object} - { filters, pagination }
 */
const parseQueryParams = (query) => {
  const {
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    search,
    isActive,
    ...filterParams
  } = query;

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  const pagination = {
    limit: limitNum,
    offset,
    sortBy,
    sortOrder: sortOrder.toUpperCase() // Convert to uppercase for GraphQL enum
  };

  // Build filters
  const filters = {};
  
  if (search) filters.search = search;
  if (isActive !== undefined) {
    filters.isActive = isActive === 'true' || isActive === true;
  }

  // Add any additional filter parameters
  Object.keys(filterParams).forEach(key => {
    if (filterParams[key] !== undefined && filterParams[key] !== '') {
      filters[key] = filterParams[key];
    }
  });

  return { filters, pagination };
};

/**
 * Transform GraphQL paginated response for REST API compatibility
 * @param {Object} graphqlResponse - GraphQL paginated response
 * @param {Object} pagination - Original pagination parameters
 * @returns {Object} - REST-compatible response
 */
const transformPaginatedResponse = (graphqlResponse, pagination) => {
  if (!graphqlResponse || !graphqlResponse.edges) {
    return {
      data: [],
      pagination: {
        page: Math.floor(pagination.offset / pagination.limit) + 1,
        limit: pagination.limit,
        total: 0,
        pages: 0,
        hasMore: false
      }
    };
  }

  const { edges, pageInfo } = graphqlResponse;
  const data = edges.map(edge => edge.node);
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const totalPages = Math.ceil(pageInfo.totalCount / pagination.limit);

  return {
    data,
    pagination: {
      page: currentPage,
      limit: pagination.limit,
      total: pageInfo.totalCount,
      pages: totalPages,
      hasMore: pageInfo.hasNextPage
    }
  };
};

/**
 * Middleware to add GraphQL context to request
 */
const addGraphQLContext = (req, res, next) => {
  req.graphqlContext = createGraphQLContext(req);
  next();
};

/**
 * Create a standardized route handler for listing resources
 * @param {string} query - GraphQL query string
 * @param {string} responseKey - Key to extract from GraphQL response
 * @returns {Function} - Express route handler
 */
const createListHandler = (query, responseKey) => {
  return async (req, res) => {
    const { filters, pagination } = parseQueryParams(req.query);
    const context = createGraphQLContext(req);
    
    const result = await executeGraphQLQuery(
      res, 
      query, 
      { filters, pagination }, 
      context, 
      `list ${responseKey}`
    );
    
    if (!result) return; // Error already handled
    
    const transformedResponse = transformPaginatedResponse(result[responseKey], pagination);
    // For backwards compatibility, some routes expect just the data array
    res.json(transformedResponse.data);
  };
};

/**
 * Create a standardized route handler for getting a single resource
 * @param {string} query - GraphQL query string
 * @param {string} responseKey - Key to extract from GraphQL response
 * @returns {Function} - Express route handler
 */
const createGetHandler = (query, responseKey) => {
  return async (req, res) => {
    const { id } = req.params;
    const context = createGraphQLContext(req);
    
    const result = await executeGraphQLQuery(
      res, 
      query, 
      { id }, 
      context, 
      `get ${responseKey}`
    );
    
    if (!result) return; // Error already handled
    
    res.json(result[responseKey]);
  };
};

/**
 * Create a standardized route handler for creating a resource
 * @param {string} mutation - GraphQL mutation string
 * @param {string} responseKey - Key to extract from GraphQL response
 * @returns {Function} - Express route handler
 */
const createCreateHandler = (mutation, responseKey) => {
  return async (req, res) => {
    const input = req.body;
    const context = createGraphQLContext(req);
    
    const result = await executeGraphQLMutation(
      res, 
      mutation, 
      { input }, 
      context, 
      `create ${responseKey}`
    );
    
    if (!result) return; // Error already handled
    
    res.status(201).json(result[responseKey]);
  };
};

/**
 * Create a standardized route handler for updating a resource
 * @param {string} mutation - GraphQL mutation string
 * @param {string} responseKey - Key to extract from GraphQL response
 * @returns {Function} - Express route handler
 */
const createUpdateHandler = (mutation, responseKey) => {
  return async (req, res) => {
    const { id } = req.params;
    const input = req.body;
    const context = createGraphQLContext(req);
    
    const result = await executeGraphQLMutation(
      res, 
      mutation, 
      { id, input }, 
      context, 
      `update ${responseKey}`
    );
    
    if (!result) return; // Error already handled
    
    res.json(result[responseKey]);
  };
};

/**
 * Create a standardized route handler for deleting a resource
 * @param {string} mutation - GraphQL mutation string
 * @param {string} responseKey - Key to extract from GraphQL response
 * @returns {Function} - Express route handler
 */
const createDeleteHandler = (mutation, responseKey) => {
  return async (req, res) => {
    const { id } = req.params;
    const context = createGraphQLContext(req);
    
    const result = await executeGraphQLMutation(
      res, 
      mutation, 
      { id }, 
      context, 
      `delete ${responseKey}`
    );
    
    if (!result) return; // Error already handled
    
    res.json({ 
      success: result[responseKey],
      message: result[responseKey] ? 'Resource deleted successfully' : 'Failed to delete resource'
    });
  };
};

module.exports = {
  createGraphQLContext,
  handleGraphQLError,
  executeGraphQLQuery,
  executeGraphQLMutation,
  parseQueryParams,
  transformPaginatedResponse,
  addGraphQLContext,
  createListHandler,
  createGetHandler,
  createCreateHandler,
  createUpdateHandler,
  createDeleteHandler
};