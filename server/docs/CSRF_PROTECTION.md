# CSRF Protection Implementation

## Overview
Cross-Site Request Forgery (CSRF) protection has been implemented across the Mirabel API to prevent unauthorized state-changing requests.

## Implementation Details

### Backend Implementation

1. **CSRF Middleware** (`server/middleware/csrf.js`)
   - Generates secure random tokens using crypto.randomBytes
   - Stores tokens per user with 1-hour expiration
   - Validates tokens on state-changing requests

2. **Token Validation**
   - GET requests: Generate new token for forms
   - POST/PUT/DELETE: Require valid CSRF token
   - Token sent via header: `x-csrf-token`
   - Alternative: `_csrf` field in request body or query

3. **Protected Endpoints**
   - All authenticated API endpoints require CSRF tokens
   - Exceptions for specific paths:
     - `/api/auth/login` - Initial authentication
     - `/api/auth/register` - User registration
     - `/api/auth/refresh` - Token refresh
     - `/api/v1/*` - API key authenticated endpoints
     - `/api/v2/*` - API key authenticated endpoints
     - `/api/webhooks/trigger/*` - Use signature validation
     - `/api/forms/public` - Public form submissions
     - `/api/email/trigger/*` - Use signature validation
     - `/api/files/upload/public` - Public file uploads

4. **GraphQL Protection**
   - Custom Apollo Server plugin validates CSRF tokens
   - Only applies to mutations (not queries)
   - Skips introspection queries

### Frontend Implementation

1. **Token Management** (`src/services/api.js`)
   - Automatically fetches CSRF token when needed
   - Includes token in all state-changing requests
   - Handles token refresh on 403 errors

2. **Token Endpoint**
   - `GET /api/csrf-token` - Fetch new CSRF token
   - Requires authentication
   - Returns: `{ csrfToken: "..." }`

## Security Considerations

1. **Token Storage**
   - Tokens stored in memory (production should use Redis)
   - Per-user tokens prevent token sharing
   - Automatic cleanup of expired tokens

2. **Token Transmission**
   - Sent via custom header to prevent form-based attacks
   - Not stored in cookies to avoid CSRF vulnerabilities

3. **Error Handling**
   - 403 Forbidden for missing/invalid tokens
   - Clear error messages for debugging
   - Automatic retry with fresh token

## Testing CSRF Protection

```javascript
// Example: Making a protected request
const response = await fetch('/api/users', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'x-csrf-token': csrfToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(userData)
});
```

## Migration Notes

1. Existing API integrations using API keys are not affected
2. Web applications need to implement CSRF token handling
3. Mobile applications can continue using JWT without CSRF