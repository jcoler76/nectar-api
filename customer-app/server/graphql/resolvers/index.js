const _ = require('lodash');
const { DateTimeResolver, JSONResolver } = require('graphql-scalars');

const userResolvers = require('./user');
const serviceResolvers = require('./service');
const applicationResolvers = require('./application');
const connectionResolvers = require('./connection');
const { workflowResolvers } = require('./workflow');
const roleResolvers = require('./role');
const endpointResolvers = require('./endpoint');
const dynamicProcedureResolvers = require('./dynamicProcedure');

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
  dynamicProcedureResolvers
);

module.exports = resolvers;
