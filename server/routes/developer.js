const express = require('express');
const router = express.Router();
const Endpoint = require('../models/Endpoint');
const Connection = require('../models/Connection');
const sql = require('mssql');
const { decryptDatabasePassword } = require('../utils/encryption');
const { logger } = require('../utils/logger');
const SQLSafetyValidator = require('../utils/sqlSafetyValidator');
const { asyncHandler, errorResponses } = require('../utils/errorHandler');

// Middleware to validate developer API key
const devApiKeyAuth = async (req, res, next) => {
  const apiKey = req.header('x-mirabel-developer-key');
  if (!apiKey) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Unauthorized: Missing developer API key' },
    });
  }

  try {
    const endpointName = req.body.endpointName;
    if (!endpointName) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Bad Request: Missing endpointName in request body',
        },
      });
    }

    const endpoint = await Endpoint.findOne({ name: endpointName, apiKey: apiKey });
    if (!endpoint) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Forbidden: Invalid API key or endpoint name' },
      });
    }

    req.endpoint = endpoint;
    next();
  } catch (error) {
    logger.error('Developer API key auth error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred processing your request' },
    });
  }
};

router.post('/execute', devApiKeyAuth, async (req, res) => {
  const { databaseName, parameters } = req.body;
  const environment = req.body.environment || 'production';

  if (!databaseName) {
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'Bad Request: Missing databaseName in request body',
      },
    });
  }

  let pool;
  try {
    // Find a connection that contains the requested database
    const connection = await Connection.findOne({
      databases: databaseName,
    }).select('+password');

    if (!connection) {
      return res.status(404).json({
        message: `Database '${databaseName}' not found in any connection.`,
      });
    }

    const decryptedPassword = decryptDatabasePassword(connection.password);

    const config = {
      user: connection.username,
      password: decryptedPassword,
      server: connection.host,
      port: connection.port,
      database: databaseName,
      options: {
        encrypt: true,
        trustServerCertificate: true,
        connectTimeout: 15000,
      },
    };

    pool = await sql.connect(config);
    const request = pool.request();

    // Validate and add parameters to the request if they exist
    if (parameters && typeof parameters === 'object') {
      const sanitizedParams = SQLSafetyValidator.validateParameters(parameters);

      for (const [key, value] of Object.entries(sanitizedParams)) {
        // Enhanced type inference with proper SQL types
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
          sqlType = sql.NVarChar;
        } else if (value instanceof Date) {
          sqlType = sql.DateTime;
        } else {
          logger.warn(`Unsupported parameter type for ${key}: ${typeof value}`);
          continue;
        }

        request.input(key, sqlType, value);
      }
    }

    // Validate procedure name before execution
    const validatedProcedureName = SQLSafetyValidator.validateProcedureName(req.endpoint.name);
    if (!validatedProcedureName) {
      throw new Error('Invalid procedure name format');
    }

    logger.info(
      `Attempting to execute stored procedure: ${validatedProcedureName} on database: ${databaseName} (${environment})`
    );
    const result = await request.execute(validatedProcedureName);
    logger.info(
      `Stored procedure executed successfully in ${environment}. Result:`,
      result.recordset
    );

    // Check if we used a fallback connection and warn the client
    const response = {
      data: result.recordset,
      recordCount: result.recordset.length,
    };

    if (connection._isFallbackToProduction) {
      response.warning = {
        type: 'configuration_fallback',
        message: `Staging connection not properly configured. Used production database instead.`,
        reason: connection._fallbackReason,
        recommendation:
          environment === 'staging'
            ? 'Configure a proper staging connection to avoid data safety issues.'
            : 'Review connection configuration.',
      };

      // Log this for monitoring
      logger.warn('Fallback connection used in database operation', {
        requestedEnvironment: environment,
        actualEnvironment: 'production',
        reason: connection._fallbackReason,
        database: databaseName,
        procedure: req.endpoint.name,
      });
    }

    res.json(response);
  } catch (error) {
    logger.error(
      `Error executing endpoint '${req.endpoint.name}' on database '${databaseName}' (${environment}):`,
      error
    );

    // Check for specific SQL Server error codes
    if (error.number === 2812) {
      // SQL Server error 2812: Could not find stored procedure
      return res.status(404).json({
        message: `Stored procedure '${req.endpoint.name}' does not exist in database '${databaseName}'`,
        error: 'Procedure not found',
        errorCode: error.number,
      });
    } else if (error.number === 229) {
      // SQL Server error 229: Permission denied
      return res.status(403).json({
        message: `Permission denied executing '${req.endpoint.name}' in database '${databaseName}'`,
        error: 'Permission denied',
        errorCode: error.number,
      });
    } else if (error.number === 201 || error.number === 8144) {
      // SQL Server errors 201/8144: Procedure expects parameter that was not supplied
      return res.status(400).json({
        message: `Missing required parameters for procedure '${req.endpoint.name}'`,
        error: 'Missing parameters',
        errorCode: error.number,
        details: error.message,
      });
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      // Database connection errors
      return res.status(503).json({
        message: `Unable to connect to database '${databaseName}'`,
        error: 'Database connection failed',
        errorCode: error.code,
      });
    } else if (error.code === 'ELOGIN') {
      // Login/authentication errors
      return res.status(401).json({
        message: `Authentication failed for database '${databaseName}'`,
        error: 'Database authentication failed',
        errorCode: error.code,
      });
    } else {
      // Generic error for other cases
      return errorResponses.serverError(res, error);
    }
  } finally {
    if (pool) {
      await pool.close();
    }
  }
});

module.exports = router;
