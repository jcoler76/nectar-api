/**
 * Role MCP Adapter
 *
 * Bridges the gap between:
 * - MCP stdio server (this adapter)
 * - Existing MCPServerGenerator (tool generation)
 * - Existing MCPToolExecutor (tool execution)
 *
 * This adapter:
 * 1. Takes an Application (with role, permissions, service, connection)
 * 2. Generates MCP tools using MCPServerGenerator
 * 3. Executes tools using MCPToolExecutor
 * 4. Converts Prisma/Postgres data for MCP protocol
 */

const MCPServerGenerator = require('../services/mcp/MCPServerGenerator');
const MCPToolExecutor = require('../services/mcp/MCPToolExecutor');

class RoleMCPAdapter {
  /**
   * @param {Object} application - Authenticated application with role, organization
   * @param {PrismaClient} prisma - Prisma client instance
   */
  constructor(application, prisma) {
    this.application = application;
    this.role = application.defaultRole;
    this.organization = application.organization;
    this.prisma = prisma;
    this.tools = [];
    this.toolsMap = new Map();
  }

  /**
   * Initialize the adapter - generate tools from role permissions
   */
  async initialize() {
    try {
      console.error('[RoleMCPAdapter] Initializing adapter for role:', this.role.name);
      console.error('[RoleMCPAdapter] Organization:', this.organization.name);

      // Convert Prisma objects to plain objects (avoid serialization issues)
      const plainRole = this.toPlainObject(this.role);
      const plainService = this.role.service ? this.toPlainObject(this.role.service) : null;
      const plainConnection = this.role.service?.connection
        ? this.toPlainObject(this.role.service.connection)
        : null;

      if (!plainService) {
        console.error(
          '[RoleMCPAdapter] WARNING: Role has no service, limited tools will be generated'
        );
      }

      if (!plainConnection) {
        console.error(
          '[RoleMCPAdapter] WARNING: Service has no connection, database tools will not be available'
        );
      }

      // Generate tools using existing MCPServerGenerator
      console.error('[RoleMCPAdapter] Generating MCP tools from permissions...');
      this.tools = await MCPServerGenerator.generateToolsForRole(
        plainRole,
        plainService,
        plainConnection,
        this.organization.id
      );

      // Create tools map for quick lookup
      for (const tool of this.tools) {
        this.toolsMap.set(tool.name, tool);
      }

      console.error(`[RoleMCPAdapter] ✓ Initialized with ${this.tools.length} tools`);

      return this;
    } catch (error) {
      console.error('[RoleMCPAdapter] Initialization failed:', error.message);
      console.error(error.stack);
      throw error;
    }
  }

  /**
   * Get all tools generated for this role
   */
  getTools() {
    return this.tools;
  }

  /**
   * Get a specific tool by name
   */
  getTool(toolName) {
    return this.toolsMap.get(toolName);
  }

  /**
   * Execute a tool by name with given parameters
   * @param {string} toolName - Name of the tool to execute
   * @param {Object} parameters - Tool parameters
   * @returns {Promise<Object>} Tool execution result
   */
  async executeTool(toolName, parameters) {
    try {
      const tool = this.getTool(toolName);

      if (!tool) {
        throw new Error(`Tool not found: ${toolName}`);
      }

      // Build execution context
      const context = {
        server: {
          id: `mcp-${this.role.id}`,
          roleId: this.role.id,
          organizationId: this.organization.id,
        },
        role: this.toPlainObject(this.role),
        service: this.role.service ? this.toPlainObject(this.role.service) : null,
        connection: this.role.service?.connection
          ? this.toPlainObject(this.role.service.connection)
          : null,
        user: {
          userId: this.application.createdBy,
          organizationId: this.organization.id,
          applicationId: this.application.id,
        },
        organizationId: this.organization.id,
      };

      // Execute using existing MCPToolExecutor
      const result = await MCPToolExecutor.executeTool(tool, parameters, context);

      // Format result for MCP protocol
      return this.formatMCPResult(result);
    } catch (error) {
      console.error(`[RoleMCPAdapter] Tool execution error (${toolName}):`, error.message);
      throw error;
    }
  }

  /**
   * Convert Prisma/Mongoose objects to plain JavaScript objects
   * This prevents serialization issues with proxies
   */
  toPlainObject(obj) {
    if (!obj) return null;

    // Handle Prisma objects
    if (typeof obj === 'object') {
      return JSON.parse(JSON.stringify(obj));
    }

    return obj;
  }

  /**
   * Format result for MCP protocol response
   * Ensures result is JSON-serializable and follows MCP conventions
   */
  formatMCPResult(result) {
    if (!result) {
      return { content: [{ type: 'text', text: 'No result' }] };
    }

    // If result already has content array, return as-is
    if (result.content && Array.isArray(result.content)) {
      return result;
    }

    // Format as MCP content
    return {
      content: [
        {
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  /**
   * Get role statistics for debugging
   */
  getStats() {
    const permissions = Array.isArray(this.role.permissions)
      ? this.role.permissions
      : JSON.parse(this.role.permissions || '[]');

    return {
      roleName: this.role.name,
      roleId: this.role.id,
      organizationName: this.organization.name,
      organizationId: this.organization.id,
      applicationName: this.application.name,
      applicationId: this.application.id,
      serviceName: this.role.service?.name || 'N/A',
      permissionsCount: permissions.length,
      toolsCount: this.tools.length,
      mcpEnabled: this.role.mcpEnabled,
      tools: this.tools.map(t => ({
        name: t.name,
        description: t.description,
        handler: t.handler,
      })),
    };
  }
}

module.exports = RoleMCPAdapter;
