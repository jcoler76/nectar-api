# Nectar API - Penetration Testing Suite

A comprehensive security testing framework designed to identify vulnerabilities and ensure the Nectar API platform meets security best practices.

## Overview

This penetration testing suite covers:

- **OWASP Top 10** vulnerabilities
- **Authentication & Authorization** flaws
- **API Security** controls
- **Input Validation** issues
- **Cryptographic** weaknesses
- **Business Logic** vulnerabilities
- **Advanced Attack Vectors** (timing attacks, race conditions, etc.)

## Test Suites

### 1. Main Penetration Test Suite (`pen-test-suite.js`)

Comprehensive testing covering:
- Authentication bypass attempts
- SQL injection attacks
- Cross-Site Scripting (XSS)
- CSRF protection
- Authorization & access control (IDOR, privilege escalation)
- API security controls
- Input validation
- File upload security
- Information disclosure
- Session management
- SSRF protection
- GraphQL security
- Command injection
- JWT security

### 2. Advanced Security Tests (`advanced-security-tests.js`)

Sophisticated attack vectors:
- Timing attacks (user enumeration, password comparison)
- Race conditions
- Business logic flaws
- Cryptographic vulnerabilities
- API abuse & resource exhaustion
- Memory & performance attacks

## Prerequisites

```bash
# Install dependencies
npm install axios form-data

# Ensure the server is running
npm run dev
```

## Running the Tests

### Run All Tests

```bash
# Run comprehensive penetration test suite
node server/tests/penetration/pen-test-suite.js

# Run advanced security tests
node server/tests/penetration/advanced-security-tests.js
```

### Run with Custom Configuration

```bash
# Test against specific URL
TEST_BASE_URL=https://staging.nectar.com node server/tests/penetration/pen-test-suite.js

# Verbose output
VERBOSE=true node server/tests/penetration/pen-test-suite.js

# Combined
TEST_BASE_URL=http://localhost:3001 VERBOSE=true node server/tests/penetration/pen-test-suite.js
```

## Test Output

### Console Output

The test suite provides color-coded console output:
- ✓ Green: Test passed (no vulnerability found)
- ✗ Red: Test failed (potential vulnerability detected)

### Test Report

After completion, a detailed JSON report is generated:
- **File**: `penetration-test-report.json`
- **Contents**: All test results, severity levels, timestamps, and detailed findings

### Severity Levels

- **CRITICAL**: Immediate security risk requiring urgent attention
- **HIGH**: Significant security concern requiring prompt remediation
- **MEDIUM**: Moderate security issue that should be addressed
- **LOW**: Minor security concern or informational finding
- **INFO**: Informational test result (no vulnerability)

## Understanding Results

### Risk Assessment

The suite calculates an overall risk level:
- **CRITICAL**: One or more critical vulnerabilities found
- **HIGH**: One or more high-severity issues found
- **MEDIUM**: Multiple medium-severity issues found
- **LOW**: Only minor or informational findings

### Exit Codes

- `0`: All tests passed or only low/medium severity findings
- `1`: Critical or high-severity vulnerabilities detected

## Test Categories Explained

### Authentication Tests

Tests authentication mechanisms:
- Missing/invalid JWT tokens
- Expired tokens
- SQL injection in login
- API key validation
- Path traversal in authentication

**Expected Behavior**: All authentication bypass attempts should be blocked with 401/403 status codes.

### SQL Injection Tests

Tests for SQL injection vulnerabilities:
- Classic SQL injection payloads
- Union-based attacks
- Time-based blind SQLi
- Stored procedure exploitation

**Expected Behavior**: All SQL injection attempts should be sanitized or blocked. Prisma ORM provides built-in protection.

### XSS (Cross-Site Scripting) Tests

Tests for reflected and stored XSS:
- Script tag injection
- Event handler injection
- JavaScript protocol handlers
- SVG/iframe-based XSS

**Expected Behavior**: All XSS payloads should be sanitized before storage/display.

### CSRF Protection Tests

Tests Cross-Site Request Forgery protection:
- Missing CSRF tokens
- Invalid CSRF tokens
- Token reuse attacks

**Expected Behavior**: State-changing operations should require valid CSRF tokens.

### Authorization Tests

Tests access control mechanisms:
- IDOR (Insecure Direct Object Reference)
- Horizontal privilege escalation
- Vertical privilege escalation
- Mass assignment vulnerabilities

**Expected Behavior**: Users should only access resources they own or have permission to access.

### API Security Tests

Tests API-specific security controls:
- Rate limiting
- API key validation
- HTTP method restrictions
- Security headers

**Expected Behavior**: Rate limits should be enforced, invalid API keys rejected, and security headers present.

### File Upload Tests

Tests file upload security:
- Malicious file extensions (.php, .exe, etc.)
- MIME type validation
- Path traversal in filenames
- File size limits

**Expected Behavior**: Only whitelisted file types should be accepted, and files should be validated.

### Information Disclosure Tests

Tests for sensitive information leakage:
- Stack traces in errors
- Version disclosure
- Directory listing
- Source code exposure

**Expected Behavior**: Error messages should be generic, and sensitive files should not be accessible.

### Session Management Tests

Tests session security:
- Session fixation
- Cookie security flags (HttpOnly, Secure)
- Session timeout

**Expected Behavior**: Sessions should regenerate on login, and cookies should have security flags.

### Advanced Tests

#### Timing Attacks
Tests for timing-based vulnerabilities that could reveal information through response time differences.

#### Race Conditions
Tests for race conditions in concurrent requests that could lead to resource manipulation.

#### Business Logic Flaws
Tests for logic vulnerabilities:
- Price manipulation
- Negative quantities
- Execution limit bypass
- Account takeover scenarios

#### Cryptographic Flaws
Tests for cryptographic weaknesses:
- Weak password policies
- Insecure token generation
- Sequential ID enumeration

## Remediation Guide

### Critical Findings

1. **SQL Injection**: 
   - Use Prisma ORM parameterized queries
   - Never concatenate user input into SQL queries
   - Validate and sanitize all inputs

2. **Authentication Bypass**:
   - Ensure JWT tokens are properly validated
   - Check token expiration
   - Verify token signatures

3. **Authorization Flaws**:
   - Implement Row Level Security (RLS) in database
   - Always check user permissions before operations
   - Use organization-scoped queries

### High Findings

1. **XSS Vulnerabilities**:
   - Sanitize all user inputs before display
   - Use Content Security Policy (CSP) headers
   - Escape HTML entities

2. **CSRF Vulnerabilities**:
   - Ensure CSRF middleware is applied to all state-changing routes
   - Use SameSite cookie attributes
   - Validate CSRF tokens on the backend

3. **File Upload Issues**:
   - Whitelist allowed file types
   - Validate MIME types and extensions
   - Scan files for malware
   - Store files outside web root

## Best Practices

### Before Running Tests

1. **Test Environment**: Run tests against development/staging, NOT production
2. **Authorization**: Ensure you have permission to run penetration tests
3. **Timing**: Run tests during off-peak hours if testing shared environments
4. **Backup**: Ensure database backups are available

### After Running Tests

1. **Review Report**: Analyze all failed tests in detail
2. **Prioritize**: Address critical and high-severity issues first
3. **Remediate**: Fix vulnerabilities and document changes
4. **Re-test**: Run tests again to verify fixes
5. **Document**: Keep records of findings and remediation steps

## Continuous Security Testing

### Integration with CI/CD

Add to your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run Security Tests
  run: |
    npm run dev &
    sleep 10
    node server/tests/penetration/pen-test-suite.js
  env:
    TEST_BASE_URL: http://localhost:3001
```

### Regular Testing Schedule

- **Daily**: Run basic authentication and API security tests
- **Weekly**: Run full penetration test suite
- **Monthly**: Run advanced security tests and manual penetration testing
- **On Code Changes**: Run relevant security tests for modified components

## Limitations

These automated tests have limitations:
- Cannot detect all business logic flaws
- May not catch context-specific vulnerabilities
- Timing-based tests can have false positives/negatives
- Manual testing and code review are still necessary

## Support and Contributing

For issues or enhancements:
1. Review existing security documentation
2. Check for similar issues in the codebase
3. Follow secure coding guidelines
4. Test thoroughly before submitting changes

## Security Disclosure

If you discover a security vulnerability:
1. **DO NOT** create a public issue
2. Contact the security team directly
3. Provide detailed information about the vulnerability
4. Allow time for remediation before disclosure

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [CWE (Common Weakness Enumeration)](https://cwe.mitre.org/)
- [SANS Top 25](https://www.sans.org/top25-software-errors/)

## License

This testing suite is part of the Nectar API platform and follows the same license terms.

---

**Remember**: Security is an ongoing process, not a one-time event. Regular testing and vigilance are essential.

