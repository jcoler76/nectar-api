const prismaService = require('../services/prismaService');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

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
          // For root path, only show files not in any folder
          if (path === '/' && !currentFolder) {
            where.folderId = null;
          } else if (currentFolder?.id) {
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

  // ========== MCP (Model Context Protocol) Methods ==========

  /**
   * Enable MCP on a folder
   * POST /api/folders/:folderId/mcp/enable
   */
  async enableFolderMCP(req, res) {
    try {
      const { folderId } = req.params;
      const { config } = req.body;
      const organizationId = req.user.organizationId || req.user.memberships?.[0]?.organizationId;
      const userId = req.user.id;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required',
        });
      }

      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      // Get folder
      const folder = await prisma.fileFolder.findFirst({
        where: {
          id: folderId,
          organizationId,
        },
      });

      if (!folder) {
        await prisma.$disconnect();
        return res.status(404).json({
          success: false,
          message: 'Folder not found',
        });
      }

      if (folder.mcpEnabled) {
        await prisma.$disconnect();
        return res.status(400).json({
          success: false,
          message: 'MCP is already enabled for this folder',
        });
      }

      // Default config
      const mcpConfig = {
        embedding_model: config?.embedding_model || 'text-embedding-3-small',
        llm_model: config?.llm_model || 'gpt-4-turbo',
        chunk_size: config?.chunk_size || 1000,
        chunk_overlap: config?.chunk_overlap || 200,
        top_k_results: config?.top_k_results || 5,
        min_similarity: config?.min_similarity || 0.5,
      };

      // Update folder to enable MCP
      await prisma.fileFolder.update({
        where: { id: folderId },
        data: {
          mcpEnabled: true,
          mcpConfig,
          indexingStatus: 'pending',
        },
      });

      // Create background job to index all files
      await prisma.backgroundJob.create({
        data: {
          jobType: 'folder_embedding',
          status: 'pending',
          priority: 5,
          folderId,
          organizationId,
          payload: {
            folderId,
            organizationId,
            triggeredBy: userId,
          },
        },
      });

      await prisma.$disconnect();

      res.json({
        success: true,
        message: 'MCP enabled successfully. Indexing has started in the background.',
        config: mcpConfig,
      });
    } catch (error) {
      console.error('Error enabling folder MCP:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to enable MCP',
      });
    }
  }

  /**
   * Disable MCP on a folder
   * POST /api/folders/:folderId/mcp/disable
   */
  async disableFolderMCP(req, res) {
    try {
      const { folderId } = req.params;
      const organizationId = req.user.organizationId || req.user.memberships?.[0]?.organizationId;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required',
        });
      }

      const EmbeddingService = require('../services/mcp/EmbeddingService');
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      // Get folder
      const folder = await prisma.fileFolder.findFirst({
        where: {
          id: folderId,
          organizationId,
        },
      });

      if (!folder) {
        await prisma.$disconnect();
        return res.status(404).json({
          success: false,
          message: 'Folder not found',
        });
      }

      if (!folder.mcpEnabled) {
        await prisma.$disconnect();
        return res.status(400).json({
          success: false,
          message: 'MCP is not enabled for this folder',
        });
      }

      // Delete all embeddings
      const deletedCount = await EmbeddingService.deleteFolderEmbeddings(folderId);

      // Update folder
      await prisma.fileFolder.update({
        where: { id: folderId },
        data: {
          mcpEnabled: false,
          mcpConfig: null,
          embeddingCount: 0,
          lastIndexedAt: null,
          indexingStatus: 'idle',
        },
      });

      await prisma.$disconnect();

      res.json({
        success: true,
        message: 'MCP disabled successfully',
        deletedEmbeddings: deletedCount,
      });
    } catch (error) {
      console.error('Error disabling folder MCP:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to disable MCP',
      });
    }
  }

  /**
   * Trigger folder reindexing
   * POST /api/folders/:folderId/mcp/reindex
   */
  async reindexFolder(req, res) {
    try {
      const { folderId } = req.params;
      const organizationId = req.user.organizationId || req.user.memberships?.[0]?.organizationId;
      const userId = req.user.id;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required',
        });
      }

      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      // Get folder
      const folder = await prisma.fileFolder.findFirst({
        where: {
          id: folderId,
          organizationId,
        },
      });

      if (!folder) {
        await prisma.$disconnect();
        return res.status(404).json({
          success: false,
          message: 'Folder not found',
        });
      }

      if (!folder.mcpEnabled) {
        await prisma.$disconnect();
        return res.status(400).json({
          success: false,
          message: 'MCP is not enabled for this folder',
        });
      }

      // Create reindex job
      await prisma.backgroundJob.create({
        data: {
          jobType: 'folder_reindex',
          status: 'pending',
          priority: 3, // Higher priority for reindex
          folderId,
          organizationId,
          payload: {
            folderId,
            organizationId,
            triggeredBy: userId,
          },
        },
      });

      // Update folder status
      await prisma.fileFolder.update({
        where: { id: folderId },
        data: {
          indexingStatus: 'pending',
        },
      });

      await prisma.$disconnect();

      res.json({
        success: true,
        message: 'Reindexing started successfully',
      });
    } catch (error) {
      console.error('Error reindexing folder:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to start reindexing',
      });
    }
  }

  /**
   * Get folder MCP status
   * GET /api/folders/:folderId/mcp/status
   */
  async getFolderMCPStatus(req, res) {
    try {
      const { folderId } = req.params;
      const organizationId = req.user.organizationId || req.user.memberships?.[0]?.organizationId;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required',
        });
      }

      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      // Get folder with counts
      const folder = await prisma.fileFolder.findFirst({
        where: {
          id: folderId,
          organizationId,
        },
        include: {
          _count: {
            select: {
              files: { where: { isActive: true } },
              embeddings: true,
            },
          },
        },
      });

      if (!folder) {
        await prisma.$disconnect();
        return res.status(404).json({
          success: false,
          message: 'Folder not found',
        });
      }

      // Get pending/processing jobs
      const activeJobs = await prisma.backgroundJob.findMany({
        where: {
          folderId,
          status: { in: ['pending', 'processing'] },
        },
        select: {
          id: true,
          jobType: true,
          status: true,
          createdAt: true,
          startedAt: true,
        },
      });

      await prisma.$disconnect();

      res.json({
        success: true,
        status: {
          mcpEnabled: folder.mcpEnabled,
          indexingStatus: folder.indexingStatus,
          embeddingCount: folder.embeddingCount,
          fileCount: folder._count.files,
          lastIndexedAt: folder.lastIndexedAt,
          config: folder.mcpConfig,
          activeJobs: activeJobs.length,
          jobs: activeJobs,
        },
      });
    } catch (error) {
      console.error('Error getting folder MCP status:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get MCP status',
      });
    }
  }

  /**
   * Query folder documents
   * POST /api/folders/:folderId/mcp/query
   */
  async queryFolder(req, res) {
    try {
      const { folderId } = req.params;
      const { question, options } = req.body;
      const organizationId = req.user.organizationId || req.user.memberships?.[0]?.organizationId;
      const userId = req.user.id;

      // Support both regular auth and folder API key auth
      const apiKeyId = req.user.apiKeyId || null;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required',
        });
      }

      if (!question || !question.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Question is required',
        });
      }

      const FolderQueryService = require('../services/mcp/FolderQueryService');

      const result = await FolderQueryService.queryFolder({
        folderId,
        organizationId,
        question: question.trim(),
        userId,
        apiKeyId, // Track queries made with API keys
        options,
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error('Error querying folder:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to query folder',
      });
    }
  }

  /**
   * Get folder query history
   * GET /api/folders/:folderId/mcp/queries
   */
  async getFolderQueryHistory(req, res) {
    try {
      const { folderId } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      const organizationId = req.user.organizationId || req.user.memberships?.[0]?.organizationId;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required',
        });
      }

      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      const [queries, totalCount] = await Promise.all([
        prisma.folderMCPQuery.findMany({
          where: { folderId },
          orderBy: { createdAt: 'desc' },
          take: parseInt(limit),
          skip: parseInt(offset),
          select: {
            id: true,
            question: true,
            answer: true,
            createdAt: true,
            relevanceScore: true,
            responseTimeMs: true,
            tokensUsed: true,
            costUsd: true,
          },
        }),
        prisma.folderMCPQuery.count({ where: { folderId } }),
      ]);

      await prisma.$disconnect();

      res.json({
        success: true,
        queries,
        totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    } catch (error) {
      console.error('Error getting query history:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get query history',
      });
    }
  }

  /**
   * Get folder MCP statistics
   * GET /api/folders/:folderId/mcp/stats
   */
  async getFolderMCPStats(req, res) {
    try {
      const { folderId } = req.params;
      const { startDate, endDate } = req.query;
      const organizationId = req.user.organizationId || req.user.memberships?.[0]?.organizationId;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required',
        });
      }

      const FolderQueryService = require('../services/mcp/FolderQueryService');
      const EmbeddingService = require('../services/mcp/EmbeddingService');

      // Default to last 30 days if no dates provided
      const start = startDate
        ? new Date(startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const [usageStats, embeddingStats] = await Promise.all([
        FolderQueryService.getUsageStats(folderId, start, end),
        EmbeddingService.getFolderStats(folderId),
      ]);

      res.json({
        success: true,
        dateRange: { start, end },
        usage: usageStats,
        embeddings: embeddingStats,
      });
    } catch (error) {
      console.error('Error getting folder stats:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get folder statistics',
      });
    }
  }

  // ========== Folder API Key Methods ==========

  /**
   * Generate API key for folder MCP access
   * POST /api/folders/:folderId/mcp/api-key
   */
  async generateFolderApiKey(req, res) {
    try {
      const { folderId } = req.params;
      const { name, expiresIn = '1y' } = req.body;
      const organizationId = req.user.organizationId || req.user.memberships?.[0]?.organizationId;
      const userId = req.user.id;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required',
        });
      }

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'API key name is required',
        });
      }

      // Verify folder exists and MCP is enabled
      const folder = await prismaService.withTenantContext(organizationId, async tx => {
        return await tx.fileFolder.findFirst({
          where: {
            id: folderId,
            organizationId,
          },
        });
      });

      if (!folder) {
        return res.status(404).json({
          success: false,
          message: 'Folder not found',
        });
      }

      if (!folder.mcpEnabled) {
        return res.status(400).json({
          success: false,
          message: 'MCP must be enabled on this folder before generating an API key',
        });
      }

      // Calculate expiration
      let expiresAt = null;
      if (expiresIn && expiresIn !== 'never') {
        const expirationMs = this._parseExpiration(expiresIn);
        expiresAt = new Date(Date.now() + expirationMs);
      }

      // Generate API key using existing pattern
      const apiKeyValue = this._generateApiKey();
      const keyHash = await bcrypt.hash(apiKeyValue, 12);
      const keyPrefix = `${apiKeyValue.substring(0, 8)}...${apiKeyValue.slice(-4)}`;

      // Create API key scoped to folder
      const apiKey = await prismaService.withTenantContext(organizationId, async tx => {
        return await tx.apiKey.create({
          data: {
            name: name.trim(),
            keyHash,
            keyPrefix,
            organizationId,
            createdById: userId,
            folderId, // Scope to folder
            permissions: ['folder:query', 'folder:mcp'],
            expiresAt,
            isActive: true,
          },
          include: {
            folder: {
              select: { id: true, name: true, path: true },
            },
            createdBy: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        });
      });

      res.status(201).json({
        success: true,
        apiKey: {
          ...apiKey,
          keyHash: undefined, // Don't return hash
        },
        key: apiKeyValue,
        warning: 'Store this API key securely. It will not be shown again.',
      });
    } catch (error) {
      console.error('Error generating folder API key:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate folder API key',
      });
    }
  }

  /**
   * List API keys for a folder
   * GET /api/folders/:folderId/mcp/api-keys
   */
  async listFolderApiKeys(req, res) {
    try {
      const { folderId } = req.params;
      const organizationId = req.user.organizationId || req.user.memberships?.[0]?.organizationId;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required',
        });
      }

      const apiKeys = await prismaService.withTenantContext(organizationId, async tx => {
        return await tx.apiKey.findMany({
          where: {
            folderId,
          },
          select: {
            id: true,
            name: true,
            keyPrefix: true,
            isActive: true,
            lastUsedAt: true,
            expiresAt: true,
            createdAt: true,
            permissions: true,
            createdBy: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
      });

      res.json({
        success: true,
        apiKeys,
        count: apiKeys.length,
      });
    } catch (error) {
      console.error('Error listing folder API keys:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to list folder API keys',
      });
    }
  }

  /**
   * Revoke folder API key
   * DELETE /api/folders/:folderId/mcp/api-key/:keyId
   */
  async revokeFolderApiKey(req, res) {
    try {
      const { folderId, keyId } = req.params;
      const organizationId = req.user.organizationId || req.user.memberships?.[0]?.organizationId;
      const userId = req.user.id;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required',
        });
      }

      // Verify key belongs to folder
      const apiKey = await prismaService.withTenantContext(organizationId, async tx => {
        return await tx.apiKey.findFirst({
          where: {
            id: keyId,
            folderId,
          },
        });
      });

      if (!apiKey) {
        return res.status(404).json({
          success: false,
          message: 'API key not found for this folder',
        });
      }

      // Revoke the key
      await prismaService.withTenantContext(organizationId, async tx => {
        await tx.apiKey.update({
          where: { id: keyId },
          data: {
            isActive: false,
          },
        });
      });

      res.json({
        success: true,
        message: 'Folder API key revoked successfully',
      });
    } catch (error) {
      console.error('Error revoking folder API key:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to revoke folder API key',
      });
    }
  }

  // Helper methods
  _generateApiKey() {
    const prefix = 'nk_folder_'; // nectar key - folder scoped
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return `${prefix}${randomBytes}`;
  }

  _parseExpiration(expiresIn) {
    const match = expiresIn.match(/^(\d+)([ymwd])$/);
    if (!match) {
      throw new Error('Invalid expiration format. Use format like: 1y, 6m, 30d, 1w');
    }

    const [, amount, unit] = match;
    const multipliers = {
      d: 24 * 60 * 60 * 1000,
      w: 7 * 24 * 60 * 60 * 1000,
      m: 30 * 24 * 60 * 60 * 1000,
      y: 365 * 24 * 60 * 60 * 1000,
    };

    return parseInt(amount) * multipliers[unit];
  }
}

module.exports = new FolderController();
