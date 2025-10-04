# MCP Server User Guide

## What are MCP Servers?

**MCP (Model Context Protocol) Servers** transform your database permissions into AI-usable tools that autonomous agents can leverage to explore, design, and implement APIs automatically.

Think of MCP servers as a bridge between your databases and AI agents—enabling them to understand your data structures, query information, and even make changes within the permissions you define.

## Key Benefits

✅ **Autonomous Database Operations** - AI agents can explore and interact with your databases without manual intervention

✅ **Permission-Based Security** - MCP tools are automatically generated from role permissions, ensuring agents can only access what you authorize

✅ **Multi-Database Support** - Works across 800+ database types seamlessly (SQL Server, PostgreSQL, MySQL, Oracle, and more)

✅ **Natural Language Interface** - Agents understand plain English requests and translate them into database operations

✅ **Self-Learning** - The system improves over time by learning from successful implementations

## Getting Started

### Step 1: Enable MCP on a Role

1. Navigate to **Roles** in the menu
2. Find the role you want to enable for MCP (or create a new one)
3. Configure the role's permissions to include the database objects (tables, views, procedures) you want accessible
4. Toggle the **MCP Server** switch to enabled
5. The system will automatically generate MCP tools based on the role's permissions

### Step 2: Create an Application

1. Navigate to **Applications** in the menu
2. Click **Add Application**
3. Provide a name and description
4. Select the MCP-enabled role as the **Default Role**
5. Save the application
6. Copy the generated API key (starts with `mapi_`)

### Step 3: Get the MCP Endpoint

1. Return to **Roles** in the menu
2. Find your MCP-enabled role
3. Click the **MCP Endpoint** action
4. Copy the base endpoint URL and review the authentication instructions
5. Note that you'll need your Application's API key for authentication

### Step 4: Connect Your AI Agent

Configure your autonomous agent with:
- **Endpoint**: The MCP base URL (e.g., `https://your-domain.com/api/mcp`)
- **Authentication**: Your Application's API key in the Authorization header
- **Discovery**: Point the agent to `/api/mcp/discover` to see available tools

## Available MCP Endpoints

### Discovery Endpoint
```bash
GET /api/mcp/discover
```
Returns all available MCP servers and their capabilities. This is the starting point for autonomous agents.

**Example:**
```bash
curl -X GET "https://your-domain.com/api/mcp/discover" \
  -H "Authorization: Bearer mapi_your_application_key"
```

### List Tools
```bash
GET /api/mcp/servers/:serverId/tools
```
Lists all tools available for a specific MCP server.

### Execute Tool
```bash
POST /api/mcp/servers/:serverId/tools/:toolName/execute
```
Executes a specific MCP tool with provided parameters.

**Example:**
```bash
curl -X POST "https://your-domain.com/api/mcp/servers/SERVER_ID/tools/query_Customers/execute" \
  -H "Authorization: Bearer mapi_your_application_key" \
  -H "Content-Type: application/json" \
  -d '{
    "parameters": {
      "filters": { "country": "USA" },
      "limit": 10,
      "orderBy": "name"
    }
  }'
```

### Health Check
```bash
GET /api/mcp/health
```
Checks the health status of all MCP servers.

## Generated MCP Tools

Based on your role's permissions, the system automatically generates different types of tools:

### Table Tools
- **query_[TableName]** - Query data with filtering, pagination, and sorting
- **insert_[TableName]** - Insert new records
- **update_[TableName]** - Update existing records
- **delete_[TableName]** - Delete records

### View Tools
- **query_[ViewName]** - Query view data
- **analyze_[ViewName]** - Get metadata and schema information

### Stored Procedure Tools
- **execute_[ProcedureName]** - Execute procedure with parameters
- **analyze_[ProcedureName]** - Get procedure signature and documentation

## Example Use Cases

### 1. Data Exploration
An AI agent can automatically explore your database structure, understand relationships, and provide insights without writing a single query.

### 2. API Development
Describe your API requirements in plain English, and autonomous agents can design and implement endpoints using your existing database schema.

### 3. Automated Reporting
Agents can generate complex reports by querying multiple tables, joining data, and formatting results based on natural language requests.

### 4. Data Migration
Describe the data transformation you need, and agents can design and execute migration scripts safely within defined permissions.

## Security & Permissions

### Multi-Tenant Isolation
All MCP operations are protected by Row Level Security (RLS), ensuring complete tenant isolation:
- ✅ Agents can only access data from their own organization
- ✅ Learning patterns never leak between organizations
- ✅ Tool execution is scoped to correct tenant
- ✅ Enforced at PostgreSQL kernel level

### Permission Control
- MCP tools are automatically generated from role permissions
- Agents can only perform actions explicitly allowed in the role
- No privilege escalation possible
- All operations are audited and logged

### API Key Security
- Application API keys are hashed and encrypted
- Keys are never stored in plain text
- Invalid keys are immediately rejected
- Rate limiting prevents brute force attempts

## Best Practices

### 1. Start with Read-Only Roles
When first experimenting with MCP, create roles with only SELECT permissions to ensure agents can explore safely.

### 2. Use Descriptive Role Names
Name your MCP-enabled roles clearly (e.g., "Customer Analytics MCP", "Order Management MCP") to understand their purpose.

### 3. Limit Scope Initially
Don't grant access to all tables at once. Start with a subset of tables and expand as you become comfortable.

### 4. Monitor Agent Activity
Review the agent execution logs regularly to understand how agents are using your data and identify optimization opportunities.

### 5. Rotate API Keys Periodically
Regenerate Application API keys on a regular schedule for enhanced security.

### 6. Document Your Databases
Well-documented tables, views, and procedures help agents understand your data model better, leading to more accurate operations.

## Troubleshooting

### Issue: "Invalid API key"
**Solution**: Ensure you're using the Application's API key (starts with `mapi_`), not a personal access token. Copy the key from the Applications page.

### Issue: "MCP server not enabled for this role"
**Solution**: Navigate to Roles, find your role, and toggle the "MCP Server" switch to enabled. The system will generate tools automatically.

### Issue: "No tools available"
**Solution**: Verify the role has permissions configured. MCP tools are generated from role permissions, so a role without permissions will have no tools.

### Issue: "Access denied"
**Solution**: Check that the Application's default role has the necessary permissions for the operation you're attempting.

### Issue: Agent can't find specific tables
**Solution**: Refresh the database schema (in Services page) to ensure the latest database structure is reflected in the MCP tools.

## Advanced Configuration

### Custom Tool Parameters
MCP tools support complex filtering with MongoDB-style operators:

```json
{
  "filters": {
    "age": { "$gte": 18, "$lte": 65 },
    "country": { "$in": ["USA", "Canada"] },
    "status": { "$ne": "inactive" }
  },
  "limit": 50,
  "offset": 0,
  "orderBy": "created_at DESC",
  "columns": ["id", "name", "email"]
}
```

### Pagination
All query tools support pagination:
- `limit`: Maximum number of records to return
- `offset`: Number of records to skip

### Sorting
Use `orderBy` parameter with column name and direction:
- `"orderBy": "name ASC"`
- `"orderBy": "created_at DESC"`

## Getting Help

### Documentation
- Architecture: `docs/MCP_AUTONOMOUS_AGENTS_ARCHITECTURE.md`
- Security: `docs/MCP_RLS_SECURITY.md`
- Implementation: `docs/MCP_IMPLEMENTATION_SUMMARY.md`

### Support
If you encounter issues not covered in this guide:
1. Check the application logs for detailed error messages
2. Review the role permissions to ensure they're configured correctly
3. Verify the Application is active and using the correct role
4. Contact support with relevant error messages and steps to reproduce

## Frequently Asked Questions

**Q: Can multiple applications use the same MCP-enabled role?**
A: Yes! Multiple applications can share the same role, each with their own API key.

**Q: What happens if I disable MCP on a role?**
A: The MCP server will be deactivated, and agents using that role's applications will no longer be able to access MCP tools.

**Q: Can agents modify my database structure?**
A: No. MCP tools only allow data operations (SELECT, INSERT, UPDATE, DELETE) based on role permissions. Schema changes (DDL) are not supported.

**Q: How do I limit which tables an agent can access?**
A: Configure the role's permissions to include only the specific tables you want accessible. MCP tools are automatically generated from these permissions.

**Q: Are MCP operations logged?**
A: Yes, all MCP tool executions are logged with full audit trails including user, organization, and operation details.

**Q: Can I use MCP with external AI services like ChatGPT or Claude?**
A: Yes! MCP follows the Model Context Protocol standard, making it compatible with any AI system that supports MCP.

## Next Steps

Now that you understand MCP servers, you can:

1. **Create Your First MCP-Enabled Role** - Start with a read-only role for safe exploration
2. **Connect an AI Agent** - Use Claude, GPT, or any MCP-compatible agent
3. **Explore the Marketing Guide** - Learn about the competitive advantages MCP provides
4. **Review the Architecture** - Understand how autonomous agents can transform your workflow

---

**Ready to revolutionize how AI interacts with your databases?** Enable MCP on a role today and experience autonomous database operations!
