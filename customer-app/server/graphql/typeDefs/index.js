const commonTypeDefs = require('./common');
const userTypeDefs = require('./user');
const serviceTypeDefs = require('./service');
const applicationTypeDefs = require('./application');
const connectionTypeDefs = require('./connection');
const workflowTypeDefs = require('./workflow');
const roleTypeDefs = require('./role');
const endpointTypeDefs = require('./endpoint');

const typeDefs = [
  commonTypeDefs,
  userTypeDefs,
  serviceTypeDefs,
  applicationTypeDefs,
  connectionTypeDefs,
  workflowTypeDefs,
  roleTypeDefs,
  endpointTypeDefs,
];

module.exports = typeDefs;
