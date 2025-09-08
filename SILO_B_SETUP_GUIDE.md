# Customer Application Refactoring Setup Guide (Silo B)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- PostgreSQL 14+ (shared database)
- Git
- Docker (optional for containerized development)
- **Existing nectar-api codebase** (this silo refactors the current code)

### 1. Backup Current State
```bash
# Create backup branch before refactoring
git checkout -b backup-pre-customer-app-refactor
git push origin backup-pre-customer-app-refactor

# Return to main development branch
git checkout main
```

### 2. Install Additional Dependencies
```bash
# Frontend dependencies for customer features
cd src
npm install @hookform/resolvers zod react-hook-form
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install react-hot-toast lucide-react
npm install @tanstack/react-table @tanstack/react-query

# Backend dependencies for organization management
cd ../server
npm install express-rate-limit helmet compression
npm install stripe @stripe/stripe-js # For billing
npm install nodemailer mjml # For customer communications
npm install @prisma/client prisma
```

### 3. Environment Configuration
```bash
# Update .env files for customer app
cp .env .env.backup
```

### Customer App Environment (`.env`)
```env
# Database (shared with admin portal)
DATABASE_URL="postgresql://customer_user:password@localhost:5432/nectar_shared"

# Authentication (different secret from admin)
CUSTOMER_JWT_SECRET="customer-specific-jwt-secret"
CUSTOMER_SESSION_TIMEOUT="24h"

# Customer App Specific
NODE_ENV="development"
PORT=3000
API_PORT=8000

# CORS for customer domain
ALLOWED_ORIGINS="http://localhost:3000,https://app.nectar.com"

# Billing Integration
STRIPE_SECRET_KEY="sk_test_your_stripe_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"

# Customer Communications
SMTP_HOST="smtp.sendgrid.net"
SMTP_USER="apikey"
SMTP_PASSWORD="your_sendgrid_api_key"
FROM_EMAIL="support@nectar.com"

# Feature Flags
ENABLE_ORGANIZATION_BILLING=true
ENABLE_CUSTOMER_SUPPORT_CHAT=false
```

## 🗂️ Refactored Project Structure

```
nectar-customer-app/ (current nectar-api)
├── src/                        # Frontend (React)
│   ├── components/
│   │   ├── auth/              # Customer authentication
│   │   ├── organizations/     # Organization management
│   │   ├── billing/           # Subscription management
│   │   ├── support/           # Customer support
│   │   └── ui/               # Reusable components
│   ├── features/
│   │   ├── connections/       # Enhanced connections UI
│   │   ├── services/         # Enhanced services UI
│   │   ├── applications/     # Enhanced applications UI
│   │   ├── workflows/        # Enhanced workflow designer
│   │   └── reports/          # Organization reports
│   ├── hooks/
│   │   ├── useOrganization.ts # Organization context
│   │   ├── useBilling.ts     # Subscription hooks
│   │   └── useCustomerAuth.ts # Customer-only auth
│   ├── services/
│   │   ├── api/              # Customer API client
│   │   ├── billing/          # Stripe integration
│   │   └── support/          # Help desk integration
│   └── types/
│       ├── customer.ts       # Customer-specific types
│       └── organization.ts   # Organization types
├── server/                    # Backend (Node.js)
│   ├── routes/
│   │   ├── auth-customer.js  # Customer authentication
│   │   ├── organizations.js  # Organization CRUD
│   │   ├── billing.js       # Subscription management
│   │   ├── customer-support.js # Support tickets
│   │   └── reports.js       # Organization reports
│   ├── middleware/
│   │   ├── customerAuth.js   # Customer-only auth
│   │   ├── organizationScope.js # Tenant isolation
│   │   └── billing.js       # Subscription validation
│   ├── services/
│   │   ├── organizationService.js
│   │   ├── billingService.js
│   │   ├── customerOnboarding.js
│   │   └── notificationService.js
│   └── utils/
│       ├── tenantIsolation.js
│       └── customerHelpers.js
└── database/                 # Shared database schemas
    └── migrations/           # Customer app migrations
```

## 🧹 Cleanup Tasks

### 1. Remove Platform Admin Code
```bash
# Files to remove (platform admin functionality)
rm server/routes/platform-admin.js
rm server/middleware/superAdminAuth.js
rm src/components/admin/PlatformDashboard.jsx
rm src/features/admin/

# Update navigation to remove admin-only items
```

### 2. Update Authentication System

#### Backend Auth Cleanup (`server/middleware/customerAuth.js`)
```javascript
// Remove superadmin logic, keep only organization-scoped auth
const jwt = require('jsonwebtoken')
const { prisma } = require('../utils/database')

const customerAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' })
    }

    const decoded = jwt.verify(token, process.env.CUSTOMER_JWT_SECRET)
    
    // Only allow customer users, no platform admin access
    if (decoded.type === 'admin') {
      return res.status(403).json({ error: 'Platform admin access not allowed in customer app' })
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { 
        organizations: {
          include: {
            members: true
          }
        }
      }
    })

    if (!user) {
      return res.status(401).json({ error: 'Invalid token.' })
    }

    req.user = user
    req.currentOrganization = user.organizations[0] // Default to first org
    next()
  } catch (error) {
    res.status(400).json({ error: 'Invalid token.' })
  }
}

module.exports = { customerAuth }
```

#### Frontend Auth Context (`src/hooks/useCustomerAuth.ts`)
```typescript
import { createContext, useContext, useState, useEffect } from 'react'
import { customerAuthService } from '../services/api/customerAuth'

interface Organization {
  id: string
  name: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
}

interface CustomerUser {
  id: string
  email: string
  name: string
  organizations: Organization[]
  currentOrganization?: Organization
}

interface CustomerAuthContextType {
  user: CustomerUser | null
  currentOrg: Organization | null
  switchOrganization: (orgId: string) => void
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
}

const CustomerAuthContext = createContext<CustomerAuthContextType | null>(null)

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext)
  if (!context) {
    throw new Error('useCustomerAuth must be used within CustomerAuthProvider')
  }
  return context
}

export const CustomerAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<CustomerUser | null>(null)
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const switchOrganization = (orgId: string) => {
    if (user) {
      const org = user.organizations.find(o => o.id === orgId)
      if (org) {
        setCurrentOrg(org)
        localStorage.setItem('currentOrganization', orgId)
      }
    }
  }

  // ... rest of auth logic
}
```

### 3. Organization Management System

#### Organization Service (`server/services/organizationService.js`)
```javascript
const { prisma } = require('../utils/database')

class OrganizationService {
  static async createOrganization(name, ownerEmail) {
    return await prisma.$transaction(async (tx) => {
      // Create organization
      const organization = await tx.organization.create({
        data: { name }
      })

      // Find owner user
      const owner = await tx.user.findUnique({
        where: { email: ownerEmail }
      })

      // Create organization membership
      await tx.organizationMember.create({
        data: {
          userId: owner.id,
          organizationId: organization.id,
          role: 'OWNER'
        }
      })

      return organization
    })
  }

  static async inviteUser(organizationId, email, role, invitedBy) {
    // Send invitation email and create pending invitation
    const invitation = await prisma.organizationInvitation.create({
      data: {
        organizationId,
        email,
        role,
        invitedBy,
        token: generateInvitationToken(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    })

    // Send email invitation
    await emailService.sendInvitation(email, invitation.token, organizationId)

    return invitation
  }

  static async acceptInvitation(token) {
    const invitation = await prisma.organizationInvitation.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
        acceptedAt: null
      }
    })

    if (!invitation) {
      throw new Error('Invalid or expired invitation')
    }

    // Create user if doesn't exist, add to organization
    return await prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({
        where: { email: invitation.email }
      })

      if (!user) {
        // Create new user account
        user = await tx.user.create({
          data: {
            email: invitation.email,
            name: invitation.email.split('@')[0], // Temporary name
            isEmailVerified: true
          }
        })
      }

      // Add to organization
      await tx.organizationMember.create({
        data: {
          userId: user.id,
          organizationId: invitation.organizationId,
          role: invitation.role
        }
      })

      // Mark invitation as accepted
      await tx.organizationInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() }
      })

      return user
    })
  }
}

module.exports = { OrganizationService }
```

### 4. Enhanced Customer Features

#### Organization Dashboard (`src/components/organizations/OrganizationDashboard.tsx`)
```typescript
import { useQuery } from '@tanstack/react-query'
import { useCustomerAuth } from '../../hooks/useCustomerAuth'
import { organizationService } from '../../services/api/organizations'

export const OrganizationDashboard = () => {
  const { currentOrg } = useCustomerAuth()
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ['organization-stats', currentOrg?.id],
    queryFn: () => organizationService.getStats(currentOrg!.id),
    enabled: !!currentOrg
  })

  const { data: recentActivity } = useQuery({
    queryKey: ['recent-activity', currentOrg?.id],
    queryFn: () => organizationService.getRecentActivity(currentOrg!.id),
    enabled: !!currentOrg
  })

  if (isLoading) return <DashboardSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Organization Dashboard</h1>
        <OrganizationSwitcher />
      </div>

      {/* Organization Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Active Connections" 
          value={stats?.activeConnections || 0}
          icon="🔗" 
        />
        <StatCard 
          title="Running Workflows" 
          value={stats?.runningWorkflows || 0}
          icon="⚡" 
        />
        <StatCard 
          title="Team Members" 
          value={stats?.teamMembers || 0}
          icon="👥" 
        />
        <StatCard 
          title="Monthly Usage" 
          value={stats?.monthlyUsage || 0}
          icon="📊" 
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
        </div>
        <div className="p-6">
          <ActivityFeed activities={recentActivity} />
        </div>
      </div>
    </div>
  )
}
```

#### Billing Integration (`src/components/billing/BillingDashboard.tsx`)
```typescript
import { loadStripe } from '@stripe/stripe-js'
import { useQuery, useMutation } from '@tanstack/react-query'
import { billingService } from '../../services/api/billing'

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY!)

export const BillingDashboard = () => {
  const { currentOrg } = useCustomerAuth()

  const { data: subscription } = useQuery({
    queryKey: ['subscription', currentOrg?.id],
    queryFn: () => billingService.getSubscription(currentOrg!.id),
    enabled: !!currentOrg
  })

  const upgradeMutation = useMutation({
    mutationFn: (planId: string) => billingService.upgradePlan(currentOrg!.id, planId),
    onSuccess: () => {
      // Redirect to Stripe checkout
    }
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Billing & Subscription</h1>

      {/* Current Plan */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Current Plan</h2>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-2xl font-bold">{subscription?.planName || 'Free'}</p>
            <p className="text-gray-600">
              {subscription?.amount ? `$${subscription.amount}/month` : 'No charge'}
            </p>
          </div>
          <button 
            onClick={() => upgradeMutation.mutate('pro')}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Upgrade Plan
          </button>
        </div>
      </div>

      {/* Usage Metrics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Usage This Month</h2>
        <UsageChart organizationId={currentOrg?.id} />
      </div>

      {/* Billing History */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Billing History</h2>
        <BillingHistory organizationId={currentOrg?.id} />
      </div>
    </div>
  )
}
```

## 🧪 Testing Strategy

### 1. Remove Platform Admin Tests
```bash
# Remove platform admin test files
rm -rf server/tests/admin/
rm -rf src/tests/admin/

# Update test suites to focus on customer functionality
```

### 2. Add Organization Testing (`server/tests/organization.test.js`)
```javascript
const request = require('supertest')
const app = require('../app')
const { prisma } = require('../utils/database')

describe('Organization Management', () => {
  let customerToken
  let organizationId

  beforeEach(async () => {
    // Setup test organization and user
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@customer.com',
        password: 'password123'
      })
    
    customerToken = response.body.token
    organizationId = response.body.user.organizations[0].id
  })

  test('should get organization dashboard stats', async () => {
    const response = await request(app)
      .get(`/api/organizations/${organizationId}/stats`)
      .set('Authorization', `Bearer ${customerToken}`)

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('activeConnections')
    expect(response.body).toHaveProperty('teamMembers')
  })

  test('should invite user to organization', async () => {
    const response = await request(app)
      .post(`/api/organizations/${organizationId}/invite`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        email: 'newuser@example.com',
        role: 'MEMBER'
      })

    expect(response.status).toBe(201)
    expect(response.body).toHaveProperty('invitationToken')
  })

  test('should not allow access to other organization data', async () => {
    const otherOrgId = 'other-org-id'
    
    const response = await request(app)
      .get(`/api/organizations/${otherOrgId}/stats`)
      .set('Authorization', `Bearer ${customerToken}`)

    expect(response.status).toBe(403)
  })
})
```

## 🚀 Migration Commands

```bash
# 1. Backup current state
git checkout -b backup-pre-refactor
git push origin backup-pre-refactor

# 2. Create feature branch for refactoring
git checkout main
git checkout -b customer-app-refactor

# 3. Install new dependencies
npm install # (dependencies listed above)

# 4. Update database schema
cd server
npx prisma generate
npx prisma db push

# 5. Run database migration for organization features
npx prisma migrate dev --name add-organization-features

# 6. Update environment variables
cp .env .env.backup
# Add customer-specific environment variables

# 7. Start refactored application
npm run dev # Frontend on :3000
npm run server:dev # Backend on :8000

# 8. Run tests to ensure functionality
npm test
```

## 📋 Refactoring Checklist

### Authentication System
- [ ] Remove superadmin/platform admin logic
- [ ] Update JWT tokens to customer-only
- [ ] Implement organization-scoped permissions
- [ ] Add organization switching capability

### Database & API Security
- [ ] Audit all API endpoints for tenant isolation
- [ ] Add organization ID to all database queries
- [ ] Implement middleware for organization boundaries
- [ ] Test cross-tenant data access prevention

### Customer Features Enhancement
- [ ] Build organization dashboard
- [ ] Enhance connections management
- [ ] Improve services configuration
- [ ] Upgrade workflow designer
- [ ] Add billing/subscription management

### User Experience
- [ ] Design customer onboarding flow
- [ ] Add in-app help and guidance
- [ ] Create customer support integration
- [ ] Build organization settings pages
- [ ] Add team member management

### Performance & Monitoring
- [ ] Optimize customer-facing queries
- [ ] Add customer usage analytics
- [ ] Implement proper error handling
- [ ] Add performance monitoring

This setup guide provides a comprehensive plan for refactoring the existing nectar-api codebase into a dedicated customer application with enhanced organization features and proper multi-tenant isolation.