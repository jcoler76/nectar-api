#!/usr/bin/env node

/**
 * MCP (Model Context Protocol) Server Entry Point
 *
 * This is a stdio-based MCP server that exposes database schemas and stored procedures
 * to AI coding assistants via the Model Context Protocol.
 *
 * CRITICAL: This file uses stdio transport, so stdout MUST be completely clean.
 * All logging goes to stderr. Any stdout writes will break the JSON-RPC protocol.
 *
 * Architecture:
 * - API Key → Application → Default Role → Permissions
 * - One MCP server instance per Application
 * - Each role's permissions define available MCP tools
 * - Cached schemas for instant responses
 *
 * Usage:
 *   node server/mcp/index.js --api-key YOUR_APPLICATION_API_KEY
 *
 * Or in Claude Desktop config:
 *   {
 *     "mcpServers": {
 *       "my-database": {
 *         "command": "node",
 *         "args": ["path/to/server/mcp/index.js", "--api-key", "YOUR_API_KEY"]
 *       }
 *     }
 *   }
 */

// CRITICAL: Set MCP_MODE before ANY other imports to suppress stdout logging
process.env.MCP_MODE = 'true';

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

// Create Prisma client for system-level operations
const prisma = new PrismaClient({
  log: ['error'], // Only log errors to stderr
});

// Import the adapter that converts Role to MCP tools
const RoleMCPAdapter = require('./RoleMCPAdapter');

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const apiKeyIndex = args.indexOf('--api-key');

  if (apiKeyIndex === -1 || !args[apiKeyIndex + 1]) {
    console.error('ERROR: --api-key parameter is required');
    console.error('Usage: node mcp/index.js --api-key YOUR_APPLICATION_API_KEY');
    process.exit(1);
  }

  return {
    apiKey: args[apiKeyIndex + 1],
  };
}

/**
 * SECURITY: Authenticate API key and load application context
 * @param {string} apiKey - Application API key (starts with 'mapi_')
 * @returns {Promise<Object>} Application with role and permissions
 */
async function authenticateApiKey(apiKey) {
  try {
    // Validate API key format
    if (!apiKey || !apiKey.startsWith('mapi_')) {
      throw new Error('Invalid API key format. Must start with "mapi_"');
    }

    // Extract prefix for efficient lookup
    const keyPrefix = apiKey.substring(0, 10); // mapi_ + first 5 chars

    console.error(`[MCP] Authenticating API key with prefix: ${keyPrefix.substring(0, 8)}...`);

    // SECURITY: Find application by prefix (indexed for performance)
    const application = await prisma.application.findFirst({
      where: {
        apiKeyPrefix: keyPrefix,
        isActive: true,
      },
      include: {
        defaultRole: {
          include: {
            service: {
              include: {
                connection: true,
              },
            },
          },
        },
        organization: true,
      },
    });

    if (!application) {
      throw new Error('Application not found or inactive');
    }

    // SECURITY: Verify API key hash with bcrypt (constant-time comparison)
    const isValid = await bcrypt.compare(apiKey, application.apiKeyHash);

    if (!isValid) {
      throw new Error('Invalid API key');
    }

    // Check application status
    if (!application.isActive) {
      throw new Error('Application is inactive');
    }

    // Check role
    if (!application.defaultRole) {
      throw new Error('No role assigned to this application');
    }

    if (!application.defaultRole.isActive) {
      throw new Error('Role is inactive');
    }

    // Check MCP enabled on role
    if (!application.defaultRole.mcpEnabled) {
      throw new Error(
        'MCP server not enabled for this role. Enable it in the Roles management page.'
      );
    }

    console.error(`[MCP] Authentication successful`);
    console.error(`[MCP] Application: ${application.name}`);
    console.error(`[MCP] Organization: ${application.organization.name}`);
    console.error(`[MCP] Role: ${application.defaultRole.name}`);
    console.error(`[MCP] Service: ${application.defaultRole.service?.name || 'N/A'}`);

    return application;
  } catch (error) {
    console.error(`[MCP] Authentication failed: ${error.message}`);
    throw error;
  }
}

/**
 * Convert JSON Schema to Zod Schema (raw shape for MCP SDK v1.17.0)
 *
 * CRITICAL: Must return ZodRawShape (plain object with Zod fields),
 * NOT z.object() wrapper. The SDK does the wrapping internally.
 */
function jsonSchemaToZodRawShape(jsonSchema) {
  if (!jsonSchema || !jsonSchema.properties) {
    return {};
  }

  const zodShape = {};
  const requiredFields = jsonSchema.required || [];

  for (const [key, prop] of Object.entries(jsonSchema.properties)) {
    let zodField;

    switch (prop.type) {
      case 'string':
        zodField = z.string();
        if (prop.enum && prop.enum.length > 0) {
          zodField = z.enum(prop.enum);
        }
        break;
      case 'number':
      case 'integer':
        zodField = z.number();
        if (prop.minimum !== undefined) zodField = zodField.min(prop.minimum);
        if (prop.maximum !== undefined) zodField = zodField.max(prop.maximum);
        break;
      case 'boolean':
        zodField = z.boolean();
        break;
      case 'array':
        zodField = z.array(z.any());
        break;
      case 'object':
        zodField = z.object({}).passthrough();
        break;
      default:
        zodField = z.any();
    }

    // Add description
    if (prop.description) {
      zodField = zodField.describe(prop.description);
    }

    // Handle optional/required and defaults
    const hasDefault = prop.default !== undefined;
    if (hasDefault) {
      zodField = zodField.default(prop.default);
    } else if (!requiredFields.includes(key)) {
      zodField = zodField.optional();
    }

    zodShape[key] = zodField;
  }

  return zodShape; // Return RAW SHAPE, not z.object(zodShape)
}

/**
 * Main function - Initialize and run MCP server
 */
async function main() {
  try {
    console.error('[MCP] Starting MCP server...');

    // Parse command line arguments
    const { apiKey } = parseArgs();

    // Authenticate and load application context
    const application = await authenticateApiKey(apiKey);

    // Initialize Role MCP Adapter
    console.error('[MCP] Initializing Role MCP Adapter...');
    const adapter = new RoleMCPAdapter(application, prisma);
    await adapter.initialize();

    // Get all MCP tools from the adapter
    const tools = adapter.getTools();
    console.error(`[MCP] Generated ${tools.length} tools from role permissions`);

    // Create MCP server
    console.error('[MCP] Creating MCP server instance...');
    const server = new McpServer({
      name: `nectar-mcp-${application.defaultRole.name}`,
      version: '1.0.0',
    });

    // Register all tools
    console.error('[MCP] Registering tools...');
    for (const tool of tools) {
      try {
        // Convert JSON Schema to Zod raw shape
        const zodRawShape = jsonSchemaToZodRawShape(tool.inputSchema);

        // Register tool with MCP server
        server.registerTool(
          tool.name,
          {
            description: tool.description,
            inputSchema: zodRawShape,
          },
          async args => {
            try {
              console.error(`[MCP] Executing tool: ${tool.name}`);
              console.error(`[MCP] Arguments:`, JSON.stringify(args, null, 2));

              // Execute tool through adapter
              const result = await adapter.executeTool(tool.name, args);

              console.error(`[MCP] Tool execution successful: ${tool.name}`);
              return result;
            } catch (error) {
              console.error(`[MCP] Tool execution failed: ${tool.name}`, error.message);
              throw error;
            }
          }
        );

        console.error(`[MCP]   ✓ Registered: ${tool.name}`);
      } catch (error) {
        console.error(`[MCP]   ✗ Failed to register ${tool.name}:`, error.message);
      }
    }

    console.error('[MCP] All tools registered successfully');

    // Set up stdio transport
    console.error('[MCP] Setting up stdio transport...');
    const transport = new StdioServerTransport();

    // Connect server to transport
    console.error('[MCP] Connecting server to transport...');
    await server.connect(transport);

    console.error('[MCP] 🔌 MCP server running and connected via stdio');
    console.error(
      '[MCP] Server is ready to receive requests from Claude Desktop or other MCP clients'
    );
    console.error('[MCP] ---');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.error('[MCP] Shutting down MCP server...');
      await server.close();
      await prisma.$disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.error('[MCP] Shutting down MCP server...');
      await server.close();
      await prisma.$disconnect();
      process.exit(0);
    });
  } catch (error) {
    console.error('[MCP] Fatal error:', error.message);
    console.error(error.stack);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Run the server
main();
