const express = require('express');
const router = express.Router();
const prismaService = require('../services/prismaService');
// SECURITY FIX: Using withTenantContext pattern for proper tenant isolation
const { adminOnly } = require('../middleware/auth');
const { logger } = require('../utils/logger');
const { asyncHandler, errorResponses } = require('../utils/errorHandler');
const { isValidApiKeyFormat, generateStandardApiKey } = require('../utils/apiKeyGenerator');

// Apply auth to all endpoint routes
// Authentication is already handled at app level in server.js

// GET all endpoints
router.get('/', adminOnly, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    // SECURITY FIX: Use withTenantContext for proper RLS enforcement
    const endpoints = await prismaService.withTenantContext(organizationId, async tx => {
      return await tx.endpoint.findMany({
        where: {
          // organizationId removed as RLS handles it
        },
        include: {
          creator: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    // Ensure we always return an array
    res.json(Array.isArray(endpoints) ? endpoints : []);
  } catch (error) {
    logger.error('Error fetching endpoints:', error);
    errorResponses.serverError(res, error);
  }
});

// POST create new endpoint
router.post('/', adminOnly, async (req, res) => {
  try {
    const { name, path, method, query, description, apiKey } = req.body;
    const organizationId = req.user.organizationId;

    // Validate required fields - name is always required
    if (!name) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Name is required',
        },
      });
    }

    // Set defaults for backward compatibility with old frontend
    const finalPath = path || `/api/endpoint/${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const finalMethod = method ? method.toUpperCase() : 'GET';
    const finalQuery = query || 'SELECT 1 as result';

    // Set default values
    let finalApiKey = apiKey && apiKey.trim() ? apiKey.trim() : generateStandardApiKey();

    // If custom API key is provided, validate it
    if (apiKey && apiKey.trim()) {
      const customKey = apiKey.trim();

      // Validate custom API key format
      if (!isValidApiKeyFormat(customKey)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_API_KEY',
            message:
              'Invalid API key format. Use only alphanumeric characters, underscores, and hyphens.',
          },
        });
      }

      // SECURITY FIX: Check if API key already exists globally (using system client)
      const systemPrisma = prismaService.getSystemClient();
      const existingEndpoint = await systemPrisma.endpoint.findUnique({
        where: { apiKey: customKey },
      });
      if (existingEndpoint) {
        return res.status(409).json({
          error: {
            code: 'DUPLICATE_API_KEY',
            message: 'An endpoint with this API key already exists.',
          },
        });
      }

      finalApiKey = customKey;
    }

    // Create endpoint data
    const endpointData = {
      name,
      path: finalPath,
      method: finalMethod,
      query: finalQuery,
      description: description || null,
      apiKey: finalApiKey,
      organizationId,
      createdBy: req.user.userId,
    };

    // SECURITY FIX: Create endpoint with proper RLS
    const newEndpoint = await prismaService.withTenantContext(organizationId, async tx => {
      return await tx.endpoint.create({
        data: endpointData,
        include: {
          creator: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });
    });

    res.status(201).json(newEndpoint);
  } catch (error) {
    if (error.code === 'P2002') {
      // Prisma unique constraint error
      const target = error.meta?.target?.[0];
      const field = target === 'name' ? 'name' : 'API key';
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: `An endpoint with this ${field} already exists.`,
        },
      });
    }
    logger.error('Error creating endpoint:', error);
    errorResponses.serverError(res, error);
  }
});

// POST regenerate API key for an endpoint
router.post('/:id/regenerate-key', adminOnly, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    // SECURITY FIX: Use withTenantContext for endpoint lookup
    const endpoint = await prismaService.withTenantContext(organizationId, async tx => {
      return await tx.endpoint.findUnique({
        where: {
          id: req.params.id,
        },
        include: {
          creator: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });
    });

    if (!endpoint) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
    }

    // Generate a new standard API key and save it
    const newApiKey = generateStandardApiKey();
    // SECURITY FIX: Update endpoint with proper RLS
    const updatedEndpoint = await prismaService.withTenantContext(organizationId, async tx => {
      return await tx.endpoint.update({
        where: { id: req.params.id },
        data: { apiKey: newApiKey },
        include: {
          creator: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });
    });

    res.json(updatedEndpoint);
  } catch (error) {
    logger.error('Error regenerating endpoint key:', error);
    errorResponses.serverError(res, error);
  }
});

// DELETE an endpoint
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    // SECURITY FIX: Check and delete endpoint with proper RLS
    await prismaService.withTenantContext(organizationId, async tx => {
      // First check if endpoint exists and belongs to the organization
      const endpoint = await tx.endpoint.findUnique({
        where: { id: req.params.id },
      });

      if (!endpoint) {
        throw new Error('ENDPOINT_NOT_FOUND');
      }

      // Delete the endpoint
      await tx.endpoint.delete({
        where: { id: req.params.id },
      });
    });

    res.json({ message: 'Endpoint deleted successfully' });
  } catch (error) {
    if (error.message === 'ENDPOINT_NOT_FOUND') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
    }
    logger.error('Error deleting endpoint:', error);
    errorResponses.serverError(res, error);
  }
});

module.exports = router;
