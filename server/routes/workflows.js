const express = require('express');
const router = express.Router();
// Approval decision endpoint (resume paused approval)
router.post('/:workflowId/runs/:runId/approvals/:approvalId/decision', async (req, res) => {
  try {
    const { workflowId, runId, approvalId } = req.params;
    const { decision } = req.body; // 'approve' | 'reject'

    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ error: 'Invalid decision' });
    }

    const { PrismaClient } = require('../prisma/generated/client');
    const prisma = new PrismaClient();
    // TODO: Add Approval model to Prisma schema if approval functionality is needed
    // const approval = await prisma.approval.findFirst({ where: { id: approvalId, workflowId, runId } });
    if (!approval || approval.status !== 'pending') {
      return res.status(404).json({ error: 'Approval not found or not pending' });
    }

    approval.status = decision === 'approve' ? 'approved' : 'rejected';
    approval.decidedAt = new Date();
    approval.decidedBy = req.user?.email || null;
    await approval.save();

    // Resume the workflow from approval point
    const { resumeApproval } = require('../services/workflows/engine');
    const resumeResult = await resumeApproval(workflowId, runId, decision);

    return res.json({ success: true, resume: resumeResult });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
const workflowController = require('../controllers/workflowController');
const { validateWorkflow } = require('../middleware/validators/workflowValidator');
const { checkValidationResult } = require('../middleware/validators/validationResult');
const axios = require('axios');
const { validateUrl } = require('../middleware/ssrfProtection');
const {
  scheduleWorkflow,
  unscheduleWorkflow,
  getSchedulerStatus,
} = require('../services/scheduler');
// const mongoose = require('mongoose'); // Removed for Prisma migration
const { verifyWorkflowAccess } = require('../middleware/resourceAuthorization');
const { asyncHandler, errorResponses } = require('../utils/errorHandler');
const { logger } = require('../middleware/logger');
const { enrichWorkflowContext } = require('../middleware/workflowEnrichment');

// Route to test an HTTP request from the workflow builder
router.post('/test-http-request', async (req, res) => {
  const { url, method, headers: customHeaders, body } = req.body;

  logger.info('Test HTTP request received:', {
    url,
    method,
    headers: customHeaders,
    body: body ? '[BODY PROVIDED]' : '[NO BODY]',
  });

  if (!url) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'URL is required.' } });
  }

  // SSRF Protection using centralized validation
  const urlValidation = validateUrl(url);

  if (!urlValidation.isValid) {
    logger.info('SSRF protection blocked test request:', urlValidation.error);
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: urlValidation.error,
      },
    });
  }

  // Use sanitized URL for the request
  const sanitizedUrl = urlValidation.sanitizedUrl;

  // Convert header array to object
  const headers = {};
  if (Array.isArray(customHeaders)) {
    customHeaders.forEach(header => {
      if (header.key) {
        headers[header.key] = header.value || '';
      }
    });
  }

  console.log('=== WORKFLOW TEST ENDPOINT HIT ===', new Date());
  logger.info('Making request with headers:', headers);
  console.log('WORKFLOW DEBUG - Original headers array:', customHeaders);
  console.log('WORKFLOW DEBUG - Converted headers object:', headers);
  console.log('WORKFLOW DEBUG - Full request config:', {
    method,
    url: sanitizedUrl,
    headers,
    data: body,
    timeout: 10000,
  });

  try {
    const response = await axios({
      method,
      url: sanitizedUrl, // Use SSRF-validated and sanitized URL
      headers,
      data: body,
      timeout: 10000, // 10 second timeout
      maxRedirects: 3, // Limit redirects to prevent redirect attacks
      validateStatus: () => true, // Always resolve, even on non-2xx status codes
    });

    logger.info(
      `Request successful - Status: ${response.status}, StatusText: ${response.statusText}`
    );

    // We want to return the raw body, could be JSON, HTML, text, etc.
    res.status(200).json({
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      body: response.data,
    });
  } catch (error) {
    console.error('Request failed:', error.message);
    console.error('Error details:', {
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      address: error.address,
      port: error.port,
    });

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      logger.info(`Response error - Status: ${error.response.status}`);
      res.status(200).json({
        status: error.response.status,
        statusText: error.response.statusText,
        headers: error.response.headers,
        body: error.response.data,
      });
    } else if (error.request) {
      // The request was made but no response was received
      let message = 'The request was made but no response was received.';
      if (error.code === 'ECONNABORTED') {
        message = `Request timed out after ${error.config.timeout}ms.`;
      } else if (error.code === 'ENOTFOUND') {
        message = `The host at ${sanitizedUrl} was not found. Please check the URL.`;
      } else if (error.code === 'ECONNREFUSED') {
        message = `Connection refused. The server at ${sanitizedUrl} is not responding.`;
      }
      logger.info('Network error:', message);
      res.status(200).json({ status: 'Error', statusText: 'Network Error', body: message });
    } else {
      // Something happened in setting up the request that triggered an Error
      logger.info('Setup error:', error.message);
      res
        .status(200)
        .json({ status: 'Error', statusText: 'Request Setup Error', body: error.message });
    }
  }
});

// Route to test an email from the workflow builder
router.post('/test-email', async (req, res) => {
  const { to, subject, htmlBody, attachments } = req.body;

  logger.info('Test email request received:', {
    to,
    subject,
    hasBody: !!htmlBody,
    attachmentCount: attachments?.length || 0,
  });

  if (!to || !subject) {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'Email recipient (to) and subject are required.' },
    });
  }

  try {
    const { sendEmail } = require('../utils/mailer');

    const emailResult = await sendEmail({
      to,
      subject,
      html: htmlBody || '<p>Test email from workflow builder</p>',
      attachments: attachments && attachments.length > 0 ? attachments : undefined,
    });

    logger.info(`Test email sent successfully. Message ID: ${emailResult.messageId}`);

    res.status(200).json({
      status: 'success',
      message: 'Test email sent successfully!',
      messageId: emailResult.messageId,
      previewUrl: emailResult.previewUrl || null,
    });
  } catch (error) {
    console.error('Test email failed:', error.message);

    res.status(500).json({
      status: 'error',
      message: `Failed to send test email: ${error.message}`,
    });
  }
});

/* GET all workflows for the authenticated user */
router.get('/', workflowController.getWorkflows);

/* GET a single workflow by ID */
router.get('/:id', enrichWorkflowContext, workflowController.getWorkflowById);

/* POST a new workflow */
router.post('/', validateWorkflow, checkValidationResult, workflowController.createWorkflow);

/* PUT to update a workflow */
router.put(
  '/:id',
  enrichWorkflowContext,
  validateWorkflow,
  checkValidationResult,
  workflowController.updateWorkflow
);

/* DELETE a workflow */
router.delete('/:id', enrichWorkflowContext, workflowController.deleteWorkflow);

// Test execution of a workflow
router.post('/:id/test', enrichWorkflowContext, workflowController.testWorkflow);

// Get all runs for a workflow
router.get('/:id/runs', enrichWorkflowContext, workflowController.getWorkflowRuns);

// Add a new route to check scheduler status
router.get('/scheduler/status', async (req, res) => {
  try {
    const status = getSchedulerStatus();
    const { PrismaClient } = require('../prisma/generated/client');
    const prisma = new PrismaClient();
    const activeWorkflows = await prisma.workflow.findMany({
      where: {
        isActive: true,
        organizationId: req.user.organizationId
        // TODO: Add JSON filter for trigger:schedule nodes when needed
      },
      select: { id: true, name: true, definition: true }
    });

    const detailedStatus = {
      ...status,
      activeScheduledWorkflows: activeWorkflows.map(workflow => {
        const scheduleNode = workflow.nodes.find(n => n.data.nodeType === 'trigger:schedule');
        return {
          id: workflow._id,
          name: workflow.name,
          cronPattern: scheduleNode?.data?.pattern || 'No pattern found',
          isScheduled: status.scheduledWorkflows.some(
            sw => sw.workflowId === workflow._id.toString()
          ),
        };
      }),
    };

    res.json(detailedStatus);
  } catch (error) {
    logger.error('Failed to get scheduler status:', { error: error.message });
    errorResponses.serverError(res, error);
  }
});

// Add a new route to manually trigger scheduler for a specific workflow
router.post('/:id/schedule/test', async (req, res) => {
  try {
    const { PrismaClient } = require('../prisma/generated/client');
    const prisma = new PrismaClient();
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.user.organizationId
      }
    });
    if (!workflow) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Workflow not found' } });
    }

    logger.info(`Manual scheduler test requested for workflow: ${workflow.name}`);
    await scheduleWorkflow(workflow);

    res.json({
      message: `Scheduler test completed for workflow: ${workflow.name}`,
      workflowId: workflow._id,
      status: 'scheduled',
    });
  } catch (error) {
    logger.error('Failed to test scheduler for workflow:', { error: error.message });
    errorResponses.serverError(res, error);
  }
});

// Debug endpoint to manually test database triggers
router.post('/:id/test-database-trigger', verifyWorkflowAccess(), async (req, res) => {
  try {
    // Workflow is already verified and available from middleware
    const workflow = req.workflow;

    // Find the database trigger node
    const dbTriggerNode = workflow.nodes.find(n => n.data.nodeType === 'trigger:database');
    if (!dbTriggerNode) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'No database trigger node found in workflow' },
      });
    }

    logger.info('🧪 Manual database trigger test initiated');

    // Import the database trigger checking function
    const { checkDatabaseTrigger } = require('../services/scheduler');

    // Test the database trigger
    await checkDatabaseTrigger(workflow, dbTriggerNode);

    res.json({
      message: 'Database trigger test completed. Check server logs for details.',
      workflow: workflow.name,
      triggerConfig: dbTriggerNode.data,
    });
  } catch (error) {
    logger.error('Error testing database trigger:', { error: error.message });
    errorResponses.serverError(res, error);
  }
});

// Test ZoomInfo Intent Trigger
router.post('/test-zoominfo-trigger', async (req, res) => {
  try {
    logger.info('Test ZoomInfo trigger endpoint called');

    const ZoomInfoIntentTrigger = require('../services/workflows/nodes/zoomInfoIntentTrigger');

    // Call the test function
    const result = await ZoomInfoIntentTrigger(req.body, {}, { action: 'test' });

    res.json(result);
  } catch (error) {
    logger.error('Error testing ZoomInfo trigger:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Test ZoomInfo Contact Discovery
router.post('/test-zoominfo-contact-discovery', async (req, res) => {
  try {
    logger.info('Test ZoomInfo contact discovery endpoint called');

    const zoomInfoContactDiscovery = require('../services/workflows/nodes/zoomInfoContactDiscovery');

    // Call the node with test configuration
    const result = await zoomInfoContactDiscovery(req.body, {}, {});

    res.json(result);
  } catch (error) {
    logger.error('Error testing ZoomInfo contact discovery:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Test CRM Integration
router.post('/test-crm-integration', async (req, res) => {
  try {
    logger.info('Test CRM integration endpoint called');

    const crmIntegration = require('../services/workflows/nodes/crmIntegration');

    // Call the node with test configuration
    const result = await crmIntegration(req.body, { input: req.body.testData }, {});

    res.json(result);
  } catch (error) {
    logger.error('Error testing CRM integration:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Test Salesforce Record Trigger
router.post('/test-salesforce-record-trigger', async (req, res) => {
  try {
    const { connection = {}, object = 'Lead', soqlWhere = '', eventType = 'new' } = req.body || {};

    // Whitelist of allowed Salesforce objects to prevent SOQL injection
    const ALLOWED_OBJECTS = [
      'Account',
      'Contact',
      'Lead',
      'Opportunity',
      'Case',
      'Task',
      'Event',
      'Campaign',
      'CampaignMember',
      'User',
      'Group',
      'Product2',
      'Pricebook2',
      'PricebookEntry',
      'OpportunityLineItem',
      'Asset',
      'Contract',
      'Order',
      'OrderItem',
      'Solution',
      'Idea',
      'ContentDocument',
      'ContentVersion',
    ];

    // Validate object name against whitelist
    if (!ALLOWED_OBJECTS.includes(object)) {
      return res.status(400).json({
        success: false,
        error: `Invalid object name. Allowed objects: ${ALLOWED_OBJECTS.join(', ')}`,
      });
    }

    // Validate and sanitize WHERE clause to prevent SOQL injection
    // Only allow alphanumeric, spaces, comparison operators, AND/OR, parentheses, quotes, and common field names
    const SOQL_WHERE_PATTERN = /^[a-zA-Z0-9_\s\(\)='<>!,\.%\-:]+$/;
    const FORBIDDEN_KEYWORDS = [
      'UNION',
      'SELECT',
      'INSERT',
      'UPDATE',
      'DELETE',
      'DROP',
      'CREATE',
      'ALTER',
      'EXEC',
      'EXECUTE',
    ];

    if (soqlWhere) {
      // Check for forbidden keywords (case-insensitive)
      const upperWhere = soqlWhere.toUpperCase();
      for (const keyword of FORBIDDEN_KEYWORDS) {
        if (upperWhere.includes(keyword)) {
          return res.status(400).json({
            success: false,
            error: `Invalid WHERE clause: forbidden keyword '${keyword}' detected`,
          });
        }
      }

      // Validate WHERE clause pattern
      if (!SOQL_WHERE_PATTERN.test(soqlWhere)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid WHERE clause: contains disallowed characters',
        });
      }
    }

    const SalesforceService = require('../services/salesforce/SalesforceService');
    const sf = new SalesforceService({
      instanceUrl: connection.instanceUrl,
      accessToken: connection.accessToken,
      apiVersion: connection.apiVersion || 'v58.0',
    });

    // Test connection first
    await sf.testConnection();

    // Build query with validated inputs
    const order = eventType === 'new' ? 'DESC' : 'DESC';
    const where = soqlWhere ? `WHERE ${soqlWhere}` : '';
    const soql = `SELECT Id, CreatedDate FROM ${object} ${where} ORDER BY CreatedDate ${order} LIMIT 1`;
    const result = await sf.querySOQL(soql);

    return res.json({ success: true, sample: result?.records?.[0] || null });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Test Salesforce Action
router.post('/test-salesforce-action', async (req, res) => {
  try {
    const salesforceAction = require('../services/workflows/nodes/salesforceRecordAction');
    const result = await salesforceAction.execute(req.body, { input: req.body.testData || {} });
    return res.json({ success: result.status === 'success', result });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Test HubSpot Record Trigger
router.post('/test-hubspot-record-trigger', async (req, res) => {
  try {
    const { connection = {}, object = 'contact', eventType = 'new', filters = '' } = req.body || {};

    const ALLOWED_OBJECTS = ['contact', 'company', 'deal', 'ticket', 'product', 'line_item'];
    if (!ALLOWED_OBJECTS.includes(object)) {
      return res.status(400).json({
        success: false,
        error: `Invalid object. Allowed: ${ALLOWED_OBJECTS.join(', ')}`,
      });
    }

    const SAFE_FILTER = /^[a-zA-Z0-9_\s\(\)='<>!,\.%\-:]+$/;
    if (filters && !SAFE_FILTER.test(filters)) {
      return res.status(400).json({ success: false, error: 'Invalid filters expression' });
    }

    const HubSpotService = require('../services/hubspot/HubSpotService');
    const hs = new HubSpotService({
      accessToken: connection.accessToken,
      baseUrl: connection.baseUrl || 'https://api.hubapi.com',
      apiVersion: connection.apiVersion || 'v3',
    });

    await hs.testConnection();

    // Get a sample record
    const path = `/crm/v3/objects/${object}`;
    const params = { limit: 1, properties: ['createdate'] };
    const axios = require('axios');
    const client = axios.create({
      baseURL: connection.baseUrl || 'https://api.hubapi.com',
      headers: { Authorization: `Bearer ${connection.accessToken}` },
    });
    const resp = await client.get(path, { params, validateStatus: () => true });
    if (resp.status >= 400) {
      return res.status(500).json({ success: false, error: `HubSpot error: ${resp.status}` });
    }
    const sample = Array.isArray(resp.data?.results) ? resp.data.results[0] : null;
    return res.json({ success: true, sample });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Test HubSpot Action
router.post('/test-hubspot-action', async (req, res) => {
  try {
    const hubspotAction = require('../services/workflows/nodes/hubspotRecordAction');
    const result = await hubspotAction.execute(req.body, { input: req.body.testData || {} });
    return res.json({ success: result.status === 'success', result });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
