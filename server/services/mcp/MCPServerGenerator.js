/**
 * MCP Server Generator
 * Generates MCP (Model Context Protocol) tools from role permissions
 * These tools can be used by autonomous agents to interact with databases
 */

const { logger } = require('../../utils/logger');
const DatabaseService = require('../database/DatabaseService');

class MCPServerGenerator {
  /**
   * Generate MCP tools from a role's permissions
   * @param {Object} role - Role object with permissions
   * @param {Object} service - Service object with database info
   * @param {Object} connection - Database connection object
   * @param {String} organizationId - Organization ID for folder tools
   * @returns {Array} Array of MCP tool definitions
   */
  async generateToolsForRole(role, service, connection, organizationId) {
    try {
      logger.info('Generating MCP tools for role', {
        roleId: role.id,
        roleName: role.name,
        serviceId: service.id,
        organizationId,
      });

      const tools = [];
      const permissions = Array.isArray(role.permissions)
        ? role.permissions
        : JSON.parse(role.permissions || '[]');

      // Group permissions by object type for better organization
      const tablePermissions = [];
      const viewPermissions = [];
      const procedurePermissions = [];

      for (const permission of permissions) {
        const { objectName, actions, path, schema } = permission;

        if (path?.includes('/table/')) {
          tablePermissions.push(permission);
          tools.push(...this.generateTableTools(objectName, actions, schema || 'dbo'));
        } else if (path?.includes('/view/')) {
          viewPermissions.push(permission);
          tools.push(...this.generateViewTools(objectName, actions, schema || 'dbo'));
        } else if (path?.includes('/proc/')) {
          procedurePermissions.push(permission);
          tools.push(
            ...(await this.generateProcedureTools(
              objectName,
              actions,
              schema || 'dbo',
              service,
              connection
            ))
          );
        }
      }

      // Note: Folder tools are managed separately via folder MCP endpoints
      // Role MCP servers only expose database tools based on role permissions

      logger.info('MCP tools generated successfully', {
        roleId: role.id,
        totalTools: tools.length,
        tables: tablePermissions.length,
        views: viewPermissions.length,
        procedures: procedurePermissions.length,
        folders:
          tools.length -
          (tablePermissions.length + viewPermissions.length + procedurePermissions.length),
      });

      return tools;
    } catch (error) {
      logger.error('Error generating MCP tools', {
        error: error.message,
        stack: error.stack,
        roleId: role.id,
      });
      throw error;
    }
  }

  /**
   * Generate MCP tools for table operations
   * @param {String} tableName - Name of the table
   * @param {Array} actions - Allowed actions (SELECT, INSERT, UPDATE, DELETE)
   * @param {String} schema - Database schema name
   * @returns {Array} Array of MCP tools for this table
   */
  generateTableTools(tableName, actions, schema) {
    const tools = [];
    const safeTableName = this.sanitizeName(tableName);

    if (actions.includes('SELECT')) {
      // PERFORMANCE: Add search/discover tool with summary mode (prevents "interrupted" errors)
      tools.push({
        name: `search_${safeTableName}`,
        description: `Smart search for ${schema}.${tableName} - Returns lightweight summary by default, or full schema if requested. Use this for discovery before querying.`,
        inputSchema: {
          type: 'object',
          properties: {
            keyword: {
              type: 'string',
              description: 'Search keyword to filter columns/descriptions (optional)',
            },
            includeFullSchema: {
              type: 'boolean',
              default: false,
              description:
                'Return full schema with all column details (default: false for performance)',
            },
          },
        },
        handler: 'searchTableSchema',
        metadata: {
          objectName: tableName,
          schema,
          action: 'SEARCH',
        },
      });

      tools.push({
        name: `query_${safeTableName}`,
        description: `Query data from ${schema}.${tableName} table with filtering, pagination, and sorting capabilities`,
        inputSchema: {
          type: 'object',
          properties: {
            filters: {
              type: 'object',
              description:
                'WHERE clause filters as key-value pairs. Example: { "status": "active", "age": { "$gt": 18 } }',
            },
            limit: {
              type: 'number',
              default: 100,
              description: 'Maximum number of records to return',
            },
            offset: {
              type: 'number',
              default: 0,
              description: 'Number of records to skip for pagination',
            },
            orderBy: {
              type: 'string',
              description: 'ORDER BY clause. Example: "created_at DESC, name ASC"',
            },
            columns: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific columns to return. If omitted, returns all columns.',
            },
          },
        },
        handler: 'executeTableQuery',
        metadata: {
          objectName: tableName,
          schema,
          action: 'SELECT',
        },
      });

      tools.push({
        name: `analyze_${safeTableName}_schema`,
        description: `Get detailed schema information for ${schema}.${tableName} including columns, data types, indexes, and constraints`,
        inputSchema: {
          type: 'object',
          properties: {
            includeStatistics: {
              type: 'boolean',
              default: false,
              description: 'Include row count and size statistics',
            },
          },
        },
        handler: 'analyzeTableSchema',
        metadata: {
          objectName: tableName,
          schema,
          action: 'ANALYZE',
        },
      });

      tools.push({
        name: `count_${safeTableName}`,
        description: `Get row count for ${schema}.${tableName} with optional filtering`,
        inputSchema: {
          type: 'object',
          properties: {
            filters: {
              type: 'object',
              description: 'WHERE clause filters to apply before counting',
            },
          },
        },
        handler: 'executeTableCount',
        metadata: {
          objectName: tableName,
          schema,
          action: 'COUNT',
        },
      });
    }

    if (actions.includes('INSERT')) {
      tools.push({
        name: `insert_${safeTableName}`,
        description: `Insert new records into ${schema}.${tableName}`,
        inputSchema: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              description: 'Array of objects to insert. Each object represents one row.',
              items: { type: 'object' },
            },
            returnInserted: {
              type: 'boolean',
              default: true,
              description: 'Return the inserted records with generated IDs',
            },
          },
          required: ['data'],
        },
        handler: 'executeTableInsert',
        metadata: {
          objectName: tableName,
          schema,
          action: 'INSERT',
        },
      });
    }

    if (actions.includes('UPDATE')) {
      tools.push({
        name: `update_${safeTableName}`,
        description: `Update existing records in ${schema}.${tableName}`,
        inputSchema: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              description: 'Object with fields to update',
            },
            filters: {
              type: 'object',
              description: 'WHERE clause to identify records to update',
              required: true,
            },
            returnUpdated: {
              type: 'boolean',
              default: true,
              description: 'Return the updated records',
            },
          },
          required: ['data', 'filters'],
        },
        handler: 'executeTableUpdate',
        metadata: {
          objectName: tableName,
          schema,
          action: 'UPDATE',
        },
      });
    }

    if (actions.includes('DELETE')) {
      tools.push({
        name: `delete_${safeTableName}`,
        description: `Delete records from ${schema}.${tableName}`,
        inputSchema: {
          type: 'object',
          properties: {
            filters: {
              type: 'object',
              description: 'WHERE clause to identify records to delete',
              required: true,
            },
            confirm: {
              type: 'boolean',
              description: 'Safety confirmation - must be true to execute delete',
              required: true,
            },
          },
          required: ['filters', 'confirm'],
        },
        handler: 'executeTableDelete',
        metadata: {
          objectName: tableName,
          schema,
          action: 'DELETE',
        },
      });
    }

    return tools;
  }

  /**
   * Generate MCP tools for view operations
   * Views are read-only, so only SELECT operations
   */
  generateViewTools(viewName, actions, schema) {
    const tools = [];
    const safeViewName = this.sanitizeName(viewName);

    if (actions.includes('SELECT')) {
      tools.push({
        name: `query_view_${safeViewName}`,
        description: `Query data from ${schema}.${viewName} view`,
        inputSchema: {
          type: 'object',
          properties: {
            filters: {
              type: 'object',
              description: 'WHERE clause filters',
            },
            limit: {
              type: 'number',
              default: 100,
            },
            offset: {
              type: 'number',
              default: 0,
            },
            orderBy: {
              type: 'string',
              description: 'ORDER BY clause',
            },
          },
        },
        handler: 'executeViewQuery',
        metadata: {
          objectName: viewName,
          schema,
          action: 'SELECT',
        },
      });

      tools.push({
        name: `analyze_view_${safeViewName}_schema`,
        description: `Get schema information for ${schema}.${viewName} view`,
        inputSchema: {
          type: 'object',
          properties: {},
        },
        handler: 'analyzeViewSchema',
        metadata: {
          objectName: viewName,
          schema,
          action: 'ANALYZE',
        },
      });
    }

    return tools;
  }

  /**
   * Generate MCP tools for stored procedure operations
   * This requires analyzing the procedure to understand its parameters
   */
  async generateProcedureTools(procName, actions, schema, service, connection) {
    const tools = [];
    const safeProcName = this.sanitizeName(procName);

    try {
      // Get procedure signature
      const signature = await this.analyzeProcedureSignature(procName, schema, service, connection);

      tools.push({
        name: `execute_${safeProcName}`,
        description: `Execute stored procedure ${schema}.${procName}${signature.description ? ': ' + signature.description : ''}`,
        inputSchema: {
          type: 'object',
          properties: {
            parameters: {
              type: 'object',
              description: `Procedure parameters: ${JSON.stringify(signature.parameters)}`,
              properties: signature.parameterSchema || {},
            },
          },
        },
        handler: 'executeProcedure',
        metadata: {
          objectName: procName,
          schema,
          action: 'EXECUTE',
          signature,
        },
      });

      tools.push({
        name: `analyze_${safeProcName}_signature`,
        description: `Get detailed information about ${schema}.${procName} including parameters, return type, and documentation`,
        inputSchema: {
          type: 'object',
          properties: {},
        },
        handler: 'analyzeProcedureSignature',
        metadata: {
          objectName: procName,
          schema,
          action: 'ANALYZE',
        },
      });
    } catch (error) {
      logger.warn('Could not analyze procedure signature', {
        procName,
        schema,
        error: error.message,
      });

      // Create basic tool without signature info
      tools.push({
        name: `execute_${safeProcName}`,
        description: `Execute stored procedure ${schema}.${procName}`,
        inputSchema: {
          type: 'object',
          properties: {
            parameters: {
              type: 'object',
              description: 'Procedure parameters',
            },
          },
        },
        handler: 'executeProcedure',
        metadata: {
          objectName: procName,
          schema,
          action: 'EXECUTE',
        },
      });
    }

    return tools;
  }

  /**
   * Analyze stored procedure to extract parameter information
   */
  async analyzeProcedureSignature(procName, schema, service, connection) {
    try {
      // This would use DatabaseService to query the procedure metadata
      // For now, return a basic structure
      return {
        parameters: [],
        returnType: 'unknown',
        description: null,
        parameterSchema: {},
      };
    } catch (error) {
      logger.error('Error analyzing procedure signature', {
        procName,
        schema,
        error: error.message,
      });
      return {
        parameters: [],
        returnType: 'unknown',
        description: null,
        parameterSchema: {},
      };
    }
  }

  /**
   * Sanitize names for use in tool names (remove special characters)
   */
  sanitizeName(name) {
    return name
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();
  }

  /**
   * Generate server URL for this MCP server instance
   */
  generateServerUrl(roleId, organizationId) {
    const baseUrl = process.env.API_URL || 'http://localhost:3001';
    return `${baseUrl}/api/mcp/${organizationId}/${roleId}`;
  }

  /**
   * Generate MCP tools for MCP-enabled folders
   * @param {String} organizationId - Organization ID
   * @returns {Promise<Array>} Array of folder MCP tools
   */
  async generateFolderTools(organizationId) {
    try {
      const prismaService = require('../prismaService');

      // Find all MCP-enabled folders for this organization using RLS
      const mcpFolders = await prismaService.withTenantContext(organizationId, async tx => {
        return await tx.fileFolder.findMany({
          where: {
            mcpEnabled: true,
          },
          select: {
            id: true,
            name: true,
            embeddingCount: true,
            lastIndexedAt: true,
          },
        });
      });

      if (mcpFolders.length === 0) {
        return [];
      }

      const tools = [];

      for (const folder of mcpFolders) {
        const safeFolderName = this.sanitizeName(folder.name);
        const folderId = folder.id;

        // Query folder documents tool
        tools.push({
          name: `query_folder_${safeFolderName}`,
          description: `Query documents in "${folder.name}" folder using natural language. This folder contains ${folder.embeddingCount || 0} indexed document chunks. ${folder.description || ''}`,
          inputSchema: {
            type: 'object',
            properties: {
              question: {
                type: 'string',
                description: 'Natural language question about the documents in this folder',
              },
              topK: {
                type: 'number',
                default: 5,
                description: 'Number of most relevant document chunks to retrieve (1-20)',
              },
              minSimilarity: {
                type: 'number',
                default: 0.5,
                description: 'Minimum similarity score threshold (0-1)',
              },
            },
            required: ['question'],
          },
          handler: 'queryFolderDocuments',
          metadata: {
            folderId,
            folderName: folder.name,
            action: 'QUERY',
            type: 'folder',
          },
        });

        // Search folder documents tool
        tools.push({
          name: `search_folder_${safeFolderName}`,
          description: `Search for similar content in "${folder.name}" folder. Returns matching document excerpts without LLM processing.`,
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query text',
              },
              topK: {
                type: 'number',
                default: 10,
                description: 'Number of results to return (1-50)',
              },
              minSimilarity: {
                type: 'number',
                default: 0.6,
                description: 'Minimum similarity score threshold (0-1)',
              },
            },
            required: ['query'],
          },
          handler: 'searchFolderDocuments',
          metadata: {
            folderId,
            folderName: folder.name,
            action: 'SEARCH',
            type: 'folder',
          },
        });

        // List folder documents tool
        tools.push({
          name: `list_folder_${safeFolderName}_files`,
          description: `List all files in "${folder.name}" folder with metadata and indexing status.`,
          inputSchema: {
            type: 'object',
            properties: {
              includeStats: {
                type: 'boolean',
                default: false,
                description: 'Include embedding and indexing statistics',
              },
            },
          },
          handler: 'listFolderFiles',
          metadata: {
            folderId,
            folderName: folder.name,
            action: 'LIST',
            type: 'folder',
          },
        });

        // Get folder statistics tool
        tools.push({
          name: `get_folder_${safeFolderName}_stats`,
          description: `Get detailed statistics about "${folder.name}" folder including embedding count, query history, and usage metrics.`,
          inputSchema: {
            type: 'object',
            properties: {
              includeCosts: {
                type: 'boolean',
                default: false,
                description: 'Include cost breakdown and token usage',
              },
              dateRange: {
                type: 'object',
                description:
                  'Optional date range for query history (e.g., {"start": "2024-01-01", "end": "2024-12-31"})',
              },
            },
          },
          handler: 'getFolderStats',
          metadata: {
            folderId,
            folderName: folder.name,
            action: 'STATS',
            type: 'folder',
          },
        });
      }

      logger.info('Folder MCP tools generated', {
        organizationId,
        folderCount: mcpFolders.length,
        toolsGenerated: tools.length,
      });

      return tools;
    } catch (error) {
      logger.error('Error generating folder tools', {
        organizationId,
        error: error.message,
        stack: error.stack,
      });
      return []; // Return empty array instead of failing entire tool generation
    }
  }
}

module.exports = new MCPServerGenerator();
