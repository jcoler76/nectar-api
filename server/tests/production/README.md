# Organization Data Isolation Test Suite - Section 1

## 🎯 Overview

This directory contains comprehensive automated tests for **Section 1: Organization Data Isolation** from the Production Testing Plan. The test suite validates zero data leakage between organizations across 20 critical test cases.

## ✅ Test Coverage

### Test Cases Implemented (TC-ISO-001 through TC-ISO-020)

| Test Case | Priority | Description | Status |
|-----------|----------|-------------|--------|
| TC-ISO-001 | CRITICAL | Database Connections Isolation | ✅ Implemented |
| TC-ISO-002 | CRITICAL | Services Isolation | ✅ Implemented |
| TC-ISO-003 | CRITICAL | Applications & API Keys Isolation | ✅ Implemented |
| TC-ISO-004 | CRITICAL | Workflows Isolation | ✅ Implemented |
| TC-ISO-005 | CRITICAL | Endpoints Isolation | ✅ Implemented |
| TC-ISO-006 | CRITICAL | API Activity Logs Isolation | ✅ Implemented |
| TC-ISO-007 | CRITICAL | Audit Logs Isolation | ✅ Implemented |
| TC-ISO-008 | CRITICAL | Users & Memberships Isolation | ✅ Implemented |
| TC-ISO-009 | CRITICAL | Invitations Isolation | ✅ Implemented |
| TC-ISO-010 | HIGH | Notifications Isolation | ✅ Implemented |
| TC-ISO-011 | HIGH | Webhooks Isolation | ✅ Implemented |
| TC-ISO-012 | CRITICAL | File Storage Isolation | ✅ Implemented |
| TC-ISO-013 | HIGH | Usage Metrics Isolation | ✅ Implemented |
| TC-ISO-014 | CRITICAL | Roles & Permissions Isolation | ✅ Implemented |
| TC-ISO-015 | CRITICAL | Subscription Data Isolation | ✅ Implemented |
| TC-ISO-016 | HIGH | Database Object Isolation | ✅ Implemented |
| TC-ISO-017 | HIGH | Rate Limit Configs Isolation | ✅ Implemented |
| TC-ISO-018 | CRITICAL | Super Admin Cross-Org Access | ✅ Implemented |
| TC-ISO-019 | CRITICAL | GraphQL Query Isolation | ✅ Implemented |
| TC-ISO-020 | CRITICAL | Security Bypass Attempts | ✅ Implemented |

## 🚀 Quick Start

### Prerequisites

1. **Backend server running** on `http://localhost:3001`
2. **PostgreSQL database** configured with RLS (Row-Level Security)
3. **Prisma client** generated (`npm run prisma:generate`)
4. **Environment variables** properly set

### Running the Tests

```bash
# Navigate to server directory
cd server

# Run the comprehensive test suite
node tests/production/organizationIsolation.test.js

# Or use npm script (add to package.json)
npm run test:isolation
```

### Expected Output

```
================================================================================
🚀 ORGANIZATION DATA ISOLATION TEST SUITE
   Section 1: Production Testing Plan
================================================================================

🔧 Setting up test data...

📦 Creating test organizations...
  ✓ Created organization: Alpha Corp
  ✓ Created organization: Beta Industries
  ✓ Created organization: Gamma Enterprises

👥 Creating test users...
  ✓ Created 9 users across 3 organizations

🔐 Logging in test users...
  ✓ All users logged in successfully

📊 Creating test data...
  ✓ Created test data for all organizations

🧪 Running isolation tests...

✅ TC-ISO-001: Database Connections Isolation - PASS
✅ TC-ISO-002: Services Isolation - PASS
...

================================================================================
📊 TEST EXECUTION SUMMARY
================================================================================

Total Tests: 20
✅ Passed: 20
❌ Failed: 0
📈 Pass Rate: 100%

✅ PRODUCTION READY: All isolation tests passed!
```

## 🔧 Test Data Setup

The test suite automatically creates:

### 3 Test Organizations
- **Alpha Corp** (`alpha-test-org`)
- **Beta Industries** (`beta-test-org`)
- **Gamma Enterprises** (`gamma-test-org`)

### 9 Test Users (3 per organization)
- Owner (ORGANIZATION_OWNER)
- Admin (ORGANIZATION_ADMIN)
- Member (MEMBER)

### Test Data per Organization
- 3 Database Connections
- 5 Services
- 3 Applications
- 10 Workflows
- 5 Endpoints
- 3 Custom Roles
- 2 API Keys
- 3 Notifications
- 2 Webhooks

## 🔍 What Each Test Validates

### TC-ISO-001: Database Connections
- ✅ Users can only see connections from their organization
- ❌ Cannot access connections from other organizations (403/404)
- ✅ organizationId matches user's organization in all results

### TC-ISO-002 through TC-ISO-017
Similar validation for Services, Applications, Workflows, Endpoints, Logs, Users, Invitations, Notifications, Webhooks, Files, Metrics, Roles, Subscriptions, Database Objects, and Rate Limits.

### TC-ISO-018: Super Admin Access
- ✅ Regular users cannot access other organizations
- ✅ Super admin context switching is properly tracked

### TC-ISO-019: GraphQL Query Isolation
- ✅ Complex GraphQL queries return only org-scoped data
- ✅ No cross-org data leakage in nested queries

### TC-ISO-020: Security Bypass Attempts
- ❌ SQL injection attempts blocked
- ❌ Header manipulation attempts blocked
- ❌ Query parameter manipulation blocked
- ✅ All attempts logged in security audit

## 📝 Test Output Files

After execution, the following files are generated:

```
server/
  test-results-isolation.json   # Detailed test results
  tests/
    production/
      organizationIsolation.test.js   # Main test suite
      README.md                        # This file
```

### test-results-isolation.json Structure

```json
{
  "passed": 20,
  "failed": 0,
  "total": 20,
  "details": [
    {
      "testCase": "TC-ISO-001",
      "status": "PASS",
      "message": "All connections properly isolated",
      "evidence": null,
      "timestamp": "2025-10-01T..."
    },
    ...
  ]
}
```

## 🐛 Troubleshooting

### Issue: Prisma Schema Errors

**Error:** `Invalid database type` or `Missing required field`

**Solution:** Ensure Prisma schema is up-to-date and generated:
```bash
cd server
npx prisma generate
```

### Issue: RLS Policy Errors

**Error:** `new row violates row-level security policy`

**Solution:** The test uses `prismaService.getSystemClient()` which bypasses RLS. Ensure:
1. `ADMIN_DATABASE_URL` environment variable is set
2. The admin user has proper permissions
3. RLS policies are correctly configured

### Issue: Login Failures

**Error:** `Failed to login user`

**Solution:**
1. Verify backend is running on port 3001
2. Check auth service is working: `curl http://localhost:3001/api/health`
3. Ensure JWT_SECRET is configured

### Issue: Test Data Cleanup

If you need to manually clean up test data:

```sql
-- Connect to PostgreSQL
-- Delete test users
DELETE FROM "User" WHERE email LIKE '%@alpha-test.com'
  OR email LIKE '%@beta-test.com'
  OR email LIKE '%@gamma-test.com';

-- Delete test organizations
DELETE FROM "Organization" WHERE slug IN (
  'alpha-test-org', 'beta-test-org', 'gamma-test-org'
);
```

## 🔒 Security Considerations

### What the Tests Validate

1. **Row-Level Security (RLS)**
   - Database-level isolation working correctly
   - Policies enforced for all tenant tables

2. **Application-Level Isolation**
   - Middleware properly filters all queries
   - organizationId context always applied

3. **API Security**
   - JWT tokens properly scoped to organizations
   - Cross-org access attempts blocked
   - API keys cannot access other organizations

4. **GraphQL Security**
   - Queries properly scoped
   - Nested queries respect organization boundaries
   - No data leakage through resolvers

5. **Bypass Prevention**
   - SQL injection blocked
   - Parameter tampering prevented
   - Header manipulation ineffective

### Production Readiness Criteria

✅ **PASS** if:
- All 20 tests pass (100% success rate)
- Zero instances of cross-org data leakage
- All security bypass attempts fail
- Super admin access properly tracked

❌ **FAIL** if:
- Any critical test fails (TC-ISO-001 through TC-ISO-020)
- Cross-org data visible in any response
- Bypass attempts succeed
- Missing audit trail for admin actions

## 📊 Continuous Integration

### Add to CI/CD Pipeline

```yaml
# .github/workflows/test-isolation.yml
name: Organization Isolation Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test-isolation:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          npm install
          cd server && npm install

      - name: Run database migrations
        run: cd server && npx prisma migrate deploy

      - name: Generate Prisma client
        run: cd server && npx prisma generate

      - name: Start backend server
        run: cd server && npm start &

      - name: Wait for server
        run: npx wait-on http://localhost:3001/api/health

      - name: Run isolation tests
        run: cd server && node tests/production/organizationIsolation.test.js

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: server/test-results-isolation.json
```

## 🎯 Next Steps

### After All Tests Pass

1. **Document Results**
   - Save test-results-isolation.json
   - Create summary report
   - Share with stakeholders

2. **Address Any Failures**
   - Review failed test details
   - Fix isolation issues
   - Re-run tests

3. **Move to Section 2**
   - RBAC Testing (18 test cases)
   - Permission validation
   - Role hierarchy tests

4. **Move to Section 3**
   - Plan Limits Testing (35 test cases)
   - Usage enforcement
   - Billing validation

### Recommended Actions

✅ **Before Production:**
- [ ] All 20 isolation tests pass
- [ ] Manual penetration testing completed
- [ ] Security audit performed
- [ ] Load testing with multiple orgs
- [ ] Monitor RLS performance impact

✅ **In Production:**
- [ ] Enable continuous isolation testing
- [ ] Monitor cross-org access attempts
- [ ] Alert on RLS policy violations
- [ ] Regular security audits
- [ ] Quarterly penetration testing

## 📚 Additional Resources

- **Production Testing Plan**: `../../docs/PRODUCTION_TESTING_PLAN.md`
- **Prisma Schema**: `../prisma/schema.prisma`
- **Tenant Isolation Middleware**: `../middleware/tenantIsolation.js`
- **Prisma Service**: `../services/prismaService.js`
- **Auth Service**: `../services/authService.js`

## 🤝 Contributing

When adding new resources that need organization isolation:

1. Add the resource to `testData` structure
2. Create test data in `createOrganizationData()`
3. Add new test case function (TC-ISO-###)
4. Call test in `runAllTests()`
5. Update this README
6. Ensure RLS policies are applied

## 📞 Support

If you encounter issues:

1. Check troubleshooting section above
2. Review test output in `test-results-isolation.json`
3. Check server logs for errors
4. Verify database RLS policies
5. Contact security team for guidance

---

**Test Suite Version**: 1.0.0
**Last Updated**: October 2025
**Maintained By**: Platform Security Team
**Related Document**: PRODUCTION_TESTING_PLAN.md Section 1
