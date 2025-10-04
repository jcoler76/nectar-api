const express = require('express');
const router = express.Router();
const folderController = require('../controllers/folderController');
const { authMiddleware } = require('../middleware/auth');
const { folderApiKeyAuth } = require('../middleware/folderApiKeyAuth');

// Apply authentication middleware to all routes (except public API key routes)
router.use(authMiddleware);

/**
 * @route   POST /api/folders
 * @desc    Create a new folder
 * @access  Private
 * @body    { name: string, parentPath?: string, description?: string }
 */
router.post('/', folderController.createFolder);

/**
 * @route   GET /api/folders
 * @desc    List folders and files in a path
 * @access  Private
 * @query   path, include (files,subfolders), limit, offset
 */
router.get('/', folderController.listFolderContents);

/**
 * @route   GET /api/folders/tree
 * @desc    Get complete folder tree/hierarchy
 * @access  Private
 * @query   maxDepth
 */
router.get('/tree', folderController.getFolderTree);

/**
 * @route   GET /api/folders/:folderId
 * @desc    Get folder details with children and files
 * @access  Private
 */
router.get('/:folderId', folderController.getFolderDetails);

/**
 * @route   PUT /api/folders/:folderId
 * @desc    Update folder name/description
 * @access  Private
 * @body    { name?: string, description?: string }
 */
router.put('/:folderId', folderController.updateFolder);

/**
 * @route   PUT /api/folders/:folderId/move
 * @desc    Move folder to a new parent location
 * @access  Private
 * @body    { newParentPath: string }
 */
router.put('/:folderId/move', folderController.moveFolder);

/**
 * @route   DELETE /api/folders/:folderId
 * @desc    Delete folder (with options for recursive and file handling)
 * @access  Private
 * @query   recursive (boolean), deleteFiles (boolean)
 */
router.delete('/:folderId', folderController.deleteFolder);

// ========== MCP (Model Context Protocol) Routes ==========

/**
 * @route   POST /api/folders/:folderId/mcp/enable
 * @desc    Enable MCP on a folder (creates embeddings for documents)
 * @access  Private
 * @body    { config?: { embedding_model, llm_model, chunk_size, chunk_overlap } }
 */
router.post('/:folderId/mcp/enable', folderController.enableFolderMCP);

/**
 * @route   POST /api/folders/:folderId/mcp/disable
 * @desc    Disable MCP on a folder (removes embeddings)
 * @access  Private
 */
router.post('/:folderId/mcp/disable', folderController.disableFolderMCP);

/**
 * @route   POST /api/folders/:folderId/mcp/reindex
 * @desc    Trigger reindexing of folder documents
 * @access  Private
 */
router.post('/:folderId/mcp/reindex', folderController.reindexFolder);

/**
 * @route   GET /api/folders/:folderId/mcp/status
 * @desc    Get folder MCP status and indexing progress
 * @access  Private
 */
router.get('/:folderId/mcp/status', folderController.getFolderMCPStatus);

/**
 * @route   POST /api/folders/:folderId/mcp/query
 * @desc    Query folder documents using natural language
 * @access  Private
 * @body    { question: string, options?: { topK, minSimilarity, model } }
 */
router.post('/:folderId/mcp/query', folderController.queryFolder);

/**
 * @route   GET /api/folders/:folderId/mcp/queries
 * @desc    Get query history for folder
 * @access  Private
 * @query   limit, offset
 */
router.get('/:folderId/mcp/queries', folderController.getFolderQueryHistory);

/**
 * @route   GET /api/folders/:folderId/mcp/stats
 * @desc    Get folder MCP statistics (embeddings, queries, costs)
 * @access  Private
 * @query   startDate, endDate
 */
router.get('/:folderId/mcp/stats', folderController.getFolderMCPStats);

/**
 * @route   POST /api/folders/:folderId/mcp/api-key
 * @desc    Generate API key for folder MCP access
 * @access  Private
 * @body    { name: string, expiresIn?: string }
 */
router.post('/:folderId/mcp/api-key', folderController.generateFolderApiKey);

/**
 * @route   GET /api/folders/:folderId/mcp/api-keys
 * @desc    List API keys for folder
 * @access  Private
 */
router.get('/:folderId/mcp/api-keys', folderController.listFolderApiKeys);

/**
 * @route   DELETE /api/folders/:folderId/mcp/api-key/:keyId
 * @desc    Revoke folder API key
 * @access  Private
 */
router.delete('/:folderId/mcp/api-key/:keyId', folderController.revokeFolderApiKey);

module.exports = router;
