const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class FolderController {
  /**
   * Create a new folder
   * POST /api/folders
   */
  async createFolder(req, res) {
    try {
      const { name, parentPath = '/', description } = req.body;
      const { organizationId } = req.user;
      const userId = req.user.id;

      // Validate input
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Folder name is required',
        });
      }

      // Clean up name
      const cleanName = name.trim();

      // Calculate new folder path
      const newPath = parentPath === '/' ? `/${cleanName}` : `${parentPath}/${cleanName}`;

      // Check if folder with this path already exists
      const existingFolder = await prisma.fileFolder.findFirst({
        where: {
          organizationId,
          path: newPath,
        },
      });

      if (existingFolder) {
        return res.status(409).json({
          success: false,
          message: 'A folder with this name already exists in the specified location',
        });
      }

      // Find parent folder if not root
      let parentFolder = null;
      let depth = 0;

      if (parentPath !== '/') {
        parentFolder = await prisma.fileFolder.findFirst({
          where: {
            organizationId,
            path: parentPath,
          },
        });

        if (!parentFolder) {
          return res.status(404).json({
            success: false,
            message: 'Parent folder not found',
          });
        }

        depth = parentFolder.depth + 1;
      }

      // Create the folder
      const folder = await prisma.fileFolder.create({
        data: {
          name: cleanName,
          path: newPath,
          parentId: parentFolder?.id || null,
          depth,
          isRoot: parentPath === '/' && cleanName === 'root',
          organizationId,
          createdBy: userId,
        },
        include: {
          creator: {
            select: { id: true, firstName: true, lastName: true },
          },
          parent: {
            select: { id: true, name: true, path: true },
          },
          _count: {
            select: { children: true, files: true },
          },
        },
      });

      res.status(201).json({
        success: true,
        folder,
      });
    } catch (error) {
      console.error('Error creating folder:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create folder',
      });
    }
  }

  /**
   * List folders and files in a path
   * GET /api/folders?path=/documents&include=files,subfolders
   */
  async listFolderContents(req, res) {
    try {
      const { path = '/', include = 'files,subfolders', limit = 50, offset = 0 } = req.query;
      const { organizationId } = req.user;

      const includeFiles = include.includes('files');
      const includeSubfolders = include.includes('subfolders');

      // Detect whether the Prisma schema includes a FileFolder model
      const hasFolderModel = !!prisma.fileFolder;

      let currentFolder = null;

      // Find current folder if not root
      if (hasFolderModel && path !== '/') {
        currentFolder = await prisma.fileFolder.findFirst({
          where: {
            organizationId,
            path,
          },
        });

        if (!currentFolder) {
          return res.status(404).json({
            success: false,
            message: 'Folder not found',
          });
        }
      }

      const response = {
        success: true,
        path,
        folder: currentFolder,
        contents: {},
      };

      // Get subfolders if requested
      if (includeSubfolders) {
        if (hasFolderModel) {
          const subfolders = await prisma.fileFolder.findMany({
            where: {
              organizationId,
              parentId: currentFolder?.id || null,
              ...(path === '/' && { isRoot: false }),
            },
            orderBy: { name: 'asc' },
            take: parseInt(limit),
            skip: parseInt(offset),
          });

          const folderIds = subfolders.map(f => f.id);

          // Children counts grouped by parentId
          const childrenCounts = folderIds.length
            ? await prisma.fileFolder.groupBy({
                by: ['parentId'],
                where: { parentId: { in: folderIds } },
                _count: { _all: true },
              })
            : [];

          // File counts grouped by folderId
          const fileCounts = folderIds.length
            ? await prisma.fileStorage.groupBy({
                by: ['folderId'],
                where: { folderId: { in: folderIds }, isActive: true },
                _count: { _all: true },
              })
            : [];

          const userIds = [...new Set(subfolders.map(f => f.createdBy).filter(Boolean))];
          const usersById = userIds.length
            ? (
                await prisma.user.findMany({
                  where: { id: { in: userIds } },
                  select: { id: true, firstName: true, lastName: true },
                })
              ).reduce((acc, u) => {
                acc[u.id] = u;
                return acc;
              }, {})
            : {};

          const childrenCountMap = new Map(childrenCounts.map(c => [c.parentId, c._count._all]));
          const fileCountMap = new Map(fileCounts.map(c => [c.folderId, c._count._all]));

          response.contents.folders = subfolders.map(f => ({
            ...f,
            creator: f.createdBy ? usersById[f.createdBy] || null : null,
            _count: {
              children: childrenCountMap.get(f.id) || 0,
              files: fileCountMap.get(f.id) || 0,
            },
          }));
        } else {
          // No folder model in schema; return empty folders list
          response.contents.folders = [];
        }
      }

      // Get files if requested
      if (includeFiles) {
        const where = {
          organizationId,
          isActive: true,
        };
        // If the folder model exists and we have a folder, limit to that folderId; otherwise list org files
        if (hasFolderModel && currentFolder?.id) {
          where.folderId = currentFolder.id;
        }

        const files = await prisma.fileStorage.findMany({
          where,
          orderBy: { filename: 'asc' },
          take: parseInt(limit),
          skip: parseInt(offset),
        });

        const fileIds = files.map(f => f.id);
        const uploaderIds = [...new Set(files.map(f => f.uploadedBy).filter(Boolean))];

        const usersById = uploaderIds.length
          ? (
              await prisma.user.findMany({
                where: { id: { in: uploaderIds } },
                select: { id: true, firstName: true, lastName: true },
              })
            ).reduce((acc, u) => {
              acc[u.id] = u;
              return acc;
            }, {})
          : {};

        const thumbnailsByFileId = fileIds.length
          ? (
              await prisma.fileThumbnail.findMany({
                where: { fileId: { in: fileIds } },
                select: { fileId: true, size: true, cdnUrl: true },
              })
            ).reduce((acc, t) => {
              if (!acc[t.fileId]) acc[t.fileId] = [];
              acc[t.fileId].push({ size: t.size, cdnUrl: t.cdnUrl });
              return acc;
            }, {})
          : {};

        response.contents.files = files.map(f => ({
          ...f,
          User: f.uploadedBy ? usersById[f.uploadedBy] || null : null,
          FileThumbnail: thumbnailsByFileId[f.id] || [],
        }));
      }

      res.json(response);
    } catch (error) {
      console.error('Error listing folder contents:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list folder contents',
      });
    }
  }

  /**
   * Get folder details
   * GET /api/folders/:folderId
   */
  async getFolderDetails(req, res) {
    try {
      const { folderId } = req.params;
      const { organizationId } = req.user;

      const folder = await prisma.fileFolder.findFirst({
        where: {
          id: folderId,
          organizationId,
        },
        include: {
          creator: {
            select: { id: true, firstName: true, lastName: true },
          },
          parent: {
            select: { id: true, name: true, path: true },
          },
          children: {
            select: { id: true, name: true, path: true, createdAt: true },
            orderBy: { name: 'asc' },
          },
          files: {
            where: { isActive: true },
            select: {
              id: true,
              filename: true,
              mimeType: true,
              fileSize: true,
              uploadedAt: true,
            },
            orderBy: { filename: 'asc' },
          },
          _count: {
            select: { children: true, files: true },
          },
        },
      });

      if (!folder) {
        return res.status(404).json({
          success: false,
          message: 'Folder not found',
        });
      }

      res.json({
        success: true,
        folder,
      });
    } catch (error) {
      console.error('Error getting folder details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get folder details',
      });
    }
  }

  /**
   * Update folder
   * PUT /api/folders/:folderId
   */
  async updateFolder(req, res) {
    try {
      const { folderId } = req.params;
      const { name, description } = req.body;
      const { organizationId } = req.user;

      // Find existing folder
      const existingFolder = await prisma.fileFolder.findFirst({
        where: {
          id: folderId,
          organizationId,
        },
        include: {
          parent: true,
        },
      });

      if (!existingFolder) {
        return res.status(404).json({
          success: false,
          message: 'Folder not found',
        });
      }

      // If name is changing, check for conflicts and update path
      let updateData = {};

      if (name && name.trim() !== existingFolder.name) {
        const cleanName = name.trim();

        // Check for naming conflict
        const parentPath = existingFolder.parent?.path || '/';
        const newPath = parentPath === '/' ? `/${cleanName}` : `${parentPath}/${cleanName}`;

        const conflictingFolder = await prisma.fileFolder.findFirst({
          where: {
            organizationId,
            path: newPath,
            id: { not: folderId },
          },
        });

        if (conflictingFolder) {
          return res.status(409).json({
            success: false,
            message: 'A folder with this name already exists in the current location',
          });
        }

        updateData.name = cleanName;
        updateData.path = newPath;
      }

      // Update folder
      const updatedFolder = await prisma.fileFolder.update({
        where: { id: folderId },
        data: updateData,
        include: {
          creator: {
            select: { id: true, firstName: true, lastName: true },
          },
          parent: {
            select: { id: true, name: true, path: true },
          },
          _count: {
            select: { children: true, files: true },
          },
        },
      });

      res.json({
        success: true,
        folder: updatedFolder,
      });
    } catch (error) {
      console.error('Error updating folder:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update folder',
      });
    }
  }

  /**
   * Move folder
   * PUT /api/folders/:folderId/move
   */
  async moveFolder(req, res) {
    try {
      const { folderId } = req.params;
      const { newParentPath } = req.body;
      const { organizationId } = req.user;

      // Find the folder to move
      const folder = await prisma.fileFolder.findFirst({
        where: {
          id: folderId,
          organizationId,
        },
      });

      if (!folder) {
        return res.status(404).json({
          success: false,
          message: 'Folder not found',
        });
      }

      // Find new parent folder
      let newParent = null;
      let newDepth = 0;

      if (newParentPath !== '/') {
        newParent = await prisma.fileFolder.findFirst({
          where: {
            organizationId,
            path: newParentPath,
          },
        });

        if (!newParent) {
          return res.status(404).json({
            success: false,
            message: 'Target parent folder not found',
          });
        }

        // Prevent moving folder into itself or its descendants
        if (newParentPath.startsWith(folder.path)) {
          return res.status(400).json({
            success: false,
            message: 'Cannot move folder into itself or its subfolder',
          });
        }

        newDepth = newParent.depth + 1;
      }

      // Calculate new path
      const newPath = newParentPath === '/' ? `/${folder.name}` : `${newParentPath}/${folder.name}`;

      // Check for naming conflict in new location
      const conflictingFolder = await prisma.fileFolder.findFirst({
        where: {
          organizationId,
          path: newPath,
          id: { not: folderId },
        },
      });

      if (conflictingFolder) {
        return res.status(409).json({
          success: false,
          message: 'A folder with this name already exists in the target location',
        });
      }

      // Update folder location
      const updatedFolder = await prisma.fileFolder.update({
        where: { id: folderId },
        data: {
          parentId: newParent?.id || null,
          path: newPath,
          depth: newDepth,
        },
        include: {
          creator: {
            select: { id: true, firstName: true, lastName: true },
          },
          parent: {
            select: { id: true, name: true, path: true },
          },
          _count: {
            select: { children: true, files: true },
          },
        },
      });

      res.json({
        success: true,
        folder: updatedFolder,
      });
    } catch (error) {
      console.error('Error moving folder:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to move folder',
      });
    }
  }

  /**
   * Delete folder
   * DELETE /api/folders/:folderId?recursive=true&deleteFiles=false
   */
  async deleteFolder(req, res) {
    try {
      const { folderId } = req.params;
      const { recursive = 'false', deleteFiles = 'false' } = req.query;
      const { organizationId } = req.user;

      const isRecursive = recursive === 'true';
      const shouldDeleteFiles = deleteFiles === 'true';

      // Find folder with children and files count
      const folder = await prisma.fileFolder.findFirst({
        where: {
          id: folderId,
          organizationId,
        },
        include: {
          _count: {
            select: { children: true, files: true },
          },
        },
      });

      if (!folder) {
        return res.status(404).json({
          success: false,
          message: 'Folder not found',
        });
      }

      // Check if folder has contents and handle accordingly
      if (folder._count.children > 0 && !isRecursive) {
        return res.status(400).json({
          success: false,
          message: 'Folder contains subfolders. Use recursive=true to delete all contents.',
        });
      }

      if (folder._count.files > 0 && !shouldDeleteFiles) {
        return res.status(400).json({
          success: false,
          message: 'Folder contains files. Use deleteFiles=true to delete all files.',
        });
      }

      // Handle file deletion/moving
      if (folder._count.files > 0) {
        if (shouldDeleteFiles) {
          // Mark files as inactive (soft delete)
          await prisma.fileStorage.updateMany({
            where: { folderId: folderId },
            data: { isActive: false, folderId: null },
          });
        } else {
          // Move files to parent folder or root
          await prisma.fileStorage.updateMany({
            where: { folderId: folderId },
            data: { folderId: folder.parentId },
          });
        }
      }

      // Delete folder (CASCADE will handle children if recursive)
      await prisma.fileFolder.delete({
        where: { id: folderId },
      });

      res.json({
        success: true,
        message: 'Folder deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting folder:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete folder',
      });
    }
  }

  /**
   * Get folder tree/hierarchy
   * GET /api/folders/tree
   */
  async getFolderTree(req, res) {
    try {
      const { organizationId } = req.user;
      const { maxDepth = 5 } = req.query;

      const folders = await prisma.fileFolder.findMany({
        where: {
          organizationId,
          depth: { lte: parseInt(maxDepth) },
        },
        include: {
          _count: {
            select: { children: true, files: true },
          },
        },
        orderBy: [{ depth: 'asc' }, { name: 'asc' }],
      });

      // Build tree structure
      const folderMap = new Map();
      const tree = [];

      // First pass: create all folder objects
      folders.forEach(folder => {
        folderMap.set(folder.id, {
          ...folder,
          children: [],
        });
      });

      // Second pass: build tree structure
      folders.forEach(folder => {
        const folderNode = folderMap.get(folder.id);

        if (folder.parentId) {
          const parent = folderMap.get(folder.parentId);
          if (parent) {
            parent.children.push(folderNode);
          }
        } else {
          tree.push(folderNode);
        }
      });

      res.json({
        success: true,
        tree,
      });
    } catch (error) {
      console.error('Error getting folder tree:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get folder tree',
      });
    }
  }
}

module.exports = new FolderController();
