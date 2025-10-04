# File Storage MCP UI Workflow

## Overview

This document outlines how users will enable MCP (Model Context Protocol) on folders from the File Storage page and generate folder-scoped API keys for secure document querying.

## Current Implementation Status

### ✅ Backend Complete
- Folder MCP enable/disable endpoints
- Folder API key generation/management
- Public query API with folder API key authentication
- RLS-compliant security throughout

### 🚧 Frontend Needed
The File Storage page UI needs to be updated to expose MCP functionality.

## User Workflow

### Step 1: Navigate to File Storage
```
Main Menu → File Storage
```

User sees their folder hierarchy with files.

### Step 2: Enable MCP on a Folder

**Current State**: Users can create folders, upload files, organize hierarchy

**Needed Addition**: Add MCP toggle to folder actions

#### UI Design (Proposed)

**Folder Context Menu** (right-click or three-dot menu):
```
┌─────────────────────────────┐
│ 📁 My Documents            │
├─────────────────────────────┤
│ ✏️  Rename                  │
│ 📤 Move                     │
│ 🗑️  Delete                  │
├─────────────────────────────┤
│ 🤖 Enable MCP Server        │ ← NEW
│ 🔑 Manage API Keys          │ ← NEW (only if MCP enabled)
└─────────────────────────────┘
```

**Alternative: Folder Details Panel**
```
┌──────────────────────────────────────┐
│ 📁 My Documents                     │
│                                      │
│ Path: /My Documents                  │
│ Files: 45                            │
│ Created: 2025-01-15                  │
│                                      │
│ ┌──────────────────────────────────┐│
│ │ MCP Server                       ││
│ │                                  ││
│ │ [Toggle: OFF]                    ││
│ │                                  ││
│ │ Enable to allow AI agents to     ││
│ │ query documents in this folder   ││
│ └──────────────────────────────────┘│
└──────────────────────────────────────┘
```

### Step 3: Configure MCP Settings

When user clicks "Enable MCP Server", show configuration dialog:

```
┌────────────────────────────────────────────────┐
│ Enable MCP on "My Documents"                   │
├────────────────────────────────────────────────┤
│                                                │
│ Embedding Model:                               │
│ ┌────────────────────────────────────────────┐ │
│ │ text-embedding-3-small            ▼        │ │
│ └────────────────────────────────────────────┘ │
│                                                │
│ LLM Model:                                     │
│ ┌────────────────────────────────────────────┐ │
│ │ gpt-4-turbo                       ▼        │ │
│ └────────────────────────────────────────────┘ │
│                                                │
│ Chunk Size: [1000]  Overlap: [200]            │
│                                                │
│ ⚠️  Indexing will process all files in this   │
│    folder and may incur OpenAI API costs.     │
│                                                │
│                    [Cancel]  [Enable MCP]      │
└────────────────────────────────────────────────┘
```

**API Call**:
```javascript
POST /api/folders/{folderId}/mcp/enable
{
  "config": {
    "embedding_model": "text-embedding-3-small",
    "llm_model": "gpt-4-turbo",
    "chunk_size": 1000,
    "chunk_overlap": 200
  }
}
```

### Step 4: Monitor Indexing Progress

After enabling, show indexing status:

```
┌──────────────────────────────────────┐
│ 📁 My Documents                     │
│                                      │
│ MCP Server: ENABLED                  │
│                                      │
│ ┌──────────────────────────────────┐│
│ │ 🔄 Indexing in progress...       ││
│ │                                  ││
│ │ ████████░░░░░░░░░░  45%          ││
│ │                                  ││
│ │ 23 of 51 files indexed           ││
│ │ Est. completion: 5 minutes       ││
│ └──────────────────────────────────┘│
│                                      │
│ [View Status Details]                │
└──────────────────────────────────────┘
```

**API Call** (polling every 5 seconds):
```javascript
GET /api/folders/{folderId}/mcp/status
```

**Response**:
```json
{
  "success": true,
  "status": {
    "mcpEnabled": true,
    "indexingStatus": "processing",
    "embeddingCount": 234,
    "fileCount": 51,
    "lastIndexedAt": null,
    "activeJobs": 1
  }
}
```

### Step 5: Generate Folder API Key

Once indexing is complete, user can generate API keys:

**Click "Manage API Keys"** → Opens dialog:

```
┌────────────────────────────────────────────────────┐
│ API Keys for "My Documents"                        │
├────────────────────────────────────────────────────┤
│                                                    │
│ Current API Keys:                                  │
│                                                    │
│ ┌────────────────────────────────────────────────┐│
│ │ Production Key                                 ││
│ │ nk_folde...a3f2                                ││
│ │ Created: 2025-01-15  Last used: 2 hours ago    ││
│ │ Expires: 2026-01-15                       [⊗]  ││
│ └────────────────────────────────────────────────┘│
│                                                    │
│ ┌────────────────────────────────────────────────┐│
│ │ Development Key                                ││
│ │ nk_folde...x9z1                                ││
│ │ Created: 2025-01-10  Last used: Never          ││
│ │ Expires: 2025-07-10                       [⊗]  ││
│ └────────────────────────────────────────────────┘│
│                                                    │
│                              [+ Generate New Key]  │
└────────────────────────────────────────────────────┘
```

**Click "+ Generate New Key"** → Show creation form:

```
┌────────────────────────────────────────────────────┐
│ Generate API Key                                   │
├────────────────────────────────────────────────────┤
│                                                    │
│ Key Name:                                          │
│ ┌────────────────────────────────────────────────┐│
│ │ External Integration Key                       ││
│ └────────────────────────────────────────────────┘│
│                                                    │
│ Expiration:                                        │
│ ┌────────────────────────────────────────────────┐│
│ │ 1 year                             ▼           ││
│ └────────────────────────────────────────────────┘│
│   Options: 1 week, 1 month, 6 months, 1 year,    │
│            Never                                   │
│                                                    │
│                           [Cancel]  [Generate]     │
└────────────────────────────────────────────────────┘
```

**API Call**:
```javascript
POST /api/folders/{folderId}/mcp/api-key
{
  "name": "External Integration Key",
  "expiresIn": "1y"
}
```

### Step 6: Copy and Use API Key

After generation, show the key **ONCE**:

```
┌────────────────────────────────────────────────────┐
│ ⚠️  IMPORTANT: Save Your API Key                   │
├────────────────────────────────────────────────────┤
│                                                    │
│ This key will only be shown once. Store it         │
│ securely - you won't be able to see it again.     │
│                                                    │
│ API Key:                                           │
│ ┌────────────────────────────────────────────────┐│
│ │ nk_folder_abc123def456...xyz789           [📋] ││
│ └────────────────────────────────────────────────┘│
│                                                    │
│ Usage Example:                                     │
│ ┌────────────────────────────────────────────────┐│
│ │ curl -X POST \                                 ││
│ │   https://api.nectar.com/api/public/folders/\ ││
│ │   {folderId}/query \                           ││
│ │   -H "Authorization: Bearer YOUR_KEY" \        ││
│ │   -d '{"question":"What is this about?"}'      ││
│ └────────────────────────────────────────────────┘│
│                                                    │
│                                        [Got It]    │
└────────────────────────────────────────────────────┘
```

### Step 7: Test Query Interface (Optional)

Provide built-in testing interface:

```
┌────────────────────────────────────────────────────┐
│ Test Query - "My Documents"                        │
├────────────────────────────────────────────────────┤
│                                                    │
│ Question:                                          │
│ ┌────────────────────────────────────────────────┐│
│ │ What are the main topics discussed in these    ││
│ │ documents?                                     ││
│ └────────────────────────────────────────────────┘│
│                                                    │
│ Advanced Options: [▼]                              │
│                                                    │
│                                         [Query]    │
│                                                    │
│ ─────────────────────────────────────────────────  │
│                                                    │
│ 📄 Answer:                                         │
│                                                    │
│ The documents primarily discuss cloud              │
│ architecture patterns, with focus on...            │
│                                                    │
│ 📚 Sources: 3 documents used                       │
│ ⏱️ Response time: 2.3s                             │
│ 💰 Cost: $0.015                                    │
│                                                    │
└────────────────────────────────────────────────────┘
```

## Complete API Reference

### Folder MCP Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/folders/:folderId/mcp/enable` | POST | Enable MCP on folder |
| `/api/folders/:folderId/mcp/disable` | POST | Disable MCP on folder |
| `/api/folders/:folderId/mcp/status` | GET | Get indexing status |
| `/api/folders/:folderId/mcp/reindex` | POST | Trigger reindexing |
| `/api/folders/:folderId/mcp/stats` | GET | Get usage statistics |

### Folder API Keys

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/folders/:folderId/mcp/api-key` | POST | Generate API key |
| `/api/folders/:folderId/mcp/api-keys` | GET | List API keys |
| `/api/folders/:folderId/mcp/api-key/:keyId` | DELETE | Revoke API key |

### Query Endpoints (Authenticated)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/folders/:folderId/mcp/query` | POST | JWT | Query with user session |
| `/api/public/folders/:folderId/query` | POST | API Key | Query with folder API key |
| `/api/folders/:folderId/mcp/queries` | GET | JWT | Get query history |

## Implementation Checklist

### File Storage Page Updates Needed

- [ ] Add MCP toggle to folder context menu
- [ ] Create "Enable MCP" configuration dialog
- [ ] Add indexing status indicator
- [ ] Create "Manage API Keys" dialog
- [ ] Add API key generation form
- [ ] Show API key once after generation
- [ ] Add "Test Query" interface (optional)
- [ ] Add MCP status badge to folder list
- [ ] Update folder details panel

### Components to Create/Update

1. **`FolderMCPToggle.jsx`**
   - Toggle switch with confirmation
   - Configuration form
   - Handles enable/disable

2. **`FolderMCPStatus.jsx`**
   - Shows indexing progress
   - Polling for status updates
   - Error handling

3. **`FolderAPIKeyManager.jsx`**
   - List existing keys
   - Generate new keys
   - Revoke keys
   - Copy to clipboard

4. **`FolderQueryTester.jsx`** (optional)
   - Query input form
   - Response display
   - Cost tracking

5. **Update `FileStoragePage.jsx`**
   - Integrate MCP components
   - Add context menu items
   - Handle MCP-related state

## User Permissions

**Who can enable MCP on folders?**
- Organization Admins
- Organization Owners
- Users with "manage_folders" permission

**Who can generate API keys?**
- Same as above (folder managers)

**Who can use API keys?**
- Anyone with a valid folder API key (external systems, integrations)

## Security Considerations

### UI Security

1. **Validation**:
   - Validate folder IDs before API calls
   - Sanitize user inputs
   - Limit key name length

2. **Sensitive Data**:
   - Show API keys only once
   - Use masked display for key prefixes
   - Clear clipboard after copy (optional)

3. **Rate Limiting**:
   - Limit API key generation (max 10 per folder)
   - Throttle status polling
   - Prevent rapid enable/disable

### API Security

✅ Already Implemented:
- RLS enforcement on all operations
- Bcrypt hashing for API keys
- Folder scope validation
- Permission checks
- Expiration handling

## Future Enhancements

### Phase 1 (Current)
- Basic MCP enable/disable
- API key management
- Simple query interface

### Phase 2 (Future)
- **Analytics Dashboard**:
  - Query volume charts
  - Cost tracking graphs
  - Popular questions
  - Response time metrics

- **Advanced Settings**:
  - Custom chunk sizes per folder
  - Model selection
  - Similarity thresholds

- **Webhooks**:
  - Query result notifications
  - Indexing completion alerts
  - Error notifications

### Phase 3 (Future)
- **Collaborative Features**:
  - Share queries with team
  - Query templates
  - Saved searches

- **Advanced Security**:
  - IP whitelisting per API key
  - Rate limits per key
  - Usage quotas

## Testing Checklist

### Manual Testing

- [ ] Enable MCP on folder
- [ ] Verify indexing starts
- [ ] Monitor indexing progress
- [ ] Generate API key
- [ ] Copy API key successfully
- [ ] Query folder with API key
- [ ] Revoke API key
- [ ] Verify revoked key doesn't work
- [ ] Disable MCP on folder
- [ ] Verify embeddings are deleted

### Edge Cases

- [ ] Enable MCP on empty folder
- [ ] Enable MCP while files being uploaded
- [ ] Generate key before indexing completes
- [ ] Expire key and try to use it
- [ ] Delete folder with active API keys
- [ ] Cross-tenant access attempt

## Migration Notes

**Database Migration**:
```bash
# Already created: server/migrations/add-folder-api-keys.sql
# Run with: node server/scripts/run-folder-api-keys-migration.js
```

**Prisma Client**:
```bash
cd server
npx prisma generate
```

**No Frontend Build Required**:
The backend is ready. Just need to add UI components.

## Example User Journey

1. **Marketing Team Lead** has a folder with 100 product documents
2. They click folder → "Enable MCP Server"
3. Configure to use GPT-4 for better accuracy
4. Wait 2 minutes for indexing
5. Click "Manage API Keys" → "Generate New Key"
6. Name it "Slack Bot Integration" with 6-month expiration
7. Copy the key and paste it into their Slack app config
8. Team members can now ask questions like "What are our Q1 product priorities?" in Slack
9. Slack bot uses the folder API key to query the documents
10. Responses are sourced from the actual product documents, not hallucinations

## Support & Documentation

**User Documentation** (to be created):
- How to enable MCP on folders
- Generating and managing API keys
- Using folder API keys in integrations
- Troubleshooting indexing issues

**Developer Documentation** (exists):
- `docs/FOLDER_API_KEYS_IMPLEMENTATION.md`
- `docs/MCP_IMPLEMENTATION_SUMMARY.md`
- API endpoint reference in code comments
