# Billing Plan Test Users

This document contains test users created for each billing plan tier to verify proper plan enforcement and user access controls.

## Test User Credentials

**Password for all test users:** `TestPass123!`

| Plan | Email | First Name | Last Name | Organization |
|------|-------|------------|-----------|--------------|
| FREE | test-free@example.com | Free | User | Free Tier Organization |
| STARTER | test-starter@example.com | Starter | User | Starter Plan Organization |
| TEAM (PROFESSIONAL) | test-team@example.com | Team | User | Team Plan Organization |
| BUSINESS | test-business@example.com | Business | User | Business Plan Organization |
| ENTERPRISE | test-enterprise@example.com | Enterprise | User | Enterprise Plan Organization |

## Plan Limits Verification

### FREE Plan
- **Max Users:** 1
- **Max API Calls:** 25,000/month
- **Max Workflows:** 5
- **Max DB Connections:** 1

### STARTER Plan
- **Max Users:** 5
- **Max API Calls:** 1,000,000/month
- **Max Workflows:** 50
- **Max DB Connections:** 5

### TEAM (PROFESSIONAL) Plan
- **Max Users:** 10
- **Max API Calls:** 5,000,000/month
- **Max Workflows:** 100
- **Max DB Connections:** 10

### BUSINESS Plan
- **Max Users:** 25
- **Max API Calls:** 10,000,000/month
- **Max Workflows:** 500
- **Max DB Connections:** 25

### ENTERPRISE Plan
- **Max Users:** 999
- **Max API Calls:** 999,999,999/month
- **Max Workflows:** 9,999
- **Max DB Connections:** 999

## Verification Steps

### 1. Admin Frontend Verification

1. **Login to Admin Frontend**
   - Navigate to the admin frontend
   - Login with admin credentials

2. **User Management Section**
   - Go to User Management
   - Search for users with emails starting with "test-"
   - Verify all 5 test users appear
   - Check user details match the table above

3. **Subscription Management Section**
   - Go to Subscription Management
   - Find subscriptions for test organizations
   - Verify plan types and limits are correctly displayed
   - Confirm subscription status is "ACTIVE" for all test users

### 2. Customer App Manual Testing

For each test user, perform the following verification:

1. **Login Test**
   - Login to the main customer application
   - Use the email and password from the credentials table
   - Verify successful login

2. **Plan Display**
   - Check dashboard/settings to see current plan information
   - Verify the displayed plan matches the expected plan tier

3. **Feature Access**
   - Test creating database connections (should respect max limits)
   - Test creating workflows (should respect max limits)
   - Test API usage (monitor for rate limiting at plan thresholds)

### 3. Database Verification

Run the verification script to check database records:

```bash
cd server
node scripts/verifyTestUsers.js
```

This script will:
- Confirm all test users exist in the database
- Verify subscription plans and limits are correctly set
- Show organization and membership details
- Provide a summary of created test data

## Plan Mapping Note

The marketing site uses these plan names:
- Free → FREE (database enum)
- Starter → STARTER (database enum)
- Team → PROFESSIONAL (database enum)
- Business → BUSINESS (database enum)
- Enterprise → ENTERPRISE (database enum)

## Test Cleanup

To remove test users after testing is complete:

```sql
-- Find test user IDs and organization IDs
SELECT u.id as user_id, u.email, o.id as org_id, o.name
FROM users u
JOIN memberships m ON u.id = m.user_id
JOIN organizations o ON m.organization_id = o.id
WHERE u.email LIKE 'test-%@example.com';

-- Then use these IDs to clean up (replace with actual IDs):
-- DELETE FROM subscriptions WHERE organization_id IN (...);
-- DELETE FROM memberships WHERE organization_id IN (...);
-- DELETE FROM organizations WHERE id IN (...);
-- DELETE FROM users WHERE id IN (...);
```

## Production Readiness

✅ **Completed:**
- Test users created for all billing plans
- Proper subscription limits configured
- Database verification scripts created
- Admin frontend ready for verification

📋 **Next Steps for Production:**
1. Verify plan enforcement in the customer application
2. Test plan upgrade/downgrade functionality
3. Verify billing integration with payment processor
4. Test plan limit enforcement (API rate limiting, feature restrictions)
5. Validate plan display in customer dashboard