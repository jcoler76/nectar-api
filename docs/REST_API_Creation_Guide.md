# REST API Creation Guide - Nectar API Platform

This comprehensive guide walks you through the complete process of creating REST APIs using the Nectar API platform, from initial database connection setup through API usage examples.

## Table of Contents

1. [Overview](#overview)
2. [Step 1: Creating a Database Connection](#step-1-creating-a-database-connection)
3. [Step 2: Adding a Service](#step-2-adding-a-service)
4. [Step 3: Creating and Managing Roles](#step-3-creating-and-managing-roles)
5. [Step 4: Creating an Application & Getting API Keys](#step-4-creating-an-application--getting-api-keys)
6. [Step 5: Using Your APIs](#step-5-using-your-apis)
7. [Advanced Features](#advanced-features)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The Nectar API platform automatically generates REST APIs from your database stored procedures and functions. The platform follows a secure, role-based access model:

**Connection** → **Service** → **Role** → **Application** → **API Access**

Each layer adds security and organization:
- **Connections** define database connectivity
- **Services** expose specific databases/schemas
- **Roles** control permissions to database objects
- **Applications** provide API keys for access

---

## Step 1: Creating a Database Connection

A **Connection** defines how the platform connects to your database server.

### Supported Database Types
- Microsoft SQL Server
- MySQL/MariaDB
- PostgreSQL
- MongoDB
- Oracle Database

### Creating a New Connection

1. **Navigate to Connections**
   - Access the Connections section from the main dashboard
   - Click "Add New Connection"

2. **Configure Connection Settings**
   ```
   Name: MyDatabase_Production
   Type: Microsoft SQL Server
   Host: sql-server.company.com
   Port: 1433
   Username: api_user
   Password: [secure_password]
   Database: master (or leave blank to see all databases)
   SSL Enabled: Yes (recommended for production)
   ```

3. **Test the Connection**
   - Use the "Test Connection" button before saving
   - The platform will verify connectivity and list available databases
   - Ensure the database user has appropriate permissions

4. **Connection Permissions Required**
   Your database user needs:
   - `CONNECT` permissions
   - `EXECUTE` permissions on stored procedures/functions
   - `SELECT` permissions on information schema views
   - For SQL Server: `VIEW DEFINITION` permissions

### Connection Security
- Credentials are encrypted at rest using AES-256
- SSL/TLS connections are strongly recommended
- Use dedicated database users with minimal required permissions
- Consider IP whitelisting at the database level

---

## Step 2: Adding a Service

A **Service** exposes a specific database within a connection for API generation.

### Creating a New Service

1. **Navigate to Services**
   - Access the Services section
   - Click "Add New Service"

2. **Configure Service Settings**
   ```
   Name: customer_api
   Label: Customer API Service
   Description: Customer management API endpoints
   Connection: MyDatabase_Production
   Database: customer_db
   Status: Active
   ```

3. **Service Configuration Details**
   - **Name**: Must be unique, used in API URLs (`/api/v2/{serviceName}/...`)
   - **Label**: Human-readable display name
   - **Description**: Detailed explanation of service purpose
   - **Connection**: Select from available connections
   - **Database**: Choose specific database to expose

4. **Schema Discovery**
   - The platform automatically discovers stored procedures and functions
   - Use "Refresh Schema" to update after database changes
   - Procedures appear as available API endpoints

### Service Naming Conventions
- Use lowercase with underscores: `customer_api`, `order_management`
- Keep names descriptive but concise
- Avoid special characters and spaces
- Names become part of API URLs

---

## Step 3: Creating and Managing Roles

**Roles** define which database objects (procedures/functions) can be accessed and how.

### Understanding Role-Based Security

Roles control:
- Which services can be accessed
- Which stored procedures/functions can be called
- Which HTTP methods are allowed (GET, POST, PUT, DELETE)
- Parameter validation and filtering

### Creating a New Role

1. **Navigate to Roles**
   - Access the Roles section
   - Click "Add New Role"

2. **Basic Role Configuration**
   ```
   Name: customer_read_write
   Description: Full access to customer management procedures
   Status: Active
   ```

3. **Assigning Service Permissions**

   For each service, you can grant permissions to specific stored procedures:

   ```
   Service: customer_api

   Procedures:
   ✓ GetCustomerById (GET)
   ✓ GetCustomers (GET)
   ✓ CreateCustomer (POST)
   ✓ UpdateCustomer (PUT)
   ✓ DeleteCustomer (DELETE)
   ✓ SearchCustomers (GET, POST)
   ```

4. **HTTP Method Permissions**
   - **GET**: Read-only operations, parameters via query string
   - **POST**: Create operations or complex queries, parameters in request body
   - **PUT**: Update operations, parameters in request body
   - **DELETE**: Delete operations, parameters via query string or body

### Role Management Best Practices

- **Principle of Least Privilege**: Grant only necessary permissions
- **Descriptive Names**: `customer_read_only`, `admin_full_access`, `reporting_view`
- **Regular Reviews**: Audit role permissions periodically
- **Documentation**: Include clear descriptions of role purposes

### Permission Structure
```json
{
  "serviceId": "service_uuid",
  "objectName": "GetCustomerById",
  "actions": {
    "GET": true,
    "POST": false,
    "PUT": false,
    "DELETE": false
  }
}
```

---

## Step 4: Creating an Application & Getting API Keys

**Applications** provide API keys that authenticate and authorize API requests.

### Creating a New Application

1. **Navigate to Applications**
   - Access the Applications section
   - Click "Add New Application"

2. **Configure Application Settings**
   ```
   Name: mobile_customer_app
   Description: Mobile application for customer management
   Default Role: customer_read_write
   Status: Active
   API Key: [auto-generated or custom]
   ```

3. **API Key Options**

   **Auto-Generated Keys** (Recommended)
   - Platform generates cryptographically secure keys
   - Format: `mapi_[32-character-random-string]`
   - Automatically handles complexity requirements

   **Custom Keys** (Advanced Users)
   - Must meet security requirements:
     - Minimum 32 characters
     - Include uppercase, lowercase, numbers, symbols
     - No whitespace or repetitive patterns
   - Example: `mapi_MySecure2024Key!With$ymbol$`

### Retrieving API Keys

**For New Applications:**
- API key is displayed immediately after creation
- Copy and store securely - this is the only time it's shown in full

**For Existing Applications:**
- Admins can reveal existing keys (if encryption permits)
- Use "Regenerate API Key" to create new keys
- Old keys are immediately invalidated when regenerated

### API Key Security

- **Storage**: Keys are hashed with bcrypt and encrypted with AES-256
- **Transmission**: Always use HTTPS in production
- **Rotation**: Regenerate keys regularly (every 90 days recommended)
- **Access Control**: Only admins can view/manage API keys

---

## Step 5: Using Your APIs

Once you have an Application with an API key, you can call your database procedures via REST API.

### API Endpoint Structure

```
https://your-domain.com/api/v2/{serviceName}/_proc/{procedureName}
```

**Example:**
```
https://api.company.com/api/v2/customer_api/_proc/GetCustomerById
```

### Authentication Methods

**Primary Method - Authorization Header:**
```http
Authorization: Bearer mapi_your_api_key_here
```

**Alternative Methods (Legacy Support):**
```http
X-API-Key: mapi_your_api_key_here
X-NectarStudio-String-API-Key: mapi_your_api_key_here
```

**Query Parameter (Not Recommended):**
```
?api_key=mapi_your_api_key_here
```

### HTTP Methods and Parameters

**GET Requests** (Query Parameters):
```http
GET /api/v2/customer_api/_proc/GetCustomerById?customerId=123
Authorization: Bearer mapi_your_api_key_here
```

**POST Requests** (JSON Body):
```http
POST /api/v2/customer_api/_proc/CreateCustomer
Authorization: Bearer mapi_your_api_key_here
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "555-1234"
}
```

---

## PowerShell Examples

### Basic GET Request
```powershell
# Set API details
$apiKey = "mapi_your_api_key_here"
$baseUrl = "https://api.company.com"
$serviceName = "customer_api"
$procedureName = "GetCustomerById"

# Create headers
$headers = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type" = "application/json"
}

# Make GET request
$customerId = 123
$url = "$baseUrl/api/v2/$serviceName/_proc/$procedureName"
$params = @{customerId = $customerId}

try {
    $response = Invoke-RestMethod -Uri $url -Method GET -Headers $headers -Body $params
    Write-Host "Customer found:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3
}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
```

### POST Request with JSON Body
```powershell
# Set API details
$apiKey = "mapi_your_api_key_here"
$baseUrl = "https://api.company.com"

# Create headers
$headers = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type" = "application/json"
}

# Prepare customer data
$customerData = @{
    firstName = "Jane"
    lastName = "Smith"
    email = "jane.smith@example.com"
    phone = "555-5678"
    address = @{
        street = "123 Main St"
        city = "Anytown"
        state = "ST"
        zipCode = "12345"
    }
} | ConvertTo-Json

# Make POST request
$url = "$baseUrl/api/v2/customer_api/_proc/CreateCustomer"

try {
    $response = Invoke-RestMethod -Uri $url -Method POST -Headers $headers -Body $customerData
    Write-Host "Customer created successfully:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3
}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorContent = $reader.ReadToEnd()
        Write-Host "Error details: $errorContent" -ForegroundColor Yellow
    }
}
```

### Batch Operations
```powershell
# Function to call API
function Invoke-API {
    param(
        [string]$ProcedureName,
        [hashtable]$Parameters = @{},
        [string]$Method = "GET"
    )

    $headers = @{
        "Authorization" = "Bearer $apiKey"
        "Content-Type" = "application/json"
    }

    $url = "$baseUrl/api/v2/$serviceName/_proc/$ProcedureName"

    if ($Method -eq "GET") {
        $response = Invoke-RestMethod -Uri $url -Method GET -Headers $headers -Body $Parameters
    } else {
        $body = $Parameters | ConvertTo-Json
        $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $headers -Body $body
    }

    return $response
}

# Get all customers
$customers = Invoke-API -ProcedureName "GetCustomers"
Write-Host "Found $($customers.Count) customers"

# Process each customer
foreach ($customer in $customers) {
    try {
        # Get detailed customer info
        $detail = Invoke-API -ProcedureName "GetCustomerById" -Parameters @{customerId = $customer.id}
        Write-Host "Processed customer: $($detail.firstName) $($detail.lastName)"
    }
    catch {
        Write-Warning "Failed to process customer ID: $($customer.id)"
    }
}
```

---

## Postman Examples

### Setting up Postman Environment

1. **Create Environment Variables:**
   ```
   api_key: mapi_your_api_key_here
   base_url: https://api.company.com
   service_name: customer_api
   ```

2. **Set Authorization Header:**
   - Type: Bearer Token
   - Token: `{{api_key}}`

### GET Request Collection

**Get Customer by ID:**
```
GET {{base_url}}/api/v2/{{service_name}}/_proc/GetCustomerById
Params: customerId = 123
Headers: Authorization = Bearer {{api_key}}
```

**Get All Customers:**
```
GET {{base_url}}/api/v2/{{service_name}}/_proc/GetCustomers
Headers: Authorization = Bearer {{api_key}}
```

### POST Request Collection

**Create Customer:**
```
POST {{base_url}}/api/v2/{{service_name}}/_proc/CreateCustomer
Headers:
  Authorization = Bearer {{api_key}}
  Content-Type = application/json

Body (JSON):
{
  "firstName": "Alice",
  "lastName": "Johnson",
  "email": "alice.johnson@example.com",
  "phone": "555-9876"
}
```

**Update Customer:**
```
PUT {{base_url}}/api/v2/{{service_name}}/_proc/UpdateCustomer
Headers:
  Authorization = Bearer {{api_key}}
  Content-Type = application/json

Body (JSON):
{
  "customerId": 123,
  "firstName": "Alice",
  "lastName": "Johnson-Smith",
  "email": "alice.johnson.smith@example.com",
  "phone": "555-9876"
}
```

---

## cURL Examples

### Basic GET Request
```bash
# Set variables
API_KEY="mapi_your_api_key_here"
BASE_URL="https://api.company.com"
SERVICE_NAME="customer_api"

# Get customer by ID
curl -X GET \
  "$BASE_URL/api/v2/$SERVICE_NAME/_proc/GetCustomerById?customerId=123" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json"
```

### POST Request with JSON
```bash
# Create new customer
curl -X POST \
  "$BASE_URL/api/v2/$SERVICE_NAME/_proc/CreateCustomer" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Bob",
    "lastName": "Wilson",
    "email": "bob.wilson@example.com",
    "phone": "555-4321"
  }'
```

### PUT Request for Updates
```bash
# Update existing customer
curl -X PUT \
  "$BASE_URL/api/v2/$SERVICE_NAME/_proc/UpdateCustomer" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": 123,
    "firstName": "Bob",
    "lastName": "Wilson-Brown",
    "email": "bob.wilson.brown@example.com",
    "phone": "555-4321"
  }'
```

### DELETE Request
```bash
# Delete customer
curl -X DELETE \
  "$BASE_URL/api/v2/$SERVICE_NAME/_proc/DeleteCustomer?customerId=123" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json"
```

### Error Handling with cURL
```bash
# Make request with error handling
response=$(curl -s -w "%{http_code}" -X GET \
  "$BASE_URL/api/v2/$SERVICE_NAME/_proc/GetCustomerById?customerId=999" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json")

http_code="${response: -3}"
body="${response%???}"

if [ "$http_code" -eq 200 ]; then
    echo "Success: $body"
else
    echo "Error ($http_code): $body"
fi
```

---

## Advanced Features

### API Versioning
The platform supports API versioning through URL paths:
- Current: `/api/v2/{service}/_proc/{procedure}`
- Future: `/api/v3/{service}/_proc/{procedure}`

### Rate Limiting
- Default: 1000 requests per hour per API key
- Configurable per application
- Headers included: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

### Request/Response Logging
- All API calls are logged with request IDs
- Audit trails available for compliance
- Performance metrics tracked

### Swagger Documentation
- Auto-generated API documentation
- Available per role: `/api/documentation/openapi/{roleId}/ui`
- Interactive testing interface

### Legacy Client Support
- Backward compatibility for existing integrations
- Multiple authentication header formats supported
- Automatic client detection and handling

---

## Troubleshooting

### Common Connection Issues

**"Connection refused" or "Timeout"**
- Verify host and port settings
- Check firewall rules
- Ensure database server is running
- Validate network connectivity

**"Authentication failed"**
- Verify username and password
- Check user permissions in database
- Ensure user account is not locked/expired

**"Database not found"**
- Verify database name spelling
- Check user has access to specified database
- Try connecting without specifying database first

### Service Issues

**"Service not found"**
- Verify service name in API URL
- Check service is active
- Ensure service exists and is properly configured

**"No procedures found"**
- Refresh service schema
- Verify stored procedures exist in database
- Check procedure permissions for database user

### Authentication Issues

**"API key required"**
- Include Authorization header: `Bearer {api_key}`
- Verify API key format starts with `mapi_`
- Check API key hasn't been regenerated

**"Invalid API key"**
- Verify API key is correct and hasn't been regenerated
- Check application is active
- Ensure API key hasn't expired (if expiration is enabled)

**"Insufficient permissions"**
- Verify role has permission for specific procedure
- Check HTTP method is allowed for procedure
- Ensure role is assigned to application

### API Call Issues

**"Procedure not found"**
- Verify procedure name spelling in URL
- Check procedure exists in database
- Refresh service schema if procedure was recently added

**"Method not allowed"**
- Check role permissions for HTTP method
- Verify procedure supports requested method
- Use correct method (GET for queries, POST for modifications)

**"Invalid parameters"**
- Check parameter names match stored procedure parameters
- Verify data types are correct
- For GET: use query parameters; for POST/PUT: use JSON body

### Performance Issues

**Slow API responses:**
- Check database query performance
- Review stored procedure execution plans
- Consider adding database indexes
- Monitor connection pool usage

**Connection timeouts:**
- Increase connection timeout settings
- Check database server load
- Review long-running queries
- Consider connection pooling optimization

### Getting Help

1. **Check API Documentation**
   - Access Swagger UI for interactive testing
   - Review procedure-specific documentation

2. **Review Logs**
   - Check application logs for detailed error messages
   - Look for request IDs in error responses

3. **Test Components Individually**
   - Test database connection directly
   - Verify stored procedures work in database
   - Test API key authentication

4. **Contact Support**
   - Include request IDs from error responses
   - Provide specific error messages
   - Detail steps to reproduce the issue

---

## Best Practices Summary

### Security
- Use HTTPS in production environments
- Rotate API keys regularly (every 90 days)
- Follow principle of least privilege for roles
- Store API keys securely (environment variables, key vaults)
- Use dedicated database users with minimal permissions

### Performance
- Design efficient stored procedures
- Use appropriate indexes in database
- Monitor API response times
- Implement caching where appropriate
- Consider connection pooling for high-traffic applications

### Monitoring
- Set up logging for all API calls
- Monitor error rates and response times
- Track API usage patterns
- Set up alerts for failures
- Regular health checks on connections and services

### Development
- Use descriptive names for all components
- Document API usage and limitations
- Test thoroughly before production deployment
- Version control your database schema changes
- Implement proper error handling in client applications

This guide provides the foundation for successfully creating and using REST APIs with the Nectar API platform. Each step builds upon the previous ones to create a secure, scalable API infrastructure for your applications.