const express = require('express');
const logger = require('../utils/logger');
const { PrismaClient } = require('../prisma/generated/client');
const prisma = new PrismaClient();
const { executeWorkflow } = require('../services/workflows/engine');
const { getFileStorageService } = require('../services/fileStorageService');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const router = express.Router();

router.use(express.json());

// POST /api/webhooks/trigger/:workflowId
// This is a public endpoint that will trigger a workflow.
router.post('/trigger/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { organization: true }
    });

    if (!workflow || !workflow.isActive) {
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Workflow not found or is inactive.' } });
    }

    // Find the specific webhook trigger node in the workflow definition
    const triggerNode = workflow.definition?.nodes?.find(
      node =>
        node.data?.nodeType === 'trigger:webhook' || node.data?.nodeType === 'trigger:s3Bucket'
    );

    if (!triggerNode) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'No webhook trigger configured for this workflow.',
        },
      });
    }

    // --- Authentication (Required) ---
    const { authType, headerName, apiKeyValue } = triggerNode.data;

    // Make API key authentication mandatory
    if (!authType || authType !== 'apiKey' || !apiKeyValue) {
      return res.status(500).json({
        message: 'Webhook authentication not configured. API key is required.',
      });
    }

    const incomingKey = req.header(headerName || 'X-Webhook-Key');
    if (!incomingKey || incomingKey !== apiKeyValue) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Unauthorized: Invalid or missing API Key.' },
      });
    }

    // Respond immediately to the caller
    res.status(202).json({ message: 'Workflow trigger accepted.' });

    // Execute the workflow asynchronously
    // We don't wait for it to finish.
    executeWorkflow(workflow, { body: req.body, headers: req.headers, query: req.query });
  } catch (error) {
    logger.error('Webhook trigger error:', { error: error.message });
    // Don't send a 500 response here, as the client has already received a 202
  }
});

// Salesforce Outbound Message (SOAP) webhook
// POST /api/webhooks/salesforce/outbound/:workflowId/:nodeId
router.post(
  '/salesforce/outbound/:workflowId/:nodeId',
  express.raw({ type: '*/*', limit: '2mb' }),
  async (req, res) => {
    try {
      const { workflowId, nodeId } = req.params;
      const workflow = await Workflow.findById(workflowId);

      if (!workflow || !workflow.active) {
        return res
          .status(404)
          .json({ error: { code: 'NOT_FOUND', message: 'Workflow not found or inactive.' } });
      }

      const node = workflow.nodes.find(
        n => n.id === nodeId && n.data?.nodeType === 'trigger:salesforce:outboundMessage'
      );
      if (!node) {
        return res.status(400).json({
          error: {
            code: 'BAD_REQUEST',
            message: 'No matching Salesforce outbound message trigger node found.',
          },
        });
      }

      const cfg = node.data || {};

      // Require TLS if configured
      if (cfg.requireTLS && req.protocol !== 'https') {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'HTTPS required' } });
      }

      // Enforce Basic Auth if enabled
      if (cfg.auth?.type === 'basic') {
        const authHeader = req.headers['authorization'] || '';
        const expected =
          'Basic ' + Buffer.from(`${cfg.auth.username}:${cfg.auth.password}`).toString('base64');
        if (authHeader !== expected) {
          return res
            .status(401)
            .set('WWW-Authenticate', 'Basic realm="Salesforce"')
            .send('Unauthorized');
        }
      }

      // Enforce allowed IPs/CIDRs if configured
      if (Array.isArray(cfg.allowedIPs) && cfg.allowedIPs.length > 0) {
        const ipaddr = require('ipaddr.js');

        // Get the real client IP address, avoiding header spoofing
        // When behind a trusted proxy (nginx), req.ip is already the real client IP
        // Only use X-Forwarded-For if we're explicitly configured to trust proxies
        let rawIp;

        // Check if Express is configured to trust proxies
        const trustProxy = req.app.get('trust proxy');

        if (trustProxy && req.headers['x-forwarded-for']) {
          // If we trust proxies, use the rightmost IP that isn't a trusted proxy
          // This prevents client spoofing while supporting legitimate proxies
          const forwardedIps = req.headers['x-forwarded-for'].split(',').map(ip => ip.trim());

          // In production with nginx, the real client IP is the last one added by our trusted proxy
          // Take the rightmost IP as it's added by our trusted infrastructure
          rawIp = forwardedIps[forwardedIps.length - 1] || req.ip;
        } else {
          // If we don't trust proxies or no X-Forwarded-For header, use req.ip directly
          // This prevents header spoofing attacks
          rawIp = req.ip || req.connection.remoteAddress;
        }

        // Additional security: Log the IP check attempt for audit purposes
        console.log(`[Security] IP allowlist check for ${rawIp} on Salesforce webhook`);

        let isAllowed = false;
        try {
          const addr = ipaddr.parse(rawIp);
          for (const cidr of cfg.allowedIPs) {
            try {
              const [range, bits] = cidr.split('/');
              const parsedRange = ipaddr.parse(range);
              if (
                addr.kind() === parsedRange.kind() &&
                addr.match(parsedRange, parseInt(bits || (addr.kind() === 'ipv6' ? 128 : 32)))
              ) {
                isAllowed = true;
                break;
              }
            } catch (e) {
              console.error(`[Security] Invalid CIDR in allowlist: ${cidr}`, e.message);
            }
          }
        } catch (e) {
          console.error(`[Security] Failed to parse IP address: ${rawIp}`, e.message);
        }

        if (!isAllowed) {
          console.warn(`[Security] Rejected request from unauthorized IP: ${rawIp}`);
          return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'IP not allowed' } });
        }
      }

      // Raw SOAP/XML body
      const rawBody =
        req.body instanceof Buffer ? req.body.toString('utf8') : (req.body || '').toString();

      // Acknowledge per Salesforce requirement if enabled
      if (cfg.responseAck !== false) {
        res.set('Content-Type', 'text/xml');
        return res
          .status(200)
          .send(
            `<?xml version="1.0" encoding="UTF-8"?>\n` +
              `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">` +
              `<soapenv:Body>` +
              `<notificationsResponse xmlns="http://soap.sforce.com/2005/09/outbound">` +
              `<Ack>true</Ack>` +
              `</notificationsResponse>` +
              `</soapenv:Body>` +
              `</soapenv:Envelope>`
          );
      }

      // Default immediate response
      res.status(202).json({ message: 'Accepted' });

      // Execute workflow async with raw SOAP payload
      executeWorkflow(workflow, {
        body: rawBody,
        headers: req.headers,
        query: req.query,
        contentType: req.headers['content-type'],
        source: 'salesforce-outbound-message',
      });
    } catch (error) {
      // Return a SOAP fault for XML clients
      res.set('Content-Type', 'text/xml');
      return res
        .status(500)
        .send(
          `<?xml version="1.0" encoding="UTF-8"?>\n` +
            `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">` +
            `<soapenv:Body>` +
            `<soapenv:Fault><faultcode>Server</faultcode><faultstring>${(
              error?.message || 'Internal Server Error'
            ).replace(/</g, '&lt;')}</faultstring></soapenv:Fault>` +
            `</soapenv:Body>` +
            `</soapenv:Envelope>`
        );
    }
  }
);

// POST /api/webhooks/s3/:workflowId
// Dedicated endpoint for S3 Event Notifications
router.post('/s3/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const workflow = await Workflow.findById(workflowId);

    if (!workflow || !workflow.active) {
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Workflow not found or is inactive.' } });
    }

    // Find the S3 bucket trigger node
    const s3TriggerNode = workflow.nodes.find(node => node.data?.nodeType === 'trigger:s3Bucket');

    if (!s3TriggerNode) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'No S3 bucket trigger configured for this workflow.',
        },
      });
    }

    // Parse S3 event notification payload
    const s3Event = req.body;

    // Handle SNS subscription confirmation (required for AWS SNS)
    if (s3Event.Type === 'SubscriptionConfirmation') {
      logger.info('S3 SNS Subscription confirmation received', {
        SubscribeURL: s3Event.SubscribeURL,
        workflowId,
      });

      // In production, you'd want to verify the subscription
      // For now, just acknowledge it
      return res.status(200).json({ message: 'Subscription confirmation received' });
    }

    // Handle SNS notification
    if (s3Event.Type === 'Notification') {
      let s3Records;
      try {
        s3Records = JSON.parse(s3Event.Message).Records;
      } catch (parseError) {
        logger.error('Failed to parse SNS message', { error: parseError.message });
        return res
          .status(400)
          .json({ error: { code: 'BAD_REQUEST', message: 'Invalid SNS message format' } });
      }
    } else if (s3Event.Records) {
      // Direct S3 event (not via SNS)
      s3Records = s3Event.Records;
    } else {
      logger.error('Unrecognized S3 event format', { body: req.body });
      return res
        .status(400)
        .json({ error: { code: 'BAD_REQUEST', message: 'Unrecognized event format' } });
    }

    // Process each S3 record
    const processedFiles = [];
    const s3TriggerConfig = s3TriggerNode.data;

    for (const record of s3Records) {
      try {
        const s3Info = record.s3;
        const bucketName = s3Info.bucket.name;
        const objectKey = decodeURIComponent(s3Info.object.key.replace(/\+/g, ' '));
        const objectSize = s3Info.object.size;

        // Check if this matches the configured bucket
        if (s3TriggerConfig.bucketName && bucketName !== s3TriggerConfig.bucketName) {
          logger.info(
            `Skipping event for bucket ${bucketName}, expected ${s3TriggerConfig.bucketName}`
          );
          continue;
        }

        // Apply file pattern filter if configured
        if (s3TriggerConfig.filePattern && s3TriggerConfig.filePattern !== '*') {
          const regex = new RegExp(s3TriggerConfig.filePattern.replace(/\*/g, '.*'));
          if (!regex.test(objectKey)) {
            logger.info(`File ${objectKey} doesn't match pattern ${s3TriggerConfig.filePattern}`);
            continue;
          }
        }

        // Apply prefix filter if configured
        if (s3TriggerConfig.prefix && !objectKey.startsWith(s3TriggerConfig.prefix)) {
          logger.info(`File ${objectKey} doesn't match prefix ${s3TriggerConfig.prefix}`);
          continue;
        }

        // Download file from S3 if downloadFiles is enabled
        let fileId = null;
        let expiresAt = null;

        if (s3TriggerConfig.downloadFiles !== false) {
          // Default to true
          try {
            const s3Client = new S3Client({
              region: s3TriggerConfig.awsRegion || process.env.AWS_REGION || 'us-east-1',
              credentials: {
                accessKeyId: s3TriggerConfig.awsAccessKeyId || process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey:
                  s3TriggerConfig.awsSecretAccessKey || process.env.AWS_SECRET_ACCESS_KEY,
              },
            });

            const getCommand = new GetObjectCommand({
              Bucket: bucketName,
              Key: objectKey,
            });

            const fileResponse = await s3Client.send(getCommand);
            const fileBuffer = Buffer.from(await fileResponse.Body.transformToByteArray());

            // Store file in temporary storage
            const fileStorageService = getFileStorageService();
            const metadata = {
              originalname: objectKey.split('/').pop(),
              mimetype: fileResponse.ContentType || 'application/octet-stream',
              size: objectSize,
              s3Key: objectKey,
              s3Bucket: bucketName,
              s3EventTime: record.eventTime,
              s3EventName: record.eventName,
              downloadedAt: new Date().toISOString(),
              eventSource: 's3-notification',
            };

            const storageResult = await fileStorageService.storeFile(fileBuffer, metadata);
            fileId = storageResult.fileId;
            expiresAt = storageResult.expiresAt;

            logger.info(`Downloaded S3 file ${objectKey} from ${bucketName} (${objectSize} bytes)`);
          } catch (downloadError) {
            logger.error(`Failed to download S3 file ${objectKey}:`, downloadError.message);
            // Continue processing without the file download
          }
        }

        processedFiles.push({
          bucketName,
          objectKey,
          objectSize,
          eventName: record.eventName,
          eventTime: record.eventTime,
          fileId,
          expiresAt,
          filename: objectKey.split('/').pop(),
        });
      } catch (recordError) {
        logger.error('Failed to process S3 record:', recordError.message);
        continue;
      }
    }

    // Respond immediately to AWS
    res.status(200).json({
      message: 'S3 event processed',
      filesProcessed: processedFiles.length,
    });

    // Execute workflow asynchronously with processed S3 data
    if (processedFiles.length > 0) {
      const workflowContext = {
        s3Event: {
          source: 'aws:s3',
          files: processedFiles,
          triggerType: 's3-event-notification',
          receivedAt: new Date().toISOString(),
        },
        headers: req.headers,
        originalPayload: s3Event,
      };

      executeWorkflow(workflow, workflowContext);

      logger.info(`S3 event triggered workflow ${workflowId} with ${processedFiles.length} files`);
    } else {
      logger.info(`S3 event received but no files matched criteria for workflow ${workflowId}`);
    }
  } catch (error) {
    logger.error('S3 webhook error:', { error: error.message, workflowId: req.params.workflowId });
    return res
      .status(500)
      .json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to process S3 event' } });
  }
});

module.exports = router;
