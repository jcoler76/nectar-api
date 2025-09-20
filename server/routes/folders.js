const express = require('express');
const router = express.Router();
const folderController = require('../controllers/folderController');
const { authMiddleware } = require('../middleware/auth');

// Apply authentication middleware to all routes
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

module.exports = router;
