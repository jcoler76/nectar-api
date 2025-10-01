# 🧪 Pricing Limits Testing Plan

## Overview
This document outlines comprehensive testing for user and datasource limits across all subscription plans.

## 📊 Current Plan Limits
```
FREE:
- Users: 1
- Datasources: 1
- API Calls: 25K/month

STARTER:
- Users: 1
- Datasources: 3
- API Calls: 1M/month

TEAM:
- Users: 10 (overage: $10/user)
- Datasources: Unlimited
- API Calls: 5M/month

BUSINESS:
- Users: 25 (overage: $10/user)
- Datasources: Unlimited
- API Calls: 10M/month

ENTERPRISE:
- Users: Unlimited
- Datasources: Unlimited
- API Calls: Unlimited
```

## 🧑‍🤝‍🧑 User Limit Tests

### Test Case 1: FREE Plan User Limits
**Objective**: Verify FREE plan cannot exceed 1 user

**Setup**:
1. Create organization with FREE plan
2. Ensure organization has 1 user (owner)

**Test Steps**:
1. Try to send invitation to second user
2. Verify invitation is blocked with appropriate error
3. Check error message contains upgrade suggestion

**Expected Results**:
- ❌ Invitation should be blocked
- ✅ Error code: `USER_LIMIT_EXCEEDED`
- ✅ Error message mentions FREE plan limit
- ✅ upgradeUrl points to `/pricing`

### Test Case 2: STARTER Plan User Limits
**Objective**: Verify STARTER plan cannot exceed 1 user

**Setup**:
1. Create organization with STARTER plan
2. Ensure organization has 1 user

**Test Steps**:
1. Try to send invitation to second user
2. Verify invitation is blocked

**Expected Results**:
- ❌ Invitation should be blocked
- ✅ Error mentions STARTER plan limit

### Test Case 3: TEAM Plan User Limits & Overage
**Objective**: Verify TEAM plan allows 10 users, then charges overage

**Setup**:
1. Create organization with TEAM plan
2. Add 10 users to organization

**Test Steps**:
1. Verify 10th user invitation succeeds
2. Send invitation for 11th user
3. Check that invitation succeeds (overage allowed)
4. Verify overage cost calculation

**Expected Results**:
- ✅ 10th user invitation succeeds
- ✅ 11th user invitation succeeds
- ✅ Overage calculation: 1 user × $10 = $10/month

### Test Case 4: BUSINESS Plan User Limits & Overage
**Objective**: Verify BUSINESS plan allows 25 users, then charges overage

**Setup**:
1. Create organization with BUSINESS plan
2. Add 25 users to organization

**Test Steps**:
1. Verify 25th user invitation succeeds
2. Send invitation for 26th user
3. Verify overage cost calculation

**Expected Results**:
- ✅ 25th user invitation succeeds
- ✅ 26th user invitation succeeds
- ✅ Overage calculation: 1 user × $10 = $10/month

### Test Case 5: ENTERPRISE Plan User Limits
**Objective**: Verify ENTERPRISE plan has unlimited users

**Setup**:
1. Create organization with ENTERPRISE plan

**Test Steps**:
1. Send multiple invitations (e.g., 50+ users)
2. Verify no limits are enforced

**Expected Results**:
- ✅ All invitations succeed
- ✅ No overage charges

## 🔗 Datasource Limit Tests

### Test Case 6: FREE Plan Datasource Limits
**Objective**: Verify FREE plan cannot exceed 1 datasource

**Setup**:
1. Create organization with FREE plan
2. Create 1 datasource/connection

**Test Steps**:
1. Try to create second datasource
2. Verify creation is blocked

**Expected Results**:
- ❌ Second datasource creation blocked
- ✅ Error code: `DATASOURCE_LIMIT_EXCEEDED`
- ✅ Error mentions FREE plan limit
- ✅ upgradeUrl points to `/pricing`

### Test Case 7: STARTER Plan Datasource Limits
**Objective**: Verify STARTER plan allows 3 datasources max

**Setup**:
1. Create organization with STARTER plan

**Test Steps**:
1. Create 3 datasources successfully
2. Try to create 4th datasource
3. Verify 4th creation is blocked

**Expected Results**:
- ✅ First 3 datasources created successfully
- ❌ 4th datasource creation blocked
- ✅ Error mentions STARTER plan 3-datasource limit

### Test Case 8: TEAM Plan Datasource Limits
**Objective**: Verify TEAM plan allows unlimited datasources

**Setup**:
1. Create organization with TEAM plan

**Test Steps**:
1. Create many datasources (e.g., 10+)
2. Verify no limits enforced

**Expected Results**:
- ✅ All datasource creations succeed
- ✅ No limit warnings

### Test Case 9: BUSINESS Plan Datasource Limits
**Objective**: Verify BUSINESS plan allows unlimited datasources

**Setup**:
1. Create organization with BUSINESS plan

**Test Steps**:
1. Create many datasources (e.g., 15+)
2. Verify no limits enforced

**Expected Results**:
- ✅ All datasource creations succeed

### Test Case 10: ENTERPRISE Plan Datasource Limits
**Objective**: Verify ENTERPRISE plan allows unlimited datasources

**Setup**:
1. Create organization with ENTERPRISE plan

**Test Steps**:
1. Create many datasources (e.g., 20+)
2. Verify no limits enforced

**Expected Results**:
- ✅ All datasource creations succeed

## 🔄 Plan Upgrade/Downgrade Tests

### Test Case 11: Plan Upgrade Preserves Data
**Objective**: Verify upgrading plans preserves existing users/datasources

**Setup**:
1. Create organization with STARTER plan
2. Add 1 user, 3 datasources

**Test Steps**:
1. Upgrade to TEAM plan
2. Verify existing data is preserved
3. Test that new limits apply

**Expected Results**:
- ✅ All existing users preserved
- ✅ All existing datasources preserved
- ✅ Can now invite more users (up to 10)
- ✅ Can create unlimited datasources

### Test Case 12: Plan Downgrade Warnings
**Objective**: Verify downgrading with excess usage shows warnings

**Setup**:
1. Create organization with TEAM plan
2. Add 5 users, 10 datasources

**Test Steps**:
1. Attempt to downgrade to STARTER plan
2. Check for appropriate warnings

**Expected Results**:
- ⚠️ Warning about 4 excess users (STARTER only allows 1)
- ⚠️ Warning about 7 excess datasources (STARTER only allows 3)
- ✅ Clear explanation of what will happen

## 📊 Usage Dashboard Tests

### Test Case 13: Usage Dashboard Accuracy
**Objective**: Verify usage dashboard shows correct limits and usage

**Setup**:
1. Create organization with TEAM plan
2. Add 7 users, 5 datasources

**Test Steps**:
1. Call `/api/usage/dashboard` endpoint
2. Verify returned data accuracy

**Expected Results**:
- ✅ `users.current`: 7
- ✅ `users.limit`: 10
- ✅ `users.percentage`: 70%
- ✅ `datasources.current`: 5
- ✅ `datasources.limit`: -1 (unlimited)
- ✅ `plan`: "TEAM"

### Test Case 14: Usage Warnings
**Objective**: Test warning generation at 80% usage

**Setup**:
1. Create organization with TEAM plan
2. Add 8 users (80% of 10 limit)

**Test Steps**:
1. Call `/api/usage/warnings` endpoint
2. Verify warning is generated

**Expected Results**:
- ✅ Warning type: `USER_LIMIT_APPROACHING`
- ✅ Warning severity: `info`
- ✅ Message mentions 80% usage

### Test Case 15: Overage Cost Calculation
**Objective**: Test overage cost calculation accuracy

**Setup**:
1. Create organization with TEAM plan
2. Add 12 users (2 over limit)

**Test Steps**:
1. Call `/api/usage/cost-estimate` endpoint
2. Verify cost calculation

**Expected Results**:
- ✅ `baseCost`: 99 (TEAM plan)
- ✅ `overages.users.count`: 2
- ✅ `overages.users.totalCost`: 20 (2 × $10)
- ✅ `totalCost`: 119

## 🚀 API Integration Tests

### Test Case 16: Middleware Integration
**Objective**: Verify middleware correctly blocks requests

**Setup**:
1. Create FREE plan organization with 1 user, 1 datasource

**Test Steps**:
1. Make POST request to `/api/invitations/send`
2. Make POST request to `/api/connections`
3. Verify both are blocked

**Expected Results**:
- ❌ Both requests return 403 status
- ✅ Appropriate error messages returned

### Test Case 17: Authentication Integration
**Objective**: Verify limits work with authenticated requests

**Setup**:
1. Create authenticated user session
2. Organization on STARTER plan

**Test Steps**:
1. Make authenticated requests to create resources
2. Verify organizationId is extracted correctly

**Expected Results**:
- ✅ Limits applied based on correct organization
- ✅ User context preserved through middleware chain

## 📝 Manual Testing Checklist

### Pre-Release Validation
- [ ] Test all user limit scenarios
- [ ] Test all datasource limit scenarios
- [ ] Verify error messages are user-friendly
- [ ] Check upgrade URLs work correctly
- [ ] Test overage calculations
- [ ] Verify usage dashboard accuracy
- [ ] Test plan upgrade/downgrade flows
- [ ] Check middleware doesn't break existing functionality

### Performance Testing
- [ ] Verify middleware doesn't significantly slow requests
- [ ] Test with high user counts (100+)
- [ ] Test with many datasources (50+)
- [ ] Check database query performance

### Security Testing
- [ ] Verify users can't bypass limits via API manipulation
- [ ] Test that organizationId is properly validated
- [ ] Check that limits apply to correct organization
- [ ] Verify no information leakage in error messages

## 🐛 Common Issues to Watch For

1. **organizationId Extraction**: Ensure middleware correctly gets organizationId from req.user
2. **Plan Type Matching**: Verify plan names match between frontend/backend
3. **Overage vs Block**: TEAM/BUSINESS allow overage, FREE/STARTER block
4. **Database Counts**: Ensure counting queries are accurate and efficient
5. **Error Handling**: Non-critical errors shouldn't break the request flow
6. **Cache Issues**: Usage counts should be real-time, not cached

## 🔧 Testing Tools

### Automated Testing
```bash
# Run specific limit tests
npm test -- --grep "user limits"
npm test -- --grep "datasource limits"

# Run integration tests
npm run test:integration

# Performance testing
npm run test:performance
```

### Manual Testing
```bash
# Create test organizations
curl -X POST /api/organizations -d '{"plan": "FREE"}'

# Test user invitations
curl -X POST /api/invitations/send -d '{"email": "test@example.com", "role": "MEMBER"}'

# Test datasource creation
curl -X POST /api/connections -d '{"name": "Test DB", "type": "postgres"}'

# Check usage dashboard
curl -X GET /api/usage/dashboard
```

This comprehensive testing plan ensures all pricing limits work correctly before release.