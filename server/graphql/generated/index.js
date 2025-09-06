// Template20 GraphQL Schema Index
// Generated from MongoDB Template20 Intelligence

const { readFileSync } = require('fs');
const { join } = require('path');

// Load type definitions
const typeDefs = readFileSync(join(__dirname, 'typeDefs.graphql'), 'utf8');

// Load resolvers
const resolvers = require('./resolvers');

module.exports = {
  typeDefs,
  resolvers,
  version: 'v1.0-ai-optimized',
  generated: '2025-07-13T15:31:20.223Z',
};
