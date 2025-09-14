const express = require('express');
const logger = require('../utils/logger');
const { URL } = require('url');
const { Workflow } = require('../models/workflowModels');
const { executeWorkflow } = require('../services/workflows/engine');

const router = express.Router();

// Middleware to parse JSON and URL-encoded bodies
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// POST /api/forms/trigger/:workflowId
// This endpoint will be called by HTML forms to trigger a workflow.
router.post('/trigger/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const workflow = await Workflow.findById(workflowId);

    if (!workflow || !workflow.active) {
      return res.status(404).send('Workflow not found or is inactive.');
    }

    const triggerNode = workflow.nodes.find(node => node.data?.nodeType === 'trigger:form');

    if (!triggerNode) {
      return res.status(400).send('No form trigger configured for this workflow.');
    }

    const { redirectUrl, passDataToRedirect, formToken } = triggerNode.data;

    // Require form token for authentication
    if (!formToken) {
      return res.status(500).send('Form authentication not configured. Form token is required.');
    }

    // Check for token in form data or query parameters
    const submittedToken = req.body._token || req.query._token;
    if (!submittedToken || submittedToken !== formToken) {
      return res.status(401).send('Unauthorized: Invalid or missing form token.');
    }

    // Remove token from form data before processing
    delete req.body._token;

    // Execute the workflow asynchronously with the form data.
    executeWorkflow(workflow, req.body);

    if (redirectUrl) {
      try {
        const destination = new URL(redirectUrl);

        // Validate redirect URL to prevent open redirect vulnerability
        const allowedHosts = process.env.ALLOWED_REDIRECT_HOSTS
          ? process.env.ALLOWED_REDIRECT_HOSTS.split(',').map(h => h.trim())
          : ['localhost', '127.0.0.1'];

        // Add the current host to allowed hosts
        const currentHost = req.get('host');
        if (currentHost) {
          allowedHosts.push(currentHost);
        }

        // Check if the redirect URL is to an allowed host
        const isAllowedHost = allowedHosts.some(host => {
          return destination.hostname === host || destination.hostname.endsWith(`.${host}`);
        });

        if (!isAllowedHost) {
          console.warn(`Blocked redirect to unauthorized host: ${destination.hostname}`);
          return res
            .status(400)
            .send('Invalid redirect URL: Redirects to external domains are not allowed.');
        }

        // Additional check: ensure protocol is http or https
        if (!['http:', 'https:'].includes(destination.protocol)) {
          console.warn(`Blocked redirect with invalid protocol: ${destination.protocol}`);
          return res.status(400).send('Invalid redirect URL: Only HTTP(S) protocols are allowed.');
        }

        if (passDataToRedirect) {
          Object.entries(req.body).forEach(([key, value]) => {
            destination.searchParams.append(key, value);
          });
        }
        return res.redirect(302, destination.toString());
      } catch (urlError) {
        console.error('Invalid redirect URL:', redirectUrl, urlError);
        // Fallback for invalid URL
        return res.status(200).send('Form submission received, but the redirect URL was invalid.');
      }
    } else {
      return res.status(200).send('Form submission received and workflow started.');
    }
  } catch (error) {
    logger.error('Form trigger error:', { error: error.message });
    res.status(500).send('An error occurred while processing the form submission.');
  }
});

module.exports = router;
