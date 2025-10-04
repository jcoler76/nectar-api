# Folder API Keys Implementation Summary

## Overview

Implemented folder-scoped API keys for granular MCP (Model Context Protocol) access control. This allows generating API keys that are restricted to querying specific folders, providing enhanced security for document storage and retrieval.

## Architecture

### Database Schema Changes

**File**: `server/prisma/schema.prisma`

Added `folderId` to `ApiKey` model:
```prisma
model ApiKey {
  // ... existing fields
  folderId         String?          // Optional: Scope API key to specific folder
  folder           FileFolder?      @relation(fields: [folderId], references: [id], onDelete: Cascade)

  @@index([folderId])
}
```

Added `apiKeys` relation to `FileFolder`:
```prisma
model FileFolder {
  // ... existing fields
  apiKeys         ApiKey[]         // API keys scoped to this folder
}
```

### RLS (Row Level Security) Compliance

✅ **Full RLS compliance maintained**:
- All operations use `prismaService.withTenantContext()`
- ApiKey table has RLS policies enforcing tenant isolation
- Migration includes RLS policy creation
- No bypass routes - all access controlled

**Migration**: `server/migrations/add-folder-api-keys.sql`

## Features Implemented

### 1. API Key Generation

**Endpoint**: `POST /api/folders/:folderId/mcp/api-key`

**Controller**: `server/controllers/folderController.js:generateFolderApiKey()`

**Features**:
- Generates cryptographically secure API keys (prefix: `nk_folder_`)
- Requires MCP to be enabled on folder
- Supports expiration (1y, 6m, 30d, 1w formats)
- Bcrypt hashing for secure storage (12 rounds)
- Returns key only once (security best practice)
- Tracks creation metadata

**Request**:
```json
{
  "name": "Production Query Key",
  "expiresIn": "1y"
}
```

**Response**:
```json
{
  "success": true,
  "apiKey": {
    "id": "...",
    "name": "Production Query Key",
    "keyPrefix": "nk_folde...a3f2",
    "folderId": "...",
    "permissions": ["folder:query", "folder:mcp"],
    "expiresAt": "2026-01-15T00:00:00.000Z"
  },
  "key": "nk_folder_abc123...xyz789",
  "warning": "Store this API key securely. It will not be shown again."
}
```

### 2. API Key Listing

**Endpoint**: `GET /api/folders/:folderId/mcp/api-keys`

**Controller**: `server/controllers/folderController.js:listFolderApiKeys()`

**Returns**:
- All API keys scoped to the folder
- Key metadata (name, prefix, expiration, last used)
- Creator information
- Active/inactive status

### 3. API Key Revocation

**Endpoint**: `DELETE /api/folders/:folderId/mcp/api-key/:keyId`

**Controller**: `server/controllers/folderController.js:revokeFolderApiKey()`

**Features**:
- Immediately deactivates API key
- Verifies key belongs to specified folder
- RLS-enforced tenant isolation

### 4. Folder API Key Authentication

**Middleware**: `server/middleware/folderApiKeyAuth.js`

**Security Features**:
- Validates API key format (`nk_folder_` prefix)
- Constant-time bcrypt comparison
- Expiration checking
- Folder scope validation
- MCP enablement verification
- RLS context setup
- Last-used timestamp tracking

**Usage**:
```javascript
const { folderApiKeyAuth, requireFolderPermission } = require('../middleware/folderApiKeyAuth');

router.post('/:folderId/query',
  folderApiKeyAuth,
  requireFolderPermission('folder:query'),
  folderController.queryFolder
);
```

### 5. Public Query API

**Endpoint**: `POST /api/public/folders/:folderId/query`

**Routes**: `server/routes/publicFolders.js`

**Authentication**: Folder API key required in Authorization header

**Request**:
```bash
curl -X POST https://api.example.com/api/public/folders/{folderId}/query \
  -H "Authorization: Bearer nk_folder_abc123...xyz789" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are the main topics discussed in these documents?",
    "options": {
      "topK": 5,
      "minSimilarity": 0.7
    }
  }'
```

**Response**:
```json
{
  "success": true,
  "answer": "The main topics discussed include...",
  "sources": [...],
  "metadata": {
    "relevanceScore": 0.89,
    "tokensUsed": 1234,
    "model": "gpt-4-turbo"
  }
}
```

## Security Implementation

### 1. Encryption & Hashing
- **API Keys**: Bcrypt hashed (12 rounds) before storage
- **Key Prefix**: Stored for lookup optimization
- **No Plaintext**: Keys never stored in plaintext

### 2. RLS Enforcement
- All database operations within `withTenantContext()`
- Automatic tenant filtering via PostgreSQL RLS
- Cross-tenant access impossible

### 3. Scope Validation
- Middleware verifies key's `folderId` matches requested folder
- Rejects mismatched folder access attempts
- Logs security violations

### 4. Permission Model
Folder API keys have restricted permissions:
- `folder:query` - Query folder documents
- `folder:mcp` - Access MCP status/metadata

### 5. Expiration Handling
- Optional expiration dates
- Middleware checks expiration before granting access
- Expired keys rejected with clear error message

## Integration Points

### Updated Files

1. **Schema**: `server/prisma/schema.prisma`
   - Added `folderId` to ApiKey
   - Added `apiKeys` relation to FileFolder

2. **Controller**: `server/controllers/folderController.js`
   - `generateFolderApiKey()` - Create folder-scoped keys
   - `listFolderApiKeys()` - List keys for folder
   - `revokeFolderApiKey()` - Revoke folder key
   - `queryFolder()` - Updated to track API key usage

3. **Routes**: `server/routes/folders.js`
   - POST `/:folderId/mcp/api-key` - Generate key
   - GET `/:folderId/mcp/api-keys` - List keys
   - DELETE `/:folderId/mcp/api-key/:keyId` - Revoke key

4. **Public Routes**: `server/routes/publicFolders.js` (NEW)
   - POST `/:folderId/query` - Public query endpoint
   - GET `/:folderId/status` - Public status endpoint

5. **Middleware**: `server/middleware/folderApiKeyAuth.js` (NEW)
   - `folderApiKeyAuth` - Main authentication middleware
   - `requireFolderPermission` - Permission checker

6. **Server Config**: `server/routes/index.js`
   - Mounted `/api/public/folders` routes
   - Added to CSRF exclusion list

## Usage Examples

### For Administrators

```javascript
// 1. Enable MCP on folder
POST /api/folders/{folderId}/mcp/enable
{
  "config": {
    "embedding_model": "text-embedding-3-small",
    "llm_model": "gpt-4-turbo"
  }
}

// 2. Generate API key for folder
POST /api/folders/{folderId}/mcp/api-key
{
  "name": "External Integration Key",
  "expiresIn": "1y"
}
// Response includes the actual key - save it!

// 3. List all keys for folder
GET /api/folders/{folderId}/mcp/api-keys

// 4. Revoke a key
DELETE /api/folders/{folderId}/mcp/api-key/{keyId}
```

### For API Consumers

```javascript
// Query folder documents
const response = await fetch(
  `https://api.example.com/api/public/folders/${folderId}/query`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${folderApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      question: 'Summarize the key findings',
      options: {
        topK: 10,
        model: 'gpt-4-turbo'
      }
    })
  }
);

const data = await response.json();
console.log(data.answer);
```

## Deployment Checklist

### 1. Database Migration

```bash
# Run migration with superuser privileges
psql $DATABASE_URL -f server/migrations/add-folder-api-keys.sql

# Verify migration
psql $DATABASE_URL -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ApiKey' AND column_name = 'folderId';"
```

### 2. Prisma Client

```bash
cd server
npx prisma generate
```

### 3. Server Restart

```bash
# Restart to load new routes and middleware
npm run pm2:restart
```

### 4. Verification

```bash
# Test key generation
curl -X POST http://localhost:3001/api/folders/{folderId}/mcp/api-key \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Key","expiresIn":"1y"}'

# Test public query
curl -X POST http://localhost:3001/api/public/folders/{folderId}/query \
  -H "Authorization: Bearer $FOLDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"question":"What is this about?"}'
```

## Security Considerations

### Best Practices

1. **Key Rotation**: Regularly rotate folder API keys
2. **Least Privilege**: Only grant `folder:query` permission
3. **Expiration**: Always set expiration dates
4. **Monitoring**: Track API key usage via `lastUsedAt`
5. **Revocation**: Immediately revoke compromised keys

### Audit Trail

All folder API key operations are logged:
- Key generation (creator, folder, permissions)
- Authentication attempts (success/failure)
- Query execution (apiKeyId tracked)
- Key revocation (who, when, why)

### RLS Guarantees

✅ **Impossible to bypass**:
- PostgreSQL enforces at kernel level
- All queries filtered by `organizationId`
- No application code can circumvent
- Cross-tenant access impossible

## Future Enhancements

### Potential Additions

1. **Rate Limiting**: Per-key rate limits
2. **IP Restrictions**: Whitelist IPs per key
3. **Usage Analytics**: Detailed query analytics per key
4. **Key Rotation**: Automated rotation workflow
5. **Webhook Integration**: Query result webhooks

## Testing

### Manual Testing

1. Generate folder API key via UI
2. Use key to query folder via public API
3. Verify RLS by attempting cross-tenant access
4. Test expiration by setting short expiry
5. Test revocation and verify access denied

### Automated Testing

```javascript
// TODO: Add to test suite
describe('Folder API Keys', () => {
  it('should generate folder-scoped API key');
  it('should reject API key for different folder');
  it('should respect RLS tenant isolation');
  it('should reject expired API keys');
  it('should track API key usage');
});
```

## References

- RLS Implementation: `docs/root-md/CLAUDE.md` (lines 845-1090)
- Existing API Keys: `server/routes/apiKeys.js`
- MCP Implementation: `docs/MCP_IMPLEMENTATION_SUMMARY.md`
- Folder Query Service: `server/services/mcp/FolderQueryService.js`
