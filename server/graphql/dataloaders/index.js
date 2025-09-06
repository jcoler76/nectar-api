const createUserLoader = require('./userLoader');
const createRoleLoader = require('./roleLoader');
const createServiceLoader = require('./serviceLoader');
const createApplicationLoader = require('./applicationLoader');
const createConnectionLoader = require('./connectionLoader');
const {
  createWorkflowLoader,
  createWorkflowRunLoader,
  createWorkflowRunsByWorkflowLoader,
  createLastWorkflowRunLoader,
  createWorkflowStatsLoader,
} = require('./workflowLoader');
const {
  createEndpointLoader,
  createEndpointByApiKeyLoader,
  createEndpointUsageStatsLoader,
} = require('./endpointLoader');

const createDataLoaders = () => {
  return {
    userLoader: createUserLoader(),
    roleLoader: createRoleLoader(),
    serviceLoader: createServiceLoader(),
    applicationLoader: createApplicationLoader(),
    connectionLoader: createConnectionLoader(),
    workflowLoader: createWorkflowLoader(),
    workflowRunLoader: createWorkflowRunLoader(),
    workflowRunsByWorkflowLoader: createWorkflowRunsByWorkflowLoader(),
    lastWorkflowRunLoader: createLastWorkflowRunLoader(),
    workflowStatsLoader: createWorkflowStatsLoader(),
    endpointLoader: createEndpointLoader(),
    endpointByApiKeyLoader: createEndpointByApiKeyLoader(),
    endpointUsageStatsLoader: createEndpointUsageStatsLoader(),
  };
};

module.exports = createDataLoaders;
