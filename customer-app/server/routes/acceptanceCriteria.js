const express = require('express');
const router = express.Router();
const AIAcceptanceCriteriaService = require('../services/AIAcceptanceCriteriaService');
const { body, validationResult } = require('express-validator');

const aiService = new AIAcceptanceCriteriaService();

router.post(
  '/generate-acceptance-criteria',
  [
    body('issueData').isObject().withMessage('Issue data is required'),
    body('issueData.title').notEmpty().withMessage('Issue title is required'),
    body('issueType').optional().isIn(['feature', 'bug', 'technical', 'enhancement']),
    body('includeTestCases').optional().isBoolean(),
    body('includeTechnicalSpecs').optional().isBoolean(),
    body('includeBusinessContext').optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({
          success: false,
          message: 'AI service not configured. Please set OPENAI_API_KEY.',
        });
      }

      const result = await aiService.generateAcceptanceCriteria(req.body.issueData, req.body);

      if (!result.success) {
        return res.status(500).json(result);
      }

      // Also return formatted version for GitHub
      const formattedForGitHub = aiService.formatAcceptanceCriteriaForGitHub(
        result.acceptanceCriteria
      );

      res.json({
        success: true,
        message: 'Acceptance criteria generated successfully',
        ...result,
        formattedForGitHub,
      });
    } catch (error) {
      console.error('Acceptance criteria generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate acceptance criteria',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

module.exports = router;
