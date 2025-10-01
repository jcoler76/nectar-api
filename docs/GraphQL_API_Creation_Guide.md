# GraphQL API Creation Guide - Nectar API Platform

This comprehensive guide covers the complete process of creating GraphQL APIs using the Nectar API platform, providing a modern alternative to REST APIs with advanced querying capabilities, field selection optimization, and type safety.

## Table of Contents

1. [Overview](#overview)
2. [GraphQL vs REST Comparison](#graphql-vs-rest-comparison)
3. [Getting Started with GraphQL](#getting-started-with-graphql)
4. [Authentication & Authorization](#authentication--authorization)
5. [Dynamic Procedure Execution](#dynamic-procedure-execution)
6. [Batch Operations](#batch-operations)
7. [Field Selection & Performance](#field-selection--performance)
8. [Usage Examples](#usage-examples)
9. [Advanced Features](#advanced-features)
10. [Migration Path from REST](#migration-path-from-rest)
11. [Troubleshooting](#troubleshooting)

---

## Overview

The Nectar API platform provides a **dual API approach**, offering both REST and GraphQL endpoints for maximum flexibility. GraphQL APIs are built on top of the same security model and stored procedure execution engine as REST APIs, but provide additional benefits:

- **Field Selection**: Request only the data fields you need
- **Single Request Batching**: Execute multiple database procedures in one request
- **Type Safety**: Optional typed schemas for better development experience
- **Introspection**: Self-documenting API schema discovery
- **Performance Optimization**: Automatic field filtering at the server level

### Key Advantages over REST

| Feature | REST API | GraphQL API |
|---------|----------|-------------|
| **Data Fetching** | Fixed response structure | Request specific fields only |
| **Multiple Operations** | Multiple HTTP requests | Single request with batch operations |
| **Type System** | JSON responses | Optional typed responses with validation |
| **API Discovery** | External documentation | Built-in schema introspection |
| **Caching** | Manual implementation | Field-level caching built-in |
| **Network Efficiency** | Can over-fetch data | Precise data fetching |

---

## GraphQL vs REST Comparison

### REST API Approach
```bash
# Multiple requests needed
GET /api/v2/customer_api/_proc/GetCustomerById?customerId=123
GET /api/v2/order_api/_proc/GetOrdersByCustomer?customerId=123
GET /api/v2/invoice_api/_proc/GetInvoicesByCustomer?customerId=123
```

**Issues:**
- 3 separate HTTP requests
- Each returns complete dataset (may include unused fields)
- No built-in batching or optimization

### GraphQL API Approach
```graphql
query GetCustomerData($customerId: Int!) {
  customer: procedure(
    serviceName: "customer_api"
    procedureName: "GetCustomerById"
    params: { customerId: $customerId }
  ) {
    ID
    Name
    Email
  }

  orders: procedure(
    serviceName: "order_api"
    procedureName: "GetOrdersByCustomer"
    params: { customerId: $customerId }
  ) {
    OrderID
    OrderDate
    Total
  }

  invoices: procedure(
    serviceName: "invoice_api"
    procedureName: "GetInvoicesByCustomer"
    params: { customerId: $customerId }
  ) {
    InvoiceID
    Amount
    DueDate
  }
}
```

**Benefits:**
- Single HTTP request
- Only requested fields returned
- Built-in batching and optimization
- Type validation and introspection

---

## Getting Started with GraphQL

### GraphQL Endpoint

**URL**: `https://your-domain.com/graphql`

All GraphQL operations (queries, mutations, subscriptions) use this single endpoint via POST requests.

### Basic Request Structure

GraphQL requests are POST requests with a JSON body containing:

```json
{
  "query": "query or mutation string",
  "variables": { "key": "value" },
  "operationName": "optional operation name"
}
```

### Your First GraphQL Query

**Simple procedure call:**
```graphql
query GetCustomers {
  procedure(
    serviceName: "customer_api"
    procedureName: "GetCustomers"
    params: {}
  )
}
```

**With specific field selection:**
```graphql
query GetCustomersOptimized {
  customers: procedure(
    serviceName: "customer_api"
    procedureName: "GetCustomers"
    params: {}
  ) {
    ID
    Name
    Email
  }
}
```

---

## Authentication & Authorization

### Authentication Methods

GraphQL APIs use the **same authentication system** as REST APIs:

**Primary Method (Recommended):**
```http
Authorization: Bearer mapi_your_api_key_here
```

**Alternative Methods:**
```http
X-API-Key: mapi_your_api_key_here
X-NectarStudio-String-API-Key: mapi_your_api_key_here
```

### Authorization Model

GraphQL APIs follow the same **role-based access control** as REST APIs:

1. **API Key → Application → Role → Permissions**
2. **Service-level access control**
3. **Procedure-level permissions**
4. **HTTP method restrictions**

**Permission Check Process:**
```javascript
// GraphQL automatically validates:
1. Valid API key exists
2. Application is active
3. Role has permission for service
4. Role has permission for specific procedure
5. Method access is allowed (GET/POST equivalent)
```

### Context Information Available

GraphQL resolvers receive rich context:

```javascript
context: {
  user,          // JWT or API key user
  jwtUser,       // JWT user (admin operations)
  apiKeyUser,    // API key user (service operations)
  req,           // Express request object
  res,           // Express response object
  dataloaders    // DataLoader instances for optimization
}
```

---

## Dynamic Procedure Execution

The core strength of Nectar's GraphQL API is **dynamic procedure execution** - call any stored procedure without pre-defined resolvers.

### Single Procedure Execution

**Basic Syntax:**
```graphql
query ProcedureName($param1: Type, $param2: Type) {
  procedure(
    serviceName: "service_name"
    procedureName: "procedure_name"
    params: { param1: $param1, param2: $param2 }
  )
}
```

**Example - Get Customer by ID:**
```graphql
query GetCustomer($customerId: Int!) {
  customer: procedure(
    serviceName: "customer_api"
    procedureName: "GetCustomerById"
    params: { customerId: $customerId }
  ) {
    ID
    Name
    Email
    Phone
    Address
  }
}
```

**Variables:**
```json
{
  "customerId": 123
}
```

### Field Selection Optimization

**Request all fields (like REST):**
```graphql
query GetAllFields {
  procedure(
    serviceName: "customer_api"
    procedureName: "GetCustomers"
    params: {}
  )
}
```
*Returns complete JSON objects*

**Request specific fields only:**
```graphql
query GetSelectedFields {
  customers: procedure(
    serviceName: "customer_api"
    procedureName: "GetCustomers"
    params: {}
  ) {
    ID
    Name
    Email
  }
}
```
*Server filters and returns only ID, Name, Email*

### Server-Side Field Projection

**Alternative field selection using `select` parameter:**
```graphql
query GetProjectedFields {
  customers: procedure(
    serviceName: "customer_api"
    procedureName: "GetCustomers"
    params: {}
    select: ["ID", "Name", "Email"]
  )
}
```

---

## Batch Operations

Execute multiple procedures in a single GraphQL request for optimal performance.

### Multiple Procedures Query

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
      "serviceName": "customer_api",
      "procedureName": "GetCustomerById",
      "params": { "customerId": 123 }
    },
    {
      "serviceName": "order_api",
      "procedureName": "GetOrdersByCustomer",
      "params": { "customerId": 123 }
    },
    {
      "serviceName": "invoice_api",
      "procedureName": "GetInvoicesByCustomer",
      "params": { "customerId": 123 }
    }
  ]
}
```

### Inline Batch Operations

**Execute multiple procedures in single query:**
```graphql
query CustomerDashboard($customerId: Int!) {
  customer: procedure(
    serviceName: "customer_api"
    procedureName: "GetCustomerById"
    params: { customerId: $customerId }
  ) {
    ID
    Name
    Email
  }

  orders: procedure(
    serviceName: "order_api"
    procedureName: "GetOrdersByCustomer"
    params: { customerId: $customerId }
  ) {
    OrderID
    OrderDate
    Total
  }

  recentInvoices: procedure(
    serviceName: "invoice_api"
    procedureName: "GetRecentInvoices"
    params: { customerId: $customerId, limit: 5 }
  ) {
    InvoiceID
    Amount
    DueDate
  }
}
```

### Error Handling in Batch Operations

**Individual procedure errors don't fail the entire request:**
```json
{
  "data": {
    "procedures": [
      {
        "serviceName": "customer_api",
        "procedureName": "GetCustomerById",
        "success": true,
        "error": null,
        "data": [{ "ID": 123, "Name": "John Doe" }]
      },
      {
        "serviceName": "order_api",
        "procedureName": "GetOrdersByCustomer",
        "success": false,
        "error": "Procedure not found",
        "data": null
      }
    ]
  }
}
```

---

## Field Selection & Performance

GraphQL's field selection provides significant performance benefits over REST APIs.

### How Field Selection Works

**GraphQL Query:**
```graphql
query OptimizedQuery {
  customers: procedure(
    serviceName: "customer_api"
    procedureName: "GetCustomers"
    params: {}
  ) {
    ID
    Name
  }
}
```

**Server Processing:**
1. Execute stored procedure (returns all 50 columns)
2. Analyze GraphQL field selection
3. Filter response to only include ID and Name
4. Return optimized response

**Response:**
```json
{
  "data": {
    "customers": [
      { "ID": 1, "Name": "John Doe" },
      { "ID": 2, "Name": "Jane Smith" }
    ]
  }
}
```

### Performance Benefits

**Network Efficiency:**
- **REST API**: Returns 50 columns × 1000 rows = 50,000 data points
- **GraphQL API**: Returns 2 columns × 1000 rows = 2,000 data points
- **Bandwidth Savings**: 96% reduction in data transfer

**Memory Efficiency:**
- Server-side field filtering reduces memory usage
- Client receives only needed data
- Reduced JSON parsing overhead

### Advanced Field Selection

**Nested field selection:**
```graphql
query NestedSelection {
  orders: procedure(
    serviceName: "order_api"
    procedureName: "GetOrdersWithDetails"
    params: {}
  ) {
    OrderID
    OrderDate
    Customer {
      Name
      Email
    }
    Items {
      ProductName
      Quantity
      Price
    }
  }
}
```

---

## Usage Examples

### PowerShell Examples

**Basic GraphQL Query:**
```powershell
# Set API details
$apiKey = "mapi_your_api_key_here"
$graphqlEndpoint = "https://api.company.com/graphql"

# Create headers
$headers = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type" = "application/json"
}

# GraphQL query
$query = @"
query GetCustomers {
  customers: procedure(
    serviceName: "customer_api"
    procedureName: "GetCustomers"
    params: {}
  ) {
    ID
    Name
    Email
  }
}
"@

# Prepare request body
$body = @{
    query = $query
} | ConvertTo-Json -Depth 5

# Execute request
try {
    $response = Invoke-RestMethod -Uri $graphqlEndpoint -Method POST -Headers $headers -Body $body
    Write-Host "GraphQL Query Successful:" -ForegroundColor Green
    $response.data.customers | Format-Table
}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
```

**Parameterized Query:**
```powershell
# GraphQL query with variables
$query = @"
query GetCustomer(`$customerId: Int!) {
  customer: procedure(
    serviceName: "customer_api"
    procedureName: "GetCustomerById"
    params: { customerId: `$customerId }
  ) {
    ID
    Name
    Email
    Phone
  }
}
"@

$variables = @{
    customerId = 123
}

$body = @{
    query = $query
    variables = $variables
} | ConvertTo-Json -Depth 5

$response = Invoke-RestMethod -Uri $graphqlEndpoint -Method POST -Headers $headers -Body $body
$response.data.customer
```

**Batch Operations:**
```powershell
# Batch multiple procedures
$query = @"
query BatchOperations(`$customerId: Int!) {
  customer: procedure(
    serviceName: "customer_api"
    procedureName: "GetCustomerById"
    params: { customerId: `$customerId }
  ) {
    Name
    Email
  }

  orders: procedure(
    serviceName: "order_api"
    procedureName: "GetOrdersByCustomer"
    params: { customerId: `$customerId }
  ) {
    OrderID
    OrderDate
    Total
  }
}
"@

$variables = @{
    customerId = 123
}

$body = @{
    query = $query
    variables = $variables
} | ConvertTo-Json -Depth 5

$response = Invoke-RestMethod -Uri $graphqlEndpoint -Method POST -Headers $headers -Body $body

Write-Host "Customer Info:" -ForegroundColor Yellow
$response.data.customer

Write-Host "`nCustomer Orders:" -ForegroundColor Yellow
$response.data.orders | Format-Table
```

### Postman Examples

**Setting up Postman for GraphQL:**

1. **Create New Request**
   - Method: `POST`
   - URL: `{{base_url}}/graphql`

2. **Set Headers**
   ```
   Authorization: Bearer {{api_key}}
   Content-Type: application/json
   ```

3. **Request Body (JSON)**
   ```json
   {
     "query": "query GetCustomers { customers: procedure(serviceName: \"customer_api\", procedureName: \"GetCustomers\", params: {}) { ID Name Email } }",
     "variables": {}
   }
   ```

**Postman Query Examples:**

**1. Simple Query**
```json
{
  "query": "query GetCustomer($customerId: Int!) { customer: procedure(serviceName: \"customer_api\", procedureName: \"GetCustomerById\", params: { customerId: $customerId }) { ID Name Email Phone } }",
  "variables": {
    "customerId": 123
  }
}
```

**2. Batch Query**
```json
{
  "query": "query CustomerDashboard($customerId: Int!) { customer: procedure(serviceName: \"customer_api\", procedureName: \"GetCustomerById\", params: { customerId: $customerId }) { Name Email } orders: procedure(serviceName: \"order_api\", procedureName: \"GetOrdersByCustomer\", params: { customerId: $customerId }) { OrderID Total } }",
  "variables": {
    "customerId": 123
  }
}
```

**3. Field Selection Optimization**
```json
{
  "query": "query OptimizedQuery { customers: procedure(serviceName: \"customer_api\", procedureName: \"GetCustomers\", params: {}) { ID Name } }"
}
```

### cURL Examples

**Basic GraphQL Query:**
```bash
# Set variables
API_KEY="mapi_your_api_key_here"
GRAPHQL_ENDPOINT="https://api.company.com/graphql"

# Simple query
curl -X POST $GRAPHQL_ENDPOINT \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query GetCustomers { customers: procedure(serviceName: \"customer_api\", procedureName: \"GetCustomers\", params: {}) { ID Name Email } }"
  }'
```

**Parameterized Query:**
```bash
# Query with variables
curl -X POST $GRAPHQL_ENDPOINT \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query GetCustomer($customerId: Int!) { customer: procedure(serviceName: \"customer_api\", procedureName: \"GetCustomerById\", params: { customerId: $customerId }) { ID Name Email } }",
    "variables": {
      "customerId": 123
    }
  }'
```

**Batch Operations:**
```bash
# Multiple procedures in one request
curl -X POST $GRAPHQL_ENDPOINT \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query BatchData($customerId: Int!) { customer: procedure(serviceName: \"customer_api\", procedureName: \"GetCustomerById\", params: { customerId: $customerId }) { Name } orders: procedure(serviceName: \"order_api\", procedureName: \"GetOrdersByCustomer\", params: { customerId: $customerId }) { OrderID Total } }",
    "variables": {
      "customerId": 123
    }
  }'
```

### JavaScript/Node.js Examples

**Using fetch API:**
```javascript
const apiKey = 'mapi_your_api_key_here';
const graphqlEndpoint = 'https://api.company.com/graphql';

async function executeGraphQL(query, variables = {}) {
  const response = await fetch(graphqlEndpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query,
      variables
    })
  });

  const result = await response.json();

  if (result.errors) {
    throw new Error(`GraphQL Error: ${result.errors.map(e => e.message).join(', ')}`);
  }

  return result.data;
}

// Example usage
const query = `
  query GetCustomer($customerId: Int!) {
    customer: procedure(
      serviceName: "customer_api"
      procedureName: "GetCustomerById"
      params: { customerId: $customerId }
    ) {
      ID
      Name
      Email
    }
  }
`;

executeGraphQL(query, { customerId: 123 })
  .then(data => console.log(data.customer))
  .catch(error => console.error(error));
```

**Using Apollo Client:**
```javascript
import { ApolloClient, InMemoryCache, gql, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

// Create HTTP link
const httpLink = createHttpLink({
  uri: 'https://api.company.com/graphql',
});

// Create auth link
const authLink = setContext((_, { headers }) => {
  const token = 'mapi_your_api_key_here';
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    }
  };
});

// Create Apollo Client
const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});

// Define queries
const GET_CUSTOMER = gql`
  query GetCustomer($customerId: Int!) {
    customer: procedure(
      serviceName: "customer_api"
      procedureName: "GetCustomerById"
      params: { customerId: $customerId }
    ) {
      ID
      Name
      Email
    }
  }
`;

// Execute query
client.query({
  query: GET_CUSTOMER,
  variables: { customerId: 123 }
})
.then(result => console.log(result.data.customer))
.catch(error => console.error(error));
```

---

## Advanced Features

### Schema Introspection

GraphQL provides built-in API discovery through introspection:

**Get schema information:**
```graphql
query IntrospectionQuery {
  __schema {
    types {
      name
      description
    }
    queryType {
      name
      fields {
        name
        description
      }
    }
  }
}
```

**Get available procedures for a service:**
```graphql
query GetServiceProcedures($serviceName: String!) {
  serviceProcedures(serviceName: $serviceName) {
    serviceName
    procedures {
      name
    }
  }
}
```

### Environment Support

GraphQL APIs support multiple environments (staging, production):

```graphql
query GetStagingData {
  customers: procedure(
    serviceName: "customer_api"
    procedureName: "GetCustomers"
    params: {}
    environment: "staging"
  ) {
    ID
    Name
  }
}
```

### Typed Resolvers

For frequently used procedures, you can create typed resolvers:

**Example typed resolver (already implemented):**
```graphql
query GetIssues($issuesetID: Int!) {
  issues(serviceName: "modernluxury", issuesetID: $issuesetID) {
    ID
    Name
    IssueDate
    Edition
  }
}
```

### WebSocket Subscriptions

GraphQL supports real-time subscriptions via WebSockets:

**Subscription endpoint:** `ws://your-domain.com/graphql-subscriptions`

```graphql
subscription OrderUpdates($customerId: Int!) {
  orderStatusChanged(customerId: $customerId) {
    orderID
    status
    updatedAt
  }
}
```

### Rate Limiting

GraphQL APIs inherit the same rate limiting as REST APIs:
- 1000 requests per hour per API key (default)
- Configurable per application
- Query complexity analysis
- Field-level rate limiting

---

## Migration Path from REST

### Phase 1: Parallel Usage (Recommended Start)

**Keep existing REST endpoints unchanged:**
```bash
# Existing REST calls continue to work
GET /api/v2/customer_api/_proc/GetCustomers
```

**Add GraphQL for new features:**
```graphql
# New integrations use GraphQL
query GetCustomers {
  customers: procedure(
    serviceName: "customer_api"
    procedureName: "GetCustomers"
    params: {}
  ) {
    ID
    Name
  }
}
```

### Phase 2: Client Migration

**Update applications incrementally:**

1. **Performance-Critical Operations**: Migrate operations that benefit from field selection
2. **Batch Operations**: Convert multiple REST calls to single GraphQL queries
3. **Real-Time Features**: Use GraphQL subscriptions for live updates

**Example migration:**

**Before (REST):**
```javascript
// Multiple REST calls
const customer = await fetch('/api/v2/customer_api/_proc/GetCustomerById?customerId=123');
const orders = await fetch('/api/v2/order_api/_proc/GetOrdersByCustomer?customerId=123');
const invoices = await fetch('/api/v2/invoice_api/_proc/GetInvoicesByCustomer?customerId=123');
```

**After (GraphQL):**
```javascript
// Single GraphQL query
const query = `
  query CustomerData($customerId: Int!) {
    customer: procedure(serviceName: "customer_api", procedureName: "GetCustomerById", params: { customerId: $customerId }) { ID Name Email }
    orders: procedure(serviceName: "order_api", procedureName: "GetOrdersByCustomer", params: { customerId: $customerId }) { OrderID Total }
    invoices: procedure(serviceName: "invoice_api", procedureName: "GetInvoicesByCustomer", params: { customerId: $customerId }) { InvoiceID Amount }
  }
`;
const data = await executeGraphQL(query, { customerId: 123 });
```

### Phase 3: Full GraphQL (Optional)

**Benefits of full migration:**
- Unified API interface
- Better development experience
- Advanced features (subscriptions, sophisticated caching)
- GraphQL-specific tooling

**Consider keeping REST for:**
- File uploads/downloads
- Simple CRUD operations
- Legacy system integrations
- Third-party webhooks

---

## Troubleshooting

### Common GraphQL Errors

**1. Authentication Errors**
```json
{
  "errors": [
    {
      "message": "Authentication failed",
      "extensions": { "code": "UNAUTHENTICATED" }
    }
  ]
}
```

**Solution:**
- Verify API key in Authorization header
- Check API key format (`mapi_...`)
- Ensure application is active

**2. Service Not Found**
```json
{
  "errors": [
    {
      "message": "Service 'customer_api' not found",
      "extensions": { "code": "SERVICE_NOT_FOUND" }
    }
  ]
}
```

**Solution:**
- Verify service name spelling (case-sensitive)
- Check service is active
- Ensure API key has access to service

**3. Insufficient Permissions**
```json
{
  "errors": [
    {
      "message": "Access denied to GetCustomers in service customer_api",
      "extensions": { "code": "FORBIDDEN" }
    }
  ]
}
```

**Solution:**
- Check role permissions for procedure
- Verify HTTP method access (GET/POST)
- Contact administrator to adjust permissions

**4. Procedure Execution Error**
```json
{
  "errors": [
    {
      "message": "Failed to execute procedure: Invalid column name 'CustomerID'",
      "extensions": {
        "code": "PROCEDURE_EXECUTION_ERROR",
        "originalError": "Invalid column name 'CustomerID'"
      }
    }
  ]
}
```

**Solution:**
- Check stored procedure exists
- Verify parameter names and types
- Review database schema changes

### Performance Issues

**1. Slow GraphQL Queries**

**Symptoms:**
- GraphQL queries slower than equivalent REST calls
- Timeout errors

**Solutions:**
- Use field selection to reduce data transfer
- Implement server-side `select` parameter
- Check stored procedure performance
- Review database indexes

**Example optimization:**
```graphql
# Instead of this (returns all fields):
query SlowQuery {
  procedure(serviceName: "customer_api", procedureName: "GetCustomers", params: {})
}

# Use this (returns only needed fields):
query FastQuery {
  customers: procedure(serviceName: "customer_api", procedureName: "GetCustomers", params: {}) {
    ID
    Name
  }
}
```

**2. Large Response Payloads**

**Solution - Server-side projection:**
```graphql
query OptimizedProjection {
  customers: procedure(
    serviceName: "customer_api"
    procedureName: "GetCustomers"
    params: {}
    select: ["ID", "Name", "Email"]  # Server-side field filtering
  )
}
```

### Development and Testing

**1. GraphQL Playground/GraphiQL**

Access interactive GraphQL explorer (development only):
```
https://your-domain.com/playground
```

**2. Schema Introspection**

Query the schema directly:
```graphql
{
  __schema {
    queryType {
      fields {
        name
        type {
          name
        }
      }
    }
  }
}
```

**3. Error Debugging**

Enable detailed error messages (development):
```javascript
// Server configuration
formatError: error => ({
  message: error.message,
  code: error.extensions?.code,
  path: error.path,
  stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
})
```

---

## Best Practices

### 1. Query Design

**✅ Good - Use field selection:**
```graphql
query GoodQuery {
  customers: procedure(
    serviceName: "customer_api"
    procedureName: "GetCustomers"
    params: {}
  ) {
    ID
    Name
    Email
  }
}
```

**❌ Bad - No field selection:**
```graphql
query BadQuery {
  procedure(
    serviceName: "customer_api"
    procedureName: "GetCustomers"
    params: {}
  )
}
```

### 2. Batch Operations

**✅ Good - Single GraphQL request:**
```graphql
query BatchGood($customerId: Int!) {
  customer: procedure(serviceName: "customer_api", procedureName: "GetCustomerById", params: { customerId: $customerId }) { Name }
  orders: procedure(serviceName: "order_api", procedureName: "GetOrdersByCustomer", params: { customerId: $customerId }) { OrderID }
}
```

**❌ Bad - Multiple requests:**
```javascript
// Don't do this
const customer = await graphql(getCustomerQuery);
const orders = await graphql(getOrdersQuery);
```

### 3. Error Handling

**✅ Good - Handle GraphQL errors:**
```javascript
async function executeGraphQL(query, variables) {
  const response = await fetch('/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ query, variables })
  });

  const result = await response.json();

  if (result.errors) {
    console.error('GraphQL Errors:', result.errors);
    throw new Error(result.errors.map(e => e.message).join(', '));
  }

  return result.data;
}
```

### 4. Performance Optimization

**Use DataLoader pattern for N+1 problem resolution:**
- Automatic batching built into Nectar GraphQL
- Field-level caching
- Connection pooling

**Monitor query performance:**
- Use field selection
- Implement reasonable query depth limits
- Monitor slow queries

---

## Conclusion

The Nectar API platform's GraphQL implementation provides a powerful, flexible alternative to REST APIs while maintaining the same security model and stored procedure execution engine. With features like dynamic procedure execution, field selection optimization, and batch operations, GraphQL APIs offer superior performance and developer experience for modern applications.

**Key Benefits:**
- **Performance**: Field selection reduces bandwidth usage by up to 96%
- **Flexibility**: Single endpoint handles all operations
- **Type Safety**: Optional typed schemas with validation
- **Batching**: Multiple procedures in single request
- **Real-time**: WebSocket subscriptions for live updates
- **Introspection**: Self-documenting API schema

**Migration Path:**
1. Start with parallel REST/GraphQL usage
2. Migrate performance-critical operations first
3. Convert batch operations to GraphQL
4. Optional full migration for advanced features

Both REST and GraphQL APIs share the same robust security, authentication, and stored procedure execution infrastructure, ensuring consistency and reliability across your API ecosystem.