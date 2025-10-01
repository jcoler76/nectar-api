# Security Fixes TODO List

## Critical Priority - Fix Immediately

### 1. Fix Password Hash Input Bypass Vulnerability ✅ COMPLETED
**File:** `admin-backend/src/routes/adminUsers.ts`
**Status:** ✅ Completed
**Severity:** HIGH

**Issue:** Admin user creation endpoint accepts pre-hashed passwords from client input without validation.

**Tasks:**
- [x] Remove `passwordHash` parameter from request body destructuring (line 99)
- [x] Add `password` parameter instead for plaintext password input
- [x] Implement server-side password validation:
  - [x] Minimum 8 characters
  - [x] At least one uppercase letter
  - [x] At least one lowercase letter
  - [x] At least one number
  - [x] At least one special character
- [x] Hash password server-side using bcrypt with 12 rounds (same as `AdminAuthService.createAdmin()`)
- [x] Update API documentation to reflect password parameter change
- [x] Add unit tests for password validation
- [x] Test existing admin user creation flows still work

**Code Change:**
```typescript
// BEFORE (vulnerable)
const { passwordHash } = req.body

// AFTER (secure)
const { password } = req.body
const passwordHash = await bcrypt.hash(password, 12)
```

---

### 2. Fix API Key Exposure via String Method Bug ✅ COMPLETED
**File:** `server/routes/apiKeys.js`
**Status:** ✅ Completed
**Severity:** HIGH

**Issue:** `substring(-4)` exposes full API key instead of last 4 characters.

**Tasks:**
- [x] Fix line 240: Replace `substring(-4)` with `slice(-4)`
- [x] Check for other occurrences of `substring(-4)` in the file
- [x] Verify API key previews only show intended characters (first 8 + last 4)
- [x] Add unit tests for key preview generation
- [x] Test that existing API key rotation still works properly
- [x] Audit database for any existing full keys stored as "previews"

**Code Change:**
```javascript
// BEFORE (vulnerable)
keyPreview: `${apiKey.substring(0, 8)}...${apiKey.substring(-4)}`

// AFTER (secure)
keyPreview: `${apiKey.substring(0, 8)}...${apiKey.slice(-4)}`
```

---

## Testing & Validation

### 3. Security Testing ✅ COMPLETED
**Status:** ✅ Completed
**Priority:** HIGH

**Tasks:**
- [x] Create integration tests for admin user creation with various password inputs
- [x] Test API key preview generation with different key lengths
- [x] Verify no full API keys are exposed in database or API responses
- [x] Test that weak passwords are properly rejected
- [x] Confirm bcrypt password verification works with new hashing

**Test Results:** All 16 security tests passed successfully in `tests/security-fixes-tests.js`

### 4. Code Review
**Status:** ❌ Not Started
**Priority:** HIGH

**Tasks:**
- [ ] Security team review of password validation logic
- [ ] Peer review of API key preview fixes
- [ ] Verify no similar string manipulation bugs exist elsewhere
- [ ] Check for other endpoints accepting pre-hashed passwords

---

## Documentation & Deployment

### 5. Update Documentation
**Status:** ❌ Not Started
**Priority:** MEDIUM

**Tasks:**
- [ ] Update API documentation for admin user creation endpoint
- [ ] Document password requirements for admin users
- [ ] Update deployment notes about password security
- [ ] Add security best practices documentation

### 6. Deployment Preparation
**Status:** ❌ Not Started
**Priority:** MEDIUM

**Tasks:**
- [ ] Plan database migration if needed for existing admin users
- [ ] Prepare deployment rollback plan
- [ ] Schedule security fixes deployment
- [ ] Notify team of API changes for admin user creation

---

## Timeline

- **Day 1:** Fix password hash vulnerability and API key preview bug
- **Day 2:** Complete testing and code review
- **Day 3:** Deploy fixes to staging environment
- **Day 4:** Production deployment after final validation

## Notes

- Both vulnerabilities are HIGH severity and should be fixed immediately
- The password hash issue affects admin user creation (SUPER_ADMIN access required)
- The API key exposure affects all API key operations
- No external dependencies required for these fixes
- Changes are backwards compatible except for admin user creation API

## Verification Checklist

After implementation:
- [ ] Admin users can only be created with plaintext passwords
- [ ] Passwords are properly validated and hashed server-side
- [ ] API key previews show exactly 8 + "..." + 4 characters
- [ ] No full API keys exposed in database or responses
- [ ] All existing functionality continues to work
- [ ] Security tests pass