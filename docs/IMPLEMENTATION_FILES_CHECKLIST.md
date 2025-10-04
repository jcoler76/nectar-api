# Implementation Files Checklist

This document lists all files needed to replicate the Role Wizard and Swagger Documentation features in another application.

## Quick Reference

- 📄 **ROLE_WIZARD_IMPLEMENTATION.md** - Complete guide for role creation wizard
- 📄 **SWAGGER_DOCUMENTATION_IMPLEMENTATION.md** - Complete guide for auto-generated Swagger docs

---

## Feature 1: Role Creation Wizard with Bulk HTTP Method Assignment

### Frontend Files to Copy

#### Core Components (Required)
1. **`src/components/roles/CreateRole.jsx`**
   - Main wizard container with 4-step process
   - Handles state management and navigation
   - Orchestrates all wizard steps

2. **`src/components/roles/ApiBuilderWelcome.jsx`**
   - Step 1: Welcome screen
   - Introduction to API Builder features

3. **`src/components/roles/BulkTableSelection.jsx`**
   - Step 3: Database object selection
   - Auto-discovery of tables, views, procedures
   - Search, filter, and bulk selection

4. **`src/components/roles/BulkHttpVerbConfig.jsx`**
   - Step 4: HTTP method assignment
   - Bulk method configuration
   - Individual endpoint customization

5. **`src/components/roles/RoleEdit.jsx`**
   - Wrapper for edit mode
   - Reuses CreateRole component

6. **`src/components/ui/stepper.jsx`**
   - Stepper progress indicator
   - Shows current step and completion status

#### Supporting Files (Update if exists, create if not)
7. **`src/hooks/useRoles.js`**
   - Role management hook
   - API calls and state management

8. **`src/services/roleService.js`**
   - Role API service methods
   - createRole, updateRole, getRoles, etc.

9. **`src/services/serviceService.js`**
   - Service API methods
   - getServices, getServiceSchema

### Backend Files to Copy

#### Core Routes (Required)
1. **`server/routes/autoRest.js`**
   - Database schema discovery endpoint
   - `GET /:serviceName/_discover`
   - Returns tables, views, procedures

2. **`server/routes/roles.js`**
   - Role CRUD endpoints
   - `POST /api/roles` - Create role
   - `PUT /api/roles/:id` - Update role
   - `GET /api/roles/service/:serviceId/schema` - Get service schema

3. **`server/services/autoRest/autoRestService.js`**
   - AutoRest service logic
   - Schema discovery and entity exposure

#### Supporting Files
4. **`server/services/database/DatabaseService.js`** (if not exists)
   - Database connection and query utilities
   - getDatabaseObjects, getTableColumns

5. **`server/middleware/roleAuthorization.js`** (if not exists)
   - Role-specific authorization middleware
   - Permission checks

6. **`server/middleware/roleInputValidation.js`** (if not exists)
   - Input validation for role operations
   - Schema validation

### Dependencies

```json
{
  "dependencies": {
    "react-hook-form": "^7.x",
    "lucide-react": "^0.x"
  }
}
```

### Environment Variables

```bash
# No specific environment variables required for wizard
# Uses existing API configuration
```

---

## Feature 2: Auto-Generated Swagger Documentation

### Frontend Files to Copy

#### Core Components (Required)
1. **`src/components/common/SecureIframe.jsx`**
   - Secure iframe component with validation
   - URL allowlist checking
   - Security indicators and error handling

2. **`src/components/roles/RoleList.jsx`** (UPDATE)
   - Add Swagger action to actions column
   - Add dialog for documentation viewer
   - Integrate SecureIframe component

#### Supporting Files
3. **`src/utils/apiUrl.js`** (if not exists)
   - API URL validation utility
   - Security checks for production

### Backend Files to Copy

#### Core Routes (Required)
1. **`server/routes/swaggerUi.js`**
   - Swagger UI route handlers
   - `GET /api/swagger-ui/openapi/:roleId/ui` - Role-specific Swagger UI
   - `GET /api/swagger-ui/blueprints/ui` - Blueprints documentation

2. **`server/routes/documentation.js`**
   - OpenAPI specification generator
   - `GET /api/documentation/openapi/:roleId` - Generate OpenAPI spec
   - `GET /api/documentation/blueprints/openapi` - Blueprints OpenAPI
   - Optional: PDF export, Postman collection, AI enhancement

3. **`server/routes/blueprints.js`** (if implementing blueprints)
   - Blueprint auto-CRUD endpoints
   - Blueprint OpenAPI generation

#### Supporting Files
4. **`server/utils/schemaUtils.js`** (if not exists)
   - Schema fetching utilities
   - Database metadata extraction

5. **`server/middleware/cspHeaders.js`** (if not exists)
   - CSP headers for iframe security
   - XSS protection

### Server Configuration (UPDATE)

**File: `server/server.js`**

Add these route mounts:
```javascript
const swaggerUiRoutes = require('./routes/swaggerUi');
const documentationRoutes = require('./routes/documentation');

// Mount routes
app.use('/api/swagger-ui', swaggerUiRoutes);
app.use('/api/documentation', documentationRoutes);
```

Add session middleware (if not exists):
```javascript
const session = require('express-session');

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);
```

### Dependencies

```json
{
  "dependencies": {
    "swagger-ui-express": "^5.0.0",
    "express-session": "^1.17.3",
    "pdfkit": "^0.13.0" // Optional: for PDF export
  }
}
```

### Environment Variables

```bash
# Required
API_BASE_URL=https://api.yourdomain.com
SESSION_SECRET=your-secure-session-secret-here

# Optional
OPENAI_API_KEY=your-openai-key  # For AI-enhanced documentation
```

---

## Database Schema Requirements

### For Role Wizard

**Roles Table:**
```sql
- id (UUID, primary key)
- name (string, unique)
- description (text)
- serviceId (UUID, foreign key to services)
- permissions (JSON array)
- isActive (boolean)
- organizationId (UUID, for tenant isolation)
- createdAt (timestamp)
- updatedAt (timestamp)
```

**Services Table:**
```sql
- id (UUID, primary key)
- name (string)
- database (string)
- objects (JSON array) -- Cached schema
- organizationId (UUID)
- connectionId (UUID, optional)
```

**DatabaseObject Table (for schema caching):**
```sql
- id (UUID, primary key)
- serviceId (UUID, foreign key)
- name (string)
- schema (string)
- type (enum: TABLE, VIEW, PROCEDURE)
- metadata (JSON)
- organizationId (UUID)
```

### For Swagger Documentation

**Permissions Structure (JSON in roles.permissions):**
```json
[
  {
    "serviceId": "uuid",
    "objectName": "/table/users",
    "actions": {
      "GET": true,
      "POST": false,
      "PUT": true,
      "PATCH": false,
      "DELETE": false
    },
    "procedureSchema": {
      "parameters": [...],
      "procedure": {...}
    }
  }
]
```

---

## UI Component Libraries Required

Both features use these UI components (install if not exists):

```bash
# shadcn/ui components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add input
npx shadcn-ui@latest add select
npx shadcn-ui@latest add checkbox
npx shadcn-ui@latest add table
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add alert
npx shadcn-ui@latest add label
npx shadcn-ui@latest add switch
npx shadcn-ui@latest add form
npx shadcn-ui@latest add textarea
```

Or manually copy from:
- `src/components/ui/`

---

## Step-by-Step Implementation Guide

### Phase 1: Setup Dependencies

1. Install NPM packages:
```bash
npm install swagger-ui-express express-session react-hook-form lucide-react
```

2. Add environment variables to `.env`:
```bash
API_BASE_URL=your-api-url
SESSION_SECRET=generate-secure-random-string
```

### Phase 2: Backend Implementation

1. **Copy backend route files:**
   - `server/routes/autoRest.js`
   - `server/routes/swaggerUi.js`
   - `server/routes/documentation.js`

2. **Copy service files:**
   - `server/services/autoRest/autoRestService.js`

3. **Update `server/server.js`:**
   - Add session middleware
   - Mount new routes

4. **Copy middleware files (if needed):**
   - `server/middleware/roleAuthorization.js`
   - `server/middleware/roleInputValidation.js`
   - `server/middleware/cspHeaders.js`

### Phase 3: Frontend Implementation

1. **Copy wizard components:**
   - `src/components/roles/CreateRole.jsx`
   - `src/components/roles/ApiBuilderWelcome.jsx`
   - `src/components/roles/BulkTableSelection.jsx`
   - `src/components/roles/BulkHttpVerbConfig.jsx`
   - `src/components/roles/RoleEdit.jsx`

2. **Copy UI components:**
   - `src/components/ui/stepper.jsx`
   - `src/components/common/SecureIframe.jsx`

3. **Update role list:**
   - Modify `src/components/roles/RoleList.jsx`
   - Add Swagger action to actions column
   - Add documentation viewer dialog

4. **Copy utility files:**
   - `src/utils/apiUrl.js`

5. **Update services/hooks:**
   - `src/services/roleService.js`
   - `src/hooks/useRoles.js`

### Phase 4: Testing

1. **Test Role Wizard:**
   - Create new role flow
   - Edit existing role flow
   - Database schema discovery
   - Bulk HTTP method assignment
   - Permission saving

2. **Test Swagger Documentation:**
   - Open role Swagger from actions menu
   - Verify OpenAPI spec generation
   - Test session authentication
   - Check iframe security
   - Test Blueprints documentation

### Phase 5: Security Review

1. **Review security measures:**
   - [ ] Organization isolation (RLS)
   - [ ] Input validation
   - [ ] URL validation in iframes
   - [ ] CSP headers
   - [ ] Session security
   - [ ] API authentication

2. **Test security:**
   - [ ] Cross-organization access blocked
   - [ ] Invalid iframe sources blocked
   - [ ] SQL injection prevented
   - [ ] XSS attacks prevented

---

## File Copy Commands (Linux/Mac)

```bash
# Backend files
cp server/routes/autoRest.js /path/to/other/app/server/routes/
cp server/routes/swaggerUi.js /path/to/other/app/server/routes/
cp server/routes/documentation.js /path/to/other/app/server/routes/
cp -r server/services/autoRest /path/to/other/app/server/services/

# Frontend files - Wizard
cp src/components/roles/CreateRole.jsx /path/to/other/app/src/components/roles/
cp src/components/roles/ApiBuilderWelcome.jsx /path/to/other/app/src/components/roles/
cp src/components/roles/BulkTableSelection.jsx /path/to/other/app/src/components/roles/
cp src/components/roles/BulkHttpVerbConfig.jsx /path/to/other/app/src/components/roles/
cp src/components/roles/RoleEdit.jsx /path/to/other/app/src/components/roles/

# Frontend files - Swagger
cp src/components/common/SecureIframe.jsx /path/to/other/app/src/components/common/
cp src/components/ui/stepper.jsx /path/to/other/app/src/components/ui/

# Utility files
cp src/utils/apiUrl.js /path/to/other/app/src/utils/
```

## File Copy Commands (Windows)

```powershell
# Backend files
Copy-Item server\routes\autoRest.js -Destination \path\to\other\app\server\routes\
Copy-Item server\routes\swaggerUi.js -Destination \path\to\other\app\server\routes\
Copy-Item server\routes\documentation.js -Destination \path\to\other\app\server\routes\
Copy-Item server\services\autoRest -Destination \path\to\other\app\server\services\ -Recurse

# Frontend files - Wizard
Copy-Item src\components\roles\CreateRole.jsx -Destination \path\to\other\app\src\components\roles\
Copy-Item src\components\roles\ApiBuilderWelcome.jsx -Destination \path\to\other\app\src\components\roles\
Copy-Item src\components\roles\BulkTableSelection.jsx -Destination \path\to\other\app\src\components\roles\
Copy-Item src\components\roles\BulkHttpVerbConfig.jsx -Destination \path\to\other\app\src\components\roles\
Copy-Item src\components\roles\RoleEdit.jsx -Destination \path\to\other\app\src\components\roles\

# Frontend files - Swagger
Copy-Item src\components\common\SecureIframe.jsx -Destination \path\to\other\app\src\components\common\
Copy-Item src\components\ui\stepper.jsx -Destination \path\to\other\app\src\components\ui\

# Utility files
Copy-Item src\utils\apiUrl.js -Destination \path\to\other\app\src\utils\
```

---

## Customization Points

### Role Wizard Customization

1. **Step Content**: Modify step components for different workflows
2. **Validation Rules**: Update validation in `CreateRole.jsx`
3. **Database Types**: Extend `autoRestService.js` for other DB types
4. **Object Types**: Add support for functions, triggers, etc.
5. **Permission Model**: Modify permission structure as needed

### Swagger Documentation Customization

1. **OpenAPI Spec**: Customize in `generateOpenAPISpec()` function
2. **UI Theme**: Modify Swagger UI theme in `swaggerUi.js`
3. **Security Schemes**: Add OAuth, API Key variations
4. **Export Formats**: Add JSON, YAML, custom formats
5. **Branding**: Customize logos, colors, company info

---

## Troubleshooting

### Common Issues

1. **Schema discovery fails**
   - Check database connection configuration
   - Verify service has connectionId or legacy fields
   - Check database permissions

2. **Swagger UI doesn't load**
   - Verify session middleware is configured
   - Check CORS headers allow iframe
   - Validate URL format in SecureIframe

3. **Permissions not saving**
   - Check JSON structure of permissions
   - Verify GraphQL mutation format
   - Check database schema for permissions field

4. **Organization isolation not working**
   - Verify `withTenantContext` is used
   - Check RLS policies in database
   - Validate organizationId in all queries

---

## Support Resources

- **Role Wizard Guide**: See `ROLE_WIZARD_IMPLEMENTATION.md`
- **Swagger Docs Guide**: See `SWAGGER_DOCUMENTATION_IMPLEMENTATION.md`
- **Original Source**: `nectar-api` repository
- **Swagger UI Docs**: https://swagger.io/tools/swagger-ui/
- **OpenAPI Spec**: https://swagger.io/specification/

---

## Version Information

- **Document Version**: 1.0
- **Last Updated**: 2025-10-01
- **Source Application**: nectar-api
- **Compatible With**: React 18+, Node 18+, Express 4+

---

## Quick Start Summary

### Minimal Setup (30 minutes)

1. **Install dependencies**:
   ```bash
   npm install swagger-ui-express express-session react-hook-form lucide-react
   ```

2. **Copy core files**:
   - Backend: `autoRest.js`, `swaggerUi.js`, `documentation.js`
   - Frontend: `CreateRole.jsx`, `BulkTableSelection.jsx`, `BulkHttpVerbConfig.jsx`, `SecureIframe.jsx`

3. **Update server.js**:
   - Add session middleware
   - Mount swagger and documentation routes

4. **Update RoleList.jsx**:
   - Add Swagger action
   - Add documentation viewer dialog

5. **Test**:
   - Create a role using wizard
   - Open Swagger documentation

### Full Setup (2-4 hours)

Follow all steps in Phase 1-5 above for complete implementation with all features, security, and customizations.
