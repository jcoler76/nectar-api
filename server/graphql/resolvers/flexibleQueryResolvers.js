const DatabaseService = require('../../services/databaseService');
const Service = require('../../models/Service');
const {
  hasClientPermission,
  hasDeveloperPermission,
  hasMCPUniversalPermission,
  getServiceForApiKey,
} = require('../middleware/apiKeyAuth');
const { AuthenticationError, ForbiddenError, UserInputError } = require('apollo-server-express');
const sql = require('mssql');
const { decryptDatabasePassword } = require('../../utils/encryption');
const SQLSafetyValidator = require('../../utils/sqlSafetyValidator');

// Simple in-memory storage for query templates (you might want to use MongoDB for persistence)
const queryTemplates = new Map();

const flexibleQueryResolvers = {
  Query: {
    // Execute a flexible database query
    executeQuery: async (_, { input }, context) => {
      const { user, jwtUser, apiKeyUser } = context;
      const startTime = Date.now();

      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      const { serviceName, query, parameters = {}, endpointName, environment } = input;

      // Validate environment parameter immediately after extraction
      if (environment && !['production', 'staging'].includes(environment)) {
        throw new UserInputError(
          'Invalid environment parameter. Must be "production" or "staging"'
        );
      }

      try {
        // Enhanced SQL safety validation
        SQLSafetyValidator.validateQuery(query);

        // Validate and sanitize parameters
        const sanitizedParameters = SQLSafetyValidator.validateParameters(parameters);
        let service = null;
        let hasPermission = false;

        // CLIENT API KEY LOGIC
        if (apiKeyUser && apiKeyUser.type === 'client') {
          // For clients, they can only access their permitted services/procedures
          // Now with optional environment support for testing
          service = await getServiceForApiKey(apiKeyUser, serviceName, environment);

          if (!service) {
            throw new ForbiddenError('No accessible service found for your API key');
          }

          // Extract procedure/view name from query for permission check
          const queryLower = query.toLowerCase().trim();
          let objectName = null;

          // Try to extract object name from different query types
          if (queryLower.startsWith('exec ') || queryLower.startsWith('execute ')) {
            // Stored procedure call
            const match = query.match(/exec(?:ute)?\s+(\w+\.?\w+)/i);
            objectName = match ? match[1] : null;
          } else if (queryLower.includes('from ')) {
            // SELECT from table/view
            const match = query.match(/from\s+(\w+\.?\w+)/i);
            objectName = match ? match[1] : null;
          } else if (queryLower.startsWith('select * from ')) {
            // Simple select
            const match = query.match(/from\s+(\w+\.?\w+)/i);
            objectName = match ? match[1] : null;
          }

          if (objectName) {
            hasPermission = hasClientPermission(apiKeyUser, service.name, objectName, 'GET');
            if (!hasPermission) {
              throw new ForbiddenError(`Access denied to ${objectName} in service ${service.name}`);
            }
          } else {
            throw new UserInputError(
              'Could not determine database object from query. Please use explicit procedure or view names.'
            );
          }
        }

        // DEVELOPER API KEY LOGIC
        else if (apiKeyUser && apiKeyUser.type === 'developer') {
          if (!endpointName) {
            throw new UserInputError('Developer API keys must specify endpointName');
          }

          hasPermission = hasDeveloperPermission(apiKeyUser, endpointName);
          if (!hasPermission) {
            throw new ForbiddenError(`Access denied to endpoint ${endpointName}`);
          }

          if (!serviceName) {
            throw new UserInputError('Developer API keys must specify serviceName');
          }

          service = await getServiceForApiKey(apiKeyUser, serviceName, environment);

          if (!service) {
            throw new UserInputError(`Service ${serviceName} not found or inactive`);
          }
        }

        // MCP UNIVERSAL KEY LOGIC
        else if (apiKeyUser && apiKeyUser.type === 'mcp_universal') {
          if (!serviceName) {
            throw new UserInputError('MCP Universal keys must specify serviceName');
          }

          hasPermission = hasMCPUniversalPermission(apiKeyUser, environment || 'staging');
          if (!hasPermission) {
            throw new ForbiddenError('MCP Universal keys are restricted from production databases');
          }

          service = await getServiceForApiKey(apiKeyUser, serviceName, environment);

          if (!service) {
            throw new UserInputError(
              `Service ${serviceName} not found or inactive in ${environment || 'staging'} environment`
            );
          }
        }

        // JWT USER LOGIC (Admin access)
        else if (jwtUser) {
          if (!serviceName) {
            throw new UserInputError('Service name is required for admin queries');
          }

          service = await Service.findOne({ name: serviceName, isActive: true }).populate(
            'connectionId'
          );

          if (!service) {
            throw new UserInputError(`Service ${serviceName} not found or inactive`);
          }

          hasPermission = true; // Admins have full access
        } else {
          throw new AuthenticationError('Invalid authentication method');
        }

        // Execute the query
        const result = await executeFlexibleQuery(service, query, sanitizedParameters);

        if (result.executionMode === 'suggestion') {
          return {
            success: false,
            error: result.message,
            executionTime: Date.now() - startTime,
            recordCount: 0,
            safetyInfo: {
              canExecute: result.canExecute,
              executableStatements: result.executableStatements,
              actionableStatements: result.actionableStatements,
              warnings: result.warnings,
            },
          };
        }

        return {
          success: true,
          data: result.data,
          executionTime: Date.now() - startTime,
          recordCount: result.recordCount || 0,
        };
      } catch (error) {
        console.error('Flexible query execution error:', error);
        return {
          success: false,
          error: error.message,
          executionTime: Date.now() - startTime,
          recordCount: 0,
        };
      }
    },

    // Get available services for the current API key
    availableServices: async (_, __, context) => {
      const { user, jwtUser, apiKeyUser } = context;

      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      // CLIENT API KEY - Return only services they have permission for
      if (apiKeyUser && apiKeyUser.type === 'client') {
        const serviceIds = apiKeyUser.permissions.map(perm => perm.serviceId._id || perm.serviceId);

        return await Service.find({
          _id: { $in: serviceIds },
          isActive: true,
        }).populate('connectionId');
      }

      // DEVELOPER API KEY - Return all active services
      if (apiKeyUser && apiKeyUser.type === 'developer') {
        return await Service.find({ isActive: true }).populate('connectionId');
      }

      // JWT USER - Return all services (admin access)
      if (jwtUser) {
        return await Service.find({ isActive: true }).populate('connectionId');
      }

      return [];
    },

    // Get database schema information
    getServiceSchema: async (_, { serviceName }, context) => {
      const { user, jwtUser, apiKeyUser } = context;

      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      // Check permissions
      let hasAccess = false;

      if (apiKeyUser && apiKeyUser.type === 'client') {
        const service = await getServiceForApiKey(apiKeyUser, serviceName);
        hasAccess = !!service;
      } else if (apiKeyUser && apiKeyUser.type === 'developer') {
        hasAccess = true; // Developers can explore schemas
      } else if (jwtUser) {
        hasAccess = true; // Admins can explore schemas
      }

      if (!hasAccess) {
        throw new ForbiddenError('Access denied to service schema');
      }

      const service = await Service.findOne({ name: serviceName, isActive: true }).populate(
        'connectionId'
      );

      if (!service) {
        throw new UserInputError(`Service ${serviceName} not found`);
      }

      try {
        return await getServiceSchemaInfo(service);
      } catch (error) {
        throw new Error(`Failed to retrieve schema: ${error.message}`);
      }
    },
  },

  Mutation: {
    // Save query template (developer endpoints only)
    saveQueryTemplate: async (_, args, context) => {
      const { user, apiKeyUser } = context;

      if (!user || !apiKeyUser || apiKeyUser.type !== 'developer') {
        throw new ForbiddenError('Only developer endpoints can save query templates');
      }

      const { name, serviceName, query, description, parameters } = args;

      const templateKey = `${apiKeyUser.endpoint.name}:${name}`;
      queryTemplates.set(templateKey, {
        name,
        serviceName,
        query,
        description,
        parameters,
        createdBy: apiKeyUser.endpoint.name,
        createdAt: new Date(),
      });

      return true;
    },

    // Execute saved query template
    executeQueryTemplate: async (_, { templateName, parameters = {} }, context) => {
      const { user, apiKeyUser } = context;

      if (!user || !apiKeyUser || apiKeyUser.type !== 'developer') {
        throw new ForbiddenError('Only developer endpoints can execute query templates');
      }

      const templateKey = `${apiKeyUser.endpoint.name}:${templateName}`;
      const template = queryTemplates.get(templateKey);

      if (!template) {
        throw new UserInputError(`Query template ${templateName} not found`);
      }

      // Merge template parameters with provided parameters
      const mergedParameters = { ...template.parameters, ...parameters };

      // Execute the template query
      return await flexibleQueryResolvers.Query.executeQuery(
        null,
        {
          input: {
            serviceName: template.serviceName,
            query: template.query,
            parameters: mergedParameters,
            endpointName: apiKeyUser.endpoint.name,
          },
        },
        context
      );
    },
  },
};

// Helper function to validate SQL for safety (only allow SELECT statements)
function validateSQLSafety(query) {
  const cleanQuery = query.trim().toLowerCase();

  // Remove leading whitespace and comments
  const sqlStatements = cleanQuery
    .replace(/--.*$/gm, '') // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);

  const results = {
    canExecute: true,
    executableStatements: [],
    actionableStatements: [],
    warnings: [],
  };

  for (const statement of sqlStatements) {
    // Check for dangerous operations
    if (statement.match(/^\s*(insert|update|delete|drop|create|alter|truncate|exec|execute)\b/i)) {
      results.canExecute = false;
      results.actionableStatements.push({
        sql: statement,
        type: statement.match(/^\s*(\w+)/i)[1].toUpperCase(),
        description: `This ${statement.match(/^\s*(\w+)/i)[1].toUpperCase()} statement would modify data`,
      });
    } else if (statement.match(/^\s*select\b/i) || statement.match(/^\s*with\b/i)) {
      results.executableStatements.push(statement);
    } else if (statement.length > 0) {
      results.warnings.push(`Unrecognized statement type: ${statement.substring(0, 50)}...`);
    }
  }

  // Special handling for stored procedures
  if (cleanQuery.match(/^\s*(exec|execute)\b/i)) {
    const procMatch = cleanQuery.match(/^\s*exec(?:ute)?\s+(\w+\.?\w+)/i);
    if (procMatch) {
      const procName = procMatch[1].toLowerCase();

      // Allow read-only procedures (those starting with 'get', 'fetch', 'select', 'list', etc.)
      if (procName.match(/^(usp.*get|get|fetch|select|list|find|search|view|report)/i)) {
        results.canExecute = true;
        results.executableStatements = [query];
        results.actionableStatements = [];
      } else {
        results.canExecute = false;
        results.actionableStatements = [
          {
            sql: query,
            type: 'PROCEDURE',
            description: `Stored procedure '${procName}' may modify data and cannot be executed automatically`,
          },
        ];
      }
    }
  }

  return results;
}

// Helper function to execute flexible queries
async function executeFlexibleQuery(service, query, parameters, options = {}) {
  let pool;

  try {
    // Validate SQL safety first
    const safetyCheck = validateSQLSafety(query);

    // If we're in suggestion mode or query is not safe to execute
    if (options.suggestionMode || !safetyCheck.canExecute) {
      return {
        executionMode: 'suggestion',
        canExecute: safetyCheck.canExecute,
        executableStatements: safetyCheck.executableStatements,
        actionableStatements: safetyCheck.actionableStatements,
        warnings: safetyCheck.warnings,
        message: safetyCheck.canExecute
          ? 'Query is safe to execute but provided as suggestion only'
          : 'Query contains data-modifying statements and cannot be executed automatically',
      };
    }

    // Get connection details
    let connectionDetails = {};

    if (service.connectionId) {
      connectionDetails = {
        host: service.connectionId.host,
        port: service.connectionId.port,
        username: service.connectionId.username,
        password: service.connectionId.password,
      };
    } else {
      connectionDetails = {
        host: service.host,
        port: service.port,
        username: service.username,
        password: service.password,
      };
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
        connectTimeout: 30000,
        requestTimeout: 60000,
      },
    };

    pool = await sql.connect(config);
    const request = pool.request();

    // Add parameters with enhanced validation
    Object.entries(parameters).forEach(([key, value]) => {
      // Additional parameter validation
      const validKey = SQLSafetyValidator.validateIdentifier(key);
      if (!validKey) {
        throw new Error(`Invalid parameter name: ${key}`);
      }
      request.input(validKey, value);
    });

    // Determine query type and execute accordingly
    const queryLower = query.toLowerCase().trim();

    if (queryLower.startsWith('exec ') || queryLower.startsWith('execute ')) {
      // Stored procedure - validate procedure name
      const procMatch = query.match(/exec(?:ute)?\s+(\w+\.?\w+)/i);
      if (!procMatch) {
        throw new Error('Invalid stored procedure format');
      }

      const procName = procMatch[1];
      const validProcName = SQLSafetyValidator.validateProcedureName(procName);
      if (!validProcName) {
        throw new Error(`Invalid procedure name: ${procName}`);
      }

      const result = await request.execute(validProcName);
      return {
        executionMode: 'executed',
        data: result.recordset,
        recordCount: result.recordset?.length || 0,
      };
    } else {
      // Raw SQL query
      const result = await request.query(query);
      return {
        executionMode: 'executed',
        data: result.recordset,
        recordCount: result.recordset?.length || 0,
      };
    }
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (err) {
        console.error('Error closing SQL connection:', err);
      }
    }
  }
}

// Helper function to get service schema information
async function getServiceSchemaInfo(service) {
  let pool;

  try {
    let connectionDetails = {};

    if (service.connectionId) {
      connectionDetails = {
        host: service.connectionId.host,
        port: service.connectionId.port,
        username: service.connectionId.username,
        password: service.connectionId.password,
      };
    } else {
      connectionDetails = {
        host: service.host,
        port: service.port,
        username: service.username,
        password: service.password,
      };
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
        connectTimeout: 30000,
      },
    };

    pool = await sql.connect(config);

    // Get tables, views, and stored procedures
    const [tables, views, procedures] = await Promise.all([
      pool.request().query(`
        SELECT TABLE_NAME as name, TABLE_TYPE as type
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
      `),
      pool.request().query(`
        SELECT TABLE_NAME as name, TABLE_TYPE as type
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'VIEW'
        ORDER BY TABLE_NAME
      `),
      pool.request().query(`
        SELECT ROUTINE_NAME as name, ROUTINE_TYPE as type
        FROM INFORMATION_SCHEMA.ROUTINES 
        WHERE ROUTINE_TYPE = 'PROCEDURE'
        ORDER BY ROUTINE_NAME
      `),
    ]);

    return {
      database: service.database,
      tables: tables.recordset,
      views: views.recordset,
      procedures: procedures.recordset,
    };
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (err) {
        console.error('Error closing SQL connection:', err);
      }
    }
  }
}

// Test the SQL safety validator (for development/debugging)
if (process.env.NODE_ENV === 'development') {
  // Test cases for SQL safety validation
  const testCases = [
    {
      name: 'Safe SELECT query',
      sql: 'SELECT * FROM gsCustomers WHERE dateadded >= GETDATE() - 30',
      expectedCanExecute: true,
    },
    {
      name: 'Dangerous INSERT query',
      sql: "INSERT INTO gsCustomers (customer, firstName) VALUES ('Test', 'User')",
      expectedCanExecute: false,
    },
    {
      name: 'Dangerous UPDATE query',
      sql: "UPDATE gsCustomers SET email = 'new@email.com' WHERE gsCustomersID = 123",
      expectedCanExecute: false,
    },
    {
      name: 'Safe stored procedure',
      sql: 'SELECT TOP 5 ContactID, ContactName FROM tblContact',
      expectedCanExecute: true,
    },
    {
      name: 'Potentially unsafe stored procedure',
      sql: "EXEC sp_UpdateCustomer @id=123, @email='new@email.com'",
      expectedCanExecute: false,
    },
  ];

  console.log('Testing SQL Safety Validator:');
  testCases.forEach(test => {
    const result = validateSQLSafety(test.sql);
    const passed = result.canExecute === test.expectedCanExecute;
    console.log(`  ${passed ? '✓' : '✗'} ${test.name}: ${passed ? 'PASS' : 'FAIL'}`);
    if (!passed) {
      console.log(`    Expected: ${test.expectedCanExecute}, Got: ${result.canExecute}`);
      console.log(`    Details:`, result);
    }
  });
}

module.exports = flexibleQueryResolvers;
