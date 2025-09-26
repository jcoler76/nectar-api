# Core Service Cleanup Guide
## Phase 3: Transforming Monolith to Clean Core Service

> **Version**: 1.0
> **Date**: September 25, 2025
> **Prerequisites**: Marketing and Admin services extracted
> **Target**: Clean, focused `nectar-core` service

---

## 🎯 Overview

### Current State (After Extractions)
```
nectar-api/ (to become nectar-core)
├── server/                    # Core API backend
├── src/                      # Core application frontend
├── marketing-site/           # ❌ TO BE REMOVED
├── admin-frontend/           # ❌ TO BE REMOVED
├── admin-backend/            # ❌ TO BE REMOVED
├── package.json              # ⚙️ TO BE CLEANED
└── Various config files      # ⚙️ TO BE UPDATED
```

### Target State (Clean Core)
```
nectar-core/
├── README.md                 # Updated service documentation
├── package.json             # Cleaned dependencies
├── .env                     # Core-specific environment
├── docker-compose.yml       # Core service deployment
├── frontend/               # Renamed from src/
│   ├── package.json
│   ├── src/
│   └── public/
├── backend/                # Renamed from server/
│   ├── package.json
│   ├── server.js
│   ├── routes/
│   ├── services/
│   └── middleware/
└── scripts/
    ├── start-dev.js
    ├── build.js
    └── deploy.js
```

---

## 📋 Cleanup Steps

### Step 1: Remove Extracted Code

#### 1.1 Delete Marketing Site Directory
```bash
cd nectar-api

# Remove marketing-site directory completely
rm -rf marketing-site/

# Verify removal
ls -la | grep marketing
# Should return nothing
```

#### 1.2 Delete Admin Directories
```bash
# Remove admin-frontend directory
rm -rf admin-frontend/

# Remove admin-backend directory
rm -rf admin-backend/

# Verify removals
ls -la | grep admin
# Should return nothing
```

#### 1.3 Remove Admin Routes from Core Backend
```bash
# Remove admin-specific routes from server/routes/
rm -f server/routes/adminBackend.js

# Remove any admin-only middleware
rm -f server/middleware/adminAuth.js          # if exists
rm -f server/middleware/adminAuthorization.js # if exists
```

#### 1.4 Clean Up Test Files
```bash
# Remove any service-specific test files
rm -f test-dashboard-fix.js      # already deleted
rm -f test-graphql.json         # already deleted
rm -f test-limits.js            # already deleted
rm -f validate-storage-billing.js   # already deleted
rm -f validate-tracking-system.js   # already deleted
rm -f trigger-dashboard.js      # marketing/admin specific
```

---

## ⚙️ Configuration Updates

### Step 2: Update Package Configuration

#### 2.1 Clean Root Package.json
```bash
# Before cleaning, backup current package.json
cp package.json package.json.backup
```

#### New package.json (Core Service)
```json
{
  "name": "nectar-core",
  "version": "2.0.0",
  "description": "Nectar Studio Core Platform - Main Application Service",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run frontend:dev\" \"npm run backend:dev\"",
    "frontend:dev": "cd frontend && npm start",
    "backend:dev": "cd backend && npm run dev",
    "build": "npm run frontend:build",
    "frontend:build": "cd frontend && npm run build",
    "test": "npm run frontend:test && npm run backend:test",
    "frontend:test": "cd frontend && npm test",
    "backend:test": "cd backend && npm test",
    "install:all": "npm install && cd frontend && npm install && cd backend && npm install",
    "start": "npm run dev",
    "lint": "npm run frontend:lint && npm run backend:lint",
    "frontend:lint": "cd frontend && npm run lint",
    "backend:lint": "cd backend && npm run lint",
    "type-check": "cd frontend && npm run type-check",
    "precommit:all": "npm run lint && npm run type-check",
    "docker:dev": "docker-compose up -d",
    "docker:down": "docker-compose down"
  },
  "dependencies": {
    "concurrently": "^8.0.0"
  },
  "devDependencies": {
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  },
  "keywords": ["core", "platform", "microservice", "nectar"],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/your-org/nectar-core.git"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  }
}
```

### 2.2 Update Environment Configuration

#### .env (Core Service)
```bash
# ===========================================
# CORE SERVICE CONFIGURATION
# ===========================================
NODE_ENV=development
SERVICE_NAME=nectar-core
SERVICE_VERSION=2.0.0

# ===========================================
# FRONTEND CONFIGURATION
# ===========================================
FRONTEND_PORT=3000
REACT_APP_API_URL=http://localhost:3001

# ===========================================
# BACKEND CONFIGURATION
# ===========================================
BACKEND_PORT=3001
PORT=3001

# ===========================================
# DATABASE CONFIGURATION (Tenant-Scoped)
# ===========================================
# Core service uses app-level access with RLS
DATABASE_URL="postgresql://nectar_app_user:nectar_app_2024!@localhost:5432/nectarstudio_ai?schema=public"

# Admin database URL for system operations (auth, etc.)
ADMIN_DATABASE_URL="postgresql://nectar_admin:nectar_dev_2024!@localhost:5432/nectarstudio_ai?schema=public"

# ===========================================
# EXTERNAL MICROSERVICES
# ===========================================
MARKETING_API_URL=http://localhost:5001
ADMIN_API_URL=http://localhost:4001

# ===========================================
# AUTHENTICATION & SECURITY
# ===========================================
JWT_SECRET=your_core_jwt_secret_here
JWT_EXPIRES_IN=24h
SESSION_SECRET=your_core_session_secret_here
CORS_ORIGIN=http://localhost:3000

# ===========================================
# THIRD-PARTY INTEGRATIONS
# ===========================================
STRIPE_SECRET_KEY=sk_live_...
SALESFORCE_CLIENT_ID=your_salesforce_client_id
HUBSPOT_API_KEY=your_hubspot_api_key
ZOOMINFO_API_KEY=your_zoominfo_api_key

# ===========================================
# LOGGING & MONITORING
# ===========================================
LOG_LEVEL=info
LOG_FILE=core-service.log
```

---

## 🔧 Backend Cleanup

### Step 3: Clean Backend Structure

#### 3.1 Update Main Server File

#### server/server.js (Cleaned)
```javascript
const express = require('express');
const cors = require('cors');
const path = require('path');
const { logger } = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database connections
const prismaService = require('./services/prismaService');

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security middleware
app.use(require('./middleware/security'));

// Request logging
app.use(require('./middleware/requestLogger'));

// Authentication middleware (for protected routes)
const authMiddleware = require('./middleware/auth');

// Core API Routes (tenant-scoped)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', authMiddleware, require('./routes/users'));
app.use('/api/organizations', authMiddleware, require('./routes/organizations'));
app.use('/api/services', authMiddleware, require('./routes/services'));
app.use('/api/applications', authMiddleware, require('./routes/applications'));
app.use('/api/workflows', authMiddleware, require('./routes/workflows'));
app.use('/api/connections', authMiddleware, require('./routes/connections'));
app.use('/api/endpoints', authMiddleware, require('./routes/endpoints'));
app.use('/api/roles', authMiddleware, require('./routes/roles'));
app.use('/api/apiKeys', authMiddleware, require('./routes/apiKeys'));

// Dashboard and reporting (tenant-scoped)
app.use('/api/dashboard', authMiddleware, require('./routes/dashboard'));
app.use('/api/reports', authMiddleware, require('./routes/reports'));

// File storage and management
app.use('/api/storage', authMiddleware, require('./routes/fileStorage'));

// GraphQL endpoint
app.use('/graphql', require('./graphql'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    service: 'nectar-core',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.SERVICE_VERSION || '2.0.0',
    database: 'connected', // TODO: Add actual DB health check
    dependencies: {
      marketing: process.env.MARKETING_API_URL,
      admin: process.env.ADMIN_API_URL
    }
  });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
  });
}

// Error handling middleware
app.use(require('./middleware/errorHandler'));

// Start server
const startServer = async () => {
  try {
    // Initialize database
    await prismaService.initialize();

    app.listen(PORT, () => {
      console.log(`🚀 Nectar Core Service running on port ${PORT}`);
      console.log(`🌐 Core Frontend: http://localhost:3000`);
      console.log(`🔧 Core API: http://localhost:${PORT}`);
      console.log(`📊 Health Check: http://localhost:${PORT}/health`);

      if (process.env.NODE_ENV === 'development') {
        console.log(`🔗 Connected Services:`);
        console.log(`   📈 Marketing: ${process.env.MARKETING_API_URL}`);
        console.log(`   👨‍💼 Admin: ${process.env.ADMIN_API_URL}`);
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down Core Service...');
  await prismaService.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down Core Service...');
  await prismaService.disconnect();
  process.exit(0);
});
```

#### 3.2 Remove Admin-Specific Routes

#### server/routes/index.js (Updated)
```javascript
const express = require('express');
const router = express.Router();

// ❌ REMOVE: Admin-specific routes (moved to nectar-admin)
// const adminBackend = require('./adminBackend');
// router.use('/admin-backend', adminBackend);

// ✅ KEEP: Core platform routes
router.use('/auth', require('./auth'));
router.use('/users', require('./users'));
router.use('/organizations', require('./organizations'));
router.use('/services', require('./services'));
router.use('/applications', require('./applications'));
router.use('/workflows', require('./workflows'));
router.use('/connections', require('./connections'));
router.use('/endpoints', require('./endpoints'));
router.use('/roles', require('./roles'));
router.use('/apiKeys', require('./apiKeys'));
router.use('/dashboard', require('./dashboard'));
router.use('/reports', require('./reports'));
router.use('/storage', require('./fileStorage'));

module.exports = router;
```

### 3.3 Update Database Services

#### server/services/prismaService.js (Focus on Core)
```javascript
const { PrismaClient } = require('../prisma/generated/client');
const { logger } = require('../utils/logger');

class CorePrismaService {
  constructor() {
    if (!CorePrismaService.instance) {
      // System Prisma: For infrastructure operations
      this.systemPrisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
        datasources: {
          db: {
            url: process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL,
          },
        },
      });

      // Tenant Prisma: For core application data with RLS
      this.tenantPrisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      });

      logger.info('✅ Core Prisma service initialized (System + Tenant with RLS)');
      CorePrismaService.instance = this;
    }

    return CorePrismaService.instance;
  }

  // ... rest of existing methods remain the same
  // (Keep all existing functionality for core operations)
}

const coreDatabase = new CorePrismaService();
module.exports = coreDatabase;
```

---

## 🎨 Frontend Cleanup

### Step 4: Update Frontend Configuration

#### 4.1 Remove Admin/Marketing References

#### src/services/api.js (Clean Core API)
```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class CoreApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // ❌ REMOVE: Admin-specific API calls
  // async getAdminMetrics() { ... }
  // async getAllUsers() { ... }

  // ❌ REMOVE: Marketing-specific API calls
  // async submitLeadForm() { ... }
  // async getMarketingCampaigns() { ... }

  // ✅ KEEP: Core platform API calls
  async login(credentials) { ... }
  async getServices() { ... }
  async createWorkflow() { ... }
  async getApplications() { ... }
  // ... other core methods
}

export const coreApi = new CoreApiService();
```

#### 4.2 Update Service References

#### src/components/dashboard/Dashboard.jsx (Remove Admin Links)
```jsx
// ❌ REMOVE: Links to admin functionality
// <Link to="/admin/users">Manage Users</Link>
// <Link to="/admin/organizations">Manage Organizations</Link>

// ✅ KEEP: Core platform features
<Link to="/services">My Services</Link>
<Link to="/workflows">My Workflows</Link>
<Link to="/applications">My Applications</Link>
```

### 4.3 Update Navigation

#### src/components/layout/Navigation.jsx (Core-Focused)
```jsx
const coreNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Services', href: '/services', icon: CogIcon },
  { name: 'Workflows', href: '/workflows', icon: PlayIcon },
  { name: 'Applications', href: '/applications', icon: CollectionIcon },
  { name: 'Connections', href: '/connections', icon: LinkIcon },
  { name: 'API Keys', href: '/api-keys', icon: KeyIcon },
  // ❌ REMOVED: Admin links
  // ❌ REMOVED: Marketing links
];
```

---

## 🔗 Service Integration Updates

### Step 5: External Service Communication

#### 5.1 Create External Services Client

#### server/services/externalServices.js (New)
```javascript
class ExternalServicesClient {
  constructor() {
    this.marketingApiUrl = process.env.MARKETING_API_URL || 'http://localhost:5001';
    this.adminApiUrl = process.env.ADMIN_API_URL || 'http://localhost:4001';
  }

  // Marketing service integration
  async notifyMarketingOfNewUser(userData) {
    try {
      const response = await fetch(`${this.marketingApiUrl}/api/internal/new-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      return response.ok;
    } catch (error) {
      console.warn('Failed to notify marketing service:', error);
      return false;
    }
  }

  // Admin service integration
  async notifyAdminOfCriticalEvent(eventData) {
    try {
      const response = await fetch(`${this.adminApiUrl}/api/internal/critical-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      });
      return response.ok;
    } catch (error) {
      console.warn('Failed to notify admin service:', error);
      return false;
    }
  }

  // Health check for dependent services
  async checkServiceHealth() {
    const results = {
      marketing: false,
      admin: false
    };

    try {
      const marketingResponse = await fetch(`${this.marketingApiUrl}/health`);
      results.marketing = marketingResponse.ok;
    } catch (error) {
      console.warn('Marketing service health check failed:', error);
    }

    try {
      const adminResponse = await fetch(`${this.adminApiUrl}/health`);
      results.admin = adminResponse.ok;
    } catch (error) {
      console.warn('Admin service health check failed:', error);
    }

    return results;
  }
}

module.exports = new ExternalServicesClient();
```

#### 5.2 Update Health Check Endpoint

#### server/routes/health.js (Enhanced)
```javascript
const express = require('express');
const router = express.Router();
const externalServices = require('../services/externalServices');
const prismaService = require('../services/prismaService');

router.get('/', async (req, res) => {
  try {
    // Check database connection
    const dbHealth = await prismaService.getSystemClient().$queryRaw`SELECT 1`;

    // Check external services
    const serviceHealth = await externalServices.checkServiceHealth();

    const health = {
      service: 'nectar-core',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.SERVICE_VERSION || '2.0.0',
      dependencies: {
        database: dbHealth ? 'healthy' : 'unhealthy',
        marketing: serviceHealth.marketing ? 'healthy' : 'unhealthy',
        admin: serviceHealth.admin ? 'healthy' : 'unhealthy'
      }
    };

    const overallHealthy = dbHealth &&
                          (serviceHealth.marketing || process.env.NODE_ENV === 'development') &&
                          (serviceHealth.admin || process.env.NODE_ENV === 'development');

    res.status(overallHealthy ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      service: 'nectar-core',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

module.exports = router;
```

---

## 📁 Directory Restructuring (Optional)

### Step 6: Rename for Clarity

#### 6.1 Rename src to frontend (Optional)
```bash
# If you want to match the other services' structure
mv src frontend

# Update package.json scripts accordingly
# "frontend:dev": "cd frontend && npm start"
```

#### 6.2 Rename server to backend (Optional)
```bash
# If you want to match the other services' structure
mv server backend

# Update package.json scripts accordingly
# "backend:dev": "cd backend && npm run dev"
```

#### 6.3 Update All References
If you choose to rename directories, update:
- package.json scripts
- Docker configurations
- Import paths
- Documentation references

---

## 🧪 Testing Strategy

### Step 7: Comprehensive Testing

#### 7.1 Core Service Testing

```bash
# Test core service independently
npm run dev

# Verify endpoints
curl http://localhost:3001/health
curl http://localhost:3001/api/auth/profile
```

#### 7.2 Integration Testing

```bash
# Test with all three services running
# Terminal 1: Core service
cd nectar-core && npm run dev

# Terminal 2: Marketing service
cd nectar-marketing && npm run dev

# Terminal 3: Admin service
cd nectar-admin && npm run dev

# Test cross-service communication
curl http://localhost:3001/health  # Should show marketing/admin status
```

#### 7.3 Functionality Testing Checklist

#### Core Platform Features
- [ ] User authentication works
- [ ] Dashboard loads with tenant data
- [ ] Services CRUD operations
- [ ] Workflow creation/editing
- [ ] Application management
- [ ] API key generation
- [ ] File storage functions

#### Database Access
- [ ] Tenant isolation (RLS) working
- [ ] User can only see their org data
- [ ] Cross-tenant data blocked appropriately
- [ ] System operations work when needed

#### External Service Integration
- [ ] Can communicate with marketing service
- [ ] Can communicate with admin service
- [ ] Health checks report service status
- [ ] Graceful degradation when services unavailable

---

## 🗑️ Complete Removal Checklist

### Files to Delete
```bash
✅ marketing-site/ (entire directory)
✅ admin-frontend/ (entire directory)
✅ admin-backend/ (entire directory)
✅ server/routes/adminBackend.js
✅ test-dashboard-fix.js
✅ test-graphql.json
✅ test-limits.js
✅ validate-storage-billing.js
✅ validate-tracking-system.js
✅ trigger-dashboard.js
✅ Any admin-specific middleware files
✅ Any marketing-specific utility files
```

### Dependencies to Remove
```bash
# Remove unused NPM packages
npm uninstall admin-specific-package
npm uninstall marketing-specific-package
npm uninstall unused-utility-package

# Clean up package-lock.json
npm install
```

### Configuration to Update
```bash
✅ package.json (remove service-specific scripts)
✅ .env (remove service-specific variables)
✅ .gitignore (add new patterns if needed)
✅ README.md (update for core service)
✅ Docker configurations
✅ Any CI/CD configurations
```

---

## 📊 Before/After Comparison

### Before Cleanup (Monolith)
```
Size: ~500MB (all services + node_modules)
Routes: ~50 endpoints (core + admin + marketing)
Dependencies: ~200 packages
Startup time: 30-45 seconds
Memory usage: 800MB-1.2GB
```

### After Cleanup (Core Service)
```
Size: ~200MB (core only + node_modules)
Routes: ~25 endpoints (core platform only)
Dependencies: ~120 packages
Startup time: 15-20 seconds
Memory usage: 400MB-600MB
```

### Performance Benefits
- 🚀 **Faster startup**: Less code to initialize
- 💾 **Lower memory**: No unused service code
- 🔧 **Easier debugging**: Focused functionality
- 📦 **Smaller deployments**: Core-only code
- 🧪 **Faster tests**: Less code to test

---

## 🚀 Post-Cleanup Validation

### Step 8: Final Verification

#### 8.1 Service Independence Test
```bash
# Start only core service
cd nectar-core && npm run dev

# Verify core functionality works without other services
# - User login
# - Dashboard loads
# - Services management
# - Workflows function
```

#### 8.2 Integration Test
```bash
# Start all three services
# Verify they work together but independently

# Each service should:
# - Start without dependencies on others
# - Gracefully handle missing services
# - Provide health status information
```

#### 8.3 Database Isolation Test
```bash
# Verify tenant isolation still works
# Core service should only show tenant-scoped data
# Admin service should show cross-tenant data
# Marketing service should show leads/billing data
```

---

## ✅ Success Criteria

### Technical Requirements
- [ ] Core service starts independently on ports 3000/3001
- [ ] All extracted code removed from codebase
- [ ] Database connections work correctly
- [ ] External service integration functional
- [ ] Health checks report accurate status

### Functional Requirements
- [ ] User authentication unchanged
- [ ] Core platform features fully functional
- [ ] Tenant isolation maintained
- [ ] Performance improved or maintained
- [ ] No functionality regressions

### Integration Requirements
- [ ] Can operate independently of other services
- [ ] Communicates with marketing service when needed
- [ ] Communicates with admin service when needed
- [ ] Handles service unavailability gracefully

---

## 🔄 Next Steps

### Immediate Actions (After Cleanup)
1. **Rename repository** to `nectar-core`
2. **Update documentation** throughout
3. **Set up independent CI/CD** for core service
4. **Configure monitoring** and logging
5. **Plan deployment strategy**

### Long-term Improvements
1. **API versioning** for better service contracts
2. **Event-driven communication** between services
3. **Shared component libraries** for consistency
4. **Unified logging/monitoring** across services
5. **Service mesh** for advanced communication

---

## 📚 Documentation Updates

### Files to Update
```bash
✅ README.md (focus on core service)
✅ API documentation (remove admin/marketing endpoints)
✅ Deployment guides (single service deployment)
✅ Development setup (simplified instructions)
✅ Architecture diagrams (show microservice structure)
```

### New Documentation Needed
```bash
✅ Service communication patterns
✅ Inter-service API contracts
✅ Deployment coordination
✅ Monitoring and logging strategy
✅ Development workflow with multiple repos
```

---

**Status**: 📋 Ready for execution after admin service extraction
**Dependencies**: Marketing and Admin services successfully extracted
**Primary Goal**: Clean, focused core service with improved performance
**Timeline**: 3-5 days after admin service completion

---

*This document completes the microservices separation trilogy, providing the roadmap for transforming the monolith into a clean, focused core service while maintaining all essential platform functionality.*