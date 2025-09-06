# Dynamic GraphQL API Usage Examples

## Overview
Your Mirabel API now supports dynamic GraphQL queries that can call any stored procedure for any client without hardcoding resolvers. This provides the same flexibility as your REST API but with GraphQL's field selection benefits.

## 🚀 Key Features

✅ **Dynamic Procedures**: Call any stored procedure without predefined resolvers  
✅ **Field Selection**: Request only the fields you need  
✅ **Performance Optimization**: Automatic field filtering at the resolver level  
✅ **Batch Operations**: Execute multiple procedures in a single request  
✅ **Type Safety**: Optional typed resolvers for known procedures  
✅ **Full REST Compatibility**: Existing REST endpoints remain unchanged  

## 📋 GraphQL Endpoint

**URL**: `https://mirabelconnect.mirabeltechnologies.com/graphql`  
**Authentication**: Same `x-mirabel-api-key` header as REST API  

## 💡 Usage Examples

### 1. Dynamic Procedure Call (Generic)

**Query:**
```graphql
query GetIssues($serviceName: String!, $procedureName: String!, $params: JSON!) {
  procedure(
    serviceName: $serviceName
    procedureName: $procedureName  
    params: $params
  ) {
    ID
    Name
  }
}
```

**Variables:**
```json
{
  "serviceName": "modernluxury",
  "procedureName": "api_GetIssues",
  "params": {
    "issuesetID": -2
  }
}
```

**PowerShell Example:**
```powershell
$headers = @{
    'x-mirabel-api-key' = '5ca2f94e4ee15c0f12742b62a7ac734e5062a177796d655b589ed3d2f5472b7e'
    'Content-Type' = 'application/json'
}

$body = @{
    query = 'query GetIssues($serviceName: String!, $procedureName: String!, $params: JSON!) { procedure(serviceName: $serviceName, procedureName: $procedureName, params: $params) }'
    variables = @{
        serviceName = "modernluxury"
        procedureName = "api_GetIssues"
        params = @{ issuesetID = -2 }
    }
} | ConvertTo-Json -Depth 10

$response = Invoke-WebRequest -Uri 'https://mirabelconnect.mirabeltechnologies.com/graphql' -Headers $headers -Method Post -Body $body
$response.Content | ConvertFrom-Json
```

### 2. Typed Issues Query (Convenience)

**Query:**
```graphql
query GetIssuesTyped($issuesetID: Int!) {
  issues(issuesetID: $issuesetID) {
    ID
    Name
  }
}
```

**Variables:**
```json
{
  "issuesetID": -2
}
```

### 3. Request All Fields

**Query:**
```graphql
query GetAllIssueFields {
  procedure(
    serviceName: "modernluxury"
    procedureName: "api_GetIssues"
    params: { issuesetID: -2 }
  )
}
```

Returns all columns as JSON (equivalent to REST API behavior).

### 4. Batch Multiple Procedures

**Query:**
```graphql
query BatchProcedures($requests: [ProcedureRequest!]!) {
  procedures(requests: $requests) {
    serviceName
    procedureName
    success
    error
    data
  }
}
```

**Variables:**
```json
{
  "requests": [
    {
      "serviceName": "modernluxury",
      "procedureName": "api_GetIssues",
      "params": { "issuesetID": -2 }
    },
    {
      "serviceName": "modernluxury", 
      "procedureName": "api_GetCustomers",
      "params": { "active": true }
    }
  ]
}
```

### 5. Discover Available Procedures

**Query:**
```graphql
query GetProcedures($serviceName: String!) {
  serviceProcedures(serviceName: $serviceName) {
    serviceName
    procedures {
      name
    }
  }
}
```

**Variables:**
```json
{
  "serviceName": "modernluxury"
}
```

## 🔧 Adding New Typed Resolvers

For frequently used procedures, you can add typed resolvers:

### 1. Add Type Definition

In `server/graphql/typeDefs/dynamicProcedure.js`:

```graphql
type CustomerResult {
  CustomerID: Int
  CustomerName: String
  Email: String
  Phone: String
}

extend type Query {
  customers(
    serviceName: String! = "modernluxury"
    active: Boolean = true
  ): [CustomerResult]
}
```

### 2. Add Resolver

In `server/graphql/resolvers/dynamicProcedure.js`:

```javascript
customers: async (parent, args, context, info) => {
  const { serviceName = 'modernluxury', active = true } = args;
  const fields = graphqlFields(info);
  const requestedFields = Object.keys(fields);
  
  const Service = require('../../models/Service');
  const service = await Service.findOne({ name: serviceName });
  
  const result = await DatabaseService.executeStoredProcedure(
    service,
    'api_GetCustomers',
    { active }
  );
  
  // Apply field selection optimization
  return result.map(row => {
    const optimizedRow = {};
    requestedFields.forEach(field => {
      if (row.hasOwnProperty(field)) {
        optimizedRow[field] = row[field];
      }
    });
    return optimizedRow;
  });
}
```

## 🚦 Performance Benefits

### Field Selection Optimization
GraphQL automatically requests only needed fields:

**Before (REST)**: Returns all 50 columns from stored procedure  
**After (GraphQL)**: Returns only ID and Name fields  

```json
// GraphQL Response (optimized)
{
  "data": {
    "issues": [
      {
        "ID": 102843,
        "Name": "Visionary Elite(2024 - September)"
      }
    ]
  }
}
```

### Automatic Caching
- Field selection is analyzed at query time
- Unnecessary data filtering happens at the resolver level  
- Reduces bandwidth and improves performance

## 🔒 Authentication

Uses the same authentication as your REST API:

```javascript
// Context includes both JWT and API key authentication
context: {
  user,          // JWT or API key user
  jwtUser,       // JWT user (admin operations)
  apiKeyUser,    // API key user (service operations)
  apiKey         // Raw API key for logging
}
```

## 🔄 Migration Path

### Phase 1: Parallel Usage
- Keep existing REST endpoints unchanged
- Add GraphQL for new integrations
- Test GraphQL with existing clients

### Phase 2: Client Migration  
- Update client applications to use GraphQL
- Monitor performance improvements
- Maintain REST for legacy systems

### Phase 3: Full GraphQL
- Deprecate REST endpoints (optional)
- Full GraphQL schema with all procedures
- Advanced features (subscriptions, caching)

## 🎯 Best Practices

1. **Use Field Selection**: Always specify only needed fields
2. **Batch Requests**: Use `procedures` query for multiple calls  
3. **Error Handling**: Check `success` field in batch operations
4. **Typed Queries**: Add typed resolvers for frequently used procedures
5. **Monitoring**: Use built-in logging for performance tracking

## 🔍 Troubleshooting

**Service Not Found**: Ensure service name matches exactly (case-sensitive)  
**Procedure Error**: Check procedure name and parameter names match stored procedure  
**Authentication Error**: Verify API key has access to the requested service  
**Field Not Found**: Field names are case-sensitive and must match procedure output  

## 📊 Comparison: REST vs GraphQL

| Feature | REST API | GraphQL API |
|---------|----------|-------------|
| **Fields** | All columns | Selected fields only |
| **Requests** | One per procedure | Batch multiple procedures |
| **Type Safety** | JSON response | Optional typed responses |
| **Introspection** | No | Yes (development) |
| **Caching** | Manual | Built-in field-level |
| **Documentation** | External | Self-documenting |

Your clients now have the flexibility to choose the best approach for their use case!