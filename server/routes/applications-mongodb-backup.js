const express = require('express');
const router = express.Router();
const { APPLICATION_QUERIES } = require('../utils/graphqlQueries');
const {
  createListHandler,
  createGetHandler,
  createCreateHandler,
  createUpdateHandler,
  createDeleteHandler,
  executeGraphQLMutation,
  createGraphQLContext,
  handleGraphQLError
} = require('../utils/routeHelpers');
const { logger } = require('../utils/logger');
const { validate } = require('../middleware/validation');
const validationRules = require('../middleware/validationRules');

// In-memory cache for recently generated API keys (admins only, 1 hour TTL)
const apiKeyCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

const cacheApiKey = (applicationId, apiKey, userId) => {
  apiKeyCache.set(applicationId, {
    key: apiKey,
    cachedAt: new Date(),
    cachedBy: userId,
  });

  // Auto-cleanup after TTL
  setTimeout(() => {
    apiKeyCache.delete(applicationId);
  }, CACHE_TTL);
};

const getCachedApiKey = applicationId => {
  const cached = apiKeyCache.get(applicationId);
  if (!cached) return null;

  // Check if expired
  if (Date.now() - cached.cachedAt.getTime() > CACHE_TTL) {
    apiKeyCache.delete(applicationId);
    return null;
  }

  return cached;
};

// Get all applications using GraphQL
router.get('/', createListHandler(APPLICATION_QUERIES.GET_ALL, 'applications'));

// Create new application using GraphQL
router.post('/', validate(validationRules.application.create), async (req, res) => {
  const { name, description, defaultRoleId, isActive } = req.body;
  const context = createGraphQLContext(req);
  
  const result = await executeGraphQLMutation(
    res,
    APPLICATION_QUERIES.CREATE,
    { 
      input: {
        name,
        description, 
        defaultRoleId,
        isActive
      }
    },
    context,
    'create application'
  );
  
  if (!result) return; // Error already handled
  
  // Cache the API key for admin access
  if (req.user?.isAdmin && result.createApplication?.apiKey) {
    cacheApiKey(result.createApplication.id, result.createApplication.apiKey, req.user.userId);
  }
  
  res.status(201).json(result.createApplication);
});
      apiKeyEncrypted,
      apiKeyPrefix,
      apiKeyHint,
      isActive,
      createdBy: req.user.userId,
    });

    await application.save();

    const populatedApp = await Application.findById(application._id)
      .populate('defaultRole', 'name')
      .populate('createdBy', 'email');

    // Cache the API key for admin access
    cacheApiKey(application._id.toString(), apiKey, req.user.userId);

    // Return the full API key only on creation
    const appObj = populatedApp.toObject({ virtuals: true });
    appObj.apiKey = apiKey; // Override virtual with actual key
    appObj.isNewKey = true; // Flag to show this is a new key

    res.status(201).json(appObj);
  } catch (error) {
    if (error.code === 11000) {
      // Handle duplicate key error
      return res.status(400).json({
        success: false,
        message: 'Application name already exists. Please choose a different name.',
      });
    }
    logger.error('Failed to create application:', { error: error.message });
    errorResponses.serverError(res, error);
  }
});

// Update application
router.put(
  '/:id',
  validate(validationRules.application.update),
  verifyApplicationAccess(),
  async (req, res) => {
    try {
      const { name, description, defaultRole, isActive, apiKey } = req.body;

      let updateData = { name, description, defaultRole, isActive };

      // Handle API key update if provided
      if (apiKey) {
        // Validate custom API key format
        if (!apiKey.match(/^[a-zA-Z0-9_-]+$/)) {
          return res.status(400).json({
            success: false,
            message:
              'Invalid API key format. Use only alphanumeric characters, underscores, and hyphens.',
          });
        }

        // Check for uniqueness (excluding current application)
        const existingApp = await Application.findOne({
          apiKeyPrefix: apiKey.substring(0, 4),
          _id: { $ne: req.params.id },
        }).select('+apiKeyHash');

        if (existingApp) {
          const isMatch = await Application.validateApiKey(apiKey, existingApp.apiKeyHash);
          if (isMatch) {
            return res.status(400).json({
              success: false,
              message: 'API key already exists. Please choose a different key.',
            });
          }
        }

        // Add encrypted API key fields to update
        const apiKeyHash = await Application.hashApiKey(apiKey);
        const apiKeyEncrypted = Application.encryptApiKey(apiKey);
        const apiKeyHint = Application.getApiKeyHint(apiKey);
        const apiKeyPrefix = apiKey.substring(0, 4);

        updateData = {
          ...updateData,
          apiKeyHash,
          apiKeyEncrypted,
          apiKeyHint,
          apiKeyPrefix,
        };
      }

      const application = await Application.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
      })
        .populate('defaultRole', 'name')
        .populate('createdBy', 'email');

      const appObj = application.toObject({ virtuals: true });

      // If API key was updated, mark it as a new key for display
      if (apiKey) {
        appObj.isNewKey = true;
        appObj.apiKey = apiKey; // Return the actual key for immediate copying
      }

      res.json(appObj);
    } catch (error) {
      errorResponses.serverError(res, error);
    }
  }
);

// Delete application
router.delete('/:id', verifyApplicationAccess(), async (req, res) => {
  try {
    await Application.findByIdAndDelete(req.params.id);
    res.json({ message: 'Application deleted successfully' });
  } catch (error) {
    errorResponses.serverError(res, error);
  }
});

// Regenerate API key
router.post('/:id/regenerate-key', verifyApplicationAccess(), async (req, res) => {
  try {
    // Generate new API key
    const newApiKey = Application.generateApiKey();
    const apiKeyHash = await Application.hashApiKey(newApiKey);
    const apiKeyEncrypted = Application.encryptApiKey(newApiKey);
    const apiKeyHint = Application.getApiKeyHint(newApiKey);
    const apiKeyPrefix = newApiKey.substring(0, 4);

    const application = await Application.findByIdAndUpdate(
      req.params.id,
      {
        apiKeyHash,
        apiKeyEncrypted,
        apiKeyPrefix,
        apiKeyHint,
        updatedAt: new Date(),
      },
      { new: true }
    )
      .populate('defaultRole', 'name')
      .populate('createdBy', 'email');

    // Cache the new API key for admin access
    cacheApiKey(req.params.id, newApiKey, req.user.userId);

    // Return the full API key only on regeneration
    const appObj = application.toObject({ virtuals: true });
    appObj.apiKey = newApiKey; // Override virtual with actual key
    appObj.isNewKey = true; // Flag to show this is a new key

    res.json(appObj);
  } catch (error) {
    logger.error('Failed to regenerate API key:', { error: error.message });
    errorResponses.serverError(res, error);
  }
});

// Special admin endpoint to reveal API key (requires special permission)
router.get('/:id/reveal-key', verifyApplicationAccess(), async (req, res) => {
  try {
    // Check if user has special admin permission
    if (!req.user.isAdmin) {
      return res
        .status(403)
        .json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    const application = await Application.findById(req.params.id)
      .select('+apiKeyEncrypted +apiKeyHash')
      .populate('defaultRole', 'name')
      .populate('createdBy', 'email')
      .populate('lastKeyRevealedBy', 'email');

    if (!application) {
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Application not found' } });
    }

    try {
      // Check if encrypted API key exists
      if (!application.apiKeyEncrypted) {
        logger.error('API key decryption failed: encrypted API key not found', {
          applicationId: req.params.id,
          applicationName: application.name,
          userId: req.user.userId,
          service: 'nectar-api',
        });

        return res.status(400).json({
          success: false,
          message:
            'This application was created before encryption was implemented. Please regenerate the API key to enable copying.',
          hint: application.apiKeyHint,
          requiresRegeneration: true,
          recommendation:
            'Click the regenerate button to create a new encrypted API key that can be copied.',
        });
      }

      // Decrypt the API key
      const decryptedApiKey = Application.decryptApiKey(application.apiKeyEncrypted);

      // Update reveal tracking with audit information
      await Application.findByIdAndUpdate(req.params.id, {
        lastKeyRevealedAt: new Date(),
        lastKeyRevealedBy: req.user.userId,
      });

      // Log admin access for security audit
      logger.info('Admin API key access', {
        userId: req.user.userId,
        userEmail: req.user.email,
        applicationId: req.params.id,
        applicationName: application.name,
        timestamp: new Date().toISOString(),
        service: 'nectar-api',
      });

      res.json({
        success: true,
        apiKey: decryptedApiKey,
        applicationName: application.name,
        lastRevealed: application.lastKeyRevealedAt
          ? {
              at: application.lastKeyRevealedAt,
              by: application.lastKeyRevealedBy?.email,
            }
          : null,
        message: 'API key successfully decrypted for admin access.',
        warning: 'This action has been logged for security audit purposes.',
      });
    } catch (decryptionError) {
      logger.error('Failed to decrypt API key for admin access', {
        error: decryptionError.message,
        stack: decryptionError.stack,
        applicationId: req.params.id,
        applicationName: application.name,
        userId: req.user.userId,
        encryptedApiKeyExists: !!application.apiKeyEncrypted,
        encryptedApiKeyLength: application.apiKeyEncrypted?.length,
        encryptedApiKeyType: typeof application.apiKeyEncrypted,
        hasDelimiter: application.apiKeyEncrypted?.includes(':'),
        service: 'nectar-api',
      });

      res.status(500).json({
        success: false,
        message: 'Failed to decrypt API key. This may indicate a system configuration issue.',
        hint: application.apiKeyHint,
        recommendation: 'Contact system administrator or regenerate the API key.',
      });
    }
  } catch (error) {
    logger.error('Error in reveal API key endpoint', {
      error: error.message,
      applicationId: req.params.id,
      userId: req.user.userId,
      service: 'nectar-api',
    });
    errorResponses.serverError(res, error);
  }
});

module.exports = router;
