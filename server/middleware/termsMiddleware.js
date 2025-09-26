const termsService = require('../services/termsService');

/**
 * Middleware to enforce Terms and Conditions acceptance
 * This should be applied after authentication middleware
 */
const enforceTermsAcceptance = async (req, res, next) => {
  try {
    // Skip enforcement for certain paths
    const exemptPaths = [
      '/api/auth/logout',
      '/api/terms/current',
      '/api/terms/accept',
      '/api/terms/check-acceptance',
      '/api/csrf-token',
      '/health',
    ];

    // Check if current path is exempt
    if (exemptPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Skip if user is not authenticated (auth middleware should handle this)
    if (
      !req.user ||
      !(req.user.userId || req.user.id) ||
      !(req.user.organizationId || req.user.orgId)
    ) {
      return next();
    }

    // Check if organization requires terms acceptance
    const prismaService = require('../services/prismaService');

    // Organization is an infrastructure table, use systemPrisma directly
    const organization = await prismaService.getSystemClient().organization.findUnique({
      where: { id: req.user.organizationId || req.user.orgId },
      select: { requiresTermsAcceptance: true },
    });

    // If organization doesn't require terms acceptance, continue
    if (!organization || !organization.requiresTermsAcceptance) {
      return next();
    }

    // Check if user has accepted current terms
    const hasAccepted = await termsService.hasUserAcceptedCurrentTerms(
      req.user.userId || req.user.id,
      req.user.organizationId || req.user.orgId
    );

    if (!hasAccepted) {
      // User hasn't accepted current terms
      return res.status(403).json({
        success: false,
        error: 'TERMS_NOT_ACCEPTED',
        message: 'You must accept the Terms and Conditions before continuing',
        data: {
          requiresTermsAcceptance: true,
          userId: req.user.userId || req.user.id,
          organizationId: req.user.organizationId || req.user.orgId,
        },
      });
    }

    // User has accepted terms, continue
    next();
  } catch (error) {
    console.error('Error in terms enforcement middleware:', error);
    // In case of error, allow the request to continue but log the issue
    next();
  }
};

/**
 * Middleware to check terms acceptance status without blocking
 * Adds termsAccepted flag to the request object
 */
const checkTermsAcceptance = async (req, res, next) => {
  try {
    if (
      !req.user ||
      !(req.user.userId || req.user.id) ||
      !(req.user.organizationId || req.user.orgId)
    ) {
      req.termsAccepted = null;
      return next();
    }

    const hasAccepted = await termsService.hasUserAcceptedCurrentTerms(
      req.user.userId || req.user.id,
      req.user.organizationId || req.user.orgId
    );

    req.termsAccepted = hasAccepted;
    next();
  } catch (error) {
    console.error('Error checking terms acceptance:', error);
    req.termsAccepted = null;
    next();
  }
};

module.exports = {
  enforceTermsAcceptance,
  checkTermsAcceptance,
};
