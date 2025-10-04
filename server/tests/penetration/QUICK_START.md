# Penetration Testing - Quick Start Guide

## 🚀 Quick Start (5 Minutes)

### Step 1: Ensure Server is Running

```bash
# Start the development server
npm run dev

# Or if using PM2
pm2 start ecosystem.config.js
```

### Step 2: Run the Tests

```bash
# Run ALL security tests (recommended)
npm run security:pentest

# Or run individual test suites:

# Main penetration tests (OWASP Top 10, etc.)
node server/tests/penetration/pen-test-suite.js

# Advanced security tests
node server/tests/penetration/advanced-security-tests.js

# All tests with comprehensive report
node server/tests/penetration/run-all-tests.js
```

### Step 3: Review Results

After running tests, check:
1. **Console output** - Color-coded results with immediate feedback
2. **JSON report** - `server/reports/security-report-TIMESTAMP.json`
3. **HTML report** - `server/reports/security-report-TIMESTAMP.html` (open in browser)

## 📊 Understanding Results

### Exit Codes
- `0` = Passed (no critical/high vulnerabilities)
- `1` = Failed (critical or high severity issues found)

### Severity Levels
- **CRITICAL** 🔴 - Immediate action required
- **HIGH** 🟠 - Address before production
- **MEDIUM** 🟡 - Should be fixed
- **LOW** 🟢 - Minor issues
- **INFO** 🔵 - Informational

### Risk Levels
- **CRITICAL** - One or more critical vulnerabilities
- **HIGH** - High-severity issues present
- **MEDIUM** - Multiple medium issues
- **LOW** - Minor issues only

## 🎯 What's Tested?

### Security Areas Covered

✅ **Authentication & Authorization**
- JWT token security
- Session management
- API key validation
- Password policies
- 2FA bypass attempts

✅ **Injection Attacks**
- SQL injection
- NoSQL injection
- Command injection
- LDAP injection
- XML injection

✅ **Cross-Site Scripting (XSS)**
- Reflected XSS
- Stored XSS
- DOM-based XSS
- Template injection

✅ **CSRF Protection**
- Token validation
- SameSite cookies
- Origin checking

✅ **Access Control**
- IDOR (Insecure Direct Object Reference)
- Horizontal privilege escalation
- Vertical privilege escalation
- Mass assignment

✅ **API Security**
- Rate limiting
- Input validation
- Output encoding
- Error handling
- CORS configuration

✅ **File Upload Security**
- File type validation
- Size limits
- Malicious file detection
- Path traversal

✅ **Information Disclosure**
- Error message leakage
- Directory listing
- Source code exposure
- Version disclosure

✅ **Cryptography**
- Weak algorithms
- Insecure randomness
- Password storage

✅ **Advanced Attacks**
- Timing attacks
- Race conditions
- Business logic flaws
- SSRF (Server-Side Request Forgery)
- XXE (XML External Entity)
- Deserialization attacks

## 🔧 Configuration

### Environment Variables

```bash
# Test against different environments
TEST_BASE_URL=http://localhost:3001  # Development (default)
TEST_BASE_URL=https://staging.nectar.com  # Staging
TEST_BASE_URL=https://api.nectar.com  # Production (⚠️ use with caution)

# Enable verbose output
VERBOSE=true

# Example:
TEST_BASE_URL=https://staging.nectar.com VERBOSE=true npm run security:pentest
```

## 📝 Common Scenarios

### Scenario 1: Quick Security Check Before Deployment

```bash
# Run all tests quickly
npm run security:pentest

# Check exit code
echo $?  # 0 = safe to deploy, 1 = issues found
```

### Scenario 2: Focus on Specific Vulnerabilities

```bash
# Only SQL injection tests
node server/tests/penetration/pen-test-suite.js | grep "SQL"

# Only authentication tests
node server/tests/penetration/pen-test-suite.js | grep "Authentication"
```

### Scenario 3: CI/CD Integration

```yaml
# .github/workflows/security.yml
name: Security Tests
on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run dev &
      - run: sleep 10
      - run: npm run security:pentest
```

### Scenario 4: Regular Security Audits

```bash
# Weekly cron job
0 2 * * 1 cd /path/to/nectar-api && npm run security:pentest >> /var/log/security-tests.log 2>&1
```

## 🐛 Troubleshooting

### Issue: "Cannot reach server"

**Solution:**
```bash
# Ensure server is running
lsof -i :3001  # Check if port is in use
npm run dev    # Start server
```

### Issue: "Connection timeout"

**Solution:**
```bash
# Increase timeout
export TEST_TIMEOUT=60000
npm run security:pentest
```

### Issue: "Too many open files"

**Solution:**
```bash
# Increase file descriptor limit
ulimit -n 10000
npm run security:pentest
```

### Issue: "Rate limiting interfering with tests"

**Solution:**
Temporarily disable rate limiting in development:
```javascript
// server/middleware/rateLimiter.js
if (process.env.DISABLE_RATE_LIMIT_FOR_TESTS === 'true') {
  return (req, res, next) => next();
}
```

Then run:
```bash
DISABLE_RATE_LIMIT_FOR_TESTS=true npm run security:pentest
```

## 📋 Test Checklist

Before deploying to production, ensure:

- [ ] All CRITICAL vulnerabilities fixed
- [ ] All HIGH vulnerabilities addressed
- [ ] MEDIUM issues documented with remediation plan
- [ ] Security headers properly configured
- [ ] HTTPS enabled
- [ ] CSRF protection active
- [ ] Rate limiting configured
- [ ] Input validation in place
- [ ] Error messages sanitized
- [ ] Logging configured (without sensitive data)
- [ ] Database queries use parameterization
- [ ] File uploads validated and scanned
- [ ] Authentication properly implemented
- [ ] Authorization checks on all endpoints
- [ ] Session management secure

## 📚 Next Steps

1. **Review Failed Tests**: Examine each failed test in detail
2. **Prioritize Fixes**: Start with CRITICAL and HIGH severity issues
3. **Implement Fixes**: Follow security best practices
4. **Re-run Tests**: Verify fixes are effective
5. **Update Documentation**: Document security measures
6. **Schedule Regular Tests**: Set up automated testing
7. **Stay Updated**: Keep dependencies and security patches current

## 🆘 Getting Help

### Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Security Documentation](./README.md)
- [CWE Database](https://cwe.mitre.org/)

### Support
If you find a security vulnerability:
1. **DO NOT** create a public issue
2. Contact security team directly
3. Provide detailed reproduction steps
4. Allow time for remediation

## ⚠️ Important Notes

1. **Test Environment**: Always test in development/staging first
2. **Authorization**: Ensure you have permission to run these tests
3. **Rate Limits**: Tests may trigger rate limiting
4. **Database**: Some tests create test data (cleaned up automatically)
5. **Logs**: Tests generate logs - review for false positives
6. **Production**: Use extreme caution when testing production systems

## 🎓 Learning More

Want to understand the tests better?

1. Read the source code in `server/tests/penetration/`
2. Check the `README.md` for detailed explanations
3. Review OWASP testing guide
4. Study failed tests to understand attack vectors

---

**Remember**: Security is a continuous process. Run these tests regularly! 🔒

