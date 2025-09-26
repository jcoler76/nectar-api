const express = require('express');
const router = express.Router();
// SECURITY FIX: Use proper prismaService for tenant isolation
const prismaService = require('../services/prismaService');

function buildOpenApiDoc(service, entities) {
  const paths = {};
  for (const e of entities) {
    const base = `/api/v2/${service.name}/_table/${e.pathSlug || e.name}`;
    paths[base] = {
      get: {
        summary: `List ${e.name}`,
        tags: [service.name],
        parameters: [
          { name: 'fields', in: 'query', schema: { type: 'string' } },
          { name: 'sort', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 25 } },
          { name: 'filter', in: 'query', schema: { type: 'string', description: 'JSON filter' } },
        ],
        responses: { 200: { description: 'OK' } },
        security: [{ ApiKeyAuth: [] }],
      },
    };
    paths[`${base}/{id}`] = {
      get: {
        summary: `Get ${e.name} by id`,
        tags: [service.name],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'fields', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'OK' }, 404: { description: 'Not Found' } },
        security: [{ ApiKeyAuth: [] }],
      },
    };
    paths[`${base}/_count`] = {
      get: {
        summary: `Count ${e.name}`,
        tags: [service.name],
        parameters: [{ name: 'filter', in: 'query', schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' } },
        security: [{ ApiKeyAuth: [] }],
      },
    };
    paths[`${base}/_schema`] = {
      get: {
        summary: `Schema for ${e.name}`,
        tags: [service.name],
        responses: { 200: { description: 'OK' } },
        security: [{ ApiKeyAuth: [] }],
      },
    };
  }

  const apiKeyHeader = process.env.API_AUTH_HEADER || 'x-nectarstudio-api-key';
  return {
    openapi: '3.0.0',
    info: { title: `Auto-REST: ${service.name}`, version: '1.0.0' },
    paths,
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: 'apiKey', in: 'header', name: apiKeyHeader },
      },
    },
  };
}

router.get('/:serviceName', async (req, res) => {
  try {
    const { serviceName } = req.params;

    // SECURITY: Ensure user is authenticated and has organization access
    const userOrganizationId = req.user?.organizationId;
    if (!userOrganizationId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'User must belong to an organization to access documentation',
        },
      });
    }

    // SECURITY FIX: Use withTenantContext for proper RLS enforcement
    const result = await prismaService.withTenantContext(userOrganizationId, async tx => {
      // Find service within organization context
      const service = await tx.service.findFirst({
        where: { name: serviceName, isActive: true },
      });

      if (!service) {
        return { error: 'SERVICE_NOT_FOUND' };
      }

      // Find entities within organization context
      const entities = await tx.exposedEntity.findMany({
        where: { serviceId: service.id, allowRead: true },
      });

      return { service, entities };
    });

    if (result.error === 'SERVICE_NOT_FOUND') {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Service not found or not accessible' },
      });
    }

    const doc = buildOpenApiDoc(result.service, result.entities);
    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: e.message } });
  }
});

module.exports = router;
