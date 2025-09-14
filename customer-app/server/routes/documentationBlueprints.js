const express = require('express');
const router = express.Router();
const blueprintsConfig = require('../config/blueprints');

function buildServers(req) {
  const url = `${req.protocol}://${req.get('host')}`;
  return [{ url }];
}

function buildBlueprintsOpenAPI(req) {
  const models = Object.keys(blueprintsConfig.models || {});
  const modelEnum = models.length ? models : undefined;

  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'Nectar Blueprints API',
      version: '1.0.0',
      description:
        'Auto-CRUD blueprint endpoints for allowlisted models. Feature flag controlled by BLUEPRINTS_ENABLED.',
    },
    servers: buildServers(req),
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Supply an access token as `Authorization: Bearer <token>`.',
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      '/api/blueprints': {
        get: {
          summary: 'List allowlisted blueprint models',
          tags: ['Blueprints'],
          responses: {
            401: { description: 'Unauthorized' },
            200: {
              description: 'Available models',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      models: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                            tenantScoped: { type: 'boolean' },
                            fields: {
                              type: 'array',
                              items: { type: 'string' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/blueprints/{model}': {
        get: {
          summary: 'List records for a blueprint model',
          tags: ['Blueprints'],
          parameters: [
            {
              name: 'model',
              in: 'path',
              required: true,
              schema: modelEnum ? { type: 'string', enum: modelEnum } : { type: 'string' },
              description: 'Blueprint model key',
            },
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', minimum: 1 },
              description: 'Page number',
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', minimum: 1 },
              description: 'Page size',
            },
            {
              name: 'select',
              in: 'query',
              schema: { type: 'string' },
              description: 'Comma-separated fields',
            },
            {
              name: 'sort',
              in: 'query',
              schema: { type: 'string' },
              description: 'Comma-separated fields, prefix with - for desc',
            },
            {
              name: 'where',
              in: 'query',
              schema: { type: 'string' },
              description:
                'JSON of filters (equals, contains, startsWith, endsWith, in, gt, gte, lt, lte, not)',
            },
          ],
          responses: {
            401: { description: 'Unauthorized' },
            200: {
              description: 'List response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { type: 'object', additionalProperties: true },
                      },
                      meta: {
                        type: 'object',
                        properties: {
                          page: { type: 'integer' },
                          limit: { type: 'integer' },
                          total: { type: 'integer' },
                          pages: { type: 'integer' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/blueprints/{model}/{id}': {
        get: {
          summary: 'Get a single record for a blueprint model',
          tags: ['Blueprints'],
          parameters: [
            {
              name: 'model',
              in: 'path',
              required: true,
              schema: modelEnum ? { type: 'string', enum: modelEnum } : { type: 'string' },
              description: 'Blueprint model key',
            },
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            {
              name: 'select',
              in: 'query',
              schema: { type: 'string' },
              description: 'Comma-separated fields',
            },
          ],
          responses: {
            401: { description: 'Unauthorized' },
            200: {
              description: 'Record',
              content: {
                'application/json': {
                  schema: { type: 'object', additionalProperties: true },
                },
              },
            },
            404: { description: 'Record not found' },
          },
        },
      },
    },
    tags: [{ name: 'Blueprints', description: 'Minimal auto-CRUD endpoints' }],
  };

  return spec;
}

router.get('/openapi', (req, res) => {
  if (!blueprintsConfig.enabled) {
    return res
      .status(404)
      .json({ error: { code: 'NOT_ENABLED', message: 'Blueprints are disabled' } });
  }
  const spec = buildBlueprintsOpenAPI(req);
  res.json(spec);
});

module.exports = router;
module.exports.buildBlueprintsOpenAPI = buildBlueprintsOpenAPI;
