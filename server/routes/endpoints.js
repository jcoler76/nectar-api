const express = require('express');
const router = express.Router();
const Endpoint = require('../models/Endpoint');
const { adminOnly } = require('../middleware/auth');
const { logger } = require('../utils/logger');
const { asyncHandler, errorResponses } = require('../utils/errorHandler');
const { isValidApiKeyFormat, generateStandardApiKey } = require('../utils/apiKeyGenerator');

// Apply auth to all endpoint routes
// Authentication is already handled at app level in server.js

// GET all endpoints
router.get('/', adminOnly, async (req, res) => {
  try {
    const endpoints = await Endpoint.find().populate('createdBy', 'username');
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
    const { name, apiKey } = req.body;
    if (!name) {
      return res
        .status(400)
        .json({ error: { code: 'BAD_REQUEST', message: 'Endpoint name is required' } });
    }

    const endpointData = {
      name,
      createdBy: req.user.userId,
    };

    // If custom API key is provided, validate and use it
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

      // Check if API key already exists
      const existingEndpoint = await Endpoint.findOne({ apiKey: customKey });
      if (existingEndpoint) {
        return res.status(409).json({
          error: {
            code: 'DUPLICATE_API_KEY',
            message: 'An endpoint with this API key already exists.',
          },
        });
      }

      endpointData.apiKey = customKey;
    }

    const newEndpoint = new Endpoint(endpointData);
    await newEndpoint.save();
    res.status(201).json(newEndpoint);
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error
      const field = error.keyPattern.name ? 'name' : 'API key';
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
    const endpoint = await Endpoint.findById(req.params.id);
    if (!endpoint) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
    }

    // Generate a new standard 64-character hex key and save it
    endpoint.apiKey = generateStandardApiKey();
    await endpoint.save();

    res.json(endpoint);
  } catch (error) {
    logger.error('Error regenerating endpoint key:', error);
    errorResponses.serverError(res, error);
  }
});

// DELETE an endpoint
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const endpoint = await Endpoint.findByIdAndDelete(req.params.id);
    if (!endpoint) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
    }
    res.json({ message: 'Endpoint deleted successfully' });
  } catch (error) {
    logger.error('Error deleting endpoint:', error);
    errorResponses.serverError(res, error);
  }
});

module.exports = router;
