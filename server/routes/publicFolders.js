/**
 * Public Folder API Routes
 * Endpoints accessible via folder-scoped API keys
 */

const express = require('express');
const router = express.Router();
const folderController = require('../controllers/folderController');
const { folderApiKeyAuth, requireFolderPermission } = require('../middleware/folderApiKeyAuth');

/**
 * @route   POST /api/public/folders/:folderId/query
 * @desc    Query folder documents using folder-scoped API key
 * @access  Public (with valid folder API key)
 * @body    { question: string, options?: { topK, minSimilarity, model } }
 * @header  Authorization: Bearer <folder-api-key>
 */
router.post(
  '/:folderId/query',
  folderApiKeyAuth,
  requireFolderPermission('folder:query'),
  folderController.queryFolder
);

/**
 * @route   GET /api/public/folders/:folderId/status
 * @desc    Get folder MCP status using API key
 * @access  Public (with valid folder API key)
 * @header  Authorization: Bearer <folder-api-key>
 */
router.get(
  '/:folderId/status',
  folderApiKeyAuth,
  requireFolderPermission('folder:mcp'),
  folderController.getFolderMCPStatus
);

module.exports = router;
