# Auto-REST API Documentation

## Overview

The Auto-REST system provides automatic REST API generation from database tables across multiple database types (PostgreSQL, MSSQL, MySQL, MongoDB). It transforms database tables into fully functional REST endpoints with minimal configuration.

## Getting Started

### 1. Finding Your API Key

Your API key is stored encrypted in the database. To retrieve it:

```javascript
// Use the provided script or create your own
node temp_decrypt_api_key.js
```

**Expected Output:**
```
Application: TestApplication
API Key Prefix: gs_d
API Key Hint: ••••••••••••••••••••••••••••••••••••••••••••••••••••••••87ea
Decrypted API Key: gs_d8d9f15fe7e2cdc000ced23f8c188a1d7ae0a4138ff2db24f12087ea
```

### 2. Authentication Headers

Auto-REST uses custom API key headers (not Bearer tokens):

```bash
# Correct header format
curl -H "x-nectarstudio-api-key: gs_d8d9f15fe7e2cdc000ced23f8c188a1d7ae0a4138ff2db24f12087ea"

# Alternative headers (if configured)
curl -H "x-nectarstudio-string-api-key: your_api_key_here"
```

### 3. Base URL Structure

All Auto-REST endpoints follow this pattern:
```
/api/v2/{serviceName}/_action
```

Where `{serviceName}` is your configured service name (e.g., "goldsuite").

## Core Endpoints

### Table Discovery

**Endpoint:** `GET /api/v2/{serviceName}/_discover`

Discovers all available tables/collections in your database.

**Example:**
```bash
curl -X GET "http://localhost:3001/api/v2/goldsuite/_discover" \
  -H "x-nectarstudio-api-key: your_api_key_here"
```

**Response:**
```json
{
  "data": [
    {
      "name": "gsCustomers",
      "schema": "dbo",
      "type": "TABLE",
      "isExposed": false,
      "suggestedPathSlug": "customers"
    },
    {
      "name": "gsEmployees",
      "schema": "dbo",
      "type": "TABLE",
      "isExposed": false,
      "suggestedPathSlug": "employees"
    }
  ],
  "total": 150,
  "exposed": 0,
  "_meta": {
    "apiVersion": "v1",
    "timestamp": "2025-09-14T02:11:52.466Z",
    "supportedDatabases": ["POSTGRESQL", "MSSQL", "MYSQL", "MONGODB"]
  }
}
```

### Table Exposure (Auto-Generate APIs)

**Endpoint:** `POST /api/v2/{serviceName}/_expose`

Converts database tables into REST API endpoints.

**Request Body:**
```json
{
  "tables": ["gsCustomers", "gsEmployees", "gsContracts"]
}
```

**Example:**
```bash
curl -X POST "http://localhost:3001/api/v2/goldsuite/_expose" \
  -H "x-nectarstudio-api-key: your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{"tables": ["gsCustomers", "gsEmployees"]}'
```

**Response:**
```json
{
  "exposed": [
    {
      "id": "d5692174-b972-40ce-a0a3-f74ed0bf8fa5",
      "name": "gsCustomers",
      "pathSlug": "customers",
      "endpoint": "/api/v2/goldsuite/_table/customers"
    },
    {
      "id": "3b287861-bc7c-4fb7-bc52-7dcae25dba71",
      "name": "gsEmployees",
      "pathSlug": "employees",
      "endpoint": "/api/v2/goldsuite/_table/employees"
    }
  ],
  "errors": [],
  "total": 2
}
```

## Generated REST API Endpoints

Once tables are exposed, the following endpoints are automatically available:

### List Records
```
GET /api/v2/{serviceName}/_table/{pathSlug}
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `pageSize` or `limit` - Records per page (default: 25, max: 200)
- `fields` - Comma-separated field names to return
- `sort` - Field name with optional direction (`field:asc`, `field:desc`)
- `filter` - JSON filter object (advanced filtering)

**Example:**
```bash
curl "http://localhost:3001/api/v2/goldsuite/_table/customers?page=1&limit=5&fields=gsCustomersID,customer,email"
```

### Get Single Record
```
GET /api/v2/{serviceName}/_table/{pathSlug}/{id}
```

### Count Records
```
GET /api/v2/{serviceName}/_table/{pathSlug}/_count
```

### Get Table Schema
```
GET /api/v2/{serviceName}/_table/{pathSlug}/_schema
```

### List All Exposed Tables
```
GET /api/v2/{serviceName}/_table
```

## Path Slug Generation

The system automatically generates clean URL paths from table names:

| Original Table Name | Generated Path Slug | Full Endpoint |
|-------------------|-------------------|---------------|
| `gsCustomers` | `customers` | `/_table/customers` |
| `tblEmployees` | `employees` | `/_table/employees` |
| `gs_Contracts` | `contracts` | `/_table/contracts` |
| `__RefactorLog` | `--refactorlog` | `/_table/--refactorlog` |

**Rules:**
- Removes common prefixes: `gs`, `tbl`, `gs_`, `tbl_`
- Converts underscores to hyphens
- Converts to lowercase
- Preserves special characters like leading underscores

## Security Considerations & Recommendations

### Current Security Model

**Strengths:**
- ✅ API key authentication required
- ✅ Role-based permissions via defaultRole
- ✅ Field-level policies (include/exclude/mask fields)
- ✅ Row-level policies with template filters
- ✅ Read-only by default (allowCreate/Update/Delete = false)

**Potential Concerns:**
- ⚠️ Discovery endpoint reveals ALL table names
- ⚠️ No granular table-level permissions
- ⚠️ Bulk exposure could accidentally expose sensitive tables
- ⚠️ No approval workflow for table exposure

### Recommended Security Enhancements

#### 1. Table-Level Access Control

**Option A: Role-Based Table Restrictions**
```sql
-- Add table access control to roles
ALTER TABLE roles ADD COLUMN allowedTables TEXT[]; -- Array of table patterns
ALTER TABLE roles ADD COLUMN deniedTables TEXT[];  -- Blacklist patterns

-- Examples:
allowedTables: ['gs*', 'user_*', '!gs_sensitive_*']
deniedTables: ['*_audit', '*_log', 'internal_*']
```

**Option B: Service-Level Table Configuration**
```sql
-- Add to services table
ALTER TABLE services ADD COLUMN exposableTablePatterns TEXT[];
ALTER TABLE services ADD COLUMN restrictedTablePatterns TEXT[];
```

#### 2. Enhanced Discovery Endpoint

**Current:**
```javascript
GET /_discover  // Shows ALL tables
```

**Recommended:**
```javascript
GET /_discover?accessible=true     // Only tables user can expose
GET /_discover?exposed=true        // Only currently exposed tables
GET /_discover?pattern=user_*      // Filter by pattern
```

#### 3. Administrative Controls

**Pre-Approval Workflow:**
```javascript
POST /_expose/request  // Request table exposure (pending approval)
GET  /_expose/pending  // List pending requests (admin only)
POST /_expose/approve  // Approve requests (admin only)
```

**Exposure Limits:**
```javascript
// Limit tables per API key/role
maxExposedTablesPerRole: 50
maxExposureRequestsPerDay: 10
```

#### 4. Audit & Monitoring

**Exposure Audit Log:**
```sql
CREATE TABLE table_exposure_audit (
  id UUID PRIMARY KEY,
  table_name VARCHAR(255),
  action VARCHAR(50), -- 'exposed', 'hidden', 'discovered'
  user_id UUID,
  api_key_id UUID,
  timestamp TIMESTAMP,
  ip_address INET
);
```

**Usage Monitoring:**
- Track which tables are actually being accessed
- Alert on unusual access patterns
- Rate limiting per table/endpoint

#### 5. Data Classification System

**Table Sensitivity Levels:**
```javascript
// Add to ExposedEntity model
sensitivityLevel: 'public' | 'internal' | 'confidential' | 'restricted'

// Automatic classification rules
const sensitivityRules = {
  'password': 'restricted',
  'ssn|social': 'confidential',
  'audit|log': 'internal',
  'public_*': 'public'
};
```

#### 6. Field-Level Security Enhancements

**Auto-Masking Sensitive Fields:**
```javascript
// Automatically mask fields matching patterns
const autoMaskPatterns = [
  /password/i, /ssn/i, /social/i,
  /credit_card/i, /bank_account/i
];
```

**PII Detection:**
```javascript
// Scan field names and sample data to detect PII
const piiDetection = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,
  ssn: /\b\d{3}-?\d{2}-?\d{4}\b/
};
```

## Implementation Recommendations

### Phase 1: Basic Security (Immediate)
1. Add table pattern filtering to discovery endpoint
2. Implement exposure confirmation prompts
3. Add basic audit logging

### Phase 2: Access Control (Short-term)
1. Role-based table access restrictions
2. Table sensitivity classification
3. Enhanced field masking

### Phase 3: Advanced Features (Long-term)
1. Pre-approval workflows
2. Automated PII detection
3. Advanced monitoring and alerting

## User Interface Considerations

### Discovery Interface
```
┌─ Available Tables (127 found) ──────────┐
│ ☐ gsCustomers     [TABLE] customers     │
│ ☐ gsEmployees     [TABLE] employees     │
│ ☐ gsContracts     [TABLE] contracts     │
│ ☑ gsPayments      [TABLE] payments      │ ← Already exposed
│                                         │
│ Filter: [gs*____] 🔍  Sort: [Name ↓]   │
│                                         │
│ Select: [All] [None] [Pattern]          │
│ Action: [Expose Selected] [Preview]     │
└─────────────────────────────────────────┘
```

### Exposure Confirmation
```
┌─ Expose Tables Confirmation ────────────┐
│ You are about to expose 3 tables:      │
│                                         │
│ • gsCustomers → /customers (2.1K rows)  │
│ • gsEmployees → /employees (15 rows)    │
│ • gsContracts → /contracts (8.7K rows) │
│                                         │
│ ⚠️  This will create public REST APIs   │
│    Review security policies first!     │
│                                         │
│ [Cancel] [Review Policies] [Expose]     │
└─────────────────────────────────────────┘
```

## Supported Database Types

### PostgreSQL
- **Dialect**: Uses `$1, $2, $3` parameter syntax
- **Pagination**: `LIMIT $1 OFFSET $2`
- **Identifiers**: Double quotes `"table_name"`

### MSSQL (SQL Server)
- **Dialect**: Uses `@param1, @param2` parameter syntax
- **Pagination**: `OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`
- **Identifiers**: Square brackets `[table_name]`

### MySQL
- **Dialect**: Uses `?` parameter placeholders
- **Pagination**: `LIMIT ?, ?` (offset, count)
- **Identifiers**: Backticks `\`table_name\``

### MongoDB
- **Dialect**: Converts SQL-like filters to MongoDB query objects
- **Pagination**: Uses `skip()` and `limit()` methods
- **Operations**: Supports `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$regex`

## Advanced Features

### Field Policies
Control which fields are returned in API responses:
- **Include Fields**: Only return specified fields
- **Exclude Fields**: Return all fields except specified ones
- **Masked Fields**: Return field names but mask values (e.g., "••••••••")

### Row Policies
Control which rows are accessible via template-based filters:
```javascript
// Example row policy template
{
  "field": "organizationId",
  "op": "eq",
  "value": "{{user.organizationId}}"
}
```

### Filtering & Sorting
Generated APIs support advanced querying:
```bash
# Filter by field value
GET /_table/customers?filter={"field":"city","op":"eq","value":"Miami"}

# Sort by multiple fields
GET /_table/customers?sort=lastName:asc,firstName:asc

# Complex filters
GET /_table/customers?filter={"type":"and","nodes":[{"field":"active","op":"eq","value":true},{"field":"city","op":"in","value":["Miami","Tampa"]}]}
```

This documentation provides a comprehensive guide for implementing and using the Auto-REST system while highlighting important security considerations for enterprise deployments.