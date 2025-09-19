import { GraphQLClient } from 'graphql-request';

// Get the GraphQL endpoint from environment or use default
const GRAPHQL_ENDPOINT = process.env.REACT_APP_GRAPHQL_URL || 'http://localhost:3001/graphql';

// Get token using the same method as the REST API
const getCurrentToken = () => {
  try {
    // Import authService to get token properly
    const authService = require('./authService');
    return authService.getToken();
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

// Create GraphQL client
const createGraphQLClient = () => {
  const token = getCurrentToken();

  return new GraphQLClient(GRAPHQL_ENDPOINT, {
    headers: {
      authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    },
  });
};

// Wrapper function to handle GraphQL requests with error handling
export const executeGraphQL = async (query, variables = {}) => {
  try {
    const client = createGraphQLClient();
    const data = await client.request(query, variables);
    return data;
  } catch (error) {
    console.error('GraphQL request failed:', error);
    throw new Error(
      error.response?.errors?.[0]?.message || error.message || 'GraphQL request failed'
    );
  }
};

export default createGraphQLClient;
