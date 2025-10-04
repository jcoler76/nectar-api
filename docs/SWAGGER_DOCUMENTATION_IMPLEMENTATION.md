# Auto-Generated Swagger Documentation Implementation Guide

This document provides complete implementation details for the auto-generated Swagger/OpenAPI documentation feature based on role permissions.

## Overview

The system automatically generates interactive Swagger UI documentation for each role, showing only the endpoints that role has access to. Documentation is dynamically generated from role permissions and database schemas.

### Key Features:
- **Role-based documentation** - Each role gets custom API docs
- **Auto-generated OpenAPI 3.0 specs** - Based on database schemas and permissions
- **Interactive Swagger UI** - Embedded in secure iframes
- **Session-based authentication** - Works with existing user sessions
- **Blueprints documentation** - Separate docs for blueprint endpoints

---

## Architecture Overview

```
Frontend (React)                Backend (Node.js)
┌─────────────────┐           ┌──────────────────────┐
│  RoleList.jsx   │           │  swaggerUi.js        │
│                 │           │  (Swagger UI routes) │
│  Click Swagger  │──────────▶│                      │
│  Action         │           │  /swagger-ui/        │
└─────────────────┘           │  openapi/:roleId/ui  │
         │                    └──────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────┐           ┌──────────────────────┐
│  Dialog opens   │           │  documentation.js    │
│  with iframe    │◀──────────│  (OpenAPI generator) │
│                 │           │                      │
│  SecureIframe   │           │  /api/documentation/ │
│  loads Swagger  │           │  openapi/:roleId     │
└─────────────────┘           └──────────────────────┘
```

---

## Frontend Implementation

### 1. Role List with Swagger Action

**File: `src/components/roles/RoleList.jsx`**

```jsx
import { Info } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import SecureIframe from '../common/SecureIframe';
import { Button } from '../ui/button';

const RoleList = () => {
  const { roles } = useRoles();

  // Swagger dialog state
  const [swaggerDialog, setSwaggerDialog] = useState({
    open: false,
    selectedRole: null,
  });

  // Documentation viewer state
  const [docViewer, setDocViewer] = useState({
    open: false,
    url: '',
    title: '',
  });

  const openSwaggerDialog = (role) => {
    setSwaggerDialog({
      open: true,
      selectedRole: role,
    });
  };

  const handleOpenSwaggerForRole = () => {
    if (!swaggerDialog.selectedRole?.id) return;

    // Validate role ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(swaggerDialog.selectedRole.id)) {
      console.error('Invalid role ID format');
      return;
    }

    // Sanitize role name
    const sanitizedRoleName = swaggerDialog.selectedRole.name?.replace(/[<>"']/g, '') || 'Unknown Role';

    const apiUrl = getApiUrl();
    const url = `${apiUrl}/api/swagger-ui/openapi/${encodeURIComponent(swaggerDialog.selectedRole.id)}/ui`;

    setDocViewer({
      open: true,
      url,
      title: `Swagger Documentation - ${sanitizedRoleName}`,
    });
    setSwaggerDialog(prev => ({ ...prev, open: false }));
  };

  const handleOpenBlueprintsDoc = () => {
    const apiUrl = getApiUrl();
    setDocViewer({
      open: true,
      url: `${apiUrl}/api/swagger-ui/blueprints/ui`,
      title: 'Blueprints Documentation',
    });
    setSwaggerDialog(prev => ({ ...prev, open: false }));
  };

  // Column definition includes Swagger action
  const columns = [
    // ... other columns
    {
      accessorKey: 'actions',
      header: 'Actions',
      type: 'actions',
      actions: [
        {
          label: 'Swagger',
          icon: Info,
          tooltip: 'Open Swagger UI documentation for this role',
          onClick: role => openSwaggerDialog(role),
        },
        // ... other actions
      ],
    },
  ];

  return (
    <>
      <BaseListView
        title="Roles"
        data={roles}
        columns={columns}
        // ... other props
      />

      {/* Swagger Role Documentation Dialog */}
      <Dialog
        open={swaggerDialog.open}
        onOpenChange={open => setSwaggerDialog(prev => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Role Documentation</DialogTitle>
            <DialogDescription>
              Access documentation for the "{swaggerDialog.selectedRole?.name}" role
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={handleOpenBlueprintsDoc}>
                Open Blueprints Docs
              </Button>
              <Button onClick={handleOpenSwaggerForRole}>
                Open Role Swagger
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Embedded Documentation Viewer */}
      <Dialog
        open={docViewer.open}
        onOpenChange={open => setDocViewer(prev => ({ ...prev, open }))}
        className="max-w-7xl w-full h-[90vh]"
      >
        <DialogContent className="max-w-7xl w-full h-[90vh] p-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle>{docViewer.title}</DialogTitle>
            <DialogDescription>
              Interactive API documentation with session-based authentication
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 w-full h-full min-h-[70vh]">
            <SecureIframe
              src={docViewer.url}
              title={docViewer.title}
              className="rounded-b-lg"
              style={{ minHeight: '70vh' }}
              onLoad={() => {
                // Documentation loaded successfully
              }}
              onError={() => {
                console.error('Failed to load documentation');
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RoleList;
```

---

### 2. Secure Iframe Component

**File: `src/components/common/SecureIframe.jsx`**

This component provides security validation and iframe protection:

```jsx
import { ExternalLink, Shield, AlertTriangle } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

// SECURITY: Strict allowlist of permitted iframe sources
const ALLOWED_IFRAME_SOURCES = [
  '/api/swagger-ui/',  // Only allow same-origin API documentation
];

// SECURITY: Restricted sandbox permissions
const SECURE_SANDBOX_PERMISSIONS = [
  'allow-same-origin',  // Required for API documentation
  'allow-scripts',      // Required for Swagger UI
];

const validateIframeSrc = url => {
  if (!url) return { isValid: false, reason: 'URL is required' };

  try {
    const parsedUrl = new URL(url, window.location.origin);

    // Block non-HTTPS URLs (except localhost for dev)
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return { isValid: false, reason: 'Only HTTPS URLs are allowed' };
    }

    // Check against allowlist
    const isAllowed = ALLOWED_IFRAME_SOURCES.some(allowedPath =>
      parsedUrl.pathname.startsWith(allowedPath)
    );

    if (!isAllowed) {
      return {
        isValid: false,
        reason: `URL path not in allowlist. Allowed: ${ALLOWED_IFRAME_SOURCES.join(', ')}`,
      };
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, reason: 'Invalid URL format' };
  }
};

const SecureIframe = ({ src, title, className = '', style = {}, onLoad, onError }) => {
  const [validationResult, setValidationResult] = useState({ isValid: true });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const result = validateIframeSrc(src);
    setValidationResult(result);
  }, [src]);

  if (!validationResult.isValid) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Security Warning:</strong> {validationResult.reason}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-2 right-2 z-10">
        <div className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
          <Shield className="h-3 w-3" />
          <span>Secured</span>
        </div>
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-600">Loading secure content...</p>
          </div>
        </div>
      )}

      <iframe
        src={src}
        title={title}
        className={`w-full h-full border-0 ${className}`}
        style={style}
        onLoad={() => {
          setIsLoading(false);
          onLoad?.();
        }}
        onError={onError}
        sandbox={SECURE_SANDBOX_PERMISSIONS.join(' ')}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="none"
      />
    </div>
  );
};

export default SecureIframe;
```

---

## Backend Implementation

### 1. Swagger UI Routes

**File: `server/routes/swaggerUi.js`**

```javascript
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const { logger } = require('../utils/logger');

const router = express.Router();

// Blueprints Swagger UI
router.use('/blueprints/ui', swaggerUi.serve, (req, res, next) => {
  const baseUrl = `${req.protocol}://${req.get('host')}/api/documentation/blueprints/openapi`;

  return swaggerUi.setup(null, {
    swaggerOptions: {
      url: baseUrl,
      displayRequestDuration: true,
    },
    customSiteTitle: 'Nectar Blueprints API Docs',
  })(req, res, next);
});

// Role-based Swagger UI (dynamic per role)
router.use('/openapi/:roleId/ui', swaggerUi.serve, (req, res, next) => {
  const baseUrl = `${req.protocol}://${req.get('host')}/api/documentation/openapi/${encodeURIComponent(
    req.params.roleId
  )}`;

  return swaggerUi.setup(null, {
    swaggerOptions: {
      url: baseUrl,
      displayRequestDuration: true,
      withCredentials: true,  // Enable sending cookies
      requestInterceptor: `(function(request) {
        request.credentials = 'include';
        return request;
      })`,
    },
    customSiteTitle: `Nectar API Docs - Role ${req.params.roleId}`,
  })(req, res, next);
});

module.exports = router;
```

---

### 2. OpenAPI Specification Generator

**File: `server/routes/documentation.js`**

```javascript
const express = require('express');
const router = express.Router();
const prismaService = require('../services/prismaService');
const { logger } = require('../utils/logger');

// Generate OpenAPI 3.0 specification for a role
router.get('/openapi/:roleId', async (req, res) => {
  try {
    // Check for user from either JWT token or session
    const organizationId = req.user?.organizationId || req.session?.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const role = await prismaService.withTenantContext(organizationId, async tx => {
      return await tx.role.findUnique({
        where: { id: req.params.roleId },
        include: {
          service: true,  // Include service info
        },
      });
    });

    if (!role) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Role not found' }
      });
    }

    // Transform permissions into endpoints
    const permissions = Array.isArray(role.permissions) ? role.permissions : [];

    const endpoints = permissions
      .filter(perm => perm.objectName)
      .map(perm => {
        const allowedMethods = Object.entries(perm.actions || {})
          .filter(([_, allowed]) => allowed)
          .map(([method]) => method);

        const schemaData = perm.procedureSchema || perm.schema;

        return {
          path: `/api/v2/${role.service.name}${perm.objectName}`,
          methods: allowedMethods,
          service: role.service.name,
          objectName: perm.objectName,
          parameters: schemaData?.parameters || [],
          procedureInfo: schemaData?.procedure || null,
        };
      });

    const openApiSpec = generateOpenAPISpec(role, endpoints);
    res.json(openApiSpec);
  } catch (error) {
    logger.error('OpenAPI generation error', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// Helper function to generate OpenAPI 3.0 specification
function generateOpenAPISpec(role, endpoints) {
  const paths = {};
  const components = {
    schemas: {},
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
      },
    },
  };

  endpoints.forEach(endpoint => {
    const path = endpoint.path;
    paths[path] = {};

    endpoint.methods.forEach(method => {
      const operation = {
        summary: `Execute ${endpoint.objectName}`,
        description: `Execute the ${endpoint.objectName} stored procedure on ${endpoint.service} service`,
        tags: [endpoint.service],
        security: [{ ApiKeyAuth: [] }],
        parameters: [],
        responses: {
          200: {
            description: 'Successful execution',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { type: 'object' } },
                    metadata: { type: 'object' },
                  },
                },
              },
            },
          },
          400: { description: 'Bad request - invalid parameters' },
          401: { description: 'Unauthorized - invalid API key' },
          403: { description: 'Forbidden - insufficient permissions' },
          500: { description: 'Internal server error' },
        },
      };

      // Add parameters from stored procedure schema
      if (endpoint.parameters) {
        endpoint.parameters.forEach(param => {
          if (!param.isOutput) {
            operation.parameters.push({
              name: param.name,
              in: method === 'GET' ? 'query' : 'formData',
              required: !param.isNullable,
              schema: {
                type: mapSqlTypeToOpenApi(param.type),
                description: param.description || `Parameter for ${endpoint.objectName}`,
              },
            });
          }
        });
      }

      paths[path][method.toLowerCase()] = operation;
    });
  });

  return {
    openapi: '3.0.0',
    info: {
      title: `${role.name} API Documentation`,
      description: `API documentation for role: ${role.description || role.name}`,
      version: '1.0.0',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3001',
        description: 'API Server',
      },
    ],
    paths,
    components,
    security: [{ ApiKeyAuth: [] }],
  };
}

// Helper to map SQL types to OpenAPI types
function mapSqlTypeToOpenApi(sqlType) {
  const typeMap = {
    varchar: 'string',
    nvarchar: 'string',
    int: 'integer',
    bigint: 'integer',
    decimal: 'number',
    float: 'number',
    bit: 'boolean',
    datetime: 'string',
    uniqueidentifier: 'string',
  };

  return typeMap[sqlType?.toLowerCase()] || 'string';
}

module.exports = router;
```

---

### 3. Blueprint Documentation

**File: `server/routes/blueprints.js`** (Excerpt)

```javascript
// Generate OpenAPI spec for blueprints
router.get('/openapi', authMiddleware, async (req, res) => {
  try {
    const allowedModels = Object.keys(BLUEPRINTS_CONFIG.models);

    const paths = {};

    // Generate paths for each model
    allowedModels.forEach(model => {
      const modelConfig = BLUEPRINTS_CONFIG.models[model];

      // List endpoint
      paths[`/api/blueprints/${model}`] = {
        get: {
          summary: `List ${model}`,
          description: `Retrieve a paginated list of ${model}`,
          tags: ['Blueprints'],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', default: 1 },
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 20 },
            },
            // ... more parameters
          ],
          responses: {
            200: {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'array' },
                      pagination: { type: 'object' },
                    },
                  },
                },
              },
            },
          },
        },
      };

      // Get by ID endpoint
      paths[`/api/blueprints/${model}/{id}`] = {
        get: {
          summary: `Get ${model} by ID`,
          tags: ['Blueprints'],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            200: { description: 'Successful response' },
            404: { description: 'Not found' },
          },
        },
      };
    });

    const openApiSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Blueprints API',
        description: 'Auto-generated CRUD API for system blueprints',
        version: '1.0.0',
      },
      servers: [
        {
          url: process.env.API_BASE_URL || 'http://localhost:3001',
        },
      ],
      paths,
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    };

    res.json(openApiSpec);
  } catch (error) {
    logger.error('Blueprints OpenAPI generation error', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## Server Setup

### Main Server Configuration

**File: `server/server.js`** (Relevant sections)

```javascript
const express = require('express');
const session = require('express-session');
const swaggerUiRoutes = require('./routes/swaggerUi');
const documentationRoutes = require('./routes/documentation');

const app = express();

// Session configuration for Swagger UI
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Mount routes
app.use('/api/swagger-ui', swaggerUiRoutes);
app.use('/api/documentation', documentationRoutes);

// Install swagger-ui-express
// npm install swagger-ui-express
```

---

## Environment Variables

```bash
# API Base URL
API_BASE_URL=https://api.yourdomain.com

# Session Secret
SESSION_SECRET=your-secure-session-secret-here

# Feature Flags
BLUEPRINTS_ENABLED=true
```

---

## NPM Dependencies

```json
{
  "dependencies": {
    "swagger-ui-express": "^5.0.0",
    "express-session": "^1.17.3"
  }
}
```

---

## API URL Validation Utility

**File: `src/utils/apiUrl.js`**

```javascript
// Enhanced API URL validation with security checks
export const getApiUrl = () => {
  const envUrl = process.env.REACT_APP_API_URL;

  if (!envUrl || envUrl.trim() === '') {
    return 'http://localhost:3001';
  }

  try {
    const url = new URL(envUrl.trim());

    // Block dangerous protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      console.warn('Invalid protocol, falling back to localhost:', envUrl);
      return 'http://localhost:3001';
    }

    // In production, require HTTPS
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
      console.warn('HTTPS required in production, falling back:', envUrl);
      return 'https://localhost:3001';
    }

    return url.href.replace(/\/$/, ''); // Remove trailing slash
  } catch (error) {
    console.warn('Invalid API URL, falling back to localhost:', envUrl);
    return 'http://localhost:3001';
  }
};
```

---

## Session Authentication Flow

```
1. User logs in
   ↓
2. Session created with user data
   ↓
3. User opens role Swagger documentation
   ↓
4. Frontend opens dialog with iframe
   ↓
5. Iframe requests: /api/swagger-ui/openapi/:roleId/ui
   ↓
6. Swagger UI loads and requests: /api/documentation/openapi/:roleId
   ↓
7. Backend checks session authentication
   ↓
8. If authenticated, generate OpenAPI spec from role permissions
   ↓
9. Return OpenAPI JSON to Swagger UI
   ↓
10. Swagger UI renders interactive documentation
```

---

## Testing Checklist

### Frontend Testing
- [ ] Swagger action button appears in role list
- [ ] Clicking Swagger opens dialog with options
- [ ] "Open Role Swagger" button works
- [ ] "Open Blueprints Docs" button works
- [ ] SecureIframe validates URLs correctly
- [ ] Security warning shows for invalid URLs
- [ ] Loading indicator displays while loading
- [ ] Error handling works for failed loads
- [ ] "Open in New Tab" button works
- [ ] Security badge shows when iframe loads

### Backend Testing
- [ ] `/api/swagger-ui/openapi/:roleId/ui` loads Swagger UI
- [ ] `/api/swagger-ui/blueprints/ui` loads Blueprint docs
- [ ] `/api/documentation/openapi/:roleId` returns valid OpenAPI JSON
- [ ] Session authentication works for iframe requests
- [ ] Role permissions correctly mapped to endpoints
- [ ] HTTP methods correctly reflected in OpenAPI spec
- [ ] Parameters from database schema included
- [ ] Security schemes configured correctly
- [ ] Error responses for missing/invalid roles
- [ ] Organization isolation enforced (RLS)

### Security Testing
- [ ] Cannot load documentation for other organization's roles
- [ ] Iframe only loads from allowed sources
- [ ] Non-HTTPS URLs blocked in production
- [ ] Dangerous query parameters blocked
- [ ] Sandbox permissions properly restricted
- [ ] CSP headers prevent XSS attacks
- [ ] Session hijacking prevented
- [ ] API key authentication documented

---

## Troubleshooting

### Issue: Swagger UI not loading
- **Check**: Session authentication is working
- **Check**: Role ID is valid UUID format
- **Check**: CORS headers allow iframe embedding
- **Fix**: Ensure `withCredentials: true` in Swagger options

### Issue: Documentation is empty
- **Check**: Role has permissions assigned
- **Check**: Database schema is populated for service
- **Fix**: Run schema refresh for the service

### Issue: "Security Warning" in iframe
- **Check**: URL starts with `/api/swagger-ui/`
- **Check**: URL validation in SecureIframe component
- **Fix**: Update ALLOWED_IFRAME_SOURCES array

### Issue: Parameters not showing
- **Check**: `procedureSchema` or `schema` field populated on permissions
- **Check**: Schema refresh has run for the service
- **Fix**: POST to `/api/documentation/refresh-schemas/:roleId`

---

## Advanced Features

### AI-Enhanced Documentation (Optional)

The system supports AI-generated documentation using OpenAI:

```javascript
// Generate AI-enhanced documentation
router.get('/ai-enhance/:roleId/:permissionId', async (req, res) => {
  const enhancedDoc = await generateAIEnhancedDocumentation(permission);
  res.json(enhancedDoc);
});
```

### PDF Export (Optional)

Export documentation as branded PDF:

```javascript
// Generate PDF documentation
router.get('/pdf/:roleId', async (req, res) => {
  const pdfBuffer = await generatePDFDocumentation(role, options);
  res.setHeader('Content-Type', 'application/pdf');
  res.send(pdfBuffer);
});
```

### Postman Collection Export (Optional)

Generate Postman collection from role:

```javascript
// Generate Postman collection
router.get('/postman/:roleId', async (req, res) => {
  const collection = generatePostmanCollection(role, endpoints);
  res.json(collection);
});
```

---

## Integration Summary

### Required Files to Copy

**Frontend:**
1. `src/components/common/SecureIframe.jsx`
2. Update `src/components/roles/RoleList.jsx` (add Swagger action)
3. `src/utils/apiUrl.js` (if not exists)

**Backend:**
1. `server/routes/swaggerUi.js`
2. `server/routes/documentation.js`
3. Update `server/server.js` (mount routes)

**Dependencies:**
```bash
npm install swagger-ui-express express-session
```

**Environment:**
```bash
API_BASE_URL=your-api-url
SESSION_SECRET=your-session-secret
```

---

## Security Best Practices

1. **Always validate role access** - Ensure user can access the role
2. **Enforce organization isolation** - Use RLS/tenant context
3. **Secure iframe sources** - Strict allowlist validation
4. **Session security** - HTTP-only cookies, secure flag in production
5. **Input sanitization** - Validate and sanitize all inputs
6. **CSP headers** - Prevent XSS in iframes
7. **Rate limiting** - Limit documentation generation requests
8. **Audit logging** - Log all documentation access

---

## Performance Optimization

1. **Cache OpenAPI specs** - Cache generated specs for 5-15 minutes
2. **Lazy load schemas** - Only fetch schemas when needed
3. **Pagination** - Limit endpoints shown in single view
4. **CDN for Swagger UI assets** - Use CDN for faster loading
5. **Compress responses** - Enable gzip compression
6. **Debounce requests** - Prevent rapid regeneration requests

---

## Additional Resources

- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)
- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [Express Session](https://github.com/expressjs/session)
- [iframe Security Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#iframes)
