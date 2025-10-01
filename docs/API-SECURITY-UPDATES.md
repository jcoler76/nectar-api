# API Security Updates - Admin User Creation

## Overview
Critical security updates have been implemented for the admin user creation endpoint to address password security vulnerabilities.

## Breaking Changes

### Admin User Creation Endpoint
**Endpoint:** `POST /api/admin/users`

#### BEFORE (Vulnerable)
```json
{
  "email": "admin@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "SUPPORT_AGENT",
  "passwordHash": "$2b$12$...",  // ❌ Client-provided hash
  "notes": "New admin user"
}
```

#### AFTER (Secure)
```json
{
  "email": "admin@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "SUPPORT_AGENT",
  "password": "StrongPassword123!",  // ✅ Plain text, server-hashed
  "notes": "New admin user"
}
```

## Password Requirements

All admin user passwords must now meet these security requirements:

- **Minimum length:** 8 characters
- **Uppercase letter:** At least one (A-Z)
- **Lowercase letter:** At least one (a-z)
- **Number:** At least one (0-9)
- **Special character:** At least one (!@#$%^&*(),.?":{}|<>)

## Error Responses

### Password Validation Errors
```json
{
  "error": "Password does not meet security requirements",
  "details": [
    "Password must be at least 8 characters long",
    "Password must contain at least one uppercase letter",
    "Password must contain at least one special character"
  ]
}
```

### Example Valid Passwords
- `SecureAdmin123!`
- `MyStr0ng#Pass`
- `Admin2024$ecure`
- `Complex&Pass789`

### Example Invalid Passwords
- `weak` (too short, missing requirements)
- `password` (no uppercase, numbers, or special chars)
- `Password123` (no special characters)
- `PASSWORD!` (no lowercase or numbers)

## Implementation Details

### Server-Side Security
1. **Password Validation:** Comprehensive strength validation before processing
2. **Bcrypt Hashing:** 12 rounds (configurable via `BCRYPT_ROUNDS` environment variable)
3. **Input Sanitization:** All inputs validated and sanitized
4. **Audit Logging:** All admin user creation events are logged

### Backwards Compatibility
⚠️ **BREAKING CHANGE:** This is a breaking change. Clients must update to send `password` instead of `passwordHash`.

## Migration Guide

### For API Clients
1. Update request payload to use `password` field instead of `passwordHash`
2. Remove any client-side password hashing logic
3. Implement password strength validation in UI (optional but recommended)
4. Handle new error response format for validation failures

### Example Migration
```javascript
// BEFORE
const createAdminUser = async (userData) => {
  const passwordHash = await bcrypt.hash(userData.password, 12); // ❌ Remove this

  return fetch('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...userData,
      passwordHash  // ❌ Remove this
    })
  });
};

// AFTER
const createAdminUser = async (userData) => {
  return fetch('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...userData,
      password: userData.password  // ✅ Send plain text
    })
  });
};
```

## Security Benefits

1. **Prevents Hash Manipulation:** Clients can no longer provide weak or malicious password hashes
2. **Enforces Password Policy:** Server-side validation ensures all passwords meet security requirements
3. **Consistent Hashing:** All passwords use the same secure bcrypt configuration
4. **Audit Trail:** Enhanced logging for admin user creation and password policy violations

## Testing

A comprehensive test suite has been added at `tests/security-fixes-tests.js` to verify:
- Password validation logic
- Error handling
- Security requirements enforcement
- Edge cases and boundary conditions

## Deployment Notes

1. **Environment Variables:** Ensure `BCRYPT_ROUNDS` is set to 12 or higher in production
2. **Client Updates:** All admin user creation clients must be updated before deployment
3. **Testing:** Run security tests before deploying: `node tests/security-fixes-tests.js`
4. **Monitoring:** Monitor logs for password validation failures after deployment

## Support

If you encounter issues with the updated API, please check:
1. Password meets all security requirements
2. Request uses `password` field (not `passwordHash`)
3. Content-Type header is set to `application/json`
4. Authentication tokens are valid and have SUPER_ADMIN role

For additional support, refer to the security team or development documentation.