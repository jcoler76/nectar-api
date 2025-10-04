# 🔒 Row-Level Security (RLS) Quick Reference Guide

## What is RLS?

Row-Level Security (RLS) is a PostgreSQL feature that automatically filters database queries based on the current user's organization. It prevents users from one organization from seeing or accessing data from another organization.

## ✅ CORRECT Patterns

### 1. Standard Database Query (Most Common)

```javascript
// ✅ CORRECT: Use withTenantContext for all organization-scoped queries
const services = await prismaService.withTenantContext(
  req.user.organizationId,
  async (tx) => {
    return await tx.service.findMany({
      where: { isActive: true },
      include: { connection: true }
    });
  }
);
```

### 2. API Route Handler

```javascript
// ✅ CORRECT: Extract organization from authenticated user
router.get('/api/services', authMiddleware, async (req, res) => {
  const organizationId = req.user.organizationId;
  
  if (!organizationId) {
    return res.status(401).json({ error: 'Organization context required' });
  }

  const services = await prismaService.withTenantContext(organizationId, async tx => {
    return await tx.service.findMany();
  });

  res.json({ success: true, data: services });
});
```

### 3. GraphQL Resolver

```javascript
// ✅ CORRECT: Use currentUser from context
const serviceResolvers = {
  Query: {
    services: async (_, { filters }, { user: currentUser }) => {
      if (!currentUser) throw new AuthenticationError('Authentication required');

      return await prismaService.withTenantContext(
        currentUser.organizationId,
        async tx => {
          return await tx.service.findMany({ where: filters });
        }
      );
    }
  }
};
```

### 4. Infrastructure Queries (Exceptions)

```javascript
// ✅ CORRECT: Use system client for infrastructure tables
// Only for tables WITHOUT organizationId (e.g., User, Membership)
const systemPrisma = prismaService.getSystemClient();
const user = await systemPrisma.user.findUnique({
  where: { email: email },
  include: { memberships: true }
});
```

### 5. API Key Authentication

```javascript
// ✅ CORRECT: Look up API key with system client, then switch to tenant context
const systemPrisma = prismaService.getSystemClient();
const apiKey = await systemPrisma.application.findFirst({
  where: { apiKeyHash: hashedKey }
});

if (!apiKey) throw new Error('Invalid API key');

// Now use tenant context for all data access
const data = await prismaService.withTenantContext(apiKey.organizationId, async tx => {
  return await tx.service.findMany();
});
```

---

## ❌ WRONG Patterns (DO NOT USE)

### ❌ Direct Prisma Client

```javascript
// ❌ WRONG: Direct Prisma client bypasses RLS
const prisma = new PrismaClient();
const services = await prisma.service.findMany(); // Returns 0 rows!
```

### ❌ Manual organizationId Filtering

```javascript
// ❌ WRONG: Manual filtering is redundant and can be forgotten
await tx.service.findMany({
  where: {
    organizationId: req.user.organizationId, // DON'T DO THIS
    isActive: true
  }
});

// ✅ CORRECT: RLS handles organizationId automatically
await tx.service.findMany({
  where: { isActive: true }
});
```

### ❌ Using getClient() for Tenant Data

```javascript
// ❌ WRONG: getClient() may not enforce RLS properly
const prisma = prismaService.getClient();
await prisma.service.findMany(); // Potentially unsafe
```

### ❌ Null Organization Context

```javascript
// ❌ WRONG: Passing null bypasses RLS
await prismaService.withTenantContext(null, async tx => {
  return await tx.service.findMany(); // Returns 0 rows
});
```

---

## 🛡️ Security Checklist

Before deploying any new feature:

- [ ] All database queries use `withTenantContext`
- [ ] Organization ID is validated before queries
- [ ] No direct `new PrismaClient()` usage
- [ ] API endpoints require authentication
- [ ] No manual `organizationId` filtering in where clauses
- [ ] Infrastructure queries use `getSystemClient()` appropriately
- [ ] Error messages don't leak organization data

---

## 📋 Tables with RLS Enabled

These tables have Row-Level Security policies:

### Core Business Tables
- ✅ Service
- ✅ DatabaseConnection
- ✅ Application
- ✅ Role
- ✅ Workflow
- ✅ WorkflowExecution (after migration)
- ✅ Endpoint

### File Storage
- ✅ FileStorage
- ✅ FileFolder
- ✅ FileEmbedding
- ✅ ApiKey

### MCP & AI
- ✅ MCPServerInstance
- ✅ AgentExecution
- ✅ AgentMemory

### Logging & Audit
- ✅ ApiActivityLog
- ✅ AuditLog
- ✅ TermsAcceptance

### Infrastructure (NO RLS - Global)
- ❌ User (accessed via system client)
- ❌ Organization (accessed via system client)
- ❌ Membership (accessed via system client)

---

## 🔍 Testing RLS

### Test 1: Verify Organization Isolation

```javascript
// Create test in server/tests/rls.test.js
test('should isolate services by organization', async () => {
  const org1Services = await prismaService.withTenantContext('org-1-uuid', async tx => {
    return await tx.service.findMany();
  });

  const org2Services = await prismaService.withTenantContext('org-2-uuid', async tx => {
    return await tx.service.findMany();
  });

  // Verify no overlap
  const org1Ids = org1Services.map(s => s.id);
  const org2Ids = org2Services.map(s => s.id);
  const overlap = org1Ids.filter(id => org2Ids.includes(id));
  
  expect(overlap).toHaveLength(0);
});
```

### Test 2: Verify RLS Blocks Unauthorized Access

```javascript
test('should return 0 rows without organization context', async () => {
  const directPrisma = new PrismaClient({
    datasources: {
      db: { url: process.env.DATABASE_URL }
    }
  });

  const services = await directPrisma.service.findMany();
  expect(services).toHaveLength(0); // RLS blocks access
});
```

---

## 🚨 Common Mistakes & Solutions

### Mistake 1: Forgetting Authentication

```javascript
// ❌ WRONG: No auth check
router.get('/api/services', async (req, res) => {
  const services = await prismaService.withTenantContext(
    req.user?.organizationId, // Might be undefined!
    async tx => tx.service.findMany()
  );
});

// ✅ CORRECT: Validate auth first
router.get('/api/services', authMiddleware, async (req, res) => {
  if (!req.user?.organizationId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const services = await prismaService.withTenantContext(
    req.user.organizationId,
    async tx => tx.service.findMany()
  );
});
```

### Mistake 2: Using Wrong Client for Infrastructure

```javascript
// ❌ WRONG: Using tenant context for User table
await prismaService.withTenantContext(orgId, async tx => {
  return await tx.user.findUnique({ where: { email } });
  // User table has no organizationId, returns null
});

// ✅ CORRECT: Use system client for infrastructure tables
const systemPrisma = prismaService.getSystemClient();
const user = await systemPrisma.user.findUnique({
  where: { email },
  include: { memberships: true }
});
```

### Mistake 3: Forgetting to Return Data

```javascript
// ❌ WRONG: Forgetting to return
await prismaService.withTenantContext(orgId, async tx => {
  await tx.service.findMany(); // Missing return!
});

// ✅ CORRECT: Always return data
const services = await prismaService.withTenantContext(orgId, async tx => {
  return await tx.service.findMany();
});
```

---

## 📞 Need Help?

If you're unsure whether to use RLS for a specific query:

1. **Does the table have an `organizationId` field?**
   - YES → Use `withTenantContext`
   - NO → Use `getSystemClient`

2. **Is this user/organization data?**
   - YES → Use `withTenantContext`
   - NO → Use `getSystemClient`

3. **When in doubt**: Use `withTenantContext`. It's safe even if not strictly required.

---

## 🎓 Additional Resources

- Main Documentation: `docs/MCP_RLS_SECURITY.md`
- Claude Guidelines: `docs/root-md/CLAUDE.md`
- Migration Scripts: `server/migrations/enable-rls-*.sql`
- Verification Script: `server/scripts/verify-rls-coverage.sql`

---

**Remember**: RLS is your last line of defense against data leakage. Always use `withTenantContext` for tenant-specific data! 🛡️

