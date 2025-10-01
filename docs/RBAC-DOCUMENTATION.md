# Role-Based Access Control (RBAC) System Documentation

## Overview

The Nectar API platform implements a comprehensive Role-Based Access Control (RBAC) system with dual architecture supporting both the main customer application and administrative portal. The system follows industry standards similar to AWS IAM and Stripe's permission models.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Role Hierarchies](#role-hierarchies)
3. [Permission System](#permission-system)
4. [Database Schema](#database-schema)
5. [Authentication & Authorization](#authentication--authorization)
6. [Frontend Integration](#frontend-integration)
7. [API Usage](#api-usage)
8. [Admin Portal](#admin-portal)
9. [Audit Logging](#audit-logging)
10. [Security Considerations](#security-considerations)
11. [Development Guide](#development-guide)
12. [Troubleshooting](#troubleshooting)

## Architecture Overview

### Dual Role System

The platform implements two separate but coordinated role systems:

1. **Main Application Roles**: Customer-facing roles for organization management
2. **Admin Portal Roles**: Internal staff roles for platform administration

```
Main Application          Admin Portal
┌─────────────────┐      ┌─────────────────┐
│ SUPER_ADMIN     │◄────►│ SUPER_ADMIN     │
│ ORG_OWNER       │      │ ADMIN           │
│ ORG_ADMIN       │      │ BILLING_ADMIN   │
│ DEVELOPER       │      │ SUPPORT_AGENT   │
│ MEMBER          │      │ ANALYST         │
│ VIEWER          │      └─────────────────┘
└─────────────────┘
```

## Role Hierarchies

### Main Application Roles

| Role | Level | Description | Inherited Permissions |
|------|-------|-------------|----------------------|
| **SUPER_ADMIN** | 7 | Platform super user | All permissions |
| **ORGANIZATION_OWNER** | 6 | Organization owner | All org permissions + lower roles |
| **ORGANIZATION_ADMIN** | 5 | Organization administrator | Admin permissions + lower roles |
| **DEVELOPER** | 4 | Developer access | API management + lower roles |
| **MEMBER** | 3 | Standard member | Basic access + viewer permissions |
| **VIEWER** | 1 | Read-only access | View-only permissions |

#### Legacy Role Mapping
- `OWNER` → `ORGANIZATION_OWNER` (Level 6)
- `ADMIN` → `ORGANIZATION_ADMIN` (Level 5)

### Admin Portal Roles

| Role | Level | Description | Permissions |
|------|-------|-------------|------------|
| **SUPER_ADMIN** | 5 | Full admin access | All admin operations |
| **ADMIN** | 4 | General admin | User/license management, analytics |
| **BILLING_ADMIN** | 3 | Billing specialist | Billing, license view, analytics |
| **SUPPORT_AGENT** | 2 | Customer support | User/license view |
| **ANALYST** | 1 | Data analyst | Analytics view only |

## Permission System

### Permission Structure

Permissions follow the format: `resource:action`

```typescript
// Example permissions
'organization:manage'     // Manage organization settings
'member:invite'          // Invite new members
'apikey:create'          // Create API keys
'billing:manage'         // Manage billing
'analytics:view'         // View analytics
```

### Permission Inheritance

Higher-level roles automatically inherit all permissions from lower-level roles:

```javascript
// ORGANIZATION_OWNER inherits all permissions from:
// - ORGANIZATION_ADMIN
// - DEVELOPER
// - MEMBER
// - VIEWER
```

### Permission Checking

```javascript
// Backend middleware
app.get('/api/sensitive-endpoint',
  AuthFactory.requireMinimumRole('DEVELOPER'),
  handler
);

// Frontend component
<RoleGuard permission="member:invite">
  <InviteButton />
</RoleGuard>
```

## Database Schema

### Core Models

#### User & Organization Relationship
```prisma
model User {
  id          String @id @default(uuid())
  email       String @unique
  memberships OrganizationMembership[]
}

model OrganizationMembership {
  id             String      @id @default(uuid())
  userId         String
  organizationId String
  role           MemberRole  @default(MEMBER)
  isActive       Boolean     @default(true)

  user         User         @relation(fields: [userId], references: [id])
  organization Organization @relation(fields: [organizationId], references: [id])
}
```

#### Admin Users
```prisma
model AdminUser {
  id           String    @id @default(uuid())
  email        String    @unique
  role         AdminRole @default(SUPPORT_AGENT)
  firstName    String
  lastName     String
  passwordHash String
  isActive     Boolean   @default(true)
  createdBy    String?
}
```

#### Audit Logging
```prisma
model AuditLog {
  id                String   @id @default(uuid())
  action           String
  entityType       String
  entityId         String
  userId           String?
  adminPerformedById String?
  organizationId   String?
  oldValues        Json?
  newValues        Json?
  metadata         Json?
  ipAddress        String?
  userAgent        String?
  timestamp        DateTime @default(now())
}

model RoleChangeLog {
  id                String           @id @default(uuid())
  targetUserId      String?
  targetAdminId     String?
  organizationId    String?
  oldRole          String
  newRole          String
  reason           String?
  status           RoleChangeStatus @default(COMPLETED)
  ipAddress        String?
  userAgent        String?
  createdAt        DateTime         @default(now())
}
```

## Authentication & Authorization

### JWT Token Structure

```javascript
{
  userId: "user-uuid",
  email: "user@example.com",
  memberships: [
    {
      role: "ORGANIZATION_ADMIN",
      organizationId: "org-uuid"
    }
  ],
  isSuperAdmin: false,
  isAdmin: true,
  exp: 1234567890
}
```

### Middleware Usage

#### Role-Specific Middleware
```javascript
const AuthFactory = require('./middleware/authFactory');

// Require specific role
app.use('/admin', AuthFactory.requireSuperAdmin());
app.use('/org-settings', AuthFactory.requireOrganizationOwner());
app.use('/api-keys', AuthFactory.requireDeveloper());

// Require minimum role level
app.use('/dashboard', AuthFactory.requireMinimumRole('MEMBER'));

// Organization-specific access
app.use('/api/orgs/:orgId',
  AuthFactory.requireOrganizationAccess(['MEMBER', 'DEVELOPER'])
);
```

#### Permission Calculation
```javascript
// Calculate user permissions
const permissions = AuthFactory.calculateUserPermissions(user);
// Returns: ['organization:admin', 'member:invite', 'api:manage', ...]
```

## Frontend Integration

### Role-Based Components

#### Role Guard
```jsx
import { RoleGuard } from '@/components/roles/RoleGuard';

function Dashboard() {
  return (
    <div>
      <RoleGuard permission="analytics:view">
        <AnalyticsWidget />
      </RoleGuard>

      <RoleGuard role="ORGANIZATION_ADMIN" fallback={<AccessDenied />}>
        <AdminPanel />
      </RoleGuard>
    </div>
  );
}
```

#### Member Role Manager
```jsx
import { MemberRoleManager } from '@/components/roles/MemberRoleManager';

function MembersPage() {
  return (
    <div>
      <h1>Team Members</h1>
      <MemberRoleManager
        members={members}
        currentUserRole="ORGANIZATION_OWNER"
        onRoleChange={handleRoleChange}
      />
    </div>
  );
}
```

### Permission Utilities

```javascript
import { hasPermission, canAccessRole } from '@/utils/rolePermissions';

// Check specific permission
if (hasPermission(userRole, 'member:invite')) {
  showInviteButton();
}

// Check role hierarchy
if (canAccessRole(userRole, 'DEVELOPER')) {
  showDeveloperFeatures();
}
```

### Role-Based Navigation

```jsx
function Navigation({ user }) {
  const showAdminNav = hasPermission(user.role, 'organization:manage');
  const showBilling = hasPermission(user.role, 'billing:view');

  return (
    <nav>
      <NavItem to="/dashboard">Dashboard</NavItem>
      {showAdminNav && <NavItem to="/admin">Admin</NavItem>}
      {showBilling && <NavItem to="/billing">Billing</NavItem>}
    </nav>
  );
}
```

## API Usage

### Authentication Headers

```bash
# Main application API
curl -H "Authorization: Bearer <jwt-token>" \
     https://api.example.com/api/organizations

# Admin portal API
curl -H "Authorization: Bearer <admin-jwt-token>" \
     https://admin.example.com/api/admin/users
```

### Role Management Endpoints

#### Main Application
```bash
# Get organization members
GET /api/organizations/:orgId/members

# Update member role
PUT /api/organizations/:orgId/members/:memberId/role
{
  "role": "DEVELOPER",
  "reason": "Promoting to developer role"
}

# Invite member with role
POST /api/organizations/:orgId/invite
{
  "email": "new@example.com",
  "role": "MEMBER"
}
```

#### Admin Portal
```bash
# List admin users (SUPER_ADMIN only)
GET /api/admin/users

# Create admin user
POST /api/admin/users
{
  "email": "admin@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "SUPPORT_AGENT",
  "passwordHash": "hashed-password"
}

# Update admin role
PUT /api/admin/users/:id/role
{
  "role": "ADMIN"
}
```

## Admin Portal

### Admin User Management

The admin portal provides comprehensive user management with role-based restrictions:

```typescript
// Admin routes with proper authorization
router.get('/', requireMinRole('SUPER_ADMIN'), listAdminUsers);
router.post('/', requireMinRole('SUPER_ADMIN'), createAdminUser);
router.put('/:id/role', requireMinRole('SUPER_ADMIN'), updateAdminRole);
```

### Role Restrictions

| Endpoint | SUPER_ADMIN | ADMIN | BILLING_ADMIN | SUPPORT_AGENT | ANALYST |
|----------|-------------|-------|---------------|---------------|---------|
| View admin users | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create admin users | ✅ | ❌ | ❌ | ❌ | ❌ |
| Update roles | ✅ | ❌ | ❌ | ❌ | ❌ |
| View licenses | ✅ | ✅ | ✅ | ✅ | ❌ |
| Manage billing | ✅ | ❌ | ✅ | ❌ | ❌ |
| View analytics | ✅ | ✅ | ✅ | ❌ | ✅ |

## Audit Logging

### Automatic Logging

The system automatically logs:
- Role changes with full context
- Admin user creation/modification
- Login attempts (success/failure)
- Organization access attempts
- API key operations

### Log Structure

```javascript
{
  id: "log-uuid",
  action: "ROLE_CHANGE",
  entityType: "USER",
  entityId: "user-uuid",
  adminPerformedById: "admin-uuid",
  organizationId: "org-uuid",
  oldValues: { role: "MEMBER" },
  newValues: { role: "DEVELOPER" },
  metadata: {
    reason: "Promotion to developer",
    roleChangeLogId: "change-log-uuid"
  },
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  timestamp: "2025-01-15T10:30:00Z"
}
```

### Querying Audit Logs

```javascript
const auditService = require('./services/auditService');

// Get role changes for organization
const logs = await auditService.getRoleChangeLogs({
  organizationId: 'org-uuid',
  startDate: new Date('2025-01-01'),
  page: 1,
  limit: 50
});

// Get all audit events for user
const events = await auditService.getAuditLogs({
  userId: 'user-uuid',
  entityType: 'USER'
});
```

## Security Considerations

### Access Control
- **Principle of Least Privilege**: Users get minimal required permissions
- **Role Inheritance**: Higher roles inherit lower role permissions
- **Organization Isolation**: Users can only access their organization's data
- **Super Admin Override**: SUPER_ADMIN can access all organizations

### Token Security
- JWT tokens include role information for efficient authorization
- Tokens expire after 1 hour (configurable)
- Token blacklisting supported for immediate revocation
- Secure token validation with proper signature verification

### Input Validation
- All role changes validated against hierarchy rules
- Organization membership verified before role assignments
- Admin operations require proper authentication and authorization
- Rate limiting applied to sensitive operations

### Audit Trail
- All role changes logged with full context
- IP addresses and user agents tracked
- Immutable audit logs for compliance
- Real-time security event monitoring

## Development Guide

### Adding New Roles

1. **Update Database Schema**
```prisma
enum MemberRole {
  // existing roles...
  NEW_ROLE
}
```

2. **Update Role Hierarchy**
```javascript
// In authFactory.js
const roleHierarchy = {
  'NEW_ROLE': 3, // Set appropriate level
  // existing roles...
};
```

3. **Add Permissions**
```javascript
// In calculateUserPermissions
case 'NEW_ROLE':
  permissions.add('new:permission');
  break;
```

4. **Update Frontend**
```javascript
// In rolePermissions.js
export const ROLE_PERMISSIONS = {
  'NEW_ROLE': ['new:permission'],
  // existing roles...
};
```

### Adding New Permissions

1. **Define Permission**
```javascript
// Format: 'resource:action'
const NEW_PERMISSION = 'resource:action';
```

2. **Add to Role Definitions**
```javascript
// In role permission mappings
'ROLE_NAME': ['existing:permissions', 'resource:action']
```

3. **Implement Middleware Check**
```javascript
app.get('/endpoint',
  AuthFactory.requireMinimumRole('REQUIRED_ROLE'),
  handler
);
```

4. **Update Frontend Guards**
```jsx
<RoleGuard permission="resource:action">
  <ProtectedComponent />
</RoleGuard>
```

### Testing Role Changes

```javascript
// Use the provided test utilities
const { RoleSystemTester } = require('./tests/role-system-tests');

const tester = new RoleSystemTester();
await tester.runAllTests(); // Validates role system integrity
```

## Troubleshooting

### Common Issues

#### "Role not found" Errors
- Verify role exists in database enum
- Check for typos in role names (case-sensitive)
- Ensure role hierarchy is properly defined

#### Permission Denied
- Verify user has required role level
- Check organization membership
- Confirm JWT token includes correct claims

#### Role Changes Not Taking Effect
- Check audit logs for failed role changes
- Verify user has permission to change roles
- Ensure target role exists and is valid

#### Frontend Permission Issues
- Clear browser cache and cookies
- Verify JWT token is being sent with requests
- Check role calculation in permission utilities

### Debug Commands

```bash
# Check role system integrity
cd server && node test-roles-simple.js

# Run integration tests
cd server && node integration-tests.js

# View audit logs
# Use Prisma Studio or database client to query AuditLog table
```

### Logging

Enable debug logging to troubleshoot issues:

```javascript
// In development
process.env.LOG_LEVEL = 'debug';

// Check specific auth errors
logger.debug('Auth check failed:', { userId, requiredRole, userRoles });
```

## Migration Guide

### From Legacy Roles

If migrating from a previous role system:

1. **Run Migration Script**
```bash
cd server && node scripts/migrate-user-roles.js
```

2. **Update Client Code**
Replace legacy role checks with new permission system:

```javascript
// Before
if (user.role === 'admin') { ... }

// After
if (hasPermission(user.role, 'organization:manage')) { ... }
```

3. **Test Thoroughly**
Use provided test suites to validate migration success.

## API Reference

### AuthFactory Methods

```javascript
// Role-specific middleware
AuthFactory.requireSuperAdmin()
AuthFactory.requireOrganizationOwner()
AuthFactory.requireOrganizationAdmin()
AuthFactory.requireDeveloper()
AuthFactory.requireMember()

// Flexible role checking
AuthFactory.requireMinimumRole(roleName)
AuthFactory.requireRole(...roleNames)
AuthFactory.requireOrganizationAccess(allowedRoles)

// Permission utilities
AuthFactory.calculateUserPermissions(user)
AuthFactory.optional(middleware) // Makes middleware optional
```

### Audit Service Methods

```javascript
// Logging functions
auditService.logAuditEvent(options)
auditService.logRoleChange(options)
auditService.logUserLogin(options)
auditService.logApiKeyEvent(options)
auditService.logInvitationEvent(options)

// Query functions
auditService.getAuditLogs(filters)
auditService.getRoleChangeLogs(filters)
```

## Best Practices

1. **Always use middleware for API protection**
2. **Implement role guards on sensitive UI components**
3. **Log all role changes with context**
4. **Validate role transitions server-side**
5. **Use minimum required permissions**
6. **Test role inheritance thoroughly**
7. **Monitor audit logs regularly**
8. **Implement proper error handling**
9. **Use environment-specific configurations**
10. **Keep documentation updated**

---

For additional support or questions about the RBAC system, please refer to the security audit report or contact the development team.