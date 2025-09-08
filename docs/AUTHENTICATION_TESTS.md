# Authentication Service Tests

Comprehensive unit tests for the Nectar API authentication system with **NO FALLBACKS** - all tests use real implementations only.

## 🎯 Testing Philosophy

### **NO FALLBACKS APPROACH**
- **Real JWT Implementation**: Uses actual jsonwebtoken library, not mocks
- **Real bcrypt Hashing**: Actual password hashing with configurable salt rounds
- **Real MongoDB**: Uses mongodb-memory-server for fast, real database operations
- **Real Sessions**: Tests actual Redis/in-memory session management
- **Real Token Validation**: Complete token lifecycle including blacklisting
- **Real Security**: Tests actual security middleware and validation

### **Test Requirements**
- ✅ **Must Pass**: Tests fail if functionality doesn't work correctly
- ❌ **No Mocks**: All components use real implementations
- 🔒 **Security First**: Tests validate actual security measures
- 📊 **Complete Coverage**: Tests all authentication flows and edge cases

## 📁 Test Structure

```
server/tests/auth/
├── auth.test.js                 # Core authentication flows
├── sessionManagement.test.js    # Session handling and security
├── tokenSecurity.test.js        # JWT security and validation
└── runAuthTests.js             # Test runner with real implementations
```

## 🧪 Test Coverage

### **Core Authentication Tests (`auth.test.js`)**

#### **User Registration**
- ✅ Valid registration with 2FA setup
- ✅ Password strength validation (real bcrypt)
- ✅ Duplicate email prevention
- ✅ Email format validation
- ✅ Real 2FA secret and backup code generation

#### **2FA Setup Verification**
- ✅ Valid TOTP token verification with speakeasy
- ✅ Invalid token rejection
- ✅ Account activation on successful verification
- ✅ Real QR code and secret generation

#### **User Login**
- ✅ Valid credentials authentication
- ✅ Invalid password handling with attempt tracking
- ✅ Account lockout after failed attempts (real timing)
- ✅ Inactive account rejection
- ✅ 2FA requirement detection

#### **2FA Verification During Login**
- ✅ Valid TOTP verification with real tokens
- ✅ Invalid token rejection
- ✅ Backup code verification and consumption
- ✅ Backup code reuse prevention
- ✅ Device trust functionality

#### **Token Management**
- ✅ Token refresh with real JWT validation
- ✅ Invalid/expired refresh token rejection
- ✅ Blacklisted token handling
- ✅ Logout with token blacklisting

#### **Security Features**
- ✅ Password complexity enforcement
- ✅ Concurrent login handling
- ✅ JWT algorithm validation (prevents algorithm confusion)
- ✅ Token tampering detection

### **Session Management Tests (`sessionManagement.test.js`)**

#### **Session Creation & Lifecycle**
- ✅ Session creation on login
- ✅ Session destruction on logout
- ✅ Multi-device session handling
- ✅ Logout from all devices

#### **Session Security**
- ✅ Session expiry handling
- ✅ Session ID regeneration on privilege escalation
- ✅ Concurrent session limits per user
- ✅ Session store failure graceful handling

#### **Active Session Management**
- ✅ List active sessions per user
- ✅ Device information tracking
- ✅ Individual session termination
- ✅ Current session protection

#### **Session Recovery**
- ✅ Session store failure fallback
- ✅ Session migration between stores
- ✅ Redis/in-memory store switching

### **Token Security Tests (`tokenSecurity.test.js`)**

#### **Token Generation**
- ✅ Valid JWT structure with all required claims
- ✅ Device fingerprint embedding
- ✅ Unique JTI (JWT ID) generation
- ✅ Proper expiration times (access: 1d, refresh: 7d)

#### **Token Validation**
- ✅ Legitimate token acceptance
- ✅ Expired token rejection
- ✅ Wrong signature detection
- ✅ Algorithm validation (prevents none algorithm)
- ✅ Tampered payload detection

#### **Token Blacklisting**
- ✅ Token blacklisting with TTL
- ✅ Blacklist validation
- ✅ Concurrent blacklist operations
- ✅ Logout blacklisting (both access and refresh)

#### **Token Refresh Security**
- ✅ Valid refresh token handling
- ✅ Blacklisted refresh token rejection
- ✅ Expired refresh token rejection
- ✅ Old token invalidation on refresh

#### **Token Analysis**
- ✅ Security characteristic analysis
- ✅ Weak token detection
- ✅ Missing expiration detection
- ✅ Algorithm security validation

#### **API Security**
- ✅ Malformed authorization header rejection
- ✅ Invalid token format handling
- ✅ Token replay attack prevention
- ✅ Device binding validation

## 🔧 Running Tests

### **All Authentication Tests**
```bash
cd server && npm run test:auth
```

### **Individual Test Suites**
```bash
# Core authentication flows
npm run test:auth:unit

# Session management  
npm run test:auth:sessions

# Token security
npm run test:auth:tokens
```

### **Development Testing**
```bash
# Run with verbose output
npx jest tests/auth/ --verbose

# Run specific test
npx jest tests/auth/auth.test.js -t "should successfully login"

# Run with coverage
npx jest tests/auth/ --coverage
```

## 📊 Real Implementation Details

### **Database Operations**
```javascript
// Real MongoDB with mongodb-memory-server
const mongoServer = await MongoMemoryServer.create();
const uri = mongoServer.getUri();
await mongoose.connect(uri);

// Real user creation and validation
const user = await testDataFactory.createUser({
  email: 'test@example.com',
  password: 'RealPassword123!',
  isActive: true
});
```

### **JWT Operations**
```javascript
// Real JWT generation
const { accessToken, refreshToken } = await generateTokens(user);

// Real validation with actual secret
const isValid = await validateToken(accessToken);

// Real blacklisting with Redis/memory
await blacklistToken(accessToken);
```

### **Password Security**
```javascript
// Real bcrypt hashing
const hashedPassword = await bcrypt.hash(password, 12);

// Real comparison
const isValid = await bcrypt.compare(password, user.password);
```

### **2FA Implementation**
```javascript
// Real TOTP generation with speakeasy
const token = speakeasy.totp({
  secret: user.twoFactorSecret,
  encoding: 'base32'
});

// Real backup code generation and validation
const backupCodes = generateBackupCodes();
const isValidBackup = await verifyBackupCode(code, user);
```

## 🚨 Test Failure Scenarios

### **Expected Failures (Security Working)**
- Invalid passwords rejected
- Expired tokens rejected  
- Blacklisted tokens blocked
- Tampered JWTs detected
- Account lockouts enforced

### **Must Fix Failures**
- Database connection errors
- Missing environment variables
- Incorrect JWT secret configuration
- Service initialization failures

## 🔒 Security Validation

### **Password Security**
- ✅ Minimum 8 characters with complexity
- ✅ bcrypt hashing with salt rounds 12+
- ✅ Password attempts tracking and lockout
- ✅ Timing attack prevention

### **Token Security**
- ✅ Strong JWT secrets (32+ characters)
- ✅ Algorithm specification (HS256 only)
- ✅ Expiration enforcement
- ✅ Issuer/audience validation
- ✅ JTI uniqueness
- ✅ Device fingerprinting

### **Session Security**
- ✅ Secure session ID generation
- ✅ Session expiration
- ✅ Cross-device isolation
- ✅ Privilege escalation handling
- ✅ Session hijacking prevention

### **2FA Security**
- ✅ TOTP window validation (30s)
- ✅ Backup code single-use
- ✅ Secret key generation (32 bytes)
- ✅ QR code secure generation
- ✅ Time-based replay prevention

## 🎯 Quality Metrics

### **Test Coverage Requirements**
- **Statements**: 95%+
- **Branches**: 90%+  
- **Functions**: 100%
- **Lines**: 95%+

### **Performance Benchmarks**
- **Login**: < 500ms (including bcrypt)
- **Token validation**: < 50ms
- **2FA verification**: < 100ms
- **Session lookup**: < 20ms

### **Security Benchmarks**
- **No security bypasses allowed**
- **All attack vectors tested**
- **Real cryptographic operations only**
- **No hardcoded secrets or fallbacks**

## 🚀 Continuous Integration

### **Pre-commit Testing**
```bash
# Add to .husky/pre-commit
npm run test:auth
```

### **Pipeline Integration**
```yaml
test-auth:
  script:
    - npm run test:auth
  artifacts:
    reports:
      junit: server/test-results/auth-results.xml
    when: always
```

## 🔧 Troubleshooting

### **Common Issues**

**MongoDB Connection Fails**
```bash
# Ensure mongodb-memory-server is installed
npm install --save-dev mongodb-memory-server
```

**JWT Secret Too Short**
```bash
# Set proper test environment variables
export JWT_SECRET="test-jwt-secret-must-be-at-least-32-characters-long"
```

**Redis Connection Issues**
```bash
# Tests use in-memory fallback if Redis unavailable
# No action needed for local development
```

**Bcrypt Performance**
```bash
# Lower salt rounds for testing if needed
export BCRYPT_ROUNDS=10
```

## 📈 Future Enhancements

### **Additional Test Coverage**
- [ ] API key authentication flows
- [ ] Rate limiting validation
- [ ] CSRF protection testing
- [ ] OAuth integration testing
- [ ] Multi-tenant authentication

### **Performance Testing**
- [ ] Load testing authentication endpoints
- [ ] Concurrent session stress testing
- [ ] Token blacklist performance at scale
- [ ] Memory usage optimization testing

### **Security Auditing**
- [ ] Automated security scanning integration
- [ ] Penetration testing scenarios
- [ ] Cryptographic strength validation
- [ ] Side-channel attack prevention

The authentication test suite provides comprehensive coverage of all security-critical flows using real implementations only. No mocks, no fallbacks - just thorough validation of actual authentication security.