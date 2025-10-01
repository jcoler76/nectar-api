# 🚀 Production Testing Plan - Complete Test Case Documentation

## Overview

This document provides comprehensive test cases for validating production readiness across three critical areas:
1. **Organization Data Isolation** - Zero data leakage between organizations
2. **Role-Based Access Control (RBAC)** - Proper permission enforcement
3. **Subscription Plan Limits** - Plan feature and limit enforcement

Each section is designed to be assigned to separate AI agents for parallel testing.

---

# 📦 SECTION 1: ORGANIZATION DATA ISOLATION TESTING

## Objective
Ensure complete data isolation between organizations with ZERO data leakage. No user from one organization should ever see ANY data from another organization.

## Test Environment Setup

### Prerequisites
```bash
# Create 3 test organizations
Organization A: "Alpha Corp" (ID: org_alpha_test)
Organization B: "Beta Industries" (ID: org_beta_test)
Organization C: "Gamma Enterprises" (ID: org_gamma_test)

# Create users for each organization
Org A Users:
- alice@alpha.com (OWNER)
- alice-admin@alpha.com (ADMIN)
- alice-member@alpha.com (MEMBER)

Org B Users:
- bob@beta.com (OWNER)
- bob-admin@beta.com (ADMIN)
- bob-member@beta.com (MEMBER)

Org C Users:
- charlie@gamma.com (OWNER)
- charlie-admin@gamma.com (ADMIN)
- charlie-member@gamma.com (MEMBER)
```

### Test Data Setup
For EACH organization, create:
- 3 database connections (different names/hosts)
- 5 services
- 3 applications with API keys
- 10 workflows
- 5 endpoints
- 3 roles
- 2 API keys
- 10 API activity logs
- 5 audit logs
- 3 notifications
- 2 webhooks
- 5 file storage items
- 3 usage metrics entries

---

## Test Cases: Data Isolation

### TC-ISO-001: Database Connections Isolation
**Priority**: CRITICAL
**Description**: Verify users cannot see connections from other organizations

**Test Steps**:
1. Login as alice@alpha.com (Org A)
2. Call `GET /api/connections`
3. Call `GET /api/graphql` with query: `{ connections { id name organizationId } }`
4. Count returned connections
5. Verify all connections have `organizationId === org_alpha_test`
6. Repeat for bob@beta.com (Org B) and charlie@gamma.com (Org C)

**Expected Results**:
- ✅ Alice sees ONLY 3 connections (all from Org A)
- ✅ Bob sees ONLY 3 connections (all from Org B)
- ✅ Charlie sees ONLY 3 connections (all from Org C)
- ❌ No connection from another organization is visible
- ✅ All organizationId values match the user's organization

**SQL Verification**:
```sql
-- Should return 3 for each organization
SELECT organization_id, COUNT(*)
FROM "DatabaseConnection"
GROUP BY organization_id;
```

---

### TC-ISO-002: Services Isolation
**Priority**: CRITICAL
**Description**: Verify services are organization-scoped

**Test Steps**:
1. Login as alice-admin@alpha.com
2. Call `GET /api/services`
3. Call `GET /api/graphql` with query: `{ services { id name organizationId } }`
4. Attempt to access a service from Org B using direct ID
5. Call `GET /api/services/{org_b_service_id}`

**Expected Results**:
- ✅ Returns only Org A services (5 services)
- ❌ Direct access to Org B service returns 404 or 403
- ❌ GraphQL query for Org B service returns null/error
- ✅ All services show organizationId === org_alpha_test

---

### TC-ISO-003: Applications & API Keys Isolation
**Priority**: CRITICAL
**Description**: Verify applications and API keys are isolated

**Test Steps**:
1. Login as alice@alpha.com
2. Call `GET /api/applications`
3. Try to use an API key from Org B to access Org A resources
4. Call `GET /api/apikeys`
5. Attempt to access Org B application by ID

**Expected Results**:
- ✅ Returns only Org A applications (3 applications)
- ❌ Org B API key cannot authenticate as Org A
- ❌ Using Org B API key returns 401 Unauthorized
- ✅ API keys list shows only Org A keys
- ❌ Direct application ID access from another org returns 403/404

---

### TC-ISO-004: Workflows Isolation
**Priority**: CRITICAL
**Description**: Verify workflows cannot be accessed across organizations

**Test Steps**:
1. Login as alice-member@alpha.com
2. Call `GET /api/workflows`
3. Call `GET /api/workflows/{org_b_workflow_id}`
4. Try to execute a workflow from Org B
5. Check workflow execution logs

**Expected Results**:
- ✅ Returns only Org A workflows (10 workflows)
- ❌ Cannot access Org B workflow (403/404)
- ❌ Cannot execute Org B workflow
- ✅ Workflow executions only show Org A workflows
- ✅ All workflows have organizationId === org_alpha_test

---

### TC-ISO-005: Endpoints Isolation
**Priority**: CRITICAL
**Description**: Verify endpoint access is organization-scoped

**Test Steps**:
1. Login as alice@alpha.com
2. Call `GET /api/endpoints`
3. Try to access an endpoint from Org B using its path
4. Attempt to call `GET /api/endpoints/{org_b_endpoint_id}`

**Expected Results**:
- ✅ Returns only Org A endpoints (5 endpoints)
- ❌ Cannot access Org B endpoint directly
- ❌ Endpoint from Org B returns 403/404
- ✅ All endpoints tied to Org A connections only

---

### TC-ISO-006: API Activity Logs Isolation
**Priority**: CRITICAL
**Description**: Verify API activity logs don't leak between organizations

**Test Steps**:
1. Generate API activity for all 3 organizations
2. Login as alice@alpha.com
3. Call `GET /api/logs/activity`
4. Call `GET /api/dashboard` (includes activity metrics)
5. Query GraphQL: `{ apiActivityLogs { id organizationId userId } }`

**Expected Results**:
- ✅ Returns only Org A logs (10 logs)
- ❌ No logs from Org B or C visible
- ✅ Dashboard metrics only show Org A data
- ✅ All logs have organizationId === org_alpha_test

---

### TC-ISO-007: Audit Logs Isolation
**Priority**: CRITICAL
**Description**: Verify audit trail doesn't expose cross-org data

**Test Steps**:
1. Login as alice-admin@alpha.com
2. Call `GET /api/audit-logs`
3. Call `GET /api/audit-logs?entityType=USER`
4. Try to query audit logs for Org B user

**Expected Results**:
- ✅ Returns only Org A audit logs (5 logs)
- ❌ Cannot see audit logs for Org B users
- ✅ All logs show organizationId === org_alpha_test

---

### TC-ISO-008: Users & Memberships Isolation
**Priority**: CRITICAL
**Description**: Verify user lists are organization-scoped

**Test Steps**:
1. Login as alice@alpha.com (Org A Owner)
2. Call `GET /api/organizations/{org_alpha_test}/members`
3. Call `GET /api/organizations/{org_beta_test}/members`
4. Call `GET /api/users` (if endpoint exists)

**Expected Results**:
- ✅ Org A members endpoint returns 3 users (all Org A)
- ❌ Org B members endpoint returns 403 Forbidden
- ✅ No user from Org B or C is visible
- ✅ All memberships have organizationId === org_alpha_test

---

### TC-ISO-009: Invitations Isolation
**Priority**: CRITICAL
**Description**: Verify invitations are organization-scoped

**Test Steps**:
1. Login as alice-admin@alpha.com
2. Call `GET /api/invitations`
3. Create invitation for Org A
4. Try to accept invitation meant for Org B using Org A user

**Expected Results**:
- ✅ Returns only Org A invitations
- ❌ Cannot see Org B invitations
- ❌ Cannot accept invitation for different organization
- ✅ All invitations have organizationId === org_alpha_test

---

### TC-ISO-010: Notifications Isolation
**Priority**: HIGH
**Description**: Verify notifications don't leak between organizations

**Test Steps**:
1. Create notifications for all organizations
2. Login as alice@alpha.com
3. Call `GET /api/notifications`
4. Check notification count
5. Verify no Org B or C notifications visible

**Expected Results**:
- ✅ Returns only Org A notifications (3 notifications)
- ❌ No notifications from other orgs
- ✅ All notifications have organizationId === org_alpha_test

---

### TC-ISO-011: Webhooks Isolation
**Priority**: HIGH
**Description**: Verify webhooks are organization-scoped

**Test Steps**:
1. Login as alice@alpha.com
2. Call `GET /api/webhooks`
3. Try to access Org B webhook by ID
4. Try to update Org B webhook

**Expected Results**:
- ✅ Returns only Org A webhooks (2 webhooks)
- ❌ Cannot access Org B webhook (403/404)
- ❌ Cannot update Org B webhook
- ✅ All webhooks have organizationId === org_alpha_test

---

### TC-ISO-012: File Storage Isolation
**Priority**: CRITICAL
**Description**: Verify file storage is completely isolated

**Test Steps**:
1. Login as alice@alpha.com
2. Call `GET /api/files`
3. Try to access file from Org B using direct ID
4. Try to download file from Org B
5. Check file sharing tokens

**Expected Results**:
- ✅ Returns only Org A files (5 files)
- ❌ Cannot access Org B file (403/404)
- ❌ Cannot download Org B file
- ❌ Org B share tokens don't work for Org A users
- ✅ All files have organizationId === org_alpha_test

---

### TC-ISO-013: Usage Metrics Isolation
**Priority**: HIGH
**Description**: Verify usage metrics don't expose other org data

**Test Steps**:
1. Login as alice@alpha.com
2. Call `GET /api/usage/metrics`
3. Call `GET /api/dashboard/analytics`
4. Check API call counts, storage usage

**Expected Results**:
- ✅ Returns only Org A metrics (3 entries)
- ❌ No metrics from Org B or C
- ✅ All counts reflect only Org A activity
- ✅ All metrics have organizationId === org_alpha_test

---

### TC-ISO-014: Roles & Permissions Isolation
**Priority**: CRITICAL
**Description**: Verify custom roles are organization-scoped

**Test Steps**:
1. Login as alice-admin@alpha.com
2. Call `GET /api/roles`
3. Try to access Org B role by ID
4. Try to assign Org B role to Org A user

**Expected Results**:
- ✅ Returns only Org A roles (3 roles)
- ❌ Cannot access Org B role (403/404)
- ❌ Cannot assign Org B role to Org A user
- ✅ All roles have organizationId === org_alpha_test

---

### TC-ISO-015: Subscription Data Isolation
**Priority**: CRITICAL
**Description**: Verify subscription and billing data is isolated

**Test Steps**:
1. Login as alice@alpha.com
2. Call `GET /api/billing/subscription`
3. Call `GET /api/billing/invoices`
4. Try to access Org B subscription details

**Expected Results**:
- ✅ Returns only Org A subscription
- ✅ Returns only Org A invoices
- ❌ Cannot see Org B billing data (403)
- ✅ Subscription has organizationId === org_alpha_test

---

### TC-ISO-016: Database Object Isolation
**Priority**: HIGH
**Description**: Verify exposed database objects are organization-scoped

**Test Steps**:
1. Login as alice@alpha.com
2. Call `GET /api/database-objects`
3. Query for exposed entities
4. Try to access Org B database object

**Expected Results**:
- ✅ Returns only Org A database objects
- ❌ Cannot see Org B database objects
- ❌ Cannot access Org B exposed entities
- ✅ All objects have organizationId === org_alpha_test

---

### TC-ISO-017: Rate Limit Configs Isolation
**Priority**: HIGH
**Description**: Verify rate limit configs are organization-scoped

**Test Steps**:
1. Login as alice-admin@alpha.com
2. Call `GET /api/rate-limits`
3. Try to modify Org B rate limit config

**Expected Results**:
- ✅ Returns only Org A rate limit configs
- ❌ Cannot modify Org B configs (403)
- ✅ All configs have organizationId === org_alpha_test

---

### TC-ISO-018: Super Admin Cross-Org Access
**Priority**: CRITICAL
**Description**: Verify Super Admin can access all organizations (expected behavior)

**Test Steps**:
1. Create super admin user
2. Login as super admin
3. Call `GET /api/admin/organizations`
4. Switch active organization context
5. Access data from different organizations

**Expected Results**:
- ✅ Super Admin sees all organizations
- ✅ Can switch between organizations
- ✅ Can access any organization's data (when context is set)
- ✅ Context switching properly isolates data
- ✅ Audit logs record super admin access

---

### TC-ISO-019: GraphQL Query Isolation
**Priority**: CRITICAL
**Description**: Verify GraphQL queries respect organization boundaries

**Test Steps**:
1. Login as alice@alpha.com
2. Run complex GraphQL query spanning multiple types:
```graphql
{
  services { id name connections { id } }
  workflows { id name }
  applications { id name }
  users { id email memberships { role } }
}
```
3. Verify all returned data is from Org A only

**Expected Results**:
- ✅ All services are from Org A
- ✅ All workflows are from Org A
- ✅ All applications are from Org A
- ✅ All users are from Org A
- ❌ No data from Org B or C in any field

---

### TC-ISO-020: Direct Database Query Bypass Attempt
**Priority**: CRITICAL
**Description**: Attempt to bypass organization filters using raw queries

**Test Steps**:
1. Login as alice@alpha.com
2. Try SQL injection in filters: `?organizationId=org_beta_test OR 1=1`
3. Try GraphQL injection to access other org data
4. Try manipulating request headers with different org IDs
5. Try JWT token manipulation

**Expected Results**:
- ❌ SQL injection attempts are blocked/sanitized
- ❌ GraphQL injection attempts fail
- ❌ Header manipulation doesn't bypass filters
- ❌ JWT manipulation invalidates token
- ✅ All attempts are logged in security audit

---

## Data Isolation Summary Metrics

### Success Criteria
- ✅ 100% of queries return only organization-scoped data
- ✅ 0 instances of cross-organization data leakage
- ✅ All bypass attempts are blocked and logged
- ✅ Super Admin access is properly tracked and audited

### Testing Checklist
- [ ] All 20 test cases pass without failures
- [ ] No cross-org data visible in any API response
- [ ] No cross-org data visible in GraphQL queries
- [ ] Super Admin access properly controlled
- [ ] All security bypass attempts fail
- [ ] Audit logs capture all access attempts
- [ ] Database-level RLS policies are enforced
- [ ] Middleware properly filters all queries

---

# 👤 SECTION 2: ROLE-BASED ACCESS CONTROL (RBAC) TESTING

## Objective
Validate that all roles have proper permissions and users can only access functionality appropriate to their role.

## Role Definitions

### Main Application Roles
| Role | Level | Description |
|------|-------|-------------|
| SUPER_ADMIN | 100 | Platform super user - all access |
| ORGANIZATION_OWNER | 80 | Organization owner - full org control |
| ORGANIZATION_ADMIN | 60 | Organization admin - most org functions |
| DEVELOPER | 40 | Developer - API and service management |
| MEMBER | 20 | Standard member - basic access |
| VIEWER | 10 | Read-only access |

### Admin Portal Roles
| Role | Level | Description |
|------|-------|-------------|
| SUPER_ADMIN | 100 | Full platform access |
| ADMIN | 80 | General admin access |
| BILLING_ADMIN | 60 | Billing and analytics |
| SUPPORT_AGENT | 40 | Customer support |
| ANALYST | 20 | Analytics view only |

---

## Test Environment Setup

### Create Test Users for Each Role
```bash
# Organization A - All Roles
owner@alpha.com (ORGANIZATION_OWNER)
admin@alpha.com (ORGANIZATION_ADMIN)
developer@alpha.com (DEVELOPER)
member@alpha.com (MEMBER)
viewer@alpha.com (VIEWER)

# Super Admin
superadmin@platform.com (SUPER_ADMIN)

# Admin Portal Users
admin-platform@admin.com (ADMIN)
billing@admin.com (BILLING_ADMIN)
support@admin.com (SUPPORT_AGENT)
analyst@admin.com (ANALYST)
```

---

## Test Cases: Main Application Roles

### TC-RBAC-001: VIEWER Role - Read-Only Access
**Priority**: HIGH
**Description**: Verify VIEWER can only read data, no write operations

**Test Steps**:
1. Login as viewer@alpha.com
2. Try to view services: `GET /api/services` ✅
3. Try to create service: `POST /api/services` ❌
4. Try to update service: `PUT /api/services/{id}` ❌
5. Try to delete service: `DELETE /api/services/{id}` ❌
6. Try to invite user: `POST /api/invitations/send` ❌
7. Try to create API key: `POST /api/apikeys` ❌
8. Try to view billing: `GET /api/billing/subscription` ❌

**Expected Results**:
- ✅ Can view: services, applications, workflows, connections
- ❌ Cannot create/update/delete any resources (403 Forbidden)
- ❌ Cannot invite users
- ❌ Cannot manage API keys
- ❌ Cannot access billing information
- ✅ All denied requests return proper 403 error

---

### TC-RBAC-002: MEMBER Role - Basic Operations
**Priority**: HIGH
**Description**: Verify MEMBER can perform basic operations

**Test Steps**:
1. Login as member@alpha.com
2. View resources: `GET /api/services` ✅
3. Use API keys: Make authenticated API calls ✅
4. Try to create service: `POST /api/services` ❌
5. Try to invite users: `POST /api/invitations/send` ❌
6. Try to delete resources: `DELETE /api/workflows/{id}` ❌
7. Try to view billing: `GET /api/billing` ❌
8. Try to manage roles: `PUT /api/members/{id}/role` ❌

**Expected Results**:
- ✅ Can view all organization resources
- ✅ Can use existing API keys
- ✅ Can view own profile
- ❌ Cannot create/delete resources (403)
- ❌ Cannot invite users
- ❌ Cannot manage billing
- ❌ Cannot change user roles

---

### TC-RBAC-003: DEVELOPER Role - API Management
**Priority**: HIGH
**Description**: Verify DEVELOPER can manage APIs and services

**Test Steps**:
1. Login as developer@alpha.com
2. Create API key: `POST /api/apikeys` ✅
3. Create service: `POST /api/services` ✅
4. Create application: `POST /api/applications` ✅
5. Create endpoint: `POST /api/endpoints` ✅
6. Manage workflows: `POST /api/workflows` ✅
7. Try to invite users: `POST /api/invitations/send` ❌
8. Try to manage billing: `POST /api/billing/update` ❌
9. Try to change roles: `PUT /api/members/{id}/role` ❌

**Expected Results**:
- ✅ Can create/edit/delete: API keys, services, applications, endpoints
- ✅ Can manage workflows
- ✅ Can view all resources
- ❌ Cannot invite users (403)
- ❌ Cannot manage billing
- ❌ Cannot change user roles
- ❌ Cannot delete organization

---

### TC-RBAC-004: ORGANIZATION_ADMIN Role - Admin Access
**Priority**: HIGH
**Description**: Verify ORGANIZATION_ADMIN has admin privileges

**Test Steps**:
1. Login as admin@alpha.com
2. Invite user: `POST /api/invitations/send` ✅
3. Update member role: `PUT /api/members/{id}/role` ✅
4. Remove member: `DELETE /api/members/{id}` ❌ (only OWNER)
5. View billing: `GET /api/billing/subscription` ✅
6. Try to update billing: `PUT /api/billing/update` ❌
7. Manage API keys: `POST /api/apikeys` ✅
8. Update organization settings: `PUT /api/organizations/{id}/settings` ✅

**Expected Results**:
- ✅ Can invite users
- ✅ Can update user roles (except OWNER)
- ✅ Can view billing information
- ✅ Can manage API keys and services
- ✅ Can update org settings
- ❌ Cannot remove members (only OWNER can)
- ❌ Cannot update billing plan
- ❌ Cannot delete organization

---

### TC-RBAC-005: ORGANIZATION_OWNER Role - Full Control
**Priority**: HIGH
**Description**: Verify ORGANIZATION_OWNER has full control

**Test Steps**:
1. Login as owner@alpha.com
2. Invite user: `POST /api/invitations/send` ✅
3. Remove member: `DELETE /api/members/{id}` ✅
4. Update billing: `PUT /api/billing/subscription` ✅
5. Cancel subscription: `POST /api/billing/cancel` ✅
6. Delete organization: `DELETE /api/organizations/{id}` ✅
7. Transfer ownership: `PUT /api/organizations/{id}/transfer` ✅
8. Manage all resources ✅

**Expected Results**:
- ✅ Can perform ALL organization operations
- ✅ Can invite/remove any user
- ✅ Can manage billing and subscriptions
- ✅ Can delete organization
- ✅ Can transfer ownership
- ✅ Can manage all API keys, services, workflows

---

### TC-RBAC-006: SUPER_ADMIN Role - Platform Access
**Priority**: CRITICAL
**Description**: Verify SUPER_ADMIN can access all organizations

**Test Steps**:
1. Login as superadmin@platform.com
2. View all organizations: `GET /api/admin/organizations` ✅
3. Switch organization context to Org A
4. Access Org A resources ✅
5. Switch to Org B
6. Access Org B resources ✅
7. View platform analytics: `GET /api/admin/analytics` ✅
8. Manage any organization ✅

**Expected Results**:
- ✅ Can see all organizations
- ✅ Can switch between organizations
- ✅ Can access any organization's data
- ✅ Can view platform-wide analytics
- ✅ Can perform admin operations
- ✅ All actions are logged in audit trail

---

## Test Cases: Permission Inheritance

### TC-RBAC-007: Role Hierarchy - Permission Inheritance
**Priority**: HIGH
**Description**: Verify higher roles inherit lower role permissions

**Test Steps**:
1. Login as admin@alpha.com (ORGANIZATION_ADMIN)
2. Perform MEMBER operations (view resources) ✅
3. Perform VIEWER operations (read-only) ✅
4. Verify admin-specific operations work ✅

**Expected Results**:
- ✅ ADMIN can do everything MEMBER can do
- ✅ MEMBER can do everything VIEWER can do
- ✅ DEVELOPER can do everything MEMBER can do
- ✅ OWNER can do everything ADMIN can do

---

### TC-RBAC-008: Role Comparison - Level Checking
**Priority**: MEDIUM
**Description**: Verify role level comparisons work correctly

**Test Steps**:
1. Login as admin@alpha.com
2. Try to change member@alpha.com to DEVELOPER ✅
3. Try to change owner@alpha.com role ❌
4. Try to change own role ❌

**Expected Results**:
- ✅ Can change roles of lower-level users
- ❌ Cannot change role of equal or higher level (403)
- ❌ Cannot change own role
- ✅ Only OWNER can change ADMIN roles

---

## Test Cases: Admin Portal Roles

### TC-RBAC-009: ANALYST Role - Analytics View Only
**Priority**: MEDIUM
**Description**: Verify ANALYST can only view analytics

**Test Steps**:
1. Login as analyst@admin.com
2. View analytics: `GET /api/admin/analytics` ✅
3. View revenue metrics: `GET /api/admin/revenue` ✅
4. Try to view users: `GET /api/admin/users` ❌
5. Try to manage licenses: `POST /api/admin/licenses` ❌

**Expected Results**:
- ✅ Can view all analytics dashboards
- ✅ Can view revenue metrics
- ❌ Cannot view user details (403)
- ❌ Cannot manage licenses
- ❌ Cannot perform any admin operations

---

### TC-RBAC-010: SUPPORT_AGENT Role - Customer Support
**Priority**: MEDIUM
**Description**: Verify SUPPORT_AGENT has appropriate support access

**Test Steps**:
1. Login as support@admin.com
2. View user details: `GET /api/admin/users/{id}` ✅
3. View licenses: `GET /api/admin/licenses` ✅
4. Try to create admin user: `POST /api/admin/users` ❌
5. Try to manage billing: `POST /api/admin/billing` ❌

**Expected Results**:
- ✅ Can view user information
- ✅ Can view license information
- ❌ Cannot create admin users (403)
- ❌ Cannot manage billing
- ❌ Cannot modify licenses

---

### TC-RBAC-011: BILLING_ADMIN Role - Billing Management
**Priority**: HIGH
**Description**: Verify BILLING_ADMIN can manage billing

**Test Steps**:
1. Login as billing@admin.com
2. View billing data: `GET /api/admin/billing` ✅
3. Update billing: `PUT /api/admin/billing/{id}` ✅
4. View analytics: `GET /api/admin/analytics` ✅
5. Try to create admin user: `POST /api/admin/users` ❌
6. Try to view user details: `GET /api/admin/users/{id}` ✅

**Expected Results**:
- ✅ Can view and manage billing
- ✅ Can view analytics
- ✅ Can view license information
- ✅ Can view user details
- ❌ Cannot create admin users
- ❌ Cannot modify user roles

---

### TC-RBAC-012: ADMIN Role - General Administration
**Priority**: HIGH
**Description**: Verify ADMIN has broad admin access

**Test Steps**:
1. Login as admin-platform@admin.com
2. Manage users: `GET/POST /api/admin/users` ✅
3. Manage licenses: `GET/POST /api/admin/licenses` ✅
4. View analytics: `GET /api/admin/analytics` ✅
5. Try to create super admin: `POST /api/admin/users` with role SUPER_ADMIN ❌

**Expected Results**:
- ✅ Can manage users (except super admins)
- ✅ Can manage licenses
- ✅ Can view all analytics
- ❌ Cannot create SUPER_ADMIN users (403)
- ❌ Cannot modify SUPER_ADMIN users

---

## Test Cases: Special Scenarios

### TC-RBAC-013: Multi-Organization Membership
**Priority**: HIGH
**Description**: Verify user with multiple org memberships has correct role per org

**Test Steps**:
1. Create user: multiorg@test.com
2. Add to Org A as DEVELOPER
3. Add to Org B as MEMBER
4. Login and switch to Org A context
5. Verify DEVELOPER permissions ✅
6. Switch to Org B context
7. Verify MEMBER permissions ✅

**Expected Results**:
- ✅ In Org A: has DEVELOPER permissions
- ✅ In Org B: has MEMBER permissions
- ✅ Permissions update when switching context
- ✅ Cannot perform cross-org operations

---

### TC-RBAC-014: Role Change Propagation
**Priority**: HIGH
**Description**: Verify role changes take effect immediately

**Test Steps**:
1. Login as owner@alpha.com
2. Change member@alpha.com from MEMBER to DEVELOPER
3. User member@alpha.com refreshes their session
4. Verify new DEVELOPER permissions immediately active
5. Check audit log for role change

**Expected Results**:
- ✅ Role change is immediate
- ✅ New permissions active after token refresh
- ✅ Old permissions no longer work
- ✅ Role change logged in audit trail

---

### TC-RBAC-015: API Key Permissions
**Priority**: HIGH
**Description**: Verify API keys inherit role permissions

**Test Steps**:
1. Login as developer@alpha.com
2. Create API key
3. Use API key to make requests
4. Verify requests have DEVELOPER permissions
5. Try to perform ADMIN operations with API key ❌

**Expected Results**:
- ✅ API key has DEVELOPER permissions
- ✅ Can perform developer-level operations
- ❌ Cannot perform admin operations (403)
- ✅ API key permissions match user role

---

### TC-RBAC-016: Application Default Roles
**Priority**: MEDIUM
**Description**: Verify application default roles work correctly

**Test Steps**:
1. Create application with default role = VIEWER
2. Create API key for application
3. Make requests using application API key
4. Verify only VIEWER permissions are available

**Expected Results**:
- ✅ Application API key limited to VIEWER role
- ❌ Cannot perform write operations
- ✅ Can only read data
- ✅ Role properly enforced

---

### TC-RBAC-017: Invitation Role Assignment
**Priority**: HIGH
**Description**: Verify invitations assign correct roles

**Test Steps**:
1. Login as admin@alpha.com
2. Send invitation with role = DEVELOPER
3. Accept invitation
4. Verify new user has DEVELOPER role
5. Verify new user has DEVELOPER permissions

**Expected Results**:
- ✅ User created with DEVELOPER role
- ✅ Has all DEVELOPER permissions
- ✅ Role change logged in audit trail
- ✅ Invitation recorded in database

---

### TC-RBAC-018: Permission Boundary Tests
**Priority**: CRITICAL
**Description**: Test edge cases and boundary conditions

**Test Steps**:
1. Test each role trying to access next-higher permission
2. Test each role trying to modify own role
3. Test deleted user permissions
4. Test suspended user permissions

**Expected Results**:
- ❌ Lower roles cannot access higher permissions
- ❌ Users cannot modify own roles
- ❌ Deleted users have no access (401)
- ❌ Suspended users have no access (403)

---

## RBAC Summary Metrics

### Success Criteria
- ✅ All roles have correct permission sets
- ✅ Role inheritance works correctly
- ✅ Permission boundaries are enforced
- ✅ Cross-role operations are properly denied
- ✅ All permission checks return correct HTTP status codes

### Permission Matrix Validation

| Operation | VIEWER | MEMBER | DEVELOPER | ADMIN | OWNER |
|-----------|--------|--------|-----------|-------|-------|
| View resources | ✅ | ✅ | ✅ | ✅ | ✅ |
| Use API keys | ❌ | ✅ | ✅ | ✅ | ✅ |
| Create services | ❌ | ❌ | ✅ | ✅ | ✅ |
| Create API keys | ❌ | ❌ | ✅ | ✅ | ✅ |
| Invite users | ❌ | ❌ | ❌ | ✅ | ✅ |
| Change roles | ❌ | ❌ | ❌ | ✅ | ✅ |
| View billing | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage billing | ❌ | ❌ | ❌ | ❌ | ✅ |
| Remove members | ❌ | ❌ | ❌ | ❌ | ✅ |
| Delete org | ❌ | ❌ | ❌ | ❌ | ✅ |

### Testing Checklist
- [ ] All 18 RBAC test cases pass
- [ ] Permission matrix fully validated
- [ ] Role inheritance verified
- [ ] Admin portal roles tested
- [ ] API key permissions validated
- [ ] Multi-org memberships work correctly
- [ ] Role changes propagate immediately
- [ ] All denied operations return 403

---

# 💳 SECTION 3: SUBSCRIPTION PLAN LIMITS TESTING

## Objective
Validate that all subscription plans enforce their limits correctly and handle overages appropriately.

## Plan Definitions

### Current Plan Limits
```javascript
FREE: {
  userLimit: 1,
  datasourceLimit: 1,
  apiCallLimit: 25000,
  maxWorkflows: 5,
  features: ['Basic workflows', 'Community support']
}

STARTER: {
  userLimit: 1,
  datasourceLimit: 3,
  apiCallLimit: 1000000,
  maxWorkflows: 50,
  userOveragePrice: 10.00,
  features: ['Full workflows', 'Email support']
}

PROFESSIONAL: {
  userLimit: 10,
  datasourceLimit: -1, // Unlimited
  apiCallLimit: 5000000,
  maxWorkflows: -1, // Unlimited
  userOveragePrice: 10.00,
  features: ['Advanced workflows', 'Priority support']
}

BUSINESS: {
  userLimit: 25,
  datasourceLimit: -1, // Unlimited
  apiCallLimit: 10000000,
  maxWorkflows: -1, // Unlimited
  userOveragePrice: 10.00,
  features: ['Enterprise features', 'Dedicated support']
}

ENTERPRISE: {
  userLimit: -1, // Unlimited
  datasourceLimit: -1, // Unlimited
  apiCallLimit: -1, // Unlimited
  maxWorkflows: -1, // Unlimited
  userOveragePrice: 0,
  features: ['Custom everything', 'White glove support']
}
```

---

## Test Environment Setup

### Create Test Organizations for Each Plan
```bash
# Create one org per plan type
Org Free: "FreeOrg" (FREE plan)
Org Starter: "StarterOrg" (STARTER plan)
Org Professional: "ProOrg" (PROFESSIONAL plan)
Org Business: "BusinessOrg" (BUSINESS plan)
Org Enterprise: "EnterpriseOrg" (ENTERPRISE plan)

# Each org has an OWNER user
free-owner@test.com
starter-owner@test.com
pro-owner@test.com
business-owner@test.com
enterprise-owner@test.com
```

---

## Test Cases: User Limits

### TC-PLAN-001: FREE Plan - User Limit Enforcement
**Priority**: CRITICAL
**Description**: Verify FREE plan cannot exceed 1 user

**Test Steps**:
1. Login as free-owner@test.com (Org has 1 user)
2. Try to invite second user: `POST /api/invitations/send`
3. Check error response
4. Verify user count via `GET /api/usage/limits`

**Expected Results**:
- ❌ Invitation blocked (403 or specific error)
- ✅ Error message: "FREE plan allows 1 user. Upgrade to add more users."
- ✅ Response includes upgradeUrl: "/pricing"
- ✅ Current user count: 1
- ✅ User limit: 1
- ❌ Overage NOT allowed (no overage on FREE plan)

---

### TC-PLAN-002: STARTER Plan - User Limit Enforcement
**Priority**: CRITICAL
**Description**: Verify STARTER plan cannot exceed 1 user

**Test Steps**:
1. Login as starter-owner@test.com (Org has 1 user)
2. Try to invite second user: `POST /api/invitations/send`
3. Check if overage is allowed or blocked
4. Check usage dashboard: `GET /api/usage/dashboard`

**Expected Results**:
- ❌ Invitation blocked OR allowed with overage warning
- ✅ If allowed: Overage cost = $10/month
- ✅ Warning message about overage charges
- ✅ Usage dashboard shows overage: 1 user over limit
- ✅ Estimated monthly cost updated

---

### TC-PLAN-003: PROFESSIONAL Plan - Within User Limit
**Priority**: HIGH
**Description**: Verify PROFESSIONAL plan allows up to 10 users

**Test Steps**:
1. Login as pro-owner@test.com
2. Invite 9 additional users (total = 10)
3. Verify all invitations succeed
4. Check usage: `GET /api/usage/dashboard`

**Expected Results**:
- ✅ All 9 invitations succeed
- ✅ Total users: 10
- ✅ User limit: 10
- ✅ Percentage used: 100%
- ✅ No overage charges
- ✅ Dashboard shows "At limit" warning

---

### TC-PLAN-004: PROFESSIONAL Plan - User Overage
**Priority**: CRITICAL
**Description**: Verify PROFESSIONAL plan allows overage with charges

**Test Steps**:
1. Login as pro-owner@test.com (already has 10 users)
2. Invite 11th user: `POST /api/invitations/send`
3. Accept invitation
4. Check usage: `GET /api/usage/dashboard`
5. Check overage cost calculation

**Expected Results**:
- ✅ 11th user invitation succeeds
- ⚠️ Overage warning displayed
- ✅ Overage users: 1
- ✅ Overage cost: $10/month
- ✅ Total estimated cost: plan base + $10
- ✅ Dashboard shows overage clearly

---

### TC-PLAN-005: BUSINESS Plan - Within User Limit
**Priority**: HIGH
**Description**: Verify BUSINESS plan allows up to 25 users

**Test Steps**:
1. Login as business-owner@test.com
2. Invite 24 additional users (total = 25)
3. Verify all invitations succeed
4. Check usage metrics

**Expected Results**:
- ✅ All 24 invitations succeed
- ✅ Total users: 25
- ✅ User limit: 25
- ✅ No overage charges
- ✅ "At limit" warning displayed

---

### TC-PLAN-006: BUSINESS Plan - User Overage
**Priority**: CRITICAL
**Description**: Verify BUSINESS plan allows overage with charges

**Test Steps**:
1. Login as business-owner@test.com (has 25 users)
2. Invite 3 more users (total = 28)
3. Check overage calculation

**Expected Results**:
- ✅ All invitations succeed
- ✅ Overage users: 3
- ✅ Overage cost: $30/month (3 × $10)
- ✅ Dashboard shows overage breakdown
- ✅ Warning about monthly charges

---

### TC-PLAN-007: ENTERPRISE Plan - Unlimited Users
**Priority**: HIGH
**Description**: Verify ENTERPRISE plan has unlimited users

**Test Steps**:
1. Login as enterprise-owner@test.com
2. Invite 50+ users
3. Verify no limits enforced

**Expected Results**:
- ✅ All invitations succeed
- ✅ No user limit enforced
- ✅ No overage charges
- ✅ Dashboard shows "Unlimited"
- ✅ No warnings about user count

---

## Test Cases: Database Connection Limits

### TC-PLAN-008: FREE Plan - Connection Limit
**Priority**: CRITICAL
**Description**: Verify FREE plan limited to 1 database connection

**Test Steps**:
1. Login as free-owner@test.com
2. Create 1 database connection ✅
3. Try to create 2nd connection ❌
4. Verify error message

**Expected Results**:
- ✅ First connection created successfully
- ❌ Second connection blocked (403)
- ✅ Error: "FREE plan allows 1 datasource. Upgrade for more."
- ✅ upgradeUrl provided
- ✅ Current connections: 1
- ✅ Connection limit: 1

---

### TC-PLAN-009: STARTER Plan - Connection Limit
**Priority**: CRITICAL
**Description**: Verify STARTER plan limited to 3 connections

**Test Steps**:
1. Login as starter-owner@test.com
2. Create 3 connections ✅
3. Try to create 4th connection ❌

**Expected Results**:
- ✅ First 3 connections created
- ❌ 4th connection blocked
- ✅ Error: "STARTER plan allows 3 datasources. Upgrade for unlimited."
- ✅ Current connections: 3
- ✅ Connection limit: 3

---

### TC-PLAN-010: PROFESSIONAL Plan - Unlimited Connections
**Priority**: HIGH
**Description**: Verify PROFESSIONAL plan allows unlimited connections

**Test Steps**:
1. Login as pro-owner@test.com
2. Create 10+ connections
3. Verify no limit enforced

**Expected Results**:
- ✅ All connections created successfully
- ✅ No limit warnings
- ✅ Dashboard shows "Unlimited"
- ✅ Connection limit: -1 (unlimited)

---

### TC-PLAN-011: BUSINESS Plan - Unlimited Connections
**Priority**: HIGH
**Description**: Verify BUSINESS plan allows unlimited connections

**Test Steps**:
1. Login as business-owner@test.com
2. Create 20+ connections
3. Verify no limit enforced

**Expected Results**:
- ✅ All connections created successfully
- ✅ No limit warnings
- ✅ Connection limit: -1 (unlimited)

---

### TC-PLAN-012: ENTERPRISE Plan - Unlimited Connections
**Priority**: MEDIUM
**Description**: Verify ENTERPRISE plan allows unlimited connections

**Test Steps**:
1. Login as enterprise-owner@test.com
2. Create 30+ connections
3. Verify no limit enforced

**Expected Results**:
- ✅ All connections created
- ✅ Connection limit: -1 (unlimited)

---

## Test Cases: API Call Limits

### TC-PLAN-013: FREE Plan - API Call Limit
**Priority**: CRITICAL
**Description**: Verify FREE plan limited to 25K API calls/month

**Test Steps**:
1. Login as free-owner@test.com
2. Simulate 25,000 API calls in current month
3. Try 25,001st API call
4. Check rate limiting response

**Expected Results**:
- ✅ First 25,000 calls succeed
- ❌ 25,001st call blocked (429 Too Many Requests)
- ✅ Error: "API limit exceeded. Resets on [date]"
- ✅ Retry-After header present
- ✅ Usage metrics show 25,000 / 25,000

---

### TC-PLAN-014: STARTER Plan - API Call Limit
**Priority**: CRITICAL
**Description**: Verify STARTER plan limited to 1M API calls/month

**Test Steps**:
1. Login as starter-owner@test.com
2. Simulate 1,000,000 API calls
3. Try 1,000,001st call
4. Check limiting behavior

**Expected Results**:
- ✅ First 1M calls succeed
- ❌ 1,000,001st call blocked (429)
- ✅ Usage metrics: 1,000,000 / 1,000,000
- ✅ "Limit exceeded" message

---

### TC-PLAN-015: PROFESSIONAL Plan - API Call Limit
**Priority**: HIGH
**Description**: Verify PROFESSIONAL plan limited to 5M API calls/month

**Test Steps**:
1. Login as pro-owner@test.com
2. Simulate 5,000,000 API calls
3. Check usage metrics at 80% (4M calls)
4. Check usage at 100% (5M calls)
5. Try 5,000,001st call

**Expected Results**:
- ⚠️ At 4M calls: "Warning: 80% of API limit used"
- ⚠️ At 5M calls: "API limit reached"
- ❌ 5,000,001st call blocked (429)
- ✅ Clear messaging about monthly reset

---

### TC-PLAN-016: BUSINESS Plan - API Call Limit
**Priority**: HIGH
**Description**: Verify BUSINESS plan limited to 10M API calls/month

**Test Steps**:
1. Login as business-owner@test.com
2. Simulate 10,000,000 API calls
3. Try 10,000,001st call

**Expected Results**:
- ✅ First 10M calls succeed
- ❌ 10,000,001st call blocked
- ✅ Usage: 10,000,000 / 10,000,000

---

### TC-PLAN-017: ENTERPRISE Plan - Unlimited API Calls
**Priority**: MEDIUM
**Description**: Verify ENTERPRISE plan has unlimited API calls

**Test Steps**:
1. Login as enterprise-owner@test.com
2. Make 20M+ API calls
3. Verify no limiting

**Expected Results**:
- ✅ All calls succeed
- ✅ No rate limiting
- ✅ Dashboard shows "Unlimited"
- ✅ API limit: -1 (unlimited)

---

## Test Cases: Workflow Limits

### TC-PLAN-018: FREE Plan - Workflow Limit
**Priority**: HIGH
**Description**: Verify FREE plan limited to 5 workflows

**Test Steps**:
1. Login as free-owner@test.com
2. Create 5 workflows ✅
3. Try to create 6th workflow ❌

**Expected Results**:
- ✅ First 5 workflows created
- ❌ 6th workflow blocked
- ✅ Error: "FREE plan allows 5 workflows"
- ✅ Current workflows: 5
- ✅ Workflow limit: 5

---

### TC-PLAN-019: STARTER Plan - Workflow Limit
**Priority**: HIGH
**Description**: Verify STARTER plan limited to 50 workflows

**Test Steps**:
1. Login as starter-owner@test.com
2. Create 50 workflows ✅
3. Try to create 51st workflow ❌

**Expected Results**:
- ✅ First 50 workflows created
- ❌ 51st workflow blocked
- ✅ Current workflows: 50
- ✅ Workflow limit: 50

---

### TC-PLAN-020: PROFESSIONAL Plan - Unlimited Workflows
**Priority**: MEDIUM
**Description**: Verify PROFESSIONAL plan allows unlimited workflows

**Test Steps**:
1. Login as pro-owner@test.com
2. Create 100+ workflows
3. Verify no limit

**Expected Results**:
- ✅ All workflows created
- ✅ Workflow limit: -1 (unlimited)

---

## Test Cases: Plan Upgrades/Downgrades

### TC-PLAN-021: Plan Upgrade - FREE to STARTER
**Priority**: HIGH
**Description**: Verify upgrading from FREE to STARTER works correctly

**Test Steps**:
1. Login as free-owner@test.com (has 1 user, 1 connection)
2. Upgrade to STARTER plan: `POST /api/billing/upgrade`
3. Verify new limits applied
4. Try to create 2nd and 3rd connection

**Expected Results**:
- ✅ Upgrade succeeds
- ✅ Plan changed to STARTER
- ✅ New limits: 1 user, 3 connections, 1M API calls
- ✅ Can now create 2 more connections (total 3)
- ✅ Existing data preserved
- ✅ Billing updated

---

### TC-PLAN-022: Plan Upgrade - STARTER to PROFESSIONAL
**Priority**: HIGH
**Description**: Verify upgrade unlocks unlimited features

**Test Steps**:
1. Login as starter-owner@test.com
2. Upgrade to PROFESSIONAL
3. Verify unlimited connections
4. Verify 10 user limit

**Expected Results**:
- ✅ Plan upgraded to PROFESSIONAL
- ✅ Connection limit: -1 (unlimited)
- ✅ User limit: 10
- ✅ Can create unlimited connections
- ✅ Can invite 9 more users

---

### TC-PLAN-023: Plan Downgrade - PROFESSIONAL to STARTER
**Priority**: CRITICAL
**Description**: Verify downgrade with excess usage shows warnings

**Test Steps**:
1. Setup: pro-owner@test.com has 5 users, 10 connections
2. Attempt to downgrade to STARTER
3. Check for warnings about excess resources

**Expected Results**:
- ⚠️ Warning: "STARTER allows 1 user, you have 5"
- ⚠️ Warning: "STARTER allows 3 connections, you have 10"
- ⚠️ "Excess resources will be disabled"
- ✅ Option to remove excess resources first
- ❌ Downgrade blocked until excess removed OR
- ✅ Downgrade allowed with resources marked inactive

---

### TC-PLAN-024: Plan Downgrade - BUSINESS to PROFESSIONAL
**Priority**: HIGH
**Description**: Verify downgrade handles user count reduction

**Test Steps**:
1. Setup: business-owner@test.com has 20 users
2. Downgrade to PROFESSIONAL (10 user limit)
3. Check overage handling

**Expected Results**:
- ⚠️ Warning: "10 users over PROFESSIONAL limit"
- ✅ Overage cost: $100/month (10 × $10)
- ✅ Option to remove 10 users first
- ✅ If proceeded: overage charges applied
- ✅ Dashboard shows overage

---

### TC-PLAN-025: Trial to Paid Conversion
**Priority**: HIGH
**Description**: Verify trial conversion preserves limits and data

**Test Steps**:
1. Create trial organization (PROFESSIONAL trial)
2. Add 5 users, 10 connections during trial
3. Convert to paid PROFESSIONAL
4. Verify data and limits preserved

**Expected Results**:
- ✅ All data preserved
- ✅ Limits remain same (PROFESSIONAL)
- ✅ Billing starts
- ✅ No data loss
- ✅ Users can continue working

---

## Test Cases: Usage Dashboard & Metrics

### TC-PLAN-026: Usage Dashboard Accuracy
**Priority**: HIGH
**Description**: Verify usage dashboard shows accurate data

**Test Steps**:
1. Login as pro-owner@test.com
2. Setup: 7 users, 15 connections, 3M API calls
3. Call `GET /api/usage/dashboard`
4. Verify all metrics

**Expected Results**:
```json
{
  "plan": "PROFESSIONAL",
  "users": {
    "current": 7,
    "limit": 10,
    "percentage": 70,
    "overage": 0
  },
  "connections": {
    "current": 15,
    "limit": -1,
    "percentage": 0
  },
  "apiCalls": {
    "current": 3000000,
    "limit": 5000000,
    "percentage": 60
  },
  "workflows": {
    "current": 25,
    "limit": -1
  }
}
```

---

### TC-PLAN-027: Usage Warnings - 80% Threshold
**Priority**: MEDIUM
**Description**: Verify warnings appear at 80% usage

**Test Steps**:
1. Login as pro-owner@test.com
2. Add 8 users (80% of 10 limit)
3. Make 4M API calls (80% of 5M limit)
4. Check `GET /api/usage/warnings`

**Expected Results**:
- ⚠️ Warning: "Users at 80% of limit"
- ⚠️ Warning: "API calls at 80% of limit"
- ✅ Warnings shown in dashboard
- ✅ Email notification sent (if configured)

---

### TC-PLAN-028: Overage Cost Calculation
**Priority**: CRITICAL
**Description**: Verify overage costs calculated correctly

**Test Steps**:
1. Login as pro-owner@test.com
2. Add 13 users (3 over limit of 10)
3. Call `GET /api/usage/cost-estimate`

**Expected Results**:
```json
{
  "plan": "PROFESSIONAL",
  "baseCost": 149.00,
  "overages": {
    "users": {
      "count": 3,
      "unitPrice": 10.00,
      "totalCost": 30.00
    }
  },
  "totalMonthlyEstimate": 179.00
}
```

---

### TC-PLAN-029: Monthly Usage Reset
**Priority**: HIGH
**Description**: Verify API call limits reset monthly

**Test Steps**:
1. Login as free-owner@test.com
2. Use all 25K API calls in month 1
3. Wait for month rollover (or simulate)
4. Verify API calls reset to 0
5. Verify 25K limit available again

**Expected Results**:
- ✅ API calls reset to 0 on month start
- ✅ Full limit available again
- ✅ Previous month data archived
- ✅ Dashboard shows new month

---

### TC-PLAN-030: Overage Billing Automation
**Priority**: HIGH
**Description**: Verify overages are billed correctly

**Test Steps**:
1. Setup: business-owner@test.com with 28 users (3 overage)
2. Wait for billing cycle end (or simulate)
3. Check generated invoice
4. Verify overage charges included

**Expected Results**:
- ✅ Base plan charge: $X
- ✅ User overage: 3 × $10 = $30
- ✅ Total: Base + $30
- ✅ Invoice line items clear
- ✅ Stripe invoice created

---

## Test Cases: Edge Cases & Error Handling

### TC-PLAN-031: Concurrent User Addition
**Priority**: MEDIUM
**Description**: Test race condition when adding users near limit

**Test Steps**:
1. Setup: pro-owner@test.com with 9 users (1 under limit)
2. Simultaneously send 2 invitation requests
3. Check which succeeds/fails

**Expected Results**:
- ✅ First invitation succeeds (user 10)
- ✅ Second invitation succeeds with overage (user 11)
- OR
- ❌ One fails if overage not allowed
- ✅ No duplicate user additions
- ✅ Accurate count maintained

---

### TC-PLAN-032: Deleted Users and Limits
**Priority**: MEDIUM
**Description**: Verify deleted users don't count toward limits

**Test Steps**:
1. Setup: pro-owner@test.com with 10 users (at limit)
2. Delete 1 user
3. Verify user count: 9
4. Invite new user
5. Verify invitation succeeds

**Expected Results**:
- ✅ User count updates to 9 after deletion
- ✅ Can invite new user (under limit)
- ✅ New invitation succeeds
- ✅ User count accurate: 10

---

### TC-PLAN-033: Inactive vs Active Connections
**Priority**: MEDIUM
**Description**: Verify only active connections count toward limits

**Test Steps**:
1. Login as starter-owner@test.com
2. Create 3 connections (at limit)
3. Mark 1 connection as inactive
4. Try to create new connection

**Expected Results**:
- ✅ Active connection count: 2
- ✅ Can create 3rd active connection
- ✅ Inactive connections don't count
- ✅ Total connections: 4 (3 active, 1 inactive)

---

### TC-PLAN-034: Plan Cancellation
**Priority**: HIGH
**Description**: Verify cancelled plan limits access appropriately

**Test Steps**:
1. Login as business-owner@test.com
2. Cancel subscription
3. Verify grace period behavior
4. After grace period, check access

**Expected Results**:
- ✅ During grace period: full access
- ⚠️ Warning: "Subscription cancelled, ends [date]"
- ❌ After grace period: downgraded to FREE
- ✅ Excess resources disabled
- ✅ Data preserved but limited access

---

### TC-PLAN-035: Payment Failure Handling
**Priority**: HIGH
**Description**: Verify behavior when payment fails

**Test Steps**:
1. Simulate payment failure for pro-owner@test.com
2. Check plan status
3. Verify grace period and warnings
4. Check feature access

**Expected Results**:
- ⚠️ Status: PAST_DUE
- ✅ Grace period: 7-14 days
- ⚠️ Warnings shown to user
- ✅ Limited access during grace period
- ❌ Full access blocked after grace period

---

## Plan Limits Summary Metrics

### Success Criteria
- ✅ All plan limits enforced correctly
- ✅ Overage calculations accurate
- ✅ Upgrades/downgrades work smoothly
- ✅ Usage dashboard shows accurate data
- ✅ Billing integration works correctly
- ✅ Edge cases handled gracefully

### Plan Limits Matrix

| Feature | FREE | STARTER | PROFESSIONAL | BUSINESS | ENTERPRISE |
|---------|------|---------|--------------|----------|------------|
| Users | 1 | 1 | 10 (+overage) | 25 (+overage) | Unlimited |
| Connections | 1 | 3 | Unlimited | Unlimited | Unlimited |
| API Calls/mo | 25K | 1M | 5M | 10M | Unlimited |
| Workflows | 5 | 50 | Unlimited | Unlimited | Unlimited |
| Overage Allowed | ❌ | ✅ | ✅ | ✅ | N/A |

### Testing Checklist
- [ ] All 35 plan test cases pass
- [ ] User limits enforced correctly
- [ ] Connection limits enforced correctly
- [ ] API call limits enforced correctly
- [ ] Workflow limits enforced correctly
- [ ] Overage calculations accurate
- [ ] Plan upgrades work correctly
- [ ] Plan downgrades handle excess resources
- [ ] Usage dashboard accurate
- [ ] Billing automation works
- [ ] Edge cases handled properly

---

# 🎯 OVERALL PRODUCTION READINESS CHECKLIST

## Critical Issues (Must Fix)
- [ ] Zero data leakage between organizations verified
- [ ] All roles have correct permissions
- [ ] All plan limits enforced correctly
- [ ] Super admin access properly controlled
- [ ] Billing integration accurate

## High Priority Issues
- [ ] API key permissions work correctly
- [ ] Multi-org memberships handled properly
- [ ] Overage billing automated
- [ ] Usage metrics accurate
- [ ] Audit logging comprehensive

## Testing Summary
- [ ] Section 1 (Isolation): X/20 tests passed
- [ ] Section 2 (RBAC): X/18 tests passed
- [ ] Section 3 (Plans): X/35 tests passed
- [ ] Overall: X/73 tests passed (Target: 100%)

## Security Verification
- [ ] No SQL injection vulnerabilities
- [ ] No authorization bypass possible
- [ ] All sensitive data encrypted
- [ ] Audit trail complete
- [ ] Rate limiting functional

## Performance Checks
- [ ] Middleware doesn't slow requests >10ms
- [ ] Database queries optimized
- [ ] Large org support (100+ users)
- [ ] API response times <200ms

---

# 📝 TESTING EXECUTION GUIDE

## For AI Testing Agents

### Agent 1: Data Isolation Testing
**Assignment**: Execute all TC-ISO-* test cases (Section 1)
**Focus**: Ensure zero cross-organization data leakage
**Report Format**:
```
Test Case ID | Status | Error Details | Evidence
TC-ISO-001   | PASS   | -             | Screenshot/logs
TC-ISO-002   | FAIL   | Error message | API response
```

### Agent 2: RBAC Testing
**Assignment**: Execute all TC-RBAC-* test cases (Section 2)
**Focus**: Validate role permissions and boundaries
**Report Format**:
```
Role Tested | Permission | Expected | Actual | Status
VIEWER      | Create API | DENY     | DENY   | PASS
```

### Agent 3: Plan Limits Testing
**Assignment**: Execute all TC-PLAN-* test cases (Section 3)
**Focus**: Ensure plan limits and billing work correctly
**Report Format**:
```
Plan    | Limit Type | Limit Value | Tested Value | Status
FREE    | Users      | 1           | 2 attempted  | PASS (blocked)
```

## Testing Tools & Scripts

### Automated Test Execution
```bash
# Run all isolation tests
npm run test:isolation

# Run all RBAC tests
npm run test:rbac

# Run all plan limit tests
npm run test:plans

# Run complete production test suite
npm run test:production
```

### Manual Testing Helpers
```bash
# Create test organizations
npm run seed:test-orgs

# Generate test data
npm run seed:test-data

# Clean up test data
npm run cleanup:test-data
```

---

# 📊 FINAL DELIVERABLES

Each AI agent should deliver:

1. **Test Execution Report** (CSV/JSON format)
2. **Failed Test Details** (with screenshots/logs)
3. **Security Findings** (any vulnerabilities found)
4. **Performance Metrics** (response times, query counts)
5. **Recommendations** (fixes needed before production)

## Report Template
```markdown
# [Section Name] Testing Report

## Summary
- Total Tests: X
- Passed: Y
- Failed: Z
- Pass Rate: Y/X%

## Critical Failures
[List any CRITICAL or HIGH priority failures]

## Security Issues
[List any security vulnerabilities found]

## Performance Concerns
[List any performance issues]

## Recommendations
[Actionable items to fix before production]
```

---

**END OF TESTING PLAN**

This comprehensive testing plan ensures your application is production-ready with zero data leakage, correct role permissions, and accurate plan limit enforcement.
