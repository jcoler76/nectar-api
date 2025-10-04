/**
 * MCP Server Service
 * Manages MCP server instances, tool generation, and coordination
 */

const { logger } = require('../../utils/logger');
const prismaService = require('../prismaService');
const MCPServerGenerator = require('./MCPServerGenerator');
const MCPToolExecutor = require('./MCPToolExecutor');

class MCPServerService {
  /**
   * Enable MCP server for a role
   * Generates tools from role permissions and creates MCP server instance
   */
  async enableMCPServer(roleId, organizationId, userId) {
    try {
      logger.info('Enabling MCP server for role', { roleId, organizationId, userId });

      // Get role with permissions, service, and connection details
      const role = await prismaService.withTenantContext(organizationId, async tx => {
        return await tx.role.findUnique({
          where: { id: roleId },
          include: {
            service: {
              include: {
                connection: true,
              },
            },
          },
        });
      });

      if (!role) {
        throw new Error('Role not found');
      }

      if (!role.service) {
        throw new Error('Role must have an associated service to enable MCP server');
      }

      if (!role.service.connection) {
        throw new Error('Service must have a database connection to enable MCP server');
      }

      // Generate MCP tools from role permissions and folders
      logger.info('Generating MCP tools', {
        roleId,
        permissionsCount: role.permissions?.length || 0,
      });

      const tools = await MCPServerGenerator.generateToolsForRole(
        role,
        role.service,
        role.service.connection,
        organizationId
      );

      // Generate server URL
      const serverUrl = MCPServerGenerator.generateServerUrl(roleId, organizationId);

      // Update role to enable MCP
      await prismaService.withTenantContext(organizationId, async tx => {
        await tx.role.update({
          where: { id: roleId },
          data: {
            mcpEnabled: true,
            mcpToolsGenerated: new Date(),
            mcpServerConfig: {
              serverUrl,
              toolsCount: tools.length,
              generatedAt: new Date().toISOString(),
              generatedBy: userId,
            },
          },
        });
      });

      // Create MCP server instance (tenant table with RLS)
      const mcpServer = await prismaService.withTenantContext(organizationId, async tx => {
        return await tx.mCPServerInstance.create({
          data: {
            roleId,
            organizationId,
            serverUrl,
            status: 'ACTIVE',
            tools: tools,
            lastHealthCheck: new Date(),
          },
        });
      });

      logger.info('MCP server enabled successfully', {
        roleId,
        serverId: mcpServer.id,
        toolsCount: tools.length,
      });

      return {
        success: true,
        server: mcpServer,
        toolsCount: tools.length,
        serverUrl,
      };
    } catch (error) {
      logger.error('Error enabling MCP server', {
        roleId,
        organizationId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Disable MCP server for a role
   */
  async disableMCPServer(roleId, organizationId) {
    try {
      logger.info('Disabling MCP server for role', { roleId, organizationId });

      // Update role
      await prismaService.withTenantContext(organizationId, async tx => {
        await tx.role.update({
          where: { id: roleId },
          data: {
            mcpEnabled: false,
            mcpServerConfig: null,
          },
        });
      });

      // Deactivate MCP server instances (tenant table with RLS)
      await prismaService.withTenantContext(organizationId, async tx => {
        await tx.mCPServerInstance.updateMany({
          where: { roleId },
          data: { status: 'INACTIVE' },
        });
      });

      logger.info('MCP server disabled successfully', { roleId });

      return {
        success: true,
        message: 'MCP server disabled',
      };
    } catch (error) {
      logger.error('Error disabling MCP server', {
        roleId,
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get all active MCP servers for an organization
   * SECURITY: RLS automatically filters by organizationId - no explicit where needed
   */
  async getOrganizationMCPServers(organizationId) {
    try {
      const servers = await prismaService.withTenantContext(organizationId, async tx => {
        // RLS automatically adds: WHERE organizationId = current_organization_id()
        // We only filter on business logic (status, role settings)
        return await tx.mCPServerInstance.findMany({
          where: {
            status: 'ACTIVE',
            role: {
              isActive: true,
              mcpEnabled: true,
            },
          },
          include: {
            role: {
              include: {
                service: true,
              },
            },
          },
        });
      });

      return servers;
    } catch (error) {
      logger.error('Error fetching organization MCP servers', {
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get MCP server by role ID
   * SECURITY: RLS ensures we only get servers from the current organization
   */
  async getMCPServerByRole(roleId, organizationId) {
    try {
      const server = await prismaService.withTenantContext(organizationId, async tx => {
        // RLS automatically filters by organizationId
        return await tx.mCPServerInstance.findFirst({
          where: {
            roleId,
            status: 'ACTIVE',
          },
          include: {
            role: {
              include: {
                service: {
                  include: {
                    connection: true,
                  },
                },
              },
            },
          },
        });
      });

      return server;
    } catch (error) {
      logger.error('Error fetching MCP server', {
        roleId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Execute an MCP tool
   * SECURITY: Critical - RLS isolates tool execution per organization
   */
  async executeTool(serverId, toolName, parameters, user, organizationId) {
    try {
      logger.info('Executing MCP tool', {
        serverId,
        toolName,
        userId: user?.userId,
        organizationId,
      });

      // SECURITY: RLS will return null if serverId belongs to different organization
      const server = await prismaService.withTenantContext(organizationId, async tx => {
        return await tx.mCPServerInstance.findUnique({
          where: { id: serverId },
          include: {
            role: {
              include: {
                service: {
                  include: {
                    connection: true,
                  },
                },
              },
            },
          },
        });
      });

      if (!server) {
        throw new Error('MCP server not found');
      }

      if (server.status !== 'ACTIVE') {
        throw new Error('MCP server is not active');
      }

      // Find the tool
      const tools = Array.isArray(server.tools) ? server.tools : JSON.parse(server.tools || '[]');
      const tool = tools.find(t => t.name === toolName);

      if (!tool) {
        throw new Error(`Tool not found: ${toolName}`);
      }

      // Execute the tool
      const startTime = Date.now();

      const result = await MCPToolExecutor.executeTool(tool, parameters, {
        server,
        role: server.role,
        service: server.role.service,
        connection: server.role.service.connection,
        user,
        organizationId,
      });

      const executionTime = Date.now() - startTime;

      // Update server statistics
      await this.updateServerStats(serverId, executionTime, organizationId);

      return {
        ...result,
        executionTimeMs: executionTime,
      };
    } catch (error) {
      logger.error('Error executing MCP tool', {
        serverId,
        toolName,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * List all tools available in an MCP server
   */
  async listTools(serverId, organizationId) {
    try {
      const server = await prismaService.withTenantContext(organizationId, async tx => {
        return await tx.mCPServerInstance.findUnique({
          where: { id: serverId },
          select: {
            tools: true,
            role: {
              select: {
                name: true,
                description: true,
              },
            },
          },
        });
      });

      if (!server) {
        throw new Error('MCP server not found');
      }

      const tools = Array.isArray(server.tools) ? server.tools : JSON.parse(server.tools || '[]');

      return {
        serverInfo: {
          roleName: server.role.name,
          roleDescription: server.role.description,
        },
        toolsCount: tools.length,
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
          metadata: tool.metadata,
        })),
      };
    } catch (error) {
      logger.error('Error listing MCP tools', {
        serverId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Regenerate tools for an MCP server
   * Useful when role permissions change
   */
  async regenerateTools(roleId, organizationId, userId) {
    try {
      logger.info('Regenerating MCP tools', { roleId, organizationId });

      // Disable current server
      await this.disableMCPServer(roleId, organizationId);

      // Re-enable with new tools
      return await this.enableMCPServer(roleId, organizationId, userId);
    } catch (error) {
      logger.error('Error regenerating MCP tools', {
        roleId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update server statistics after tool execution
   */
  async updateServerStats(serverId, executionTime, organizationId) {
    try {
      await prismaService.withTenantContext(organizationId, async tx => {
        const server = await tx.mCPServerInstance.findUnique({
          where: { id: serverId },
          select: {
            requestCount: true,
            avgResponseTime: true,
          },
        });

        if (!server) return;

        const newRequestCount = server.requestCount + 1;
        const newAvgResponseTime = server.avgResponseTime
          ? (server.avgResponseTime * server.requestCount + executionTime) / newRequestCount
          : executionTime;

        await tx.mCPServerInstance.update({
          where: { id: serverId },
          data: {
            requestCount: newRequestCount,
            avgResponseTime: newAvgResponseTime,
            lastHealthCheck: new Date(),
          },
        });
      });
    } catch (error) {
      logger.warn('Error updating server stats', {
        serverId,
        error: error.message,
      });
      // Don't throw - this is not critical
    }
  }

  /**
   * Health check for MCP servers
   * Returns status of all servers
   */
  async healthCheck(organizationId) {
    try {
      const servers = await prismaService.withTenantContext(organizationId, async tx => {
        return await tx.mCPServerInstance.findMany({
          where: {
            role: {
              organizationId,
            },
          },
          include: {
            role: {
              select: {
                name: true,
                isActive: true,
              },
            },
          },
        });
      });

      return servers.map(server => ({
        id: server.id,
        roleName: server.role.name,
        status: server.status,
        toolsCount: Array.isArray(server.tools) ? server.tools.length : 0,
        requestCount: server.requestCount,
        avgResponseTime: server.avgResponseTime,
        lastHealthCheck: server.lastHealthCheck,
      }));
    } catch (error) {
      logger.error('Error during health check', {
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = new MCPServerService();
