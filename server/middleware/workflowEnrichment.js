const { Workflow } = require('../models/workflowModels');
const { logger } = require('./logger');

/**
 * Middleware to enrich workflow-related requests with workflow name for better activity logging
 */
const enrichWorkflowContext = async (req, res, next) => {
  try {
    // Only process workflow-related routes
    const path = req.originalUrl || req.url;

    // Check if this is a workflow-specific route (has workflow ID in path)
    const workflowIdMatch = path.match(/\/api\/workflows\/([0-9a-fA-F]{24})/);

    if (workflowIdMatch) {
      const workflowId = workflowIdMatch[1];

      try {
        // Look up the workflow name
        const workflow = await Workflow.findById(workflowId).select('name').lean();

        if (workflow) {
          // Add workflow name to request context for activity logging
          req.workflowName = workflow.name;
          req.workflowId = workflowId;
        }
      } catch (dbError) {
        // Don't fail the request if workflow lookup fails
        logger.warn('Failed to enrich workflow context', {
          workflowId,
          error: dbError.message,
        });
      }
    }

    next();
  } catch (error) {
    // Don't fail the request if enrichment fails
    logger.warn('Workflow enrichment middleware error', {
      error: error.message,
      path: req.originalUrl || req.url,
    });
    next();
  }
};

module.exports = { enrichWorkflowContext };
