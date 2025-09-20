const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../prisma/generated/client');

const prisma = new PrismaClient();
const { decryptDatabasePassword } = require('../utils/encryption');
const { logger } = require('../middleware/logger');
const { fetchSchemaFromDatabase } = require('../utils/schemaUtils');
const { errorResponses } = require('../utils/errorHandler');
const sql = require('mssql');
const crypto = require('crypto');

// Get documentation using stored schema
router.get('/role/:roleId', async (req, res) => {
  try {
    const role = await prisma.role.findUnique({
      where: { id: req.params.roleId },
      include: {
        permissions: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!role) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Role not found' } });
    }

    // Check how many permissions lack schema information
    const permissionsWithoutSchema = role.permissions.filter(p => p.service && !p.schema);
    let needsSchemaRefresh = permissionsWithoutSchema.length > 0;

    logger.info(
      `Role ${role.name} has ${role.permissions.length} permissions, ${permissionsWithoutSchema.length} lack schema data`
    );

    // If we have permissions without schema, try to refresh them automatically
    if (needsSchemaRefresh && req.query.autoRefresh !== 'false') {
      logger.info('Attempting automatic schema refresh for missing schemas');
      try {
        await refreshSchemasByService(role.permissions);
        logger.info('Automatic schema refresh completed');
      } catch (refreshError) {
        logger.warn(
          'Automatic schema refresh failed, proceeding with available data',
          refreshError.message
        );
      }
    }

    // Transform all permissions into endpoints
    const endpoints = role.permissions
      .filter(p => p.service) // Only filter out ones without service
      .map(perm => {
        // Get the allowed methods
        const allowedMethods = Object.entries(perm.actions || {})
          .filter(([_, allowed]) => allowed)
          .map(([method]) => method);

        // Enhance parameter information - support both old and new field names
        const schemaData = perm.procedureSchema || perm.schema; // Backward compatibility
        const parameters =
          schemaData?.parameters?.map((param, index) => ({
            name: param.name || `param${index}`,
            type: param.type || 'unknown',
            parameterId: param.parameterId || index,
            isOutput: !!param.isOutput,
            isNullable: !!param.isNullable,
            maxLength: param.maxLength,
            precision: param.precision,
            scale: param.scale,
            description: param.description || `Parameter ${index + 1} for ${perm.objectName}`,
            // Add OpenAPI schema information
            schema: {
              type: mapSqlTypeToOpenApi(param.type),
              format: getOpenApiFormat(param.type),
              maxLength: param.maxLength,
              nullable: param.isNullable,
            },
          })) || [];

        // Enhanced procedure info with AI-generated documentation
        let procedureInfo = schemaData?.procedure
          ? {
              ...schemaData.procedure,
              fullPath: perm.objectName,
              hasSchema: true,
            }
          : {
              name: perm.objectName,
              fullPath: perm.objectName,
              hasSchema: false,
              note: 'Schema not loaded - click refresh to load parameter details',
            };

        // Add modern API documentation elements
        const apiDocumentation = {
          summary: `Execute ${perm.objectName.replace(/^.*\//, '')} stored procedure`,
          description: `Executes the ${perm.objectName} stored procedure on ${perm.service.name} service`,
          operationId: `execute_${perm.objectName.replace(/[^a-zA-Z0-9]/g, '_')}`,
          tags: [perm.service.name],
          produces: ['application/json'],
          consumes: ['application/json'],
          security: [{ ApiKeyAuth: [] }],
          responses: {
            200: {
              description: 'Successful execution',
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'array',
                    items: { type: 'object' },
                    description: 'Array of result records from stored procedure',
                  },
                  metadata: {
                    type: 'object',
                    properties: {
                      executionTime: { type: 'string', example: '45ms' },
                      recordCount: { type: 'integer', example: 10 },
                      service: { type: 'string', example: perm.service.name },
                      procedure: { type: 'string', example: perm.objectName },
                    },
                  },
                },
              },
            },
            400: { description: 'Bad Request - Invalid parameters' },
            401: { description: 'Unauthorized - Invalid or missing API key' },
            403: { description: 'Forbidden - Insufficient permissions' },
            500: { description: 'Internal Server Error' },
          },
        };

        // Enhance procedure info with API documentation
        procedureInfo = {
          ...procedureInfo,
          apiDocumentation,
        };

        return {
          path: `https://api.nectarstudio.ai/api/v2/${perm.service.name}${perm.objectName}`,
          methods: allowedMethods,
          method: allowedMethods[0] || 'GET', // Keep for backward compatibility
          primaryMethod: allowedMethods[0] || 'GET',
          service: perm.service.name,
          objectName: perm.objectName,
          description: perm.procedureSchema?.procedure?.name
            ? `Execute ${perm.procedureSchema.procedure.name} stored procedure`
            : `Execute ${perm.objectName} - schema not loaded`,
          parameters,
          procedureInfo,
          metadata: perm.schema
            ? {
                schema: perm.schema.procedure?.schema || 'unknown',
                created: perm.schema.procedure?.created,
                modified: perm.schema.procedure?.modified,
                schemaLastUpdated: perm.schema.lastUpdated,
                hasDetailedSchema: true,
              }
            : {
                schema: 'unknown',
                hasDetailedSchema: false,
                note: 'Click refresh to load detailed schema information',
              },
          roleId: role.id,
          permissionId: perm.id,
          actions: perm.actions,
          schemaStatus: schemaData ? 'loaded' : 'missing',

          // Add comprehensive API documentation fields
          httpMethods: allowedMethods.map(method => ({
            method,
            description: `${method} request to execute ${perm.objectName}`,
            requestContentType: method === 'GET' ? null : 'application/json',
            responseContentType: 'application/json',
          })),

          // Authentication requirements
          authentication: {
            type: 'apiKey',
            name: 'X-API-Key',
            location: 'header',
            description: 'API key for authentication',
          },

          // Rate limiting info
          rateLimiting: {
            requests: 1000,
            period: '1 hour',
            description: 'Standard rate limit applies',
          },

          // Examples and testing
          examples: {
            curl: generateCurlExample(perm, allowedMethods[0] || 'GET'),
            javascript: generateJavaScriptExample(perm, allowedMethods[0] || 'GET'),
            postman: `/api/documentation/examples/${role.id}/${perm.id}`,
          },
        };
      });

    const schemasLoaded = endpoints.filter(e => e.schemaStatus === 'loaded').length;
    const schemasMissing = endpoints.filter(e => e.schemaStatus === 'missing').length;
    const uniqueServices = [...new Set(endpoints.map(e => e.service))];
    const uniqueMethods = [...new Set(endpoints.flatMap(e => e.methods))];

    res.json({
      endpoints,
      role: {
        id: role.id,
        name: role.name,
        description: role.description,
        isActive: role.isActive,
      },
      summary: {
        totalEndpoints: endpoints.length,
        schemasLoaded,
        schemasMissing,
        services: uniqueServices,
        methods: uniqueMethods,
        servicesCount: uniqueServices.length,
        completeness:
          endpoints.length > 0 ? Math.round((schemasLoaded / endpoints.length) * 100) : 0,
      },
      actions: {
        refreshAll: `/api/documentation/refresh-schemas/${role.id}`,
        openapi: `/api/documentation/openapi/${role.id}`,
        postman: `/api/documentation/postman/${role.id}`,
        comprehensive: `/api/documentation/comprehensive/${role.id}`,
        pdf: {
          standard: `/api/documentation/pdf/${role.id}`,
          info: `/api/documentation/pdf/${role.id}/info`,
          custom: {
            method: 'POST',
            url: `/api/documentation/pdf/${role.id}/custom`,
          },
        },
        aiEnhance: `/api/documentation/ai-enhance/${role.id}`,
      },
      recommendations:
        schemasMissing > 0
          ? [
              'Some endpoints are missing schema information',
              'Use "Refresh All" to load detailed parameter information',
              'Schema refresh may take a few moments for large databases',
            ]
          : [
              'All schemas are loaded and up to date',
              'Use the OpenAPI or Postman links to export documentation',
              'Individual schemas can be refreshed as needed',
            ],
    });
  } catch (error) {
    logger.error('Documentation retrieval error', {
      error: error.message,
      stack: error.stack,
    });
    errorResponses.serverError(res, error);
  }
});

// Get usage examples for specific endpoint
router.get('/examples/:roleId/:permissionId', async (req, res) => {
  try {
    const role = await prisma.role.findUnique({
      where: { id: req.params.roleId },
      include: {
        permissions: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!role) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Role not found' } });
    }

    const permission = role.permissions.find(p => p.id === req.params.permissionId);
    if (!permission) {
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Permission not found' } });
    }

    const examples = generateUsageExamples(permission, role);
    res.json(examples);
  } catch (error) {
    logger.error('Usage examples generation error', error);
    errorResponses.serverError(res, error);
  }
});

// Generate AI-enhanced documentation for a specific endpoint
router.get('/ai-enhance/:roleId/:permissionId', async (req, res) => {
  try {
    const role = await prisma.role.findUnique({
      where: { id: req.params.roleId },
      include: {
        permissions: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!role) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Role not found' } });
    }

    const permission = role.permissions.find(p => p.id === req.params.permissionId);
    if (!permission) {
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Permission not found' } });
    }

    const forceRefresh = req.query.refresh === 'true';

    // Generate AI-enhanced documentation
    const enhancedDoc = await generateAIEnhancedDocumentation(permission, forceRefresh);

    // Save cached results if generated fresh
    if (enhancedDoc.cacheInfo?.shouldSave) {
      logger.info(`AI documentation generated for ${enhancedDoc.procedureName}`);
    }

    res.json(enhancedDoc);
  } catch (error) {
    logger.error('AI enhancement error', error);
    errorResponses.serverError(res, error);
  }
});

// Refresh schema for a specific permission
router.post('/refresh-schema/:roleId/:permissionId', async (req, res) => {
  try {
    const role = await prisma.role.findUnique({
      where: { id: req.params.roleId },
      include: {
        permissions: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!role) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Role not found' } });
    }

    const permission = role.permissions.find(p => p.id === req.params.permissionId);
    if (!permission) {
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Permission not found' } });
    }

    // Connect to database and get fresh schema
    const schema = await fetchSchemaFromDatabase(permission.service, permission.objectName);

    // Update stored schema in both fields for backward compatibility
    const schemaWithTimestamp = {
      lastUpdated: new Date(),
      ...schema,
    };

    // Update the permission using Prisma
    await prisma.permission.update({
      where: { id: permission.id },
      data: {
        procedureSchema: schemaWithTimestamp,
        schema: schemaWithTimestamp,
      },
    });

    res.json({
      message: 'Schema refreshed successfully',
      schema: permission.schema,
    });
  } catch (error) {
    logger.error('Schema refresh error', error);
    errorResponses.serverError(res, error);
  }
});

// Refresh all schemas for a role
router.post('/refresh-schemas/:roleId', async (req, res) => {
  try {
    const role = await prisma.role.findUnique({
      where: { id: req.params.roleId },
      include: {
        permissions: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!role) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Role not found' } });
    }

    logger.info('Starting bulk schema refresh', {
      roleId: req.params.roleId,
      permissionCount: role.permissions.length,
    });

    const startTime = Date.now();
    await refreshSchemasByService(role.permissions);

    logger.info('Bulk schema refresh completed', {
      roleId: req.params.roleId,
      duration: Date.now() - startTime,
    });

    res.json({
      message: 'Schemas refreshed successfully',
      updatedAt: new Date(),
      count: role.permissions.length,
    });
  } catch (error) {
    logger.error('Bulk schema refresh failed', {
      roleId: req.params.roleId,
      error: error.message,
    });
    errorResponses.serverError(res, error);
  }
});

async function refreshSchemasByService(permissions) {
  const serviceGroups = permissions.reduce((acc, perm) => {
    if (!perm.service) return acc;
    const key = `${perm.service.id}`;
    if (!acc[key]) {
      acc[key] = {
        service: perm.service,
        permissions: [],
      };
    }
    acc[key].permissions.push(perm);
    return acc;
  }, {});

  for (const group of Object.values(serviceGroups)) {
    try {
      // Get decrypted password
      const decryptedPassword = decryptDatabasePassword(group.service.password);
      if (!decryptedPassword) {
        throw new Error('Failed to decrypt database password');
      }

      // Single connection per service
      const pool = await sql.connect({
        server: group.service.host,
        port: group.service.port,
        database: group.service.database,
        user: group.service.username,
        password: decryptedPassword,
        options: {
          encrypt: true,
          trustServerCertificate: true,
        },
      });

      // Process all permissions for this service
      for (const perm of group.permissions) {
        try {
          const schema = await fetchSchemaFromDatabase(pool, perm.objectName);
          if (schema) {
            // Store in both fields for backward compatibility
            const schemaWithTimestamp = {
              lastUpdated: new Date(),
              ...schema,
            };

            // Update permission using Prisma
            await prisma.permission.update({
              where: { id: perm.id },
              data: {
                procedureSchema: schemaWithTimestamp,
                schema: schemaWithTimestamp,
              },
            });
          }
        } catch (error) {
          logger.error('Failed to refresh schema', {
            service: group.service.name,
            object: perm.objectName,
            error: error.message,
          });
        }
      }

      await pool.close();
    } catch (error) {
      logger.error('Service connection error during bulk refresh', {
        service: group.service.name,
        error: error.message,
      });
    }
  }
}

// Generate OpenAPI 3.0 specification for a role
router.get('/openapi/:roleId', async (req, res) => {
  try {
    const role = await prisma.role.findUnique({
      where: { id: req.params.roleId },
      include: {
        service: true,
      },
    });

    if (!role) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Role not found' } });
    }

    // Handle permissions as JSON field, not relation
    const permissions = role.permissions || [];

    const endpoints = Array.isArray(permissions)
      ? permissions
          .filter(p => p.objectName) // Basic filter for valid permissions
          .map(perm => {
            const allowedMethods = Object.entries(perm.actions || {})
              .filter(([_, allowed]) => allowed)
              .map(([method]) => method);

            return {
              path: `/api/services/${role.service.name}/${perm.objectName}`,
              methods: allowedMethods,
              service: role.service.name,
              objectName: perm.objectName,
              parameters: perm.procedureSchema?.parameters || [],
              procedureInfo: perm.procedureSchema?.procedure || null,
            };
          })
      : [];

    const openApiSpec = generateOpenAPISpec(role, endpoints);
    res.json(openApiSpec);
  } catch (error) {
    logger.error('OpenAPI generation error', error);
    errorResponses.serverError(res, error);
  }
});

// Generate Postman collection for a role
router.get('/postman/:roleId', async (req, res) => {
  try {
    const role = await prisma.role.findUnique({
      where: { id: req.params.roleId },
      include: {
        permissions: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!role) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Role not found' } });
    }

    const endpoints = role.permissions
      .filter(p => p.service)
      .map(perm => {
        const allowedMethods = Object.entries(perm.actions || {})
          .filter(([_, allowed]) => allowed)
          .map(([method]) => method);

        return {
          path: `/api/services/${perm.service.name}/${perm.objectName}`,
          methods: allowedMethods,
          service: perm.service.name,
          objectName: perm.objectName,
          parameters: perm.procedureSchema?.parameters || [],
        };
      });

    const postmanCollection = generatePostmanCollection(role, endpoints);
    res.json(postmanCollection);
  } catch (error) {
    logger.error('Postman collection generation error', error);
    errorResponses.serverError(res, error);
  }
});

// Generate comprehensive documentation with AI enhancement
router.get('/comprehensive/:roleId', async (req, res) => {
  try {
    const role = await prisma.role.findUnique({
      where: { id: req.params.roleId },
      include: {
        permissions: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!role) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Role not found' } });
    }

    // Get basic endpoint information
    const endpoints = role.permissions
      .filter(p => p.service)
      .map(perm => {
        const allowedMethods = Object.entries(perm.actions || {})
          .filter(([_, allowed]) => allowed)
          .map(([method]) => method);

        return {
          path: `/api/services/${perm.service.name}/${perm.objectName}`,
          methods: allowedMethods,
          service: perm.service.name,
          objectName: perm.objectName,
          parameters: perm.procedureSchema?.parameters || [],
          procedureInfo: perm.procedureSchema?.procedure || null,
          serviceId: perm.serviceId._id,
        };
      });

    // Group by service for better organization
    const serviceGroups = endpoints.reduce((acc, endpoint) => {
      if (!acc[endpoint.service]) {
        acc[endpoint.service] = {
          serviceName: endpoint.service,
          serviceId: endpoint.serviceId,
          endpoints: [],
        };
      }
      acc[endpoint.service].endpoints.push(endpoint);
      return acc;
    }, {});

    // AI Documentation Service has been deprecated in favor of OpenAI SDK integration
    let aiDocumentation = null;

    const comprehensiveDoc = {
      role: {
        id: role.id,
        name: role.name,
        description: role.description,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      },
      services: Object.values(serviceGroups),
      summary: {
        totalEndpoints: endpoints.length,
        servicesCount: Object.keys(serviceGroups).length,
        availableMethods: [...new Set(endpoints.flatMap(e => e.methods))],
        totalProcedures: endpoints.length,
      },
      apiSpecs: {
        openapi: `/api/documentation/openapi/${role.id}`,
        postman: `/api/documentation/postman/${role.id}`,
      },
      aiEnhancement: aiDocumentation
        ? {
            available: true,
            files: aiDocumentation.outputFiles,
            generationTime: aiDocumentation.generationTime,
          }
        : {
            available: false,
            reason: 'AI documentation service unavailable or failed',
          },
      generatedAt: new Date().toISOString(),
    };

    res.json(comprehensiveDoc);
  } catch (error) {
    logger.error('Comprehensive documentation generation error', error);
    errorResponses.serverError(res, error);
  }
});

// Helper function to generate OpenAPI 3.0 specification
function generateOpenAPISpec(role, endpoints) {
  const paths = {};
  const components = {
    schemas: {},
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
      },
    },
  };

  endpoints.forEach(endpoint => {
    const path = endpoint.path;
    paths[path] = {};

    endpoint.methods.forEach(method => {
      const operation = {
        summary: `Execute ${endpoint.objectName}`,
        description: `Execute the ${endpoint.objectName} stored procedure on ${endpoint.service} service`,
        tags: [endpoint.service],
        security: [{ ApiKeyAuth: [] }],
        parameters: [],
        responses: {
          200: {
            description: 'Successful execution',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { type: 'object' } },
                    metadata: { type: 'object' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Bad request - invalid parameters',
          },
          401: {
            description: 'Unauthorized - invalid API key',
          },
          403: {
            description: 'Forbidden - insufficient permissions',
          },
          500: {
            description: 'Internal server error',
          },
        },
      };

      // Add parameters based on stored procedure schema
      if (endpoint.parameters) {
        endpoint.parameters.forEach(param => {
          if (!param.isOutput) {
            operation.parameters.push({
              name: param.name,
              in: method === 'GET' ? 'query' : 'formData',
              required: !param.isNullable,
              schema: {
                type: mapSqlTypeToOpenApi(param.type),
                description: param.description || `Parameter for ${endpoint.objectName}`,
              },
            });
          }
        });
      }

      paths[path][method.toLowerCase()] = operation;
    });
  });

  return {
    openapi: '3.0.0',
    info: {
      title: `${role.name} API Documentation`,
      description: `API documentation for role: ${role.description || role.name}`,
      version: '1.0.0',
      contact: {
        name: 'Nectar Studio',
        description: 'Generated API documentation',
      },
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3001',
        description: 'Nectar Studio Server',
      },
    ],
    paths,
    components,
    security: [{ ApiKeyAuth: [] }],
  };
}

// Helper function to generate Postman collection
function generatePostmanCollection(role, endpoints) {
  const requests = [];

  endpoints.forEach(endpoint => {
    endpoint.methods.forEach(method => {
      const request = {
        name: `${method} ${endpoint.objectName}`,
        request: {
          method: method,
          header: [
            {
              key: 'X-API-Key',
              value: '{{api_key}}',
              type: 'text',
            },
            {
              key: 'Content-Type',
              value: 'application/json',
              type: 'text',
            },
          ],
          url: {
            raw: `{{base_url}}${endpoint.path}`,
            host: ['{{base_url}}'],
            path: endpoint.path.split('/').filter(p => p),
          },
          description: `Execute ${endpoint.objectName} stored procedure`,
        },
        response: [],
      };

      // Add body for POST/PUT/PATCH requests
      if (['POST', 'PUT', 'PATCH'].includes(method) && endpoint.parameters) {
        const bodyParams = {};
        endpoint.parameters.forEach(param => {
          if (!param.isOutput) {
            bodyParams[param.name] = `{{${param.name}}}`;
          }
        });

        request.request.body = {
          mode: 'raw',
          raw: JSON.stringify(bodyParams, null, 2),
          options: {
            raw: {
              language: 'json',
            },
          },
        };
      }

      // Add query parameters for GET requests
      if (method === 'GET' && endpoint.parameters) {
        request.request.url.query = endpoint.parameters
          .filter(param => !param.isOutput)
          .map(param => ({
            key: param.name,
            value: `{{${param.name}}}`,
            description: param.description || `Parameter for ${endpoint.objectName}`,
          }));
      }

      requests.push(request);
    });
  });

  return {
    info: {
      name: `${role.name} API Collection`,
      description: `Postman collection for ${role.name} role API endpoints`,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    variable: [
      {
        key: 'base_url',
        value: process.env.API_BASE_URL || 'http://localhost:3001',
        type: 'string',
      },
      {
        key: 'api_key',
        value: 'your-api-key-here',
        type: 'string',
      },
    ],
    item: requests,
  };
}

// Helper functions for inline examples
function generateCurlExample(permission, method) {
  const endpoint = `https://api.nectarstudio.ai/api/v2/${permission.service.name}${permission.objectName}`;
  let curlCommand = `curl -X ${method} "${endpoint}" \\
  -H "X-API-Key: YOUR_API_KEY"`;

  if (method !== 'GET' && permission.procedureSchema?.parameters) {
    const inputParams = permission.procedureSchema.parameters.filter(p => !p.isOutput);
    if (inputParams.length > 0) {
      const bodyParams = {};
      inputParams.forEach(p => {
        bodyParams[p.name] = getSampleValueForType(p.type);
      });
      curlCommand += ` \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(bodyParams, null, 2)}'`;
    }
  }

  return curlCommand;
}

function generateJavaScriptExample(permission, method) {
  const endpoint = `https://api.nectarstudio.ai/api/v2/${permission.service.name}${permission.objectName}`;
  let jsExample = `const response = await fetch('${endpoint}', {
  method: '${method}',
  headers: {
    'X-API-Key': 'YOUR_API_KEY'`;

  if (method !== 'GET') {
    jsExample += `,
    'Content-Type': 'application/json'`;
  }

  jsExample += `
  }`;

  if (method !== 'GET' && permission.procedureSchema?.parameters) {
    const inputParams = permission.procedureSchema.parameters.filter(p => !p.isOutput);
    if (inputParams.length > 0) {
      const bodyParams = {};
      inputParams.forEach(p => {
        bodyParams[p.name] = getSampleValueForType(p.type);
      });
      jsExample += `,
  body: JSON.stringify(${JSON.stringify(bodyParams, null, 2)})`;
    }
  }

  jsExample += `
});

const data = await response.json();
console.log(data);`;

  return jsExample;
}

// Generate PDF documentation for client sharing
router.get('/pdf/:roleId', async (req, res) => {
  try {
    const role = await prisma.role.findUnique({
      where: { id: req.params.roleId },
      include: {
        permissions: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!role) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Role not found' } });
    }

    // Generate PDF
    const pdfBuffer = await generatePDFDocumentation(role, {
      includeExamples: req.query.examples !== 'false',
      includeSchemas: req.query.schemas !== 'false',
      clientName: req.query.client || 'Client',
      watermark: req.query.watermark || null,
    });

    // Set response headers for PDF download
    const filename = `${role.name.replace(/[^a-zA-Z0-9]/g, '_')}_API_Documentation.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    logger.error('PDF generation error', error);
    errorResponses.serverError(res, error);
  }
});

// Generate branded PDF with custom styling
router.post('/pdf/:roleId/custom', async (req, res) => {
  try {
    const role = await prisma.role.findUnique({
      where: { id: req.params.roleId },
      include: {
        permissions: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!role) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Role not found' } });
    }

    const pdfOptions = {
      ...req.body,
      clientName: req.body.clientName || 'Client',
      includeExamples: req.body.includeExamples !== false,
      includeSchemas: req.body.includeSchemas !== false,
      includeCoverPage: req.body.includeCoverPage !== false,
      brandingOptions: {
        logo: req.body.logo,
        primaryColor: req.body.primaryColor || '#1976d2',
        secondaryColor: req.body.secondaryColor || '#f5f5f5',
        companyName: req.body.companyName || 'Nectar Studio',
        contactInfo: req.body.contactInfo,
      },
    };

    const pdfBuffer = await generatePDFDocumentation(role, pdfOptions);

    const filename = `${role.name.replace(/[^a-zA-Z0-9]/g, '_')}_API_Documentation_${req.body.clientName || 'Client'}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    logger.error('Custom PDF generation error', error);
    errorResponses.serverError(res, error);
  }
});

// Get PDF generation preview/info
router.get('/pdf/:roleId/info', async (req, res) => {
  try {
    const role = await prisma.role.findUnique({
      where: { id: req.params.roleId },
      include: {
        permissions: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!role) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Role not found' } });
    }

    const validPermissions = role.permissions.filter(p => p.service);
    const estimatedPages = 2 + validPermissions.length; // Cover + TOC + one page per endpoint

    const pdfInfo = {
      role: {
        name: role.name,
        description: role.description,
      },
      endpoints: validPermissions.length,
      services: [...new Set(validPermissions.map(p => p.service.name))],
      estimatedPages,
      downloadLinks: {
        standard: `/api/documentation/pdf/${role.id}`,
        withExamples: `/api/documentation/pdf/${role.id}?examples=true`,
        withoutSchemas: `/api/documentation/pdf/${role.id}?schemas=false`,
        custom: {
          method: 'POST',
          url: `/api/documentation/pdf/${role.id}/custom`,
          bodyExample: {
            clientName: 'Example Client',
            includeExamples: true,
            includeSchemas: true,
            includeCoverPage: true,
            brandingOptions: {
              primaryColor: '#1976d2',
              secondaryColor: '#f5f5f5',
              companyName: 'Nectar Studio',
              contactInfo: 'support@nectarstudio.ai',
            },
          },
        },
      },
      supportedOptions: {
        clientName: 'string - Name to appear on cover page',
        includeExamples: 'boolean - Include code examples',
        includeSchemas: 'boolean - Include parameter tables',
        includeCoverPage: 'boolean - Include branded cover page',
        brandingOptions: {
          primaryColor: 'string - Hex color for headers',
          secondaryColor: 'string - Hex color for backgrounds',
          companyName: 'string - Company name for footer',
          contactInfo: 'string - Contact information',
        },
      },
    };

    res.json(pdfInfo);
  } catch (error) {
    logger.error('PDF info error', error);
    errorResponses.serverError(res, error);
  }
});

// Helper function to generate usage examples
function generateUsageExamples(permission, role) {
  const serviceName = permission.service.name;
  const objectName = permission.objectName;
  const allowedMethods = Object.entries(permission.actions || {})
    .filter(([_, allowed]) => allowed)
    .map(([method]) => method);

  const examples = {
    curl: [],
    javascript: [],
    postman: {
      name: `${objectName} Examples`,
      requests: [],
    },
  };

  allowedMethods.forEach(method => {
    const endpoint = `/api/services/${serviceName}${objectName}`;
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';

    // Generate curl examples
    let curlCommand = `curl -X ${method} "${baseUrl}${endpoint}" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;

    // Add sample parameters if available
    if (permission.procedureSchema?.parameters) {
      const inputParams = permission.procedureSchema.parameters.filter(p => !p.isOutput);
      if (inputParams.length > 0) {
        if (method === 'GET') {
          const queryParams = inputParams.map(p => `${p.name}=sample_value`).join('&');
          curlCommand = curlCommand.replace(endpoint, `${endpoint}?${queryParams}`);
        } else {
          const bodyParams = {};
          inputParams.forEach(p => {
            bodyParams[p.name] = getSampleValueForType(p.type);
          });
          curlCommand += ` \\
  -d '${JSON.stringify(bodyParams, null, 2)}'`;
        }
      }
    }

    examples.curl.push({
      method,
      command: curlCommand,
      description: `${method} request to ${objectName}`,
    });

    // Generate JavaScript examples
    let jsExample = `// ${method} request to ${objectName}
const response = await fetch('${baseUrl}${endpoint}'`;

    if (method !== 'GET') {
      jsExample += `, {
  method: '${method}',
  headers: {
    'X-API-Key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  }`;

      if (permission.procedureSchema?.parameters) {
        const inputParams = permission.procedureSchema.parameters.filter(p => !p.isOutput);
        if (inputParams.length > 0) {
          const bodyParams = {};
          inputParams.forEach(p => {
            bodyParams[p.name] = getSampleValueForType(p.type);
          });
          jsExample += `,
  body: JSON.stringify(${JSON.stringify(bodyParams, null, 4)})`;
        }
      }
      jsExample += '\n}';
    } else {
      jsExample += `, {
  headers: {
    'X-API-Key': 'YOUR_API_KEY'
  }
}`;
    }

    jsExample += `);

const data = await response.json();
console.log(data);`;

    examples.javascript.push({
      method,
      code: jsExample,
      description: `${method} request to ${objectName} using fetch API`,
    });
  });

  return {
    permission: {
      id: permission._id,
      objectName,
      service: serviceName,
      allowedMethods,
    },
    examples,
    sampleResponse: {
      success: true,
      data: [
        {
          // Sample response structure
          note: 'Actual response structure depends on the stored procedure output',
        },
      ],
      metadata: {
        executionTime: '45ms',
        recordCount: 1,
        service: serviceName,
        procedure: objectName,
      },
    },
  };
}

// Helper function to generate sample values based on SQL type
function getSampleValueForType(sqlType) {
  const type = sqlType?.toLowerCase() || 'varchar';

  if (type.includes('int')) return 123;
  if (type.includes('decimal') || type.includes('numeric') || type.includes('float')) return 123.45;
  if (type.includes('bit')) return true;
  if (type.includes('date') || type.includes('time')) return '2024-01-01T12:00:00Z';
  if (type.includes('uniqueidentifier')) return '12345678-1234-1234-1234-123456789abc';
  return 'sample_value';
}

// AI-powered documentation enhancement with caching
async function generateAIEnhancedDocumentation(permission, forceRefresh = false) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      enhanced: false,
      reason: 'OpenAI API key not configured',
      fallback: generateBasicDocumentation(permission),
    };
  }

  try {
    const procedureName = permission.objectName.replace(/^.*\//, '');
    const serviceName = permission.service.name;

    // Generate hash of current schema to detect changes
    const crypto = require('crypto');
    const currentSchema = permission.procedureSchema || permission.schema; // Backward compatibility
    const schemaString = JSON.stringify(currentSchema || {});
    const currentSchemaHash = crypto.createHash('md5').update(schemaString).digest('hex');

    // Check if we have cached AI documentation that's still valid
    if (
      !forceRefresh &&
      permission.aiDocumentation &&
      permission.aiDocumentation.schemaHash === currentSchemaHash &&
      permission.aiDocumentation.lastGenerated
    ) {
      const cacheAge = Date.now() - new Date(permission.aiDocumentation.lastGenerated).getTime();
      const cacheMaxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      if (cacheAge < cacheMaxAge) {
        logger.info(
          `Using cached AI documentation for ${procedureName} (${Math.round(cacheAge / (1000 * 60 * 60))} hours old)`
        );
        return {
          enhanced: true,
          cached: true,
          procedureName,
          serviceName,
          cacheAge: Math.round(cacheAge / (1000 * 60 * 60)),
          documentation: {
            fullAnalysis: permission.aiDocumentation.fullAnalysis,
            sections: {
              businessPurpose: permission.aiDocumentation.businessPurpose,
              responseSchema: permission.aiDocumentation.responseSchema,
              responseExamples: permission.aiDocumentation.responseExamples,
              errorScenarios: permission.aiDocumentation.errorScenarios,
              usageGuidelines: permission.aiDocumentation.usageGuidelines,
              performanceNotes: permission.aiDocumentation.performanceNotes,
            },
            structured: {
              summary:
                permission.aiDocumentation.businessPurpose ||
                `Execute ${procedureName} stored procedure`,
              description: permission.aiDocumentation.fullAnalysis?.substring(0, 500) + '...' || '',
              responseSchema: permission.aiDocumentation.responseSchema,
              examples: permission.aiDocumentation.responseExamples,
              errors: permission.aiDocumentation.errorScenarios,
            },
          },
        };
      }
    }

    logger.info(`Generating fresh AI documentation for ${procedureName} (cache miss or expired)`);

    // Build context for AI analysis
    const analysisPrompt = buildStoredProcedureAnalysisPrompt(
      permission,
      procedureName,
      serviceName
    );

    // Call OpenAI API
    const axios = require('axios');
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert API documentation generator. Create comprehensive, modern API documentation similar to Swagger/OpenAPI specifications. Focus on practical usage, clear examples, and detailed response schemas.',
          },
          {
            role: 'user',
            content: analysisPrompt,
          },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const aiAnalysis = response.data.choices[0].message.content;
    const parsedDoc = parseAIDocumentationResponse(aiAnalysis, permission);

    // Cache the AI analysis results
    const aiDocumentation = {
      lastGenerated: new Date(),
      modelUsed: 'gpt-4o-mini',
      businessPurpose: parsedDoc.sections.businessPurpose,
      responseSchema: parsedDoc.structured.responseSchema,
      responseExamples: parsedDoc.structured.examples,
      errorScenarios: parsedDoc.structured.errors,
      usageGuidelines: parsedDoc.sections.usageGuidelines,
      performanceNotes: parsedDoc.sections.performanceNotes,
      fullAnalysis: aiAnalysis,
      schemaHash: currentSchemaHash,
    };

    // Note: The calling function should save this back to the database
    permission.aiDocumentation = aiDocumentation;

    return {
      enhanced: true,
      cached: false,
      procedureName,
      serviceName,
      aiAnalysis,
      generatedAt: new Date().toISOString(),
      documentation: parsedDoc,
      cacheInfo: {
        schemaHash: currentSchemaHash,
        shouldSave: true,
      },
    };
  } catch (error) {
    logger.error('AI documentation enhancement failed', error);
    return {
      enhanced: false,
      reason: `AI enhancement failed: ${error.message}`,
      fallback: generateBasicDocumentation(permission),
    };
  }
}

// Build comprehensive analysis prompt for OpenAI
function buildStoredProcedureAnalysisPrompt(permission, procedureName, serviceName) {
  const parameters = permission.procedureSchema?.parameters || [];
  const inputParams = parameters.filter(p => !p.isOutput);
  const outputParams = parameters.filter(p => p.isOutput);

  let prompt = `Analyze this SQL Server stored procedure and generate comprehensive API documentation:\n\n`;

  prompt += `**Stored Procedure**: ${procedureName}\n`;
  prompt += `**Service**: ${serviceName}\n`;
  prompt += `**Full Path**: ${permission.objectName}\n\n`;

  if (inputParams.length > 0) {
    prompt += `**Input Parameters**:\n`;
    inputParams.forEach(param => {
      prompt += `- ${param.name} (${param.type}${param.maxLength ? `(${param.maxLength})` : ''}) - ${param.isNullable ? 'Optional' : 'Required'}\n`;
    });
    prompt += `\n`;
  }

  if (outputParams.length > 0) {
    prompt += `**Output Parameters**:\n`;
    outputParams.forEach(param => {
      prompt += `- ${param.name} (${param.type})\n`;
    });
    prompt += `\n`;
  }

  prompt += `Please provide:\n\n`;
  prompt += `1. **Business Purpose**: What does this procedure do in business terms?\n`;
  prompt += `2. **Response Schema**: Detailed JSON schema of what this procedure returns\n`;
  prompt += `3. **Response Examples**: Sample JSON responses with realistic data\n`;
  prompt += `4. **Error Scenarios**: Common error cases and their HTTP status codes\n`;
  prompt += `5. **Usage Guidelines**: Best practices for using this endpoint\n`;
  prompt += `6. **Performance Notes**: Any performance considerations or limitations\n\n`;

  prompt += `Format your response as structured markdown that would be suitable for modern API documentation (like Swagger).`;

  return prompt;
}

// Parse AI response into structured documentation
function parseAIDocumentationResponse(aiResponse, permission) {
  // Extract sections from the AI response
  const sections = {
    businessPurpose: extractSection(aiResponse, 'Business Purpose'),
    responseSchema: extractSection(aiResponse, 'Response Schema'),
    responseExamples: extractSection(aiResponse, 'Response Examples'),
    errorScenarios: extractSection(aiResponse, 'Error Scenarios'),
    usageGuidelines: extractSection(aiResponse, 'Usage Guidelines'),
    performanceNotes: extractSection(aiResponse, 'Performance Notes'),
  };

  return {
    fullAnalysis: aiResponse,
    sections,
    structured: {
      summary: sections.businessPurpose || `Execute ${permission.objectName} stored procedure`,
      description: aiResponse.substring(0, 500) + '...',
      responseSchema: tryParseJsonSchema(sections.responseSchema),
      examples: tryParseExamples(sections.responseExamples),
      errors: parseErrorScenarios(sections.errorScenarios),
    },
  };
}

// Helper functions for parsing AI response
function extractSection(text, sectionName) {
  const regex = new RegExp(`\\*\\*${sectionName}\\*\\*:?\\s*([\\s\\S]*?)(?=\\*\\*|$)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

function tryParseJsonSchema(schemaText) {
  if (!schemaText) return null;

  try {
    // Look for JSON blocks in the schema text
    const jsonMatch = schemaText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
  } catch (error) {
    logger.warn('Failed to parse JSON schema from AI response', error);
  }

  return { raw: schemaText };
}

function tryParseExamples(examplesText) {
  if (!examplesText) return [];

  const examples = [];
  const jsonBlocks = examplesText.match(/```json\s*([\s\S]*?)\s*```/g) || [];

  jsonBlocks.forEach((block, index) => {
    try {
      const jsonContent = block.replace(/```json\s*|\s*```/g, '');
      examples.push({
        name: `Example ${index + 1}`,
        data: JSON.parse(jsonContent),
      });
    } catch (error) {
      logger.warn(`Failed to parse example ${index + 1}`, error);
    }
  });

  return examples.length > 0 ? examples : [{ raw: examplesText }];
}

function parseErrorScenarios(errorText) {
  if (!errorText) return [];

  const errors = [];
  const lines = errorText.split('\n');

  lines.forEach(line => {
    const statusMatch = line.match(/(\d{3})/); // Look for HTTP status codes
    if (statusMatch) {
      errors.push({
        status: parseInt(statusMatch[1]),
        description: line.replace(/^.*\d{3}\s*[-:]?\s*/, '').trim(),
      });
    }
  });

  return errors;
}

// Generate basic documentation when AI is not available
function generateBasicDocumentation(permission) {
  const procedureName = permission.objectName.replace(/^.*\//, '');

  return {
    summary: `Execute ${procedureName} stored procedure`,
    description: `Executes the ${procedureName} stored procedure on ${permission.service.name} service`,
    responseSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', description: 'Request success status' },
        data: {
          type: 'array',
          items: { type: 'object' },
          description: 'Result data from stored procedure',
        },
        metadata: {
          type: 'object',
          description: 'Execution metadata',
        },
      },
    },
    examples: [
      {
        name: 'Success Response',
        data: {
          success: true,
          data: [{ sample: 'result' }],
          metadata: { executionTime: '45ms', recordCount: 1 },
        },
      },
    ],
  };
}

// Helper function to map SQL types to OpenAPI types
function mapSqlTypeToOpenApi(sqlType) {
  const typeMap = {
    varchar: 'string',
    nvarchar: 'string',
    char: 'string',
    nchar: 'string',
    text: 'string',
    ntext: 'string',
    int: 'integer',
    bigint: 'integer',
    smallint: 'integer',
    tinyint: 'integer',
    decimal: 'number',
    numeric: 'number',
    float: 'number',
    real: 'number',
    money: 'number',
    smallmoney: 'number',
    bit: 'boolean',
    datetime: 'string',
    datetime2: 'string',
    date: 'string',
    time: 'string',
    timestamp: 'string',
    uniqueidentifier: 'string',
  };

  const normalizedType = sqlType?.toLowerCase() || 'string';
  return typeMap[normalizedType] || 'string';
}

// Helper function to get OpenAPI format for SQL types
function getOpenApiFormat(sqlType) {
  const formatMap = {
    datetime: 'date-time',
    datetime2: 'date-time',
    date: 'date',
    time: 'time',
    uniqueidentifier: 'uuid',
    decimal: 'decimal',
    numeric: 'decimal',
    float: 'float',
    real: 'float',
    money: 'decimal',
    smallmoney: 'decimal',
  };

  const normalizedType = sqlType?.toLowerCase() || '';
  return formatMap[normalizedType] || undefined;
}

// PDF Generation Function
async function generatePDFDocumentation(role, options = {}) {
  const PDFDocument = require('pdfkit');
  const fs = require('fs');
  const path = require('path');

  const {
    includeExamples = true,
    includeSchemas = true,
    clientName = 'Client',
    includeCoverPage = true,
    brandingOptions = {},
  } = options;

  const doc = new PDFDocument({
    size: 'A4',
    margins: {
      top: 50,
      bottom: 50,
      left: 50,
      right: 50,
    },
  });

  // Collect PDF data
  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));

  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      resolve(pdfBuffer);
    });

    doc.on('error', reject);

    try {
      // Generate PDF content
      generatePDFContent(doc, role, options);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function generatePDFContent(doc, role, options) {
  const {
    clientName = 'Client',
    includeCoverPage = true,
    includeExamples = true,
    includeSchemas = true,
    brandingOptions = {},
  } = options;

  const primaryColor = brandingOptions.primaryColor || '#1976d2';
  const companyName = brandingOptions.companyName || 'Nectar Studio';

  let currentY = 50;

  // Cover Page
  if (includeCoverPage) {
    // Title
    doc
      .fontSize(28)
      .fillColor(primaryColor)
      .text('API Documentation', 50, 100, { align: 'center' });

    doc.fontSize(20).fillColor('#333333').text(`${role.name} API`, 50, 150, { align: 'center' });

    doc
      .fontSize(14)
      .fillColor('#666666')
      .text(`Prepared for: ${clientName}`, 50, 200, { align: 'center' })
      .text(`Generated: ${new Date().toLocaleDateString()}`, 50, 220, { align: 'center' })
      .text(`By: ${companyName}`, 50, 240, { align: 'center' });

    // Add company contact info if provided
    if (brandingOptions.contactInfo) {
      doc
        .fontSize(12)
        .fillColor('#888888')
        .text(brandingOptions.contactInfo, 50, 700, { align: 'center' });
    }

    doc.addPage();
    currentY = 50;
  }

  // Table of Contents
  doc.fontSize(18).fillColor(primaryColor).text('Table of Contents', 50, currentY);

  currentY += 40;

  const validPermissions = role.permissions.filter(p => p.service);

  doc.fontSize(12).fillColor('#333333');

  validPermissions.forEach((perm, index) => {
    const procedureName = perm.objectName.replace(/^.*\//, '');
    doc
      .text(`${index + 1}. ${procedureName}`, 70, currentY, { continued: true })
      .text(`Page ${index + 2}`, 0, currentY, { align: 'right' });
    currentY += 20;
  });

  // API Overview
  doc.addPage();
  currentY = 50;

  doc.fontSize(18).fillColor(primaryColor).text('API Overview', 50, currentY);

  currentY += 30;

  doc
    .fontSize(12)
    .fillColor('#333333')
    .text(`Role: ${role.name}`, 50, currentY)
    .text(`Description: ${role.description || 'No description provided'}`, 50, currentY + 20)
    .text(`Total Endpoints: ${validPermissions.length}`, 50, currentY + 40)
    .text(
      `Services: ${[...new Set(validPermissions.map(p => p.service.name))].join(', ')}`,
      50,
      currentY + 60
    );

  currentY += 100;

  // Authentication section
  doc.fontSize(14).fillColor(primaryColor).text('Authentication', 50, currentY);

  currentY += 25;

  doc
    .fontSize(12)
    .fillColor('#333333')
    .text(
      'All API requests require authentication using an API key in the request header:',
      50,
      currentY
    )
    .text('Header: X-API-Key', 70, currentY + 20)
    .text('Value: Your assigned API key', 70, currentY + 40);

  currentY += 80;

  // Base URL section
  doc.fontSize(14).fillColor(primaryColor).text('Base URL', 50, currentY);

  currentY += 25;

  doc.fontSize(12).fillColor('#333333').text('https://api.nectarstudio.ai/api/v2/', 50, currentY);

  // Individual Endpoints
  validPermissions.forEach((perm, index) => {
    doc.addPage();
    currentY = 50;

    const procedureName = perm.objectName.replace(/^.*\//, '');
    const allowedMethods = Object.entries(perm.actions || {})
      .filter(([_, allowed]) => allowed)
      .map(([method]) => method);

    // Endpoint title
    doc.fontSize(18).fillColor(primaryColor).text(`${procedureName}`, 50, currentY);

    currentY += 30;

    // Endpoint details
    doc
      .fontSize(12)
      .fillColor('#333333')
      .text(`Service: ${perm.service.name}`, 50, currentY)
      .text(`Methods: ${allowedMethods.join(', ')}`, 50, currentY + 20)
      .text(`Path: ${perm.service.name}${perm.objectName}`, 50, currentY + 40);

    currentY += 80;

    // Full URL example
    doc
      .fontSize(10)
      .fillColor('#666666')
      .text(
        `Full URL: https://api.nectarstudio.ai/api/v2/${perm.service.name}${perm.objectName}`,
        50,
        currentY
      );

    currentY += 30;

    // Parameters section
    if (includeSchemas && perm.procedureSchema?.parameters?.length > 0) {
      doc.fontSize(14).fillColor(primaryColor).text('Parameters', 50, currentY);

      currentY += 25;

      // Parameters table headers
      doc
        .fontSize(10)
        .fillColor('#333333')
        .text('Name', 50, currentY)
        .text('Type', 200, currentY)
        .text('Required', 300, currentY)
        .text('I/O', 400, currentY);

      currentY += 20;

      // Draw header line
      doc.moveTo(50, currentY).lineTo(500, currentY).stroke('#cccccc');

      currentY += 10;

      perm.procedureSchema.parameters.forEach(param => {
        doc
          .fontSize(9)
          .fillColor('#333333')
          .text(param.name || 'Unknown', 50, currentY)
          .text(param.type || 'Unknown', 200, currentY)
          .text(param.isNullable ? 'Optional' : 'Required', 300, currentY)
          .text(param.isOutput ? 'Output' : 'Input', 400, currentY);

        currentY += 15;

        // Check if we need a new page
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }
      });

      currentY += 20;
    }

    // Example request section
    if (includeExamples && allowedMethods.length > 0) {
      if (currentY > 600) {
        doc.addPage();
        currentY = 50;
      }

      doc.fontSize(14).fillColor(primaryColor).text('Example Request', 50, currentY);

      currentY += 25;

      const method = allowedMethods[0];
      const curlExample = generateCurlExample(perm, method);

      doc
        .fontSize(9)
        .fillColor('#333333')
        .font('Courier')
        .text(curlExample, 50, currentY, { width: 500 });

      currentY += 80;

      // Example response
      doc
        .fontSize(14)
        .fillColor(primaryColor)
        .font('Helvetica')
        .text('Example Response', 50, currentY);

      currentY += 25;

      const exampleResponse = JSON.stringify(
        {
          success: true,
          data: [{ sample: 'response data' }],
          metadata: {
            executionTime: '45ms',
            recordCount: 1,
            service: perm.service.name,
            procedure: procedureName,
          },
        },
        null,
        2
      );

      doc
        .fontSize(9)
        .fillColor('#333333')
        .font('Courier')
        .text(exampleResponse, 50, currentY, { width: 500 });
    }
  });

  // Footer on last page
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc
      .fontSize(8)
      .fillColor('#888888')
      .text(`${companyName} - API Documentation`, 50, 770, { align: 'left' })
      .text(`Page ${i + 1} of ${pageCount}`, 50, 770, { align: 'right' });
  }
}

module.exports = router;
// Also export generator for internal use (e.g., SDK tooling)
module.exports.generateOpenAPISpec = generateOpenAPISpec;
