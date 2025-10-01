# Admin Service Extraction Guide
## Phase 2: Converting Admin Portal to Standalone Microservice

> **Version**: 1.0
> **Date**: September 25, 2025
> **Prerequisites**: Marketing service extraction completed
> **Target**: Create `nectar-admin` as independent service

---

## 🎯 Overview

### Current Admin Structure in Monolith
```
nectar-api/
├── admin-frontend/           # React admin dashboard (port 4000)
├── admin-backend/           # Express admin API (port 4001)
└── server/routes/adminBackend.js  # Additional admin routes
```

### Target Admin Service Structure
```
nectar-admin/
├── README.md
├── package.json             # Root service manager
├── docker-compose.yml       # Development environment
├── .env                    # Service configuration
├── .gitignore
├── frontend/               # Admin dashboard (React + TypeScript)
│   ├── package.json
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── contexts/
│   │   └── hooks/
│   ├── public/
│   └── .env
├── backend/                # Admin API (Express + Node.js)
│   ├── package.json
│   ├── server.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── organizations.js
│   │   ├── metrics.js
│   │   ├── leads.js
│   │   └── billing.js
│   ├── middleware/
│   ├── services/
│   └── .env
└── scripts/
    ├── start-dev.js
    ├── build.js
    └── deploy.js
```

---

## 📋 Migration Steps

### Step 1: Create Base Structure

#### 1.1 Initialize Admin Service Directory
```bash
# Navigate to parent directory (where nectar-api and nectar-marketing exist)
cd ..

# Create nectar-admin directory structure
mkdir nectar-admin
cd nectar-admin
mkdir frontend backend scripts
```

#### 1.2 Copy Admin Frontend
```bash
# From nectar-api/admin-frontend/ to nectar-admin/frontend/
cp -r ../nectar-api/admin-frontend/* ./frontend/
```

#### 1.3 Copy Admin Backend
```bash
# From nectar-api/admin-backend/ to nectar-admin/backend/
cp -r ../nectar-api/admin-backend/* ./backend/
```

#### 1.4 Extract Additional Admin Routes
```bash
# Copy admin routes from main server
cp ../nectar-api/server/routes/adminBackend.js ./backend/routes/
```

---

## ⚙️ Configuration Setup

### 2.1 Root Package Configuration

#### nectar-admin/package.json
```json
{
  "name": "nectar-admin",
  "version": "1.0.0",
  "description": "Nectar Studio Admin Portal - User and System Management Service",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run frontend:dev\" \"npm run backend:dev\"",
    "frontend:dev": "cd frontend && npm run dev",
    "backend:dev": "cd backend && npm run dev",
    "build": "npm run frontend:build",
    "frontend:build": "cd frontend && npm run build",
    "test": "npm run frontend:test && npm run backend:test",
    "frontend:test": "cd frontend && npm test",
    "backend:test": "cd backend && npm test",
    "install:all": "npm install && cd frontend && npm install && cd ../backend && npm install",
    "start": "npm run dev",
    "lint": "npm run frontend:lint && npm run backend:lint",
    "frontend:lint": "cd frontend && npm run lint",
    "backend:lint": "cd backend && npm run lint"
  },
  "devDependencies": {
    "concurrently": "^8.0.0"
  },
  "keywords": ["admin", "dashboard", "management", "microservice"],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/your-org/nectar-admin.git"
  }
}
```

### 2.2 Environment Configuration

#### nectar-admin/.env (Root)
```bash
# ===========================================
# ADMIN SERVICE CONFIGURATION
# ===========================================
NODE_ENV=development
SERVICE_NAME=nectar-admin
SERVICE_VERSION=1.0.0

# ===========================================
# FRONTEND CONFIGURATION
# ===========================================
FRONTEND_PORT=4000
VITE_ADMIN_API_URL=http://localhost:4001

# ===========================================
# BACKEND CONFIGURATION
# ===========================================
BACKEND_PORT=4001

# ===========================================
# DATABASE CONFIGURATION (Admin Access)
# ===========================================
# Admin service uses system-level database access
ADMIN_DATABASE_URL="postgresql://nectar_admin:nectar_dev_2024!@localhost:5432/nectarstudio_ai?schema=public"

# ===========================================
# EXTERNAL SERVICES
# ===========================================
CORE_API_URL=http://localhost:3001
MARKETING_API_URL=http://localhost:5001

# ===========================================
# SECURITY CONFIGURATION
# ===========================================
JWT_SECRET=your_admin_jwt_secret_here
SESSION_SECRET=your_admin_session_secret_here
CORS_ORIGIN=http://localhost:4000

# ===========================================
# ADMIN USER SETTINGS
# ===========================================
SUPER_ADMIN_EMAIL=support@nectarstudio.ai
SUPER_ADMIN_PASSWORD=Fr33d0M!!@!NC

# ===========================================
# LOGGING & MONITORING
# ===========================================
LOG_LEVEL=debug
ADMIN_LOG_FILE=admin-service.log
```

#### nectar-admin/frontend/.env
```bash
# Frontend-specific environment variables
VITE_ADMIN_API_URL=http://localhost:4001
VITE_APP_TITLE=Nectar Studio Admin Portal
VITE_APP_VERSION=1.0.0
```

#### nectar-admin/backend/.env
```bash
# Backend-specific environment variables
PORT=4001
ADMIN_DATABASE_URL="postgresql://nectar_admin:nectar_dev_2024!@localhost:5432/nectarstudio_ai?schema=public"
CORS_ORIGIN=http://localhost:4000
```

---

## 🔧 Backend Integration

### 3.1 Merge Admin Routes

The admin service needs routes from both the original `admin-backend` and the `adminBackend.js` from the main server.

#### backend/routes/index.js (Route Aggregator)
```javascript
const express = require('express');
const router = express.Router();

// Import all admin routes
const authRoutes = require('./auth');
const userRoutes = require('./users');
const organizationRoutes = require('./organizations');
const metricsRoutes = require('./metrics');
const crmRoutes = require('./crm');
const billingRoutes = require('./billing');
const systemRoutes = require('./system');

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/organizations', organizationRoutes);
router.use('/metrics', metricsRoutes);
router.use('/crm', crmRoutes);
router.use('/billing', billingRoutes);
router.use('/system', systemRoutes);

module.exports = router;
```

#### backend/server.js (Updated)
```javascript
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:4000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', require('./routes'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'nectar-admin',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.SERVICE_VERSION || '1.0.0'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Nectar Admin Service running on port ${PORT}`);
  console.log(`📊 Admin Dashboard: http://localhost:4000`);
  console.log(`🔧 Admin API: http://localhost:${PORT}`);
});
```

### 3.2 Database Service Configuration

#### backend/services/database.js
```javascript
const { PrismaClient } = require('@prisma/client');

class AdminDatabaseService {
  constructor() {
    // Admin service uses system-level Prisma (no RLS restrictions)
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.ADMIN_DATABASE_URL
        }
      },
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
    });
  }

  async connect() {
    await this.prisma.$connect();
    console.log('✅ Admin database connected');
  }

  async disconnect() {
    await this.prisma.$disconnect();
    console.log('🔌 Admin database disconnected');
  }

  // Get system client (no RLS enforcement)
  getClient() {
    return this.prisma;
  }

  // Admin-specific queries with cross-tenant access
  async getAllUsers(filters = {}) {
    const { page = 1, limit = 20, search, isActive, isAdmin } = filters;
    const offset = (page - 1) * limit;

    const where = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (isActive !== undefined) where.isActive = isActive;
    if (isAdmin !== undefined) where.isAdmin = isAdmin;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: parseInt(offset),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          memberships: {
            include: {
              organization: true
            }
          }
        }
      }),
      this.prisma.user.count({ where })
    ]);

    return { users, total, page: parseInt(page), limit: parseInt(limit) };
  }

  async getSystemMetrics() {
    const [totalUsers, activeUsers, totalOrgs] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.organization.count()
    ]);

    return {
      totalUsers,
      activeUsers,
      totalSubscriptions: totalOrgs, // Using orgs as proxy for subscriptions
      monthlyRevenue: 0 // TODO: Calculate from billing data
    };
  }
}

module.exports = new AdminDatabaseService();
```

---

## 🎨 Frontend Configuration Updates

### 4.1 Update API Base URL

#### frontend/src/services/adminApi.ts (Update)
```typescript
// Update the base URL to use environment variable
const ADMIN_API_BASE_URL = import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:4001';

// Remove the "/api/admin-backend" prefix since this is now the admin service
export class AdminApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${ADMIN_API_BASE_URL}/api${endpoint}`;
    // ... rest of implementation
  }

  async getAdminMetrics(): Promise<AdminMetrics> {
    return this.request<AdminMetrics>('/metrics');
  }

  // ... other methods
}
```

### 4.2 Update Authentication Context

#### frontend/src/contexts/AuthContext.tsx (Update)
```typescript
const API_BASE_URL = import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:4001';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Update all fetch calls to use the new base URL
  const initializeAuth = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'GET',
        credentials: 'include'
      });
      // ... rest of implementation
    } catch (error) {
      // ... error handling
    }
  };

  // ... rest of implementation
};
```

---

## 🔗 Service Integration

### 5.1 Cross-Service Communication

#### backend/services/externalServices.js
```javascript
class ExternalServicesClient {
  constructor() {
    this.coreApiUrl = process.env.CORE_API_URL || 'http://localhost:3001';
    this.marketingApiUrl = process.env.MARKETING_API_URL || 'http://localhost:5001';
  }

  // Get user details from core service
  async getCoreUserDetails(userId) {
    try {
      const response = await fetch(`${this.coreApiUrl}/api/users/${userId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      return await response.json();
    } catch (error) {
      console.error('Error fetching core user details:', error);
      return null;
    }
  }

  // Get marketing lead data
  async getMarketingLeads(filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters);
      const response = await fetch(`${this.marketingApiUrl}/api/leads?${queryParams}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      return await response.json();
    } catch (error) {
      console.error('Error fetching marketing leads:', error);
      return [];
    }
  }
}

module.exports = new ExternalServicesClient();
```

### 5.2 Admin-Specific Routes

#### backend/routes/metrics.js (Fix Dashboard Issue)
```javascript
const express = require('express');
const router = express.Router();
const dbService = require('../services/database');

// Admin metrics endpoint - this will fix the dashboard 0s issue
router.get('/', async (req, res) => {
  try {
    console.log('[ADMIN METRICS] Fetching system-wide metrics');

    const metrics = await dbService.getSystemMetrics();

    console.log('[ADMIN METRICS] Metrics retrieved:', metrics);

    res.json(metrics);
  } catch (error) {
    console.error('Admin metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin metrics',
      error: error.message
    });
  }
});

module.exports = router;
```

---

## 🧪 Testing Strategy

### 6.1 Service-Level Testing

#### Test Admin Frontend
```bash
cd nectar-admin/frontend
npm run dev
# Visit: http://localhost:4000
```

#### Test Admin Backend
```bash
cd nectar-admin/backend
npm run dev
# Test: curl http://localhost:4001/health
```

#### Test Combined Service
```bash
cd nectar-admin
npm run dev
# Tests both frontend and backend together
```

### 6.2 Functionality Testing Checklist

#### Authentication & Access
- [ ] Admin can log in with `support@nectarstudio.ai` / `Fr33d0M!!@!NC`
- [ ] Session management works correctly
- [ ] Unauthorized access is blocked
- [ ] CORS allows frontend-backend communication

#### Dashboard Metrics (FIX CURRENT ISSUE)
- [ ] Dashboard shows actual user counts (not 0)
- [ ] Active users metric displays correctly
- [ ] Organization count shows real data
- [ ] API calls and activity data loads

#### User Management
- [ ] User list loads all users across organizations
- [ ] User search and filtering works
- [ ] User creation/editing functions
- [ ] User deactivation works

#### Organization Management
- [ ] All organizations visible (cross-tenant)
- [ ] Organization details load correctly
- [ ] Organization settings editable

#### CRM & Leads
- [ ] Marketing leads visible in admin
- [ ] Lead management functions work
- [ ] Lead analytics display correctly

### 6.3 Integration Testing

#### Database Access
```bash
# Test admin database connection
curl http://localhost:4001/api/metrics
# Should return real numbers, not 0s
```

#### Cross-Service Communication
```bash
# Test connection to core service
curl http://localhost:4001/api/system/health-check
# Should show status of all services
```

---

## 📁 File Migration Checklist

### Files to Copy
```
✅ admin-frontend/ → nectar-admin/frontend/
  ├── src/components/
  ├── src/services/
  ├── src/contexts/
  ├── src/hooks/
  ├── package.json
  └── .env

✅ admin-backend/ → nectar-admin/backend/
  ├── server.js
  ├── package.json
  └── .env

✅ server/routes/adminBackend.js → nectar-admin/backend/routes/
  └── (merge with existing routes)
```

### Files to Create
```
✅ nectar-admin/package.json (root)
✅ nectar-admin/.env (service config)
✅ nectar-admin/README.md
✅ nectar-admin/docker-compose.yml
✅ nectar-admin/scripts/start-dev.js
✅ nectar-admin/backend/services/database.js
✅ nectar-admin/backend/services/externalServices.js
```

### Files to Update
```
✅ frontend/src/services/adminApi.ts (API base URL)
✅ frontend/src/contexts/AuthContext.tsx (auth endpoints)
✅ backend/server.js (route integration)
✅ backend/routes/metrics.js (fix dashboard issue)
```

---

## 🚀 Deployment Preparation

### 7.1 Development Scripts

#### scripts/start-dev.js
```javascript
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Nectar Admin Service...');

// Start backend
const backend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, '../backend'),
  stdio: 'inherit'
});

// Start frontend
const frontend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, '../frontend'),
  stdio: 'inherit'
});

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Admin Service...');
  backend.kill();
  frontend.kill();
  process.exit();
});
```

### 7.2 Docker Configuration

#### docker-compose.yml
```yaml
version: '3.8'

services:
  admin-backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "4001:4001"
    environment:
      - NODE_ENV=development
      - PORT=4001
      - ADMIN_DATABASE_URL=${ADMIN_DATABASE_URL}
    depends_on:
      - postgres

  admin-frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "4000:4000"
    environment:
      - VITE_ADMIN_API_URL=http://localhost:4001
    depends_on:
      - admin-backend

  postgres:
    image: postgres:15
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=nectarstudio_ai
      - POSTGRES_USER=nectar_admin
      - POSTGRES_PASSWORD=nectar_dev_2024!
```

---

## ✅ Success Criteria

### Technical Validation
- [ ] Admin service starts on ports 4000/4001
- [ ] Database connection successful with admin privileges
- [ ] All admin routes respond correctly
- [ ] Frontend loads and displays data
- [ ] **Dashboard shows real metrics (not 0s)** 🎯
- [ ] Authentication works independently

### Functional Validation
- [ ] User management across all organizations
- [ ] Lead management from marketing service
- [ ] System monitoring and health checks
- [ ] CRM functionality intact
- [ ] Billing/subscription oversight

### Integration Validation
- [ ] Can communicate with core service
- [ ] Can access marketing lead data
- [ ] Database queries return cross-tenant data
- [ ] Admin actions reflect in other services

---

## 🔄 Next Steps

### Immediate Actions (After Completion)
1. **Remove admin code from nectar-api** (Phase 3)
2. **Update nectar-api routing** to remove admin paths
3. **Test end-to-end integration** across all services
4. **Update documentation** and deployment scripts

### Post-Migration Tasks
1. **Set up monitoring** for admin service
2. **Configure logging** and error tracking
3. **Implement backup strategy** for admin service
4. **Set up CI/CD pipeline** for independent deployment

---

**Status**: 📋 Ready for execution after marketing service
**Dependencies**: Marketing service extraction completed
**Primary Goal**: Fix admin dashboard data display (resolve 0s issue)
**Timeline**: 1 week after marketing service completion

---

*This document provides the complete roadmap for extracting the admin portal into an independent microservice while maintaining all functionality and fixing the current dashboard data issues.*