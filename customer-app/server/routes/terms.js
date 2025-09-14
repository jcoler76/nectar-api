const express = require('express');
const router = express.Router();
const termsService = require('../services/termsService');
const { authMiddleware } = require('../middleware/auth');
const requireAdmin = require('../middleware/adminOnly');

/**
 * Get the current active Terms and Conditions
 * Public endpoint - can be accessed before login
 */
router.get('/current', async (req, res) => {
  try {
    const terms = await termsService.getActiveTerms();

    if (!terms) {
      return res.status(404).json({
        success: false,
        message: 'No active terms and conditions found',
      });
    }

    res.json({
      success: true,
      data: {
        id: terms.id,
        version: terms.version,
        content: terms.content,
        summary: terms.summary,
        effectiveDate: terms.effectiveDate,
      },
    });
  } catch (error) {
    console.error('Error fetching current terms:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch terms and conditions',
    });
  }
});

/**
 * Check if the current user has accepted the terms
 */
router.get('/check-acceptance', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const organizationId = req.user.organizationId || req.user.orgId || req.user.organization_id;

    const hasAccepted = await termsService.hasUserAcceptedCurrentTerms(userId, organizationId);

    res.json({
      success: true,
      data: {
        hasAccepted,
        userId,
        organizationId,
      },
    });
  } catch (error) {
    console.error('Error checking terms acceptance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check terms acceptance',
    });
  }
});

/**
 * Record user's acceptance of the terms
 */
router.post('/accept', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const organizationId = req.user.organizationId || req.user.orgId || req.user.organization_id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const { acceptanceMethod = 'CLICK' } = req.body;

    // Validate acceptance method
    const validMethods = ['CLICK', 'SCROLL', 'SIGNATURE'];
    if (!validMethods.includes(acceptanceMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid acceptance method',
      });
    }

    const acceptance = await termsService.recordAcceptance(
      userId,
      organizationId,
      ipAddress,
      userAgent,
      acceptanceMethod
    );

    res.json({
      success: true,
      message: 'Terms and conditions accepted successfully',
      data: {
        acceptanceId: acceptance.id,
        acceptedAt: acceptance.acceptedAt,
        termsVersion: acceptance.terms.version,
      },
    });
  } catch (error) {
    console.error('Error recording terms acceptance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record terms acceptance',
    });
  }
});

/**
 * Get acceptance statistics for an organization (admin only)
 */
router.get('/stats/:organizationId', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { organizationId } = req.params;
    const stats = await termsService.getAcceptanceStats(organizationId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching acceptance stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch acceptance statistics',
    });
  }
});

/**
 * Export acceptance records for compliance (admin only)
 */
router.get('/export/:organizationId', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { startDate, endDate, format = 'json' } = req.query;

    const records = await termsService.exportAcceptanceRecords(organizationId, startDate, endDate);

    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(records);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=terms-acceptance-${organizationId}.csv`
      );
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: records,
        count: records.length,
      });
    }
  } catch (error) {
    console.error('Error exporting acceptance records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export acceptance records',
    });
  }
});

/**
 * Admin endpoints for managing terms versions
 */

// Get all terms versions (admin only)
router.get('/versions', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const versions = await termsService.getAllTermsVersions();

    res.json({
      success: true,
      data: versions,
    });
  } catch (error) {
    console.error('Error fetching terms versions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch terms versions',
    });
  }
});

// Create or update terms (admin only)
router.post('/versions', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { version, content, summary, effectiveDate } = req.body;

    // Validate required fields
    if (!version || !content || !effectiveDate) {
      return res.status(400).json({
        success: false,
        message: 'Version, content, and effective date are required',
      });
    }

    const terms = await termsService.createOrUpdateTerms(version, content, summary, effectiveDate);

    res.json({
      success: true,
      message: 'Terms and conditions created successfully',
      data: terms,
    });
  } catch (error) {
    console.error('Error creating terms:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create terms and conditions',
    });
  }
});

// Helper function to convert records to CSV
function convertToCSV(records) {
  if (!records || records.length === 0) {
    return 'No records found';
  }

  const headers = [
    'Acceptance ID',
    'User ID',
    'User Email',
    'User Name',
    'Terms Version',
    'Accepted At',
    'IP Address',
    'User Agent',
    'Acceptance Method',
    'Geolocation',
  ];

  const rows = records.map(record => [
    record.id,
    record.user.id,
    record.user.email,
    `${record.user.firstName} ${record.user.lastName}`,
    record.terms.version,
    record.acceptedAt,
    record.ipAddress,
    record.userAgent || '',
    record.acceptanceMethod,
    record.geolocation ? JSON.stringify(record.geolocation) : '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

module.exports = router;
