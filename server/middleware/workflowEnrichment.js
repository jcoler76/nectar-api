const prismaService = require('../services/prismaService');
const { logger } = require('./logger');

/**
 * Middleware to enrich workflow-related requests with workflow name for better activity logging
 */
const enrichWorkflowContext = async (req, res, next) => {
  try {
    // Only process workflow-related routes
    const path = req.originalUrl || req.url;

    // Check if this is a workflow-specific route (has workflow ID in path)
    // Updated for UUID format instead of MongoDB ObjectId
    const workflowIdMatch = path.match(
      /\/api\/workflows\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/
    );

    if (workflowIdMatch) {
      const workflowId = workflowIdMatch[1];

      try {
        // Look up the workflow name using proper RLS
        // Use organizationId from req.user if available, otherwise system context for middleware
        const organizationId = req.user?.organizationId;

        const workflow = await prismaService.withTenantContext(organizationId, async tx => {
          return await tx.workflow.findUnique({
            where: { id: workflowId },
            select: { id: true, name: true },
          });
        });

        if (workflow) {
          // Add workflow name to request context for activity logging
          req.workflowName = workflow.name;
          req.workflowId = workflowId;
          req.workflow = workflow; // Add full workflow object for route usage
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
