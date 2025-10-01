# Nectar Studio Microservices Separation Plan
## Complete Migration from Monolith to Three Independent Services

> **Version**: 1.0
> **Date**: September 25, 2025
> **Status**: 📋 Planning Phase
> **Backup**: Secured with restore point at commit `e5f0532`

---

## 🎯 Overview & Goals

### Current State (Monolith)
```
nectar-api/
├── server/ (Main API - ports 3000/3001)
├── src/ (Main Frontend - port 3000)
├── marketing-site/ (Marketing - ports 5000/5001)
└── admin-frontend/ + admin-backend/ (Admin - ports 4000/4001)
```

### Target State (Microservices)
```
nectar-core/           # Core Platform Service
nectar-marketing/      # Marketing & Lead Generation Service
nectar-admin/          # Admin & Management Service
```

### Migration Benefits
- 🎯 **Clear Separation**: No more port/endpoint confusion
- 🚀 **Independent Deployment**: Each service deployable separately
- 🔒 **Security**: Better isolation and access control
- 📈 **Scalability**: Scale services based on individual needs
- 👥 **Team Autonomy**: Different teams can own different services

---

## 🏗️ Target Architecture

### Service Communication Pattern
```mermaid
graph TB
    subgraph "External Users"
        CU[Customer Users]
        AU[Admin Users]
        PU[Public Users]
    end

    subgraph "Microservices"
        CS[Nectar Core<br/>:3000/:3001]
        MS[Nectar Marketing<br/>:5000/:5001]
        AS[Nectar Admin<br/>:4000/:4001]
    end

    subgraph "Database Layer"
        DB[(Shared PostgreSQL<br/>nectarstudio_ai)]
    end

    CU --> CS
    AU --> AS
    PU --> MS

    CS --> DB
    MS --> DB
    AS --> DB

    MS -.->|Lead Data| AS
    AS -.->|User Management| CS
```

### Database Access Strategy
```
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                     │
│                   nectarstudio_ai                          │
├─────────────────────────────────────────────────────────────┤
│  Core Service          │  Marketing Service │  Admin Service │
│  (RLS Enabled)         │  (Direct Access)   │  (Admin Access)│
│                        │                    │                │
│  • Users/Orgs          │  • Leads/Contacts  │  • All Data    │
│  • API Services        │  • Billing/Stripe  │  • Cross-tenant│
│  • Workflows           │  • Campaigns       │  • Monitoring  │
│  • Tenant-scoped       │  • No RLS needed   │  • No RLS      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Migration Phases

### Phase 1: Marketing Service Extraction ⭐ (START HERE)
**Target**: Create `nectar-marketing` as standalone service

**Why First?**
- Least complex dependencies
- Self-contained functionality
- Clear business domain boundary
- Quick win to validate approach

### Phase 2: Admin Service Extraction
**Target**: Create `nectar-admin` as standalone service

**Why Second?**
- Admin dashboard issues get resolved
- Clear admin-only functionality
- Uses system-level database access

### Phase 3: Core Service Cleanup
**Target**: Clean up `nectar-core` (renamed from nectar-api)

**Why Last?**
- Remove extracted code
- Simplify and optimize remaining core
- Update documentation and deployment

---

## 🚀 Phase 1: Marketing Service Extraction

### 1.1 Directory Structure Setup
```bash
# Target structure for nectar-marketing
nectar-marketing/
├── README.md                      # Service documentation
├── package.json                   # Root package manager
├── docker-compose.yml             # Local development
├── .env                          # Shared environment
├── .gitignore                    # Git exclusions
├── frontend/                     # React marketing site
│   ├── package.json
│   ├── src/
│   ├── public/
│   ├── build/
│   └── .env
├── backend/                      # Express marketing API
│   ├── package.json
│   ├── server.js
│   ├── routes/
│   ├── middleware/
│   └── .env
└── scripts/                      # Development tools
    ├── start-dev.js              # Start both services
    ├── build.js                  # Build for production
    ├── test.js                   # Run all tests
    └── deploy.js                 # Deployment script
```

### 1.2 File Migration Strategy

#### Copy Operations:
```bash
# From nectar-api/marketing-site/ to nectar-marketing/
cp -r marketing-site/frontend nectar-marketing/frontend
cp -r marketing-site/backend nectar-marketing/backend

# Additional files needed:
# - Database connection utilities
# - Shared middleware (CORS, auth, etc.)
# - Environment configurations
# - Stripe integration components
```

#### Dependencies to Copy:
- **Frontend**: React components, styles, public assets
- **Backend**: Express routes, Stripe webhooks, email services
- **Shared**: Database models, utility functions, configs

### 1.3 Environment Configuration

#### nectar-marketing/.env
```bash
# Service Configuration
NODE_ENV=development
SERVICE_NAME=nectar-marketing

# Frontend Configuration
FRONTEND_PORT=5000
FRONTEND_URL=http://localhost:5000

# Backend Configuration
BACKEND_PORT=5001
BACKEND_URL=http://localhost:5001

# Database (Marketing doesn't need RLS)
DATABASE_URL="postgresql://nectar_admin:nectar_dev_2024!@localhost:5432/nectarstudio_ai?schema=public"

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=notifications@nectarstudio.ai
SMTP_PASS=...

# External Service URLs
CORE_API_URL=http://localhost:3001
ADMIN_API_URL=http://localhost:4001
```

### 1.4 Package Configuration

#### nectar-marketing/package.json (Root)
```json
{
  "name": "nectar-marketing",
  "version": "1.0.0",
  "description": "Nectar Studio Marketing and Lead Generation Service",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run frontend:dev\" \"npm run backend:dev\"",
    "frontend:dev": "cd frontend && npm start",
    "backend:dev": "cd backend && npm run dev",
    "build": "cd frontend && npm run build",
    "test": "npm run frontend:test && npm run backend:test",
    "frontend:test": "cd frontend && npm test",
    "backend:test": "cd backend && npm test",
    "install:all": "npm install && cd frontend && npm install && cd ../backend && npm install"
  },
  "devDependencies": {
    "concurrently": "^8.0.0"
  }
}
```

### 1.5 Service Responsibilities

#### Marketing Frontend (Port 5000)
- **Public Website**: Landing pages, marketing content
- **Lead Generation**: Contact forms, newsletter signup
- **Stripe Integration**: Pricing pages, subscription signup
- **Public Blog**: Content management (if applicable)

#### Marketing Backend (Port 5001)
- **Lead Processing**: Store leads in database
- **Stripe Webhooks**: Process payment events
- **Email Services**: Welcome emails, newsletters
- **Contact Forms**: Process and store inquiries

### 1.6 Database Models Used
```sql
-- Marketing service will use these tables:
- contacts              (leads and inquiries)
- subscriptions         (Stripe billing data)
- marketing_campaigns   (if exists)
- email_templates       (if exists)

-- No RLS needed - marketing data is not tenant-scoped
```

---

## 🛡️ Phase 2: Admin Service Extraction

### 2.1 Directory Structure Setup
```bash
nectar-admin/
├── README.md
├── package.json
├── docker-compose.yml
├── .env
├── frontend/                     # React admin dashboard
│   ├── package.json
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   └── contexts/
│   └── .env
├── backend/                      # Express admin API
│   ├── package.json
│   ├── server.js
│   ├── routes/
│   │   ├── users.js
│   │   ├── organizations.js
│   │   ├── metrics.js
│   │   └── leads.js
│   └── middleware/
└── scripts/
```

### 2.2 Admin Service Responsibilities

#### Admin Frontend (Port 4000)
- **User Management**: CRUD operations for all users
- **Organization Management**: Multi-tenant administration
- **Lead Management**: View and manage marketing leads
- **Analytics Dashboard**: System-wide metrics and reporting
- **Billing Oversight**: Subscription management
- **System Configuration**: Admin-only settings

#### Admin Backend (Port 4001)
- **Cross-Tenant API**: Access all organizations
- **User Operations**: Create, update, delete users
- **Metrics Aggregation**: Dashboard statistics
- **Lead Management**: CRM functionality
- **System Monitoring**: Health checks, audit logs

### 2.3 Database Access
```bash
# Admin service uses system-level access
ADMIN_DATABASE_URL="postgresql://nectar_admin:nectar_dev_2024!@localhost:5432/nectarstudio_ai?schema=public"

# No RLS restrictions - admin sees all data
```

---

## ⚙️ Phase 3: Core Service Cleanup

### 3.1 Renamed Structure
```bash
nectar-core/ (renamed from nectar-api)
├── server/                       # Core API backend
├── src/                         # Core application frontend
├── package.json
└── README.md                    # Updated documentation
```

### 3.2 Core Service Responsibilities

#### Core Frontend (Port 3000)
- **User Dashboard**: Tenant-scoped user interface
- **Workflow Builder**: Visual workflow creation
- **API Management**: Endpoint creation and testing
- **Service Catalog**: Browse and configure services
- **Organization Settings**: Tenant-specific configuration

#### Core Backend (Port 3001)
- **Authentication**: User login and session management
- **Tenant-Scoped API**: RLS-enforced data access
- **Workflow Engine**: Execute and manage workflows
- **Service Management**: CRUD for services and endpoints
- **Integration Hub**: Third-party API connections

### 3.3 Cleanup Tasks
- ✅ Remove `marketing-site/` directory
- ✅ Remove `admin-frontend/` and `admin-backend/` directories
- ✅ Update package.json to remove unused dependencies
- ✅ Simplify routing and middleware
- ✅ Update environment configurations
- ✅ Clean up documentation

---

## 🔧 Configuration Changes

### Environment Variables by Service

#### Nectar Core (.env)
```bash
NODE_ENV=development
PORT=3001
FRONTEND_PORT=3000

# Tenant-scoped database access
DATABASE_URL="postgresql://nectar_app_user:nectar_app_2024!@localhost:5432/nectarstudio_ai?schema=public"

# External service URLs
MARKETING_API_URL=http://localhost:5001
ADMIN_API_URL=http://localhost:4001
```

#### Nectar Marketing (.env)
```bash
NODE_ENV=development
FRONTEND_PORT=5000
BACKEND_PORT=5001

# System-level database access (no RLS for marketing)
DATABASE_URL="postgresql://nectar_admin:nectar_dev_2024!@localhost:5432/nectarstudio_ai?schema=public"

# Stripe configuration
STRIPE_SECRET_KEY=...
```

#### Nectar Admin (.env)
```bash
NODE_ENV=development
FRONTEND_PORT=4000
BACKEND_PORT=4001

# Admin-level database access
ADMIN_DATABASE_URL="postgresql://nectar_admin:nectar_dev_2024!@localhost:5432/nectarstudio_ai?schema=public"

# External service URLs
CORE_API_URL=http://localhost:3001
MARKETING_API_URL=http://localhost:5001
```

---

## 🚦 Migration Execution Plan

### Step-by-Step Execution

#### Week 1: Marketing Service
- [ ] Day 1-2: Create nectar-marketing structure
- [ ] Day 3-4: Copy and configure files
- [ ] Day 5: Test marketing service independently
- [ ] Day 6-7: Update integrations and deploy

#### Week 2: Admin Service
- [ ] Day 1-2: Create nectar-admin structure
- [ ] Day 3-4: Copy and configure admin files
- [ ] Day 5: Fix admin dashboard data issues
- [ ] Day 6-7: Test admin service and integrations

#### Week 3: Core Cleanup & Testing
- [ ] Day 1-2: Remove extracted code from nectar-core
- [ ] Day 3-4: Update configurations and documentation
- [ ] Day 5-7: End-to-end testing of all three services

### Success Criteria
- ✅ All three services start independently
- ✅ Database connections work correctly
- ✅ Cross-service communication functions
- ✅ Authentication works in each service
- ✅ No broken functionality compared to monolith
- ✅ Admin dashboard shows correct data (fixes current issue)

---

## 🔍 Testing Strategy

### Service-Level Testing
```bash
# Test each service independently
nectar-marketing: http://localhost:5000 + http://localhost:5001
nectar-admin: http://localhost:4000 + http://localhost:4001
nectar-core: http://localhost:3000 + http://localhost:3001
```

### Integration Testing
- **Lead Flow**: Marketing → Database → Admin visibility
- **User Management**: Admin creates user → Core service access
- **Billing Flow**: Marketing Stripe → Admin monitoring → Core access
- **Authentication**: Each service validates sessions correctly

### Database Testing
- **RLS Functionality**: Core service respects tenant boundaries
- **Admin Access**: Admin service sees all data
- **Marketing Access**: Marketing service accesses leads/billing
- **Data Integrity**: No data loss during migration

---

## 🎯 Benefits Realization

### Immediate Benefits
- 🔧 **Fixed Admin Dashboard**: No more 0s, proper cross-tenant data
- 🎯 **Clear Boundaries**: No confusion about which service does what
- 🚀 **Independent Development**: Teams can work on services separately

### Long-term Benefits
- 📈 **Scalability**: Scale marketing, admin, and core independently
- 🔒 **Security**: Better isolation and access control
- 🚀 **Deployment**: Deploy updates to individual services
- 👥 **Team Structure**: Clear ownership and responsibility

### Technical Benefits
- 🧹 **Code Clarity**: Smaller, focused codebases
- 🔧 **Easier Debugging**: Issues isolated to specific services
- 📚 **Better Documentation**: Service-specific docs
- 🧪 **Targeted Testing**: Test individual service functionality

---

## ⚠️ Risks & Mitigation

### Primary Risks
1. **Data Consistency**: Services accessing same database
   - *Mitigation*: Clear data ownership boundaries, database transactions

2. **Service Communication**: Network calls between services
   - *Mitigation*: Robust error handling, service health checks

3. **Configuration Complexity**: Multiple environment files
   - *Mitigation*: Clear documentation, shared configuration patterns

4. **Development Overhead**: Managing three repositories
   - *Mitigation*: Docker Compose, shared development scripts

### Rollback Plan
If migration fails at any point:
1. Use backup branch: `backup-pre-microservices-20250925-XXXXXX`
2. Follow restoration guide in `BACKUP_RESTORATION_GUIDE.md`
3. Return to working monolith state
4. Analyze issues and retry with different approach

---

## 📚 Next Steps

### Immediate Actions (This Week)
1. **Review this document** - Ensure alignment with goals
2. **Start Phase 1** - Create nectar-marketing service
3. **Test marketing service** - Verify functionality
4. **Update documentation** - Keep this plan current

### Decision Points
- **Repository Strategy**: Separate Git repos vs. monorepo
- **Deployment Strategy**: Individual deploys vs. coordinated
- **Monitoring Strategy**: Per-service vs. unified monitoring
- **Database Strategy**: Keep shared vs. separate databases

---

**Status**: 📋 Ready for execution
**Next Phase**: Marketing Service Extraction
**Contact**: Complete this migration with confidence - backup is secure!

---

*This document will be updated as migration progresses. Keep it current with actual implementation decisions and learnings.*