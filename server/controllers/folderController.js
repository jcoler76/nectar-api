const prismaService = require('../services/prismaService');

class FolderController {
  /**
   * Create a new folder
   * POST /api/folders
   */
  async createFolder(req, res) {
    try {
      const { name, parentPath = '/', description } = req.body;
      const organizationId = req.user.organizationId || req.user.memberships?.[0]?.organizationId;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required',
        });
      }

      const userId = req.user.id;

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Folder name is required',
        });
      }

      const cleanName = name.trim();
      const newPath = parentPath === '/' ? `/${cleanName}` : `${parentPath}/${cleanName}`;

      const folder = await prismaService.withTenantContext(organizationId, async tx => {
        const existingFolder = await tx.fileFolder.findFirst({
          where: {
            organizationId,
            path: newPath,
          },
        });

        if (existingFolder) {
          throw new Error(
            'CONFLICT:A folder with this name already exists in the specified location'
          );
        }

        let parentFolder = null;
        let depth = 0;

        if (parentPath !== '/') {
          parentFolder = await tx.fileFolder.findFirst({
            where: {
              organizationId,
              path: parentPath,
            },
          });

          if (!parentFolder) {
            throw new Error('NOT_FOUND:Parent folder not found');
          }

          depth = parentFolder.depth + 1;
        }

        const systemPrisma = prismaService.getSystemClient();
        const creator = await systemPrisma.user.findUnique({
          where: { id: userId },
          select: { id: true, firstName: true, lastName: true },
        });

        const folder = await tx.fileFolder.create({
          data: {
            name: cleanName,
            path: newPath,
            parentId: parentFolder?.id || null,
            depth,
            isRoot: parentPath === '/' && cleanName === 'root',
            organizationId,
            createdBy: userId,
          },
        });

        const parent = parentFolder
          ? {
              id: parentFolder.id,
              name: parentFolder.name,
              path: parentFolder.path,
            }
          : null;

        return {
          ...folder,
          creator,
          parent,
          _count: { children: 0, files: 0 },
        };
      });

      res.status(201).json({
        success: true,
        folder,
      });
    } catch (error) {
      console.error('Error creating folder:', error);
      if (error.message.startsWith('CONFLICT:')) {
        return res.status(409).json({
          success: false,
          message: error.message.replace('CONFLICT:', ''),
        });
      }
      if (error.message.startsWith('NOT_FOUND:')) {
        return res.status(404).json({
          success: false,
          message: error.message.replace('NOT_FOUND:', ''),
        });
      }
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
      const organizationId = req.user.organizationId || req.user.memberships?.[0]?.organizationId;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required',
        });
      }

      const includeFiles = include.includes('files');
      const includeSubfolders = include.includes('subfolders');

      const response = await prismaService.withTenantContext(organizationId, async tx => {
        let currentFolder = null;

        if (path !== '/') {
          currentFolder = await tx.fileFolder.findFirst({
            where: {
              organizationId,
              path,
            },
          });

          if (!currentFolder) {
            throw new Error('NOT_FOUND:Folder not found');
          }
        }

        const response = {
          success: true,
          path,
          folder: currentFolder,
          contents: {},
        };

        if (includeSubfolders) {
          const subfolders = await tx.fileFolder.findMany({
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

          const childrenCounts = folderIds.length
            ? await tx.fileFolder.groupBy({
                by: ['parentId'],
                where: { parentId: { in: folderIds } },
                _count: { _all: true },
              })
            : [];

          const fileCounts = folderIds.length
            ? await tx.fileStorage.groupBy({
                by: ['folderId'],
                where: { folderId: { in: folderIds }, isActive: true },
                _count: { _all: true },
              })
            : [];

          const userIds = [...new Set(subfolders.map(f => f.createdBy).filter(Boolean))];
          const systemPrisma = prismaService.getSystemClient();
          const usersById = userIds.length
            ? (
                await systemPrisma.user.findMany({
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
        }

        if (includeFiles) {
          const where = {
            organizationId,
            isActive: true,
          };
          if (currentFolder?.id) {
            where.folderId = currentFolder.id;
          }

          const files = await tx.fileStorage.findMany({
            where,
            orderBy: { filename: 'asc' },
            take: parseInt(limit),
            skip: parseInt(offset),
          });

          const fileIds = files.map(f => f.id);
          const uploaderIds = [...new Set(files.map(f => f.uploadedBy).filter(Boolean))];

          const systemPrisma = prismaService.getSystemClient();
          const usersById = uploaderIds.length
            ? (
                await systemPrisma.user.findMany({
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
                await tx.fileThumbnail.findMany({
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
            uploader: f.uploadedBy ? usersById[f.uploadedBy] || null : null,
            thumbnails: thumbnailsByFileId[f.id] || [],
          }));
        }

        return response;
      });

      res.json(response);
    } catch (error) {
      console.error('Error listing folder contents:', error);
      if (error.message.startsWith('NOT_FOUND:')) {
        return res.status(404).json({
          success: false,
          message: error.message.replace('NOT_FOUND:', ''),
        });
      }
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
      const organizationId = req.user.organizationId || req.user.memberships?.[0]?.organizationId;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required',
        });
      }

      const folder = await prismaService.withTenantContext(organizationId, async tx => {
        const folder = await tx.fileFolder.findFirst({
          where: {
            id: folderId,
            organizationId,
          },
        });

        if (!folder) {
          throw new Error('NOT_FOUND:Folder not found');
        }

        const systemPrisma = prismaService.getSystemClient();
        const creator = folder.createdBy
          ? await systemPrisma.user.findUnique({
              where: { id: folder.createdBy },
              select: { id: true, firstName: true, lastName: true },
            })
          : null;

        const parent = folder.parentId
          ? await tx.fileFolder.findUnique({
              where: { id: folder.parentId },
              select: { id: true, name: true, path: true },
            })
          : null;

        const children = await tx.fileFolder.findMany({
          where: { parentId: folderId },
          select: { id: true, name: true, path: true, createdAt: true },
          orderBy: { name: 'asc' },
        });

        const files = await tx.fileStorage.findMany({
          where: { folderId: folderId, isActive: true },
          select: {
            id: true,
            filename: true,
            mimeType: true,
            fileSize: true,
            uploadedAt: true,
          },
          orderBy: { filename: 'asc' },
        });

        const childrenCount = children.length;
        const filesCount = files.length;

        return {
          ...folder,
          creator,
          parent,
          children,
          files,
          _count: {
            children: childrenCount,
            files: filesCount,
          },
        };
      });

      res.json({
        success: true,
        folder,
      });
    } catch (error) {
      console.error('Error getting folder details:', error);
      if (error.message.startsWith('NOT_FOUND:')) {
        return res.status(404).json({
          success: false,
          message: error.message.replace('NOT_FOUND:', ''),
        });
      }
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
      const organizationId = req.user.organizationId || req.user.memberships?.[0]?.organizationId;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required',
        });
      }

      const updatedFolder = await prismaService.withTenantContext(organizationId, async tx => {
        const existingFolder = await tx.fileFolder.findFirst({
          where: {
            id: folderId,
            organizationId,
          },
        });

        if (!existingFolder) {
          throw new Error('NOT_FOUND:Folder not found');
        }

        let updateData = {};

        if (name && name.trim() !== existingFolder.name) {
          const cleanName = name.trim();

          const parent = existingFolder.parentId
            ? await tx.fileFolder.findUnique({
                where: { id: existingFolder.parentId },
                select: { path: true },
              })
            : null;

          const parentPath = parent?.path || '/';
          const newPath = parentPath === '/' ? `/${cleanName}` : `${parentPath}/${cleanName}`;

          const conflictingFolder = await tx.fileFolder.findFirst({
            where: {
              organizationId,
              path: newPath,
              id: { not: folderId },
            },
          });

          if (conflictingFolder) {
            throw new Error(
              'CONFLICT:A folder with this name already exists in the current location'
            );
          }

          updateData.name = cleanName;
          updateData.path = newPath;
        }

        const updatedFolder = await tx.fileFolder.update({
          where: { id: folderId },
          data: updateData,
        });

        const systemPrisma = prismaService.getSystemClient();
        const creator = updatedFolder.createdBy
          ? await systemPrisma.user.findUnique({
              where: { id: updatedFolder.createdBy },
              select: { id: true, firstName: true, lastName: true },
            })
          : null;

        const parent = updatedFolder.parentId
          ? await tx.fileFolder.findUnique({
              where: { id: updatedFolder.parentId },
              select: { id: true, name: true, path: true },
            })
          : null;

        const childrenCount = await tx.fileFolder.count({
          where: { parentId: folderId },
        });

        const filesCount = await tx.fileStorage.count({
          where: { folderId: folderId, isActive: true },
        });

        return {
          ...updatedFolder,
          creator,
          parent,
          _count: {
            children: childrenCount,
            files: filesCount,
          },
        };
      });

      res.json({
        success: true,
        folder: updatedFolder,
      });
    } catch (error) {
      console.error('Error updating folder:', error);
      if (error.message.startsWith('NOT_FOUND:')) {
        return res.status(404).json({
          success: false,
          message: error.message.replace('NOT_FOUND:', ''),
        });
      }
      if (error.message.startsWith('CONFLICT:')) {
        return res.status(409).json({
          success: false,
          message: error.message.replace('CONFLICT:', ''),
        });
      }
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
      const organizationId = req.user.organizationId || req.user.memberships?.[0]?.organizationId;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required',
        });
      }

      const updatedFolder = await prismaService.withTenantContext(organizationId, async tx => {
        const folder = await tx.fileFolder.findFirst({
          where: {
            id: folderId,
            organizationId,
          },
        });

        if (!folder) {
          throw new Error('NOT_FOUND:Folder not found');
        }

        let newParent = null;
        let newDepth = 0;

        if (newParentPath !== '/') {
          newParent = await tx.fileFolder.findFirst({
            where: {
              organizationId,
              path: newParentPath,
            },
          });

          if (!newParent) {
            throw new Error('NOT_FOUND:Target parent folder not found');
          }

          if (newParentPath.startsWith(folder.path)) {
            throw new Error('BAD_REQUEST:Cannot move folder into itself or its subfolder');
          }

          newDepth = newParent.depth + 1;
        }

        const newPath =
          newParentPath === '/' ? `/${folder.name}` : `${newParentPath}/${folder.name}`;

        const conflictingFolder = await tx.fileFolder.findFirst({
          where: {
            organizationId,
            path: newPath,
            id: { not: folderId },
          },
        });

        if (conflictingFolder) {
          throw new Error('CONFLICT:A folder with this name already exists in the target location');
        }

        const updatedFolder = await tx.fileFolder.update({
          where: { id: folderId },
          data: {
            parentId: newParent?.id || null,
            path: newPath,
            depth: newDepth,
          },
        });

        const systemPrisma = prismaService.getSystemClient();
        const creator = updatedFolder.createdBy
          ? await systemPrisma.user.findUnique({
              where: { id: updatedFolder.createdBy },
              select: { id: true, firstName: true, lastName: true },
            })
          : null;

        const parent = updatedFolder.parentId
          ? await tx.fileFolder.findUnique({
              where: { id: updatedFolder.parentId },
              select: { id: true, name: true, path: true },
            })
          : null;

        const childrenCount = await tx.fileFolder.count({
          where: { parentId: folderId },
        });

        const filesCount = await tx.fileStorage.count({
          where: { folderId: folderId, isActive: true },
        });

        return {
          ...updatedFolder,
          creator,
          parent,
          _count: {
            children: childrenCount,
            files: filesCount,
          },
        };
      });

      res.json({
        success: true,
        folder: updatedFolder,
      });
    } catch (error) {
      console.error('Error moving folder:', error);
      if (error.message.startsWith('NOT_FOUND:')) {
        return res.status(404).json({
          success: false,
          message: error.message.replace('NOT_FOUND:', ''),
        });
      }
      if (error.message.startsWith('BAD_REQUEST:')) {
        return res.status(400).json({
          success: false,
          message: error.message.replace('BAD_REQUEST:', ''),
        });
      }
      if (error.message.startsWith('CONFLICT:')) {
        return res.status(409).json({
          success: false,
          message: error.message.replace('CONFLICT:', ''),
        });
      }
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
      const organizationId = req.user.organizationId || req.user.memberships?.[0]?.organizationId;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required',
        });
      }

      const isRecursive = recursive === 'true';
      const shouldDeleteFiles = deleteFiles === 'true';

      await prismaService.withTenantContext(organizationId, async tx => {
        const folder = await tx.fileFolder.findFirst({
          where: {
            id: folderId,
            organizationId,
          },
        });

        if (!folder) {
          throw new Error('NOT_FOUND:Folder not found');
        }

        const childrenCount = await tx.fileFolder.count({
          where: { parentId: folderId },
        });

        const filesCount = await tx.fileStorage.count({
          where: { folderId: folderId, isActive: true },
        });

        if (childrenCount > 0 && !isRecursive) {
          throw new Error(
            'BAD_REQUEST:Folder contains subfolders. Use recursive=true to delete all contents.'
          );
        }

        if (filesCount > 0 && !shouldDeleteFiles) {
          throw new Error(
            'BAD_REQUEST:Folder contains files. Use deleteFiles=true to delete all files.'
          );
        }

        if (filesCount > 0) {
          if (shouldDeleteFiles) {
            await tx.fileStorage.updateMany({
              where: { folderId: folderId },
              data: { isActive: false, folderId: null },
            });
          } else {
            await tx.fileStorage.updateMany({
              where: { folderId: folderId },
              data: { folderId: folder.parentId },
            });
          }
        }

        await tx.fileFolder.delete({
          where: { id: folderId },
        });
      });

      res.json({
        success: true,
        message: 'Folder deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting folder:', error);
      if (error.message.startsWith('NOT_FOUND:')) {
        return res.status(404).json({
          success: false,
          message: error.message.replace('NOT_FOUND:', ''),
        });
      }
      if (error.message.startsWith('BAD_REQUEST:')) {
        return res.status(400).json({
          success: false,
          message: error.message.replace('BAD_REQUEST:', ''),
        });
      }
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
      const organizationId = req.user.organizationId || req.user.memberships?.[0]?.organizationId;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required',
        });
      }

      const { maxDepth = 5 } = req.query;

      const tree = await prismaService.withTenantContext(organizationId, async tx => {
        const folders = await tx.fileFolder.findMany({
          where: {
            organizationId,
            depth: { lte: parseInt(maxDepth) },
          },
          orderBy: [{ depth: 'asc' }, { name: 'asc' }],
        });

        const folderIds = folders.map(f => f.id);

        const childrenCounts = folderIds.length
          ? await tx.fileFolder.groupBy({
              by: ['parentId'],
              where: { parentId: { in: folderIds } },
              _count: { _all: true },
            })
          : [];

        const fileCounts = folderIds.length
          ? await tx.fileStorage.groupBy({
              by: ['folderId'],
              where: { folderId: { in: folderIds }, isActive: true },
              _count: { _all: true },
            })
          : [];

        const childrenCountMap = new Map(childrenCounts.map(c => [c.parentId, c._count._all]));
        const fileCountMap = new Map(fileCounts.map(c => [c.folderId, c._count._all]));

        const folderMap = new Map();
        const tree = [];

        folders.forEach(folder => {
          folderMap.set(folder.id, {
            ...folder,
            children: [],
            _count: {
              children: childrenCountMap.get(folder.id) || 0,
              files: fileCountMap.get(folder.id) || 0,
            },
          });
        });

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

        return tree;
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
