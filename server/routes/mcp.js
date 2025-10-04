/**
 * MCP Server Routes
 * HTTP API endpoints for managing and interacting with MCP servers
 *
 * AUTHENTICATION: These routes use Application API key authentication
 * Agents must provide their application's API key in the Authorization header
 *
 * ACTIVITY LOGGING: All MCP operations are logged to ApiActivityLog
 */

const express = require('express');
const router = express.Router();
const MCPServerService = require('../services/mcp/MCPServerService');
const { logger } = require('../utils/logger');
const {
  requireRoleManagementPermission,
  verifyRoleAccess,
} = require('../middleware/roleAuthorization');
const { mcpApiKeyAuth } = require('../middleware/mcpApiKeyAuth');
const mcpActivityLogger = require('../middleware/mcpActivityLogger');

// Apply activity logging to all MCP routes (non-blocking, safe)
router.use(mcpActivityLogger.middleware());

/**
 * Get all MCP servers for an organization
 * AUTH: Requires valid Application API key
 */
router.get('/servers', mcpApiKeyAuth, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const servers = await MCPServerService.getOrganizationMCPServers(organizationId);

    res.json({
      success: true,
      servers,
      count: servers.length,
    });
  } catch (error) {
    logger.error('Error fetching MCP servers', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch MCP servers',
      error: error.message,
    });
  }
});

/**
 * Get MCP server by role ID
 * AUTH: Requires valid Application API key
 */
router.get('/servers/role/:roleId', mcpApiKeyAuth, async (req, res) => {
  try {
    const { roleId } = req.params;
    const organizationId = req.user.organizationId;

    const server = await MCPServerService.getMCPServerByRole(roleId, organizationId);

    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'MCP server not found for this role',
      });
    }

    res.json({
      success: true,
      server,
    });
  } catch (error) {
    logger.error('Error fetching MCP server', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch MCP server',
      error: error.message,
    });
  }
});

/**
 * List tools available in an MCP server
 * AUTH: Requires valid Application API key
 */
router.get('/servers/:serverId/tools', mcpApiKeyAuth, async (req, res) => {
  try {
    const { serverId } = req.params;
    const organizationId = req.user.organizationId;

    const toolsInfo = await MCPServerService.listTools(serverId, organizationId);

    res.json({
      success: true,
      ...toolsInfo,
    });
  } catch (error) {
    logger.error('Error listing MCP tools', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to list MCP tools',
      error: error.message,
    });
  }
});

/**
 * Execute an MCP tool
 * AUTH: Requires valid Application API key
 */
router.post('/servers/:serverId/tools/:toolName/execute', mcpApiKeyAuth, async (req, res) => {
  try {
    const { serverId, toolName } = req.params;
    const { parameters } = req.body;
    const organizationId = req.user.organizationId;

    logger.info('MCP tool execution requested', {
      serverId,
      toolName,
      userId: req.user.userId,
      organizationId,
    });

    const result = await MCPServerService.executeTool(
      serverId,
      toolName,
      parameters || {},
      req.user,
      organizationId
    );

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    logger.error('Error executing MCP tool', {
      error: error.message,
      serverId: req.params.serverId,
      toolName: req.params.toolName,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to execute MCP tool',
      error: error.message,
    });
  }
});

/**
 * Regenerate tools for an MCP server
 */
router.post(
  '/servers/role/:roleId/regenerate',
  requireRoleManagementPermission('update'),
  async (req, res) => {
    try {
      const { roleId } = req.params;
      const organizationId = req.user.organizationId;
      const userId = req.user.userId;

      logger.info('Regenerating MCP tools', { roleId, userId });

      const result = await MCPServerService.regenerateTools(roleId, organizationId, userId);

      res.json({
        success: true,
        message: 'MCP tools regenerated successfully',
        result,
      });
    } catch (error) {
      logger.error('Error regenerating MCP tools', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to regenerate MCP tools',
        error: error.message,
      });
    }
  }
);

/**
 * Health check for MCP servers
 * AUTH: Requires valid Application API key
 */
router.get('/health', mcpApiKeyAuth, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const health = await MCPServerService.healthCheck(organizationId);

    res.json({
      success: true,
      servers: health,
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error('Error during MCP health check', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message,
    });
  }
});

/**
 * MCP Server Discovery Endpoint
 * Returns available MCP servers and their capabilities
 * Used by agents to discover what tools are available
 * AUTH: Requires valid Application API key
 */
router.get('/discover', mcpApiKeyAuth, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const servers = await MCPServerService.getOrganizationMCPServers(organizationId);

    const discovery = await Promise.all(
      servers.map(async server => {
        const tools = await MCPServerService.listTools(server.id, organizationId);

        return {
          serverId: server.id,
          serverUrl: server.serverUrl,
          roleName: server.role.name,
          roleDescription: server.role.description,
          database: server.role.service.database,
          databaseType: server.role.service.connection.dbType,
          toolsCount: tools.toolsCount,
          tools: tools.tools,
          status: server.status,
          lastHealthCheck: server.lastHealthCheck,
        };
      })
    );

    res.json({
      success: true,
      organizationId,
      serversCount: discovery.length,
      servers: discovery,
      discoveredAt: new Date(),
    });
  } catch (error) {
    logger.error('Error during MCP discovery', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'MCP discovery failed',
      error: error.message,
    });
  }
});

module.exports = router;
