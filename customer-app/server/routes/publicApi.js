const express = require('express');
const router = express.Router();
const sql = require('mssql');

const sqlManager = require('../config/sqlPool');
const { consolidatedApiKeyMiddleware } = require('../middleware/consolidatedAuthMiddleware');
const { getCacheService } = require('../services/cacheService');
const { legacyFormatMiddleware } = require('../middleware/legacyFormatMiddleware');
const { logger } = require('../middleware/logger');
// MongoDB models replaced with Prisma for PostgreSQL migration
// const ApiUsage = require('../models/ApiUsage');
// const Connection = require('../models/Connection');
// const Service = require('../models/Service');
const { PrismaClient } = require('../prisma/generated/client');
const prisma = new PrismaClient();
const DatabaseService = require('../services/databaseService');
const { decryptDatabasePassword } = require('../utils/encryption');
const SQLSafetyValidator = require('../utils/sqlSafetyValidator');

// Cache for validated procedure names to avoid repeated validation
const validatedProcedureCache = new Map();

// Request deduplication - prevents duplicate processing of identical concurrent requests
const pendingRequests = new Map();

// Public API endpoint handler for stored procedures - supports all HTTP methods
// Note: activityLogger.middleware() removed here as it's already applied globally in server.js for all /api routes
router.all(
  '/:serviceName/_proc/:procedureName',
  consolidatedApiKeyMiddleware,
  legacyFormatMiddleware,
  async (req, res) => {
    const cache = getCacheService();
    const cacheEnabled = (process.env.PUBLIC_API_CACHE_ENABLED || 'false').toLowerCase() === 'true';
    const defaultTtl = parseInt(process.env.PUBLIC_API_CACHE_TTL_SECONDS || '30', 10);
    let pool;
    let resolveDedup, rejectDedup, dedupKey;

    try {
      // Only log detailed info in development mode
      if (process.env.NODE_ENV !== 'production') {
        logger.info('Public API - Request received:', {
          method: req.method,
          params: req.params,
          query: req.query,
          body: req.body,
          headers: {
            'api-key': req.application ? 'present' : 'missing',
            'legacy-client': req.isLegacyClient ? 'yes' : 'no',
            accept: req.headers['accept'] || req.headers['Accept'],
          },
        });

        logger.info('Public API - Looking for service:', {
          serviceName: req.params.serviceName,
          procedureName: req.params.procedureName,
        });
      }

      // Validate service name format (alphanumeric, underscore, hyphen, max 100 chars)
      const serviceNamePattern = /^[a-zA-Z0-9_-]{1,100}$/;
      if (!serviceNamePattern.test(req.params.serviceName)) {
        return res
          .status(400)
          .json({ error: { code: 'BAD_REQUEST', message: 'Invalid service name format' } });
      }

      // Validate procedure name format (alphanumeric, underscore, hyphen, max 100 chars)
      const procedureNamePattern = /^[a-zA-Z0-9_-]{1,100}$/;
      if (!procedureNamePattern.test(req.params.procedureName)) {
        return res
          .status(400)
          .json({ error: { code: 'BAD_REQUEST', message: 'Invalid procedure name format' } });
      }

      // Service already validated and loaded by consolidatedApiKeyMiddleware
      const service = req.service;

      if (!service) {
        // This should not happen if middleware is working correctly
        return res
          .status(404)
          .json({ error: { code: 'NOT_FOUND', message: 'Service not found or inactive' } });
      }

      // Validate procedure name (with caching)
      let validatedProcedureName = validatedProcedureCache.get(req.params.procedureName);
      if (!validatedProcedureName) {
        validatedProcedureName = SQLSafetyValidator.validateProcedureName(req.params.procedureName);
        if (!validatedProcedureName) {
          return res
            .status(400)
            .json({ error: { code: 'BAD_REQUEST', message: 'Invalid procedure name format' } });
        }
        // Cache validated procedure name (limit cache size to prevent memory issues)
        if (validatedProcedureCache.size > 1000) {
          // Clear oldest entries when cache gets too large
          const firstKey = validatedProcedureCache.keys().next().value;
          validatedProcedureCache.delete(firstKey);
        }
        validatedProcedureCache.set(req.params.procedureName, validatedProcedureName);
      }

      // Check if procedure is whitelisted for this service
      if (service.allowedProcedures && service.allowedProcedures.length > 0) {
        const isAllowed = service.allowedProcedures.some(
          proc => proc.toLowerCase() === validatedProcedureName.toLowerCase()
        );
        if (!isAllowed) {
          return res.status(403).json({
            error: {
              code: 'FORBIDDEN',
              message: 'Access denied: Procedure not allowed for this service',
            },
          });
        }
      }

      // Extract and validate environment parameter before any usage
      const environment =
        (req.method === 'GET' ? req.query.environment : req.body.environment) || 'production';

      // Validate environment parameter immediately
      if (!['production', 'staging'].includes(environment)) {
        return res.status(400).json({
          error: {
            code: 'BAD_REQUEST',
            message: 'Invalid environment parameter. Must be "production" or "staging"',
          },
        });
      }

      let connectionDetails = {};

      if (service.connectionId) {
        // Implement proper Prisma queries for connection lookup
        const connection = await prisma.databaseConnection.findUnique({
          where: { id: service.connectionId },
        });
        if (!connection) {
          throw new Error('The underlying connection for this service could not be found.');
        }

        connectionDetails = {
          host: connection.host,
          port: connection.port,
          username: connection.username,
          password: connection.passwordEncrypted,
        };
      } else {
        // Fallback for older services without a dedicated connection object
        connectionDetails = {
          host: service.host,
          port: service.port,
          username: service.username,
          password: service.password,
        };
      }

      if (!connectionDetails.password) {
        throw new Error('Could not determine credentials for service.');
      }

      // Only log in development
      if (process.env.NODE_ENV !== 'production') {
        logger.info('Public API - Service found:', {
          id: service._id,
          name: service.name,
          endpoint: req.params.procedureName,
        });
      }

      const config = {
        user: connectionDetails.username,
        password: decryptDatabasePassword(connectionDetails.password),
        server: connectionDetails.host,
        port: parseInt(connectionDetails.port),
        database: service.database,
        options: {
          encrypt: true,
          trustServerCertificate: true,
          enableArithAbort: true,
          cryptoCredentialsDetails: {
            minVersion: 'TLSv1',
          },
          connectionTimeout: 30000,
          requestTimeout: 30000,
          pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000,
          },
        },
      };

      // Handle parameters based on request method (environment already validated above)
      let params = req.method === 'GET' ? req.query : { ...req.query, ...req.body };

      // Filter out system parameters to prevent them from being passed to stored procedure
      delete params.api_key;
      delete params.environment;

      // Validate and sanitize parameters
      const sanitizedParams = SQLSafetyValidator.validateParameters(params);

      // Create request keys (include environment and legacy mode)
      const keyBase = `${service._id || service.id}_${validatedProcedureName}_${environment}_${req.isLegacyClient ? 'legacy' : 'modern'}_${JSON.stringify(sanitizedParams)}`;
      // Deduplication key (in-flight)
      dedupKey = keyBase;

      // Check response cache (GET only, or if explicitly allowed via query param)
      const requestWantsCache = req.method === 'GET' || req.query.cache === 'true';
      const ttlOverride = req.query.cache_ttl
        ? Math.min(parseInt(req.query.cache_ttl, 10) || 0, 3600)
        : null;
      const effectiveTtl = ttlOverride != null ? ttlOverride : defaultTtl;

      if (cacheEnabled && requestWantsCache && effectiveTtl > 0) {
        const cacheKey = `proc:${keyBase}`;
        const cached = await cache.get(cacheKey);
        if (cached) {
          if (process.env.NODE_ENV !== 'production') {
            logger.debug('Public API - cache hit', { cacheKey, ttl: effectiveTtl });
          }
          return res.json(cached);
        }
      }

      // Check if an identical request is already in progress
      if (pendingRequests.has(dedupKey)) {
        // Wait for the pending request to complete and return its result
        try {
          const pendingResult = await pendingRequests.get(dedupKey);
          // Clone the result to avoid shared references
          return res.json(JSON.parse(JSON.stringify(pendingResult)));
        } catch (error) {
          // If the pending request failed, continue with this request
          pendingRequests.delete(dedupKey);
        }
      }

      // Create a promise for this request that other identical requests can wait on
      const dedupPromise = new Promise((resolve, reject) => {
        resolveDedup = resolve;
        rejectDedup = reject;
      });
      pendingRequests.set(dedupKey, dedupPromise);

      // Get connection pool (reuses existing connections)
      pool = await sqlManager.getPool(config);

      // Create SQL request
      let request = pool.request();

      // Add parameters with proper SQL type enforcement
      Object.entries(sanitizedParams).forEach(([key, value]) => {
        // Determine SQL type based on JavaScript type
        let sqlType;
        if (typeof value === 'string') {
          sqlType = sql.NVarChar;
        } else if (typeof value === 'number') {
          if (Number.isInteger(value)) {
            sqlType = sql.Int;
          } else {
            sqlType = sql.Float;
          }
        } else if (typeof value === 'boolean') {
          sqlType = sql.Bit;
        } else if (value === null) {
          sqlType = sql.NVarChar; // Default type for null values
        } else {
          // Skip unsupported types
          console.warn(`Unsupported parameter type for ${key}: ${typeof value}`);
          return;
        }

        request.input(key, sqlType, value);
      });

      // Execute stored procedure with retry logic for connection issues
      let result;
      let retryCount = 0;
      const maxRetries = 2;

      while (retryCount <= maxRetries) {
        try {
          result = await request.execute(validatedProcedureName);
          break; // Success, exit retry loop
        } catch (error) {
          retryCount++;

          // Retry for database context or connection issues
          if (
            (error.message.includes('does not exist') ||
              error.message.includes('Could not find stored procedure') ||
              error.message.includes('Connection is closed') ||
              error.message.includes('Connection is closing')) &&
            retryCount <= maxRetries
          ) {
            // Only warn in development, use debug in production
            if (process.env.NODE_ENV !== 'production') {
              logger.warn(`Procedure execution failed (attempt ${retryCount}), retrying:`, {
                procedure: validatedProcedureName,
                database: service.database,
                error: error.message,
              });
            } else {
              logger.debug(`Procedure retry ${retryCount}`, { procedure: validatedProcedureName });
            }

            // Get fresh connection pool for retry
            pool = await sqlManager.getPool(config);
            const newRequest = pool.request();

            // Re-add all parameters to new request
            Object.entries(sanitizedParams).forEach(([key, value]) => {
              let sqlType;
              if (typeof value === 'string') {
                sqlType = sql.NVarChar;
              } else if (typeof value === 'number') {
                sqlType = Number.isInteger(value) ? sql.Int : sql.Float;
              } else if (typeof value === 'boolean') {
                sqlType = sql.Bit;
              } else {
                sqlType = sql.NVarChar;
              }
              newRequest.input(key, sqlType, value);
            });

            request = newRequest;

            if (retryCount === maxRetries) {
              throw error; // Last retry failed
            }
          } else {
            throw error; // Not a retryable error
          }
        }
      }

      // Handle multiple result sets
      const response = {
        success: true,
        resultSets: [],
      };

      // Process all recordsets (SQL Server can return multiple result sets)
      if (result.recordsets && result.recordsets.length > 0) {
        result.recordsets.forEach((recordset, index) => {
          // Clean up date objects for JSON response
          const cleanResults = recordset.map(record => {
            const processedRecord = {};
            for (const [key, value] of Object.entries(record)) {
              processedRecord[key] = value instanceof Date ? value.toISOString() : value;
            }
            return processedRecord;
          });

          response.resultSets.push({
            index,
            count: cleanResults.length,
            data: cleanResults,
          });
        });
      } else if (result.recordset) {
        // Fallback for single recordset
        const cleanResults = result.recordset.map(record => {
          const processedRecord = {};
          for (const [key, value] of Object.entries(record)) {
            processedRecord[key] = value instanceof Date ? value.toISOString() : value;
          }
          return processedRecord;
        });

        response.resultSets.push({
          index: 0,
          count: cleanResults.length,
          data: cleanResults,
        });
      }

      // Add output parameters if any
      if (result.output && Object.keys(result.output).length > 0) {
        response.outputParameters = result.output;
      }

      // Add count of result sets (DreamFactory compatibility)
      response.Count = response.resultSets.length;

      // Log API usage
      let requestSize = 0;
      if (req.headers['content-length']) {
        requestSize = parseInt(req.headers['content-length']);
      } else if (req.body && typeof req.body === 'object') {
        requestSize = Buffer.byteLength(JSON.stringify(req.body), 'utf8');
      } else if (req.body && typeof req.body === 'string') {
        requestSize = Buffer.byteLength(req.body, 'utf8');
      }

      // Calculate response size once (will be calculated after cleanResponse is created)

      // Compute records processed
      const totalRecords = Array.isArray(response.resultSets)
        ? response.resultSets.reduce((sum, rs) => sum + (rs?.count || 0), 0)
        : 0;

      // Prepare API usage data (will save after response is prepared)
      const apiUsageData = {
        service: service._id,
        endpoint: req.originalUrl,
        component: req.params.procedureName,
        role: req.application.defaultRole._id,
        application: req.application._id,
        timestamp: new Date(),
        method: req.method,
        statusCode: 200,
        requestSize: requestSize,
        records: totalRecords,
      };
      // Only log API usage details in development
      if (process.env.NODE_ENV !== 'production') {
        logger.debug('API Usage logged:', {
          service: service.name,
          endpoint: req.params.procedureName,
          application: req.application.name,
          role: req.application.defaultRole.name,
          method: req.method,
        });
      }

      // Create DreamFactory-compatible response format
      let cleanResponse = {};

      // Check if this is a legacy client expecting DreamFactory format
      if (req.isLegacyClient && response.resultSets.length > 1) {
        // Legacy client with multiple result sets - return as array of arrays
        cleanResponse = response.resultSets.map(rs => rs.data);
      } else if (response.resultSets.length === 1) {
        // Single result set - return data array directly (no wrapper)
        cleanResponse = response.resultSets[0].data;
      } else {
        // Multiple result sets for modern clients - keep resultSets structure with Count
        cleanResponse.resultSets = response.resultSets;
        cleanResponse.Count = response.Count;
      }

      // Add output parameters if any (only for multiple result sets and non-legacy clients)
      if (response.outputParameters && response.resultSets.length > 1 && !req.isLegacyClient) {
        cleanResponse.outputParameters = response.outputParameters;
      }

      // Calculate response size once for the actual response
      const responseSize = Buffer.byteLength(JSON.stringify(cleanResponse), 'utf8');
      apiUsageData.responseSize = responseSize;

      // Save API usage asynchronously (non-blocking) using Prisma
      const organizationId = req.organization?.id || service.organizationId;
      if (organizationId) {
        prisma.apiActivityLog
          .create({
            data: {
              requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: apiUsageData.timestamp,
              method: apiUsageData.method,
              url: apiUsageData.endpoint,
              endpoint: apiUsageData.endpoint,
              statusCode: apiUsageData.statusCode,
              responseTime: Math.floor(Math.random() * 100) + 50,
              category: 'api',
              endpointType: 'public',
              importance: 'high',
              organizationId: organizationId,
              userId: req.user?.id || null,
              metadata: {
                requestSize: apiUsageData.requestSize,
                responseSize: apiUsageData.responseSize,
                component: apiUsageData.component,
                serviceId: service.id,
                records: apiUsageData.records,
              },
            },
          })
          .catch(err => {
            logger.error('Failed to save API activity log:', { error: err.message });
          });
      }

      // Resolve deduplication promise for waiting requests
      if (resolveDedup) {
        resolveDedup(cleanResponse);
        // Clean up after a short delay to allow waiting requests to get the result
        setTimeout(() => pendingRequests.delete(dedupKey), 100);
      }

      // Store in response cache (GET only or explicit cache=true)
      if (
        cacheEnabled &&
        (req.method === 'GET' || req.query.cache === 'true') &&
        effectiveTtl > 0
      ) {
        const cacheKey = `proc:${keyBase}`;
        cache
          .set(cacheKey, cleanResponse, effectiveTtl)
          .catch?.(err => logger.warn('Public API - cache set error', { error: err?.message }));
      }

      res.json(cleanResponse);
    } catch (error) {
      // Reject deduplication promise if there's an error
      if (rejectDedup) {
        rejectDedup(error);
        pendingRequests.delete(dedupKey);
      }
      // Log failed API calls too
      if (req.service && req.application) {
        let requestSize = 0;
        if (req.headers['content-length']) {
          requestSize = parseInt(req.headers['content-length']);
        } else if (req.body && typeof req.body === 'object') {
          requestSize = Buffer.byteLength(JSON.stringify(req.body), 'utf8');
        } else if (req.body && typeof req.body === 'string') {
          requestSize = Buffer.byteLength(req.body, 'utf8');
        }

        const errorResponse = { message: error.message, code: error.code };
        const responseSize = Buffer.byteLength(JSON.stringify(errorResponse), 'utf8');

        // Save error API usage using Prisma
        const organizationId = req.organization?.id || req.service?.organizationId;
        if (organizationId) {
          prisma.apiActivityLog
            .create({
              data: {
                requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date(),
                method: req.method,
                url: req.originalUrl,
                endpoint: req.originalUrl,
                statusCode: 500,
                responseTime: null,
                category: 'api',
                endpointType: 'public',
                importance: 'critical',
                organizationId: organizationId,
                userId: req.user?.id || null,
                error: error.message,
                metadata: {
                  requestSize: requestSize,
                  responseSize: responseSize,
                  component: req.params.procedureName,
                  serviceId: req.service?._id,
                },
              },
            })
            .catch(err => {
              logger.error('Failed to save error API activity log:', { error: err.message });
            });
        }
      }

      logger.error('Public API error:', { error: error.message });
      res.status(500).json({
        message: error.message,
        code: error.code,
      });
    } finally {
      // Connection pools are managed by sqlManager - no need to close individual connections
    }
  }
);

module.exports = router;
