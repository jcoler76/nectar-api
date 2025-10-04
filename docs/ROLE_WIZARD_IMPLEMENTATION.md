# Role Creation Wizard Implementation Guide

This document provides complete implementation details for the role creation wizard with bulk HTTP method assignment, based on the nectar-api application.

## Overview

The role creation wizard is a 4-step process that guides users through creating API roles with auto-discovered database endpoints and bulk HTTP method assignment.

### Wizard Steps:
1. **Welcome** - Introduction to API Builder
2. **Basic Information** - Role name, description, and status
3. **Select Endpoints** - Database object discovery and selection
4. **Configure Endpoints** - Bulk HTTP method assignment

---

## Frontend Implementation

### File Structure

```
src/
├── components/
│   ├── roles/
│   │   ├── RoleList.jsx              # Main role listing component
│   │   ├── CreateRole.jsx            # Main wizard container
│   │   ├── RoleEdit.jsx              # Edit wrapper (reuses CreateRole)
│   │   ├── ApiBuilderWelcome.jsx     # Step 1: Welcome screen
│   │   ├── BulkTableSelection.jsx    # Step 3: Database object selection
│   │   └── BulkHttpVerbConfig.jsx    # Step 4: HTTP method assignment
│   ├── ui/
│   │   └── stepper.jsx               # Stepper progress indicator
│   └── common/
│       └── BaseListView.jsx          # List view base component
├── hooks/
│   └── useRoles.js                   # Role management hook
└── services/
    └── roleService.js                # API calls for roles
```

---

## Step-by-Step Implementation

### Step 1: Welcome Screen Component

**File: `src/components/roles/ApiBuilderWelcome.jsx`**

```jsx
import { ArrowRight, Sparkles } from 'lucide-react';
import React from 'react';

import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

const ApiBuilderWelcome = ({ onNext }) => {
  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-10 w-10 text-primary" />
        </div>
        <CardTitle className="text-2xl">Welcome to API Builder</CardTitle>
        <CardDescription className="text-lg">
          Generate production-ready REST APIs from your database in under 5 minutes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          <div className="rounded-lg border p-4">
            <h4 className="font-semibold text-green-800">✨ Zero-Code API Generation</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Connect your database and instantly generate secure REST endpoints
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h4 className="font-semibold text-blue-800">🔍 Auto-Discovery</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Automatically discovers all tables, views, and their schemas
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h4 className="font-semibold text-purple-800">🚀 Instant Testing</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Built-in API explorer for immediate testing and documentation
            </p>
          </div>
        </div>

        <div className="pt-4 text-center">
          <Button onClick={onNext} variant="ocean" size="lg" className="px-8">
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApiBuilderWelcome;
```

---

### Step 2: Main Wizard Container

**File: `src/components/roles/CreateRole.jsx`** (Key sections)

```jsx
import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Stepper } from '../ui/stepper';

// Import wizard step components
import ApiBuilderWelcome from './ApiBuilderWelcome';
import BulkTableSelection from './BulkTableSelection';
import BulkHttpVerbConfig from './BulkHttpVerbConfig';

const steps = ['Welcome', 'Basic Information', 'Select Endpoints', 'Configure Endpoints'];

const CreateRole = ({ mode = 'create', existingRole = null }) => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(mode === 'edit' ? 1 : 0);
  const [role, setRole] = useState({
    name: '',
    description: '',
    serviceId: '',
    permissions: [],
    isActive: true,
  });

  // State for bulk operations
  const [selectedTables, setSelectedTables] = useState([]);
  const [bulkPermissions, setBulkPermissions] = useState([]);

  const form = useForm({
    defaultValues: {
      name: '',
      description: '',
      isActive: true,
    },
  });

  // Navigation handlers
  const handleNext = async () => {
    if (activeStep === 0) {
      setActiveStep(prevStep => prevStep + 1);
      return;
    }

    if (activeStep === 1) {
      const formData = form.getValues();
      if (!formData.name) {
        setError('Please enter a role name');
        return;
      }
      setRole(prev => ({
        ...prev,
        name: formData.name,
        description: formData.description,
        isActive: formData.isActive,
      }));
    }

    if (activeStep === 2) {
      if (selectedTables.length === 0) {
        setError('Please select at least one object');
        return;
      }
    }

    if (activeStep === 3) {
      const hasValidPermissions = bulkPermissions.some(permission =>
        Object.values(permission.actions).some(enabled => enabled)
      );

      if (!hasValidPermissions) {
        setError('Please select at least one HTTP method for the objects');
        return;
      }
    }

    setActiveStep(prevStep => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep(prevStep => prevStep - 1);
  };

  // Bulk selection callbacks
  const handleTablesSelected = (tables, serviceId) => {
    setSelectedTables(tables);
    setRole(prev => ({ ...prev, serviceId }));
  };

  const handlePermissionsChange = useCallback(permissions => {
    setBulkPermissions(permissions);
  }, []);

  const handleRemoveTable = useCallback(tableName => {
    setSelectedTables(prev => prev.filter(table => table.name !== tableName));
  }, []);

  // Final submission
  const handleSubmit = async () => {
    const roleData = {
      name: role.name,
      description: role.description,
      serviceId: role.serviceId,
      permissions: bulkPermissions,
      isActive: role.isActive,
    };

    if (mode === 'edit') {
      await updateRole(existingRole.id, roleData);
    } else {
      await createRole(roleData);
    }

    navigate('/roles');
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <Stepper steps={steps} activeStep={activeStep} className="mb-8" />

      <Card>
        <CardContent className="pt-6">
          {activeStep === 0 && <ApiBuilderWelcome onNext={handleNext} />}
          {activeStep === 1 && renderBasicInfo()}
          {activeStep === 2 && (
            <BulkTableSelection
              onTablesSelected={handleTablesSelected}
              selectedService={selectedService}
              setSelectedService={setSelectedService}
            />
          )}
          {activeStep === 3 && (
            <BulkHttpVerbConfig
              selectedTables={selectedTables}
              selectedService={selectedService}
              onPermissionsChange={handlePermissionsChange}
              existingPermissions={role?.permissions || []}
              onRemoveTable={handleRemoveTable}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      {activeStep > 0 && (
        <div className="flex flex-col-reverse sm:flex-row justify-end mt-6 gap-2">
          <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          {activeStep > 0 && (
            <Button variant="outline" onClick={handleBack}>Back</Button>
          )}
          {activeStep === steps.length - 1 ? (
            <Button onClick={handleSubmit} variant="ocean">
              {mode === 'edit' ? 'Update' : 'Create'} Role
            </Button>
          ) : (
            <Button onClick={handleNext} variant="ocean">Next</Button>
          )}
        </div>
      )}
    </div>
  );
};

export default CreateRole;
```

---

### Step 3: Database Object Selection (Auto-Discovery)

**File: `src/components/roles/BulkTableSelection.jsx`**

**Key Features:**
- Auto-discovers database schema via API
- Groups objects by type (Tables, Views, Procedures)
- Search and filter functionality
- Bulk selection with checkboxes
- Shows already-exposed endpoints

**API Endpoint Used:**
```
GET /api/v2/:serviceName/_discover
```

**Component Structure:**
```jsx
const BulkTableSelection = ({ onTablesSelected, selectedService, setSelectedService }) => {
  const [discoveredObjects, setDiscoveredObjects] = useState({
    tables: [],
    views: [],
    procedures: [],
  });
  const [selectedObjects, setSelectedObjects] = useState(new Set());

  const discoverTables = async (serviceId) => {
    const service = services.find(s => s.id === serviceId);
    const response = await api.get(`/api/v2/${service.name}/_discover`);
    const data = response.data.data || {};

    setDiscoveredObjects({
      tables: data.tables || [],
      views: data.views || [],
      procedures: data.procedures || [],
    });
  };

  return (
    <div className="space-y-6">
      {/* Service Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Database Service</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedService} onValueChange={handleServiceChange}>
            {/* Services dropdown */}
          </Select>
          <Button onClick={discoverTables}>Discover Schema</Button>
        </CardContent>
      </Card>

      {/* Tabbed object display */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tables">Tables ({discoveredObjects.tables.length})</TabsTrigger>
          <TabsTrigger value="views">Views ({discoveredObjects.views.length})</TabsTrigger>
          <TabsTrigger value="procedures">Procedures ({discoveredObjects.procedures.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="tables">
          {renderObjectList(discoveredObjects.tables, 'tables')}
        </TabsContent>
        {/* Similar for views and procedures */}
      </Tabs>
    </div>
  );
};
```

---

### Step 4: Bulk HTTP Method Configuration

**File: `src/components/roles/BulkHttpVerbConfig.jsx`**

**Key Features:**
- Bulk apply HTTP methods to all selected endpoints
- Individual endpoint method customization
- Permission summary and validation
- Remove endpoints from selection

```jsx
const BulkHttpVerbConfig = ({
  selectedTables,
  selectedService,
  onPermissionsChange,
  existingPermissions = [],
  onRemoveTable,
}) => {
  const [bulkActions, setBulkActions] = useState({
    GET: false,
    POST: false,
    PUT: false,
    PATCH: false,
    DELETE: false,
  });

  const [tablePermissions, setTablePermissions] = useState({});

  // Bulk action handler
  const handleBulkActionChange = (action, checked) => {
    setBulkActions(prev => ({ ...prev, [action]: checked }));

    // Apply to all selected tables
    setTablePermissions(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(tableName => {
        updated[tableName] = { ...updated[tableName], [action]: checked };
      });
      return updated;
    });
  };

  // Individual table action handler
  const handleTableActionChange = (tableName, action, checked) => {
    setTablePermissions(prev => ({
      ...prev,
      [tableName]: {
        ...prev[tableName],
        [action]: checked,
      },
    }));
  };

  // Notify parent when permissions change
  useEffect(() => {
    const permissions = Object.entries(tablePermissions).map(([tableName, actions]) => ({
      serviceId: selectedService,
      objectName: `/table/${tableName}`,
      actions: actions,
    }));
    onPermissionsChange(permissions);
  }, [tablePermissions, selectedService, onPermissionsChange]);

  return (
    <div className="space-y-6">
      {/* Bulk Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Bulk HTTP Method Configuration</CardTitle>
          <CardDescription>Apply HTTP methods to all selected endpoints at once</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(method => (
              <div key={method} className="flex items-center space-x-2">
                <Checkbox
                  id={`bulk-${method}`}
                  checked={bulkActions[method]}
                  onCheckedChange={checked => handleBulkActionChange(method, checked)}
                />
                <Label htmlFor={`bulk-${method}`}>{method}</Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Individual Endpoint Permissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Endpoint Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Endpoint Name</TableHead>
                <TableHead>GET</TableHead>
                <TableHead>POST</TableHead>
                <TableHead>PUT</TableHead>
                <TableHead>PATCH</TableHead>
                <TableHead>DELETE</TableHead>
                <TableHead>Actions</TableHead>
                <TableHead>Remove</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedTables.map(table => (
                <TableRow key={table.name}>
                  <TableCell>{table.name}</TableCell>
                  {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(method => (
                    <TableCell key={method}>
                      <Checkbox
                        checked={tablePermissions[table.name]?.[method] || false}
                        onCheckedChange={checked =>
                          handleTableActionChange(table.name, method, checked)
                        }
                      />
                    </TableCell>
                  ))}
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {getSelectedActionsCount(tablePermissions[table.name])} method(s)
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveTable(table.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Permission Summary</h4>
              <p className="text-sm text-muted-foreground">
                {selectedTables.length} endpoints configured with API access
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">
                Total Endpoints: {calculateTotalEndpoints(tablePermissions)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
```

---

## Backend Implementation

### AutoRest Discovery Endpoint

**File: `server/routes/autoRest.js`**

```javascript
// Discover all tables/collections in database (from stored schema data)
router.get('/:serviceName/_discover', authMiddleware, async (req, res) => {
  try {
    const prismaService = require('../services/prismaService');

    // Use withTenantContext to properly enforce RLS
    const result = await prismaService.withTenantContext(req.user.organizationId, async tx => {
      // Find the service by name for this organization
      const service = await tx.service.findFirst({
        where: {
          name: req.params.serviceName,
          organizationId: req.user.organizationId,
          isActive: true,
        },
      });

      if (!service) {
        return { error: { code: 'SERVICE_NOT_FOUND', message: 'Service not found or inactive' } };
      }

      // Get stored database objects for this service
      const databaseObjects = await tx.databaseObject.findMany({
        where: {
          serviceId: service.id,
          organizationId: req.user.organizationId,
        },
        select: {
          name: true,
          schema: true,
          type: true,
          metadata: true,
        },
      });

      // Get exposed entities to mark which tables are already exposed
      const exposedEntities = await tx.exposedEntity.findMany({
        where: {
          serviceId: service.id,
          organizationId: req.user.organizationId,
        },
        select: {
          name: true,
          schema: true,
        },
      });

      return { service, databaseObjects, exposedEntities };
    });

    if (result.error) {
      return res.status(404).json({ error: result.error });
    }

    const { service, databaseObjects, exposedEntities } = result;

    // Create exposed lookup
    const exposedLookup = new Set();
    exposedEntities.forEach(e => {
      const key = e.schema ? `${e.schema}.${e.name}` : e.name;
      exposedLookup.add(key);
    });

    // Format the response
    const objects = databaseObjects.map(obj => {
      const key = obj.schema ? `${obj.schema}.${obj.name}` : obj.name;
      return {
        name: obj.name,
        schema: obj.schema,
        type: obj.type.toUpperCase(),
        isExposed: exposedLookup.has(key),
        metadata: obj.metadata || {},
        suggestedPathSlug: obj.name
          .toLowerCase()
          .replace(/^(gs|tbl|sp_|fn_)_?/, '')
          .replace(/_/g, '-'),
      };
    });

    // Group by type
    const groupedObjects = {
      tables: objects.filter(obj => obj.type === 'USER_TABLE'),
      views: objects.filter(obj => obj.type === 'VIEW'),
      procedures: objects.filter(obj => obj.type === 'SQL_STORED_PROCEDURE'),
    };

    res.json({
      data: groupedObjects,
      total: objects.length,
      exposed: objects.filter(obj => obj.isExposed).length,
      counts: {
        tables: groupedObjects.tables.length,
        views: groupedObjects.views.length,
        procedures: groupedObjects.procedures.length,
      },
    });
  } catch (e) {
    logger.error('auto-rest discover error', { error: e.message });
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: e.message } });
  }
});
```

### Role Creation Endpoint

**File: `server/routes/roles.js`**

```javascript
// Create new role - comprehensive security stack
router.post(
  '/',
  ...createRoleAuthStack('create', { requireServiceAccess: true }),
  checkFreemiumLimits('roles'),
  ...validateRoleCreation(),
  sanitizeRoleInputs(),
  async (req, res) => {
    try {
      const { name, description, serviceId, permissions, isActive } = req.body;
      const context = createGraphQLContext(req);

      logger.info('Creating role', {
        name,
        serviceId,
        permissions: permissions || [],
        permissionsLength: (permissions || []).length,
        isActive,
      });

      const result = await executeGraphQLMutation(
        res,
        ROLE_QUERIES.CREATE,
        {
          input: {
            name,
            description,
            serviceId,
            permissions: permissions || [],
            isActive,
          },
        },
        context,
        'create role'
      );

      if (!result) return; // Error already handled

      res.status(201).json(result.createRole);
    } catch (error) {
      logger.error('Role creation route error', { error: error.message });
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);
```

---

## Key Data Structures

### Permission Object Format

```javascript
{
  serviceId: "uuid-service-id",
  objectName: "/table/tableName", // or "/view/viewName" or "/proc/procName"
  actions: {
    GET: true,
    POST: false,
    PUT: true,
    PATCH: false,
    DELETE: false
  }
}
```

### Role Creation Payload

```javascript
{
  name: "API Consumer Role",
  description: "Role for API consumers with limited access",
  serviceId: "uuid-service-id",
  permissions: [
    {
      serviceId: "uuid-service-id",
      objectName: "/table/users",
      actions: { GET: true, POST: false, PUT: false, PATCH: false, DELETE: false }
    },
    {
      serviceId: "uuid-service-id",
      objectName: "/table/products",
      actions: { GET: true, POST: true, PUT: true, PATCH: true, DELETE: false }
    }
  ],
  isActive: true
}
```

---

## UI Components Required

### Stepper Component

**File: `src/components/ui/stepper.jsx`**

```jsx
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

const Stepper = ({ steps, activeStep, className }) => {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = index === activeStep;
          const isCompleted = index < activeStep;
          const isLast = index === steps.length - 1;

          return (
            <div key={index} className="flex items-center flex-1">
              <div className="flex items-center relative">
                <div
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full border-2',
                    isCompleted && 'bg-ocean-600 border-ocean-600 text-white',
                    isActive && 'border-ocean-600 text-ocean-700',
                    !isCompleted && !isActive && 'border-muted-foreground text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <div className={cn('ml-2', isActive && 'text-foreground', !isActive && 'text-muted-foreground')}>
                  <p className="text-sm font-medium">{step}</p>
                </div>
              </div>
              {!isLast && (
                <div className={cn('flex-1 h-[2px] mx-4', isCompleted ? 'bg-ocean-600' : 'bg-muted')} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export { Stepper };
```

---

## Testing Checklist

- [ ] Welcome screen displays correctly
- [ ] Basic info form validation works
- [ ] Service selection triggers schema discovery
- [ ] Database objects are grouped correctly (tables, views, procedures)
- [ ] Search and filter work on all tabs
- [ ] Bulk selection checkbox works
- [ ] Individual object selection updates parent state
- [ ] Bulk HTTP method assignment applies to all selected objects
- [ ] Individual method override works
- [ ] Can remove individual objects from selection
- [ ] Permission summary calculates correctly
- [ ] Navigation (Next/Back/Cancel) works
- [ ] Final submission creates role with correct permissions
- [ ] Edit mode pre-populates existing data
- [ ] Error handling displays appropriate messages

---

## API Integration Points

1. **Service List**: `GET /api/services` - Get available database services
2. **Schema Discovery**: `GET /api/v2/:serviceName/_discover` - Auto-discover database objects
3. **Role Creation**: `POST /api/roles` - Create new role with permissions
4. **Role Update**: `PUT /api/roles/:id` - Update existing role

---

## Security Considerations

1. **Authentication**: All endpoints require valid JWT token
2. **Organization Isolation**: RLS enforced via `withTenantContext`
3. **Service Access**: Verify user has access to selected service
4. **Input Validation**: Sanitize role inputs and validate structure
5. **Permission Validation**: Ensure at least one HTTP method selected
6. **Freemium Limits**: Check role creation limits for free tier users

---

## Additional Notes

- The wizard supports both create and edit modes
- Edit mode skips the welcome screen and starts at step 1
- Existing permissions are merged with new selections in edit mode
- Database schema is cached in the service's `objects` field
- Auto-refresh attempts if no objects found for a service
- Supports multiple database types: PostgreSQL, MSSQL, MySQL, MongoDB
