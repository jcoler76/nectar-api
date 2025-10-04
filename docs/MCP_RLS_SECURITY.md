# MCP Server & Autonomous Agents - RLS Security

## Critical Security Principle

**ALL MCP and Agent operations MUST use RLS (Row Level Security) for tenant isolation.**

This ensures that:
- Agents cannot access other organizations' data
- MCP servers are completely isolated per tenant
- Learning/memory is never shared between organizations
- Tool execution is scoped to the correct tenant

## RLS Architecture

### Database Layer (PostgreSQL)

RLS policies enforce organizationId filtering at the **database kernel level**:

```sql
-- Example: MCPServerInstance RLS Policy
CREATE POLICY tenant_isolation ON "MCPServerInstance"
FOR ALL
USING ("organizationId" = current_organization_id())
WITH CHECK ("organizationId" = current_organization_id());
```

When `current_organization_id()` session variable is set, **ALL queries** are automatically filtered:

```javascript
// This query:
await tx.mCPServerInstance.findMany({ where: { status: 'ACTIVE' } });

// PostgreSQL executes:
SELECT * FROM "MCPServerInstance"
WHERE status = 'ACTIVE'
  AND "organizationId" = current_organization_id(); -- Added by RLS!
```

### Application Layer (Prisma)

**CORRECT Pattern** - Use `withTenantContext`:

```javascript
// ✅ CORRECT - RLS enforces tenant isolation
const servers = await prismaService.withTenantContext(organizationId, async tx => {
  return await tx.mCPServerInstance.findMany({
    where: {
      status: 'ACTIVE'  // Only filter on business logic
    }
    // RLS automatically adds: AND organizationId = current_organization_id()
  });
});
```

**INCORRECT Patterns**:

```javascript
// ❌ WRONG - Redundant organizationId filter
await tx.mCPServerInstance.findMany({
  where: {
    organizationId,  // DON'T DO THIS - RLS already filters!
    status: 'ACTIVE'
  }
});

// ❌ WRONG - No RLS context
const prisma = new PrismaClient();
await prisma.mCPServerInstance.findMany(); // Returns 0 rows!

// ❌ WRONG - Old pattern
const client = prismaService.getRLSClient(); // Deprecated
```

## RLS-Protected Tables

### MCP Server Tables

1. **MCPServerInstance**
   - Policy: `tenant_isolation`
   - Field: `organizationId`
   - RLS: ENABLED + FORCED

2. **Role** (existing)
   - Policy: `tenant_isolation`
   - Field: `organizationId`
   - RLS: ENABLED + FORCED
   - **Critical**: MCP tools are generated from role permissions

### Agent Tables

3. **AgentExecution**
   - Policy: `tenant_isolation`
   - Field: `organizationId`
   - RLS: ENABLED + FORCED
   - **Critical**: Stores agent thoughts, discoveries, and results

4. **AgentMemory**
   - Policy: `tenant_isolation`
   - Field: `organizationId`
   - RLS: ENABLED + FORCED
   - **MOST CRITICAL**: Learning must NEVER leak between tenants

## Security Guarantees

### What RLS Prevents

✅ **Cross-tenant data access** - Impossible to query another org's data
✅ **Tool execution leakage** - MCP tools only work on own org's databases
✅ **Memory contamination** - Agent learning stays within organization
✅ **Execution log exposure** - Other orgs can't see your agent runs

### Defense-in-Depth Layers

1. **RLS Policies** (Database kernel) - Primary defense
2. **withTenantContext** (Application) - Ensures RLS variable is set
3. **Authentication Middleware** - Verifies user's organizationId
4. **API Authorization** - Role-based access control

## MCP-Specific RLS Patterns

### Tool Execution Security

When an agent executes an MCP tool:

```javascript
// 1. User authenticated → req.user.organizationId
// 2. RLS context set
await prismaService.withTenantContext(req.user.organizationId, async tx => {

  // 3. Get MCP server - RLS blocks if serverId from different org
  const server = await tx.mCPServerInstance.findUnique({
    where: { id: serverId }  // If wrong org, returns null
  });

  if (!server) {
    throw new Error('MCP server not found'); // Could be wrong org or truly missing
  }

  // 4. Execute tool - operates on database defined in server.role.service
  // 5. Results isolated to this organization only
});
```

### Learning System Security

Agent memory must respect RLS:

```javascript
// ✅ CORRECT - Memory isolated per organization
await prismaService.withTenantContext(organizationId, async tx => {

  // Store learning
  await tx.agentMemory.create({
    data: {
      organizationId,  // Required in data for creation
      type: 'SUCCESS_PATTERN',
      content: pattern,
      embedding: vectorEmbedding
    }
  });

  // Retrieve memories - only from this organization
  const memories = await tx.agentMemory.findMany({
    where: {
      type: 'SUCCESS_PATTERN'
      // RLS adds: AND organizationId = current_organization_id()
    }
  });
});
```

### Vector Database Integration

When using external vector DBs (Qdrant, Pinecone):

```javascript
// Store organizationId as metadata
await vectorDB.upsert({
  id: memoryId,
  vector: embedding,
  metadata: {
    organizationId,  // CRITICAL: Must tag all vectors
    type: 'SUCCESS_PATTERN'
  }
});

// Always filter by organizationId when querying
const results = await vectorDB.search({
  vector: queryEmbedding,
  filter: {
    organizationId: currentOrganizationId  // Explicit filter required
  }
});
```

**Important**: External vector databases don't have RLS, so **explicit filtering is required**.

## Testing RLS Compliance

### Verification Script

```bash
# Run RLS compliance tests
node server/scripts/test-mcp-rls.js
```

### Test Scenarios

1. **Cross-tenant access attempt**
   - User from Org A tries to access Org B's MCP server
   - Expected: `null` returned, no error (RLS blocks silently)

2. **Tool execution isolation**
   - Agent from Org A executes tool
   - Expected: Only sees data from Org A's database

3. **Memory isolation**
   - Agent from Org A queries memories
   - Expected: Only retrieves Org A's learning patterns

4. **Server listing**
   - User lists MCP servers
   - Expected: Only sees own organization's servers

### Manual Verification

```sql
-- Check RLS is enabled on all MCP tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('MCPServerInstance', 'AgentExecution', 'AgentMemory');
-- All should show: rowsecurity = true

-- Verify policies use current_organization_id() function
SELECT tablename, policyname, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'MCP%' OR tablename LIKE 'Agent%';
-- All should use: current_organization_id() NOT current_setting()
```

## Migration Checklist

When deploying RLS for MCP/Agents:

- [ ] Run database migration: `server/migrations/enable-rls-mcp-agents.sql`
- [ ] Verify RLS policies exist on all tables
- [ ] Test cross-tenant access (should fail silently)
- [ ] Verify withTenantContext used in all services
- [ ] Test agent execution with multiple orgs
- [ ] Verify memory isolation with learning tests
- [ ] Document any RLS exceptions (should be none)

## Common Pitfalls

### ❌ Forgetting withTenantContext

```javascript
// WRONG - No RLS context
const servers = await prisma.mCPServerInstance.findMany();
// Returns: [] (empty) because no organizationId set
```

**Solution**: Always use `withTenantContext`

### ❌ Adding Redundant Filters

```javascript
// WRONG - Redundant organizationId filter
where: {
  organizationId,  // RLS already does this!
  status: 'ACTIVE'
}
```

**Solution**: Let RLS handle organizationId filtering

### ❌ Wrong Session Variable Name

```javascript
// WRONG - Variable name mismatch
SELECT set_config('app.organization_id', ...)  // Missing 'current_'
```

**Solution**: Must use `app.current_organization_id` everywhere

### ❌ Bypassing RLS with Direct Queries

```javascript
// WRONG - Raw query bypasses Prisma
await prisma.$executeRaw`SELECT * FROM "MCPServerInstance"`
// Still enforces RLS, but harder to debug
```

**Solution**: Use Prisma queries, not raw SQL

## Emergency Procedures

### If RLS is Broken

**Symptoms**:
- Queries return 0 results despite data existing
- New records can't be created
- Null returned when data should exist

**Diagnosis**:
```bash
# Check RLS function
node server/check-rls-function.js

# Find broken policies
node server/find-broken-rls-policies.js
```

**Fix**:
```bash
# Repair all RLS policies
node server/fix-all-rls-policies.js
```

### Temporary RLS Disable (DANGEROUS)

**Only for emergency debugging - NEVER in production:**

```sql
-- Disable RLS (superuser only)
ALTER TABLE "MCPServerInstance" DISABLE ROW LEVEL SECURITY;

-- Always re-enable immediately
ALTER TABLE "MCPServerInstance" ENABLE ROW LEVEL SECURITY;
```

## References

- Main RLS Documentation: `docs/root-md/CLAUDE.md` (lines 845-1090)
- RLS Migration Script: `server/migrations/enable-rls.sql`
- MCP RLS Migration: `server/migrations/enable-rls-mcp-agents.sql`
- Prisma Service: `server/services/prismaService.js` (withTenantContext method)
