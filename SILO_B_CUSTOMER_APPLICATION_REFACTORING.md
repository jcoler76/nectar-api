# SILO B: Customer Application Refactoring Guide

## 🎯 **Overview**
Refactor the existing `nectar-api` codebase to remove all platform admin complexity and create a clean, customer-focused SaaS application. This involves cleaning up the current codebase while enhancing customer-facing features.

**Domain:** `app.nectar.com`  
**Repository:** `nectar-customer-app` (current nectar-api evolved)  
**Technology:** React 18 + Node.js + PostgreSQL (existing stack)  

---

## 📂 **Current vs. Target Structure**

### **Current Structure Issues**
```
nectar-api/
├── 📁 src/                     # Mixed customer/admin frontend
├── 📁 server/                  # Mixed customer/admin backend
├── 📁 server/middleware/       # Complex multi-level auth
├── 📁 server/routes/          # Mixed customer/platform routes
└── 📁 src/constants/          # Complex permission system
```

### **Target Clean Structure**
```
nectar-customer-app/
├── 📁 src/                     # Customer-only frontend
│   ├── 📁 components/         # Customer UI components
│   ├── 📁 pages/             # Customer pages only
│   ├── 📁 hooks/             # Customer-focused hooks
│   └── 📁 constants/         # Simplified permissions
├── 📁 server/                  # Customer-only backend
│   ├── 📁 routes/            # Organization-scoped routes
│   ├── 📁 middleware/        # Simplified auth middleware
│   └── 📁 services/          # Customer business logic
└── 📁 database/              # Shared database schemas
```

---

## 🧹 **Phase 1: Authentication & User System Cleanup**

### **B1.1: Remove Platform Admin Logic**

**Current Permission System Cleanup:**

**`src/constants/permissions.ts`** - Simplify to organization-only
```typescript
export interface CustomerPermissions {
  // Core permissions
  canViewDashboard: boolean
  canManageConnections: boolean
  canManageServices: boolean
  canManageApplications: boolean
  canManageWorkflows: boolean
  
  // User management within organization
  canManageOrgUsers: boolean
  canManageOrgSettings: boolean
  canViewOrgReports: boolean
  canManageOrgBilling: boolean
  
  // Data permissions
  canExportData: boolean
  canImportData: boolean
  canDeleteData: boolean
}

// Remove SUPERADMIN_PERMISSIONS entirely
// export const SUPERADMIN_PERMISSIONS = ... // DELETE THIS

// Simplified role-based permissions
export const ORG_OWNER_PERMISSIONS: CustomerPermissions = {
  canViewDashboard: true,
  canManageConnections: true,
  canManageServices: true,
  canManageApplications: true,
  canManageWorkflows: true,
  canManageOrgUsers: true,
  canManageOrgSettings: true,
  canViewOrgReports: true,
  canManageOrgBilling: true,
  canExportData: true,
  canImportData: true,
  canDeleteData: true,
}

export const ORG_ADMIN_PERMISSIONS: CustomerPermissions = {
  canViewDashboard: true,
  canManageConnections: true,
  canManageServices: true,
  canManageApplications: true,
  canManageWorkflows: true,
  canManageOrgUsers: true,
  canManageOrgSettings: false, // Cannot change org settings
  canViewOrgReports: true,
  canManageOrgBilling: false,  // Cannot manage billing
  canExportData: true,
  canImportData: true,
  canDeleteData: false,        // Cannot delete data
}

export const ORG_MEMBER_PERMISSIONS: CustomerPermissions = {
  canViewDashboard: true,
  canManageConnections: false,
  canManageServices: false,
  canManageApplications: false,
  canManageWorkflows: true,     // Can create/edit workflows
  canManageOrgUsers: false,
  canManageOrgSettings: false,
  canViewOrgReports: false,
  canManageOrgBilling: false,
  canExportData: false,
  canImportData: false,
  canDeleteData: false,
}

export const ORG_VIEWER_PERMISSIONS: CustomerPermissions = {
  canViewDashboard: true,
  canManageConnections: false,
  canManageServices: false,
  canManageApplications: false,
  canManageWorkflows: false,
  canManageOrgUsers: false,
  canManageOrgSettings: false,
  canViewOrgReports: false,
  canManageOrgBilling: false,
  canExportData: false,
  canImportData: false,
  canDeleteData: false,
}
```

### **B1.2: Simplify Authentication System**

**Update `server/services/authService.js`** - Remove platform admin logic:
```javascript
class AuthService {
  async login(email, password, ipAddress, userAgent) {
    try {
      const user = await prismaService.getUserByEmail(email, {
        memberships: {
          include: {
            organization: {
              include: {
                subscription: true,
              },
            },
          },
        },
      })

      if (!user || !user.isActive) {
        throw new Error('Invalid credentials or inactive account')
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash)
      if (!isValidPassword) {
        throw new Error('Invalid credentials')
      }

      if (!user.memberships || user.memberships.length === 0) {
        throw new Error('No organization access found')
      }

      // Get primary organization membership
      const primaryMembership = user.memberships[0]
      const organization = primaryMembership.organization

      // REMOVED: Platform admin logic
      // REMOVED: Cross-tenant access
      // REMOVED: isSuperAdmin checks

      // Generate customer-only JWT token
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: organization.id,
        organizationSlug: organization.slug,
        role: primaryMembership.role,
        type: 'customer', // Always customer type
      }

      const token = jwt.sign(tokenPayload, this.jwtSecret, {
        expiresIn: this.tokenExpiry,
        issuer: 'nectar-customer-app',
        audience: 'nectar-customers',
      })

      await prismaService.updateUserLastLogin(user.id)

      return {
        user,
        organization,
        membership: primaryMembership,
        token,
        expiresIn: this.tokenExpiry,
      }
    } catch (error) {
      logger.error('Customer login error', { 
        error: error.message, 
        email: email.replace(/./g, '*'), // Mask email in logs
        ipAddress,
      })
      throw error
    }
  }

  // REMOVED: Platform admin methods
  // REMOVED: Cross-tenant methods
  // REMOVED: Impersonation methods
}
```

### **B1.3: Update Frontend Permission Context**

**`src/context/PermissionContext.jsx`** - Simplify to customer-only:
```javascript
import {
  ORG_OWNER_PERMISSIONS,
  ORG_ADMIN_PERMISSIONS,
  ORG_MEMBER_PERMISSIONS,
  ORG_VIEWER_PERMISSIONS,
  DEFAULT_PERMISSIONS,
} from '../constants/permissions'

export const PermissionProvider = ({ children }) => {
  const { user } = useAuth()
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS)

  useEffect(() => {
    if (!user) {
      setPermissions(DEFAULT_PERMISSIONS)
      return
    }

    // REMOVED: Platform admin logic
    // REMOVED: isSuperAdmin checks

    // Simple organization role-based permissions
    switch (user.role) {
      case 'OWNER':
        setPermissions(ORG_OWNER_PERMISSIONS)
        break
      case 'ADMIN':
        setPermissions(ORG_ADMIN_PERMISSIONS)
        break
      case 'MEMBER':
        setPermissions(ORG_MEMBER_PERMISSIONS)
        break
      case 'VIEWER':
        setPermissions(ORG_VIEWER_PERMISSIONS)
        break
      default:
        setPermissions(DEFAULT_PERMISSIONS)
    }
  }, [user])

  return <PermissionContext.Provider value={permissions}>{children}</PermissionContext.Provider>
}
```

### **B1.4: Clean Up Middleware**

**Update `server/middleware/authFactory.js`** - Remove platform logic:
```javascript
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // REMOVED: Platform admin token handling
    // Only handle customer tokens
    if (decoded.type !== 'customer') {
      return res.status(401).json({ error: 'Invalid token type' })
    }

    const user = await prismaService.getUserById(decoded.userId, {
      memberships: {
        include: {
          organization: true,
        },
      },
    })

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' })
    }

    // Ensure user belongs to the organization in the token
    const membership = user.memberships.find(m => m.organizationId === decoded.organizationId)
    
    if (!membership) {
      return res.status(401).json({ error: 'Invalid organization access' })
    }

    req.user = {
      ...user,
      userId: user.id,
      organizationId: decoded.organizationId,
      role: membership.role,
      // REMOVED: isAdmin flag (handled by role)
      // REMOVED: isSuperAdmin flag
    }

    req.organization = membership.organization
    next()
  } catch (error) {
    logger.warn('Token verification failed', { error: error.message })
    res.status(401).json({ error: 'Invalid token' })
  }
}
```

---

## 🏢 **Phase 2: Organization Management Enhancement**

### **B2.1: Enhanced Organization Setup Workflow**

**Create `src/pages/Onboarding/OrganizationSetup.jsx`**:
```javascript
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { CheckCircleIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/context/AuthContext'
import api from '@/services/api'

const OrganizationSetup = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  
  const [orgData, setOrgData] = useState({
    name: '',
    industry: '',
    size: '',
    useCase: '',
    goals: [],
  })

  const setupMutation = useMutation({
    mutationFn: (data) => api.post('/api/organizations/setup', data),
    onSuccess: () => {
      navigate('/dashboard?welcome=true')
    },
  })

  const steps = [
    { id: 1, name: 'Organization Info', status: currentStep >= 1 ? 'complete' : 'upcoming' },
    { id: 2, name: 'Team Setup', status: currentStep >= 2 ? 'complete' : 'upcoming' },
    { id: 3, name: 'First Connection', status: currentStep >= 3 ? 'complete' : 'upcoming' },
  ]

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    } else {
      setupMutation.mutate(orgData)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Welcome to Nectar, {user?.firstName}!
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Let's set up your organization in just a few steps
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        {/* Progress Steps */}
        <nav className="mb-8">
          <ol className="flex items-center justify-center space-x-5">
            {steps.map((step) => (
              <li key={step.name} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 border-2 rounded-full ${
                  step.status === 'complete' ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                }`}>
                  {step.status === 'complete' ? (
                    <CheckCircleIcon className="w-6 h-6 text-white" />
                  ) : (
                    <span className={`text-sm font-medium ${
                      currentStep === step.id ? 'text-indigo-600' : 'text-gray-500'
                    }`}>
                      {step.id}
                    </span>
                  )}
                </div>
                <span className="ml-2 text-sm font-medium text-gray-900">{step.name}</span>
              </li>
            ))}
          </ol>
        </nav>

        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {currentStep === 1 && (
            <OrganizationInfoStep 
              data={orgData} 
              onChange={setOrgData} 
              onNext={handleNext}
            />
          )}
          {currentStep === 2 && (
            <TeamSetupStep 
              data={orgData} 
              onChange={setOrgData} 
              onNext={handleNext}
            />
          )}
          {currentStep === 3 && (
            <FirstConnectionStep 
              data={orgData} 
              onChange={setOrgData} 
              onNext={handleNext}
              isLoading={setupMutation.isLoading}
            />
          )}
        </div>
      </div>
    </div>
  )
}

const OrganizationInfoStep = ({ data, onChange, onNext }) => {
  const handleSubmit = (e) => {
    e.preventDefault()
    onNext()
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Organization Name
          </label>
          <input
            type="text"
            required
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Industry
          </label>
          <select
            required
            value={data.industry}
            onChange={(e) => onChange({ ...data, industry: e.target.value })}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">Select industry</option>
            <option value="technology">Technology</option>
            <option value="healthcare">Healthcare</option>
            <option value="finance">Finance</option>
            <option value="ecommerce">E-commerce</option>
            <option value="manufacturing">Manufacturing</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Company Size
          </label>
          <select
            required
            value={data.size}
            onChange={(e) => onChange({ ...data, size: e.target.value })}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">Select size</option>
            <option value="1-10">1-10 employees</option>
            <option value="11-50">11-50 employees</option>
            <option value="51-200">51-200 employees</option>
            <option value="201-1000">201-1000 employees</option>
            <option value="1000+">1000+ employees</option>
          </select>
        </div>
      </div>

      <div className="mt-6">
        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Continue
        </button>
      </div>
    </form>
  )
}

// Additional step components...
export default OrganizationSetup
```

### **B2.2: Organization Settings Dashboard**

**Create `src/pages/Settings/OrganizationSettings.jsx`**:
```javascript
import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { usePermissions } from '@/context/PermissionContext'
import api from '@/services/api'

const OrganizationSettings = () => {
  const { user } = useAuth()
  const permissions = usePermissions()
  const queryClient = useQueryClient()

  const { data: organization } = useQuery({
    queryKey: ['organization', user?.organizationId],
    queryFn: () => api.get(`/api/organizations/${user.organizationId}`).then(r => r.data),
  })

  const updateOrgMutation = useMutation({
    mutationFn: (data) => api.put(`/api/organizations/${user.organizationId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['organization'])
    },
  })

  if (!permissions.canManageOrgSettings) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">Access Denied</h3>
          <p className="mt-2 text-sm text-gray-500">
            You don't have permission to manage organization settings.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Organization Settings</h1>

      <div className="space-y-6">
        <OrganizationInfoCard 
          organization={organization}
          onUpdate={updateOrgMutation.mutate}
          isLoading={updateOrgMutation.isLoading}
        />
        
        <BillingCard organization={organization} />
        
        <SecurityCard organization={organization} />
        
        <DangerZoneCard organization={organization} />
      </div>
    </div>
  )
}

const OrganizationInfoCard = ({ organization, onUpdate, isLoading }) => {
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: organization?.name || '',
    domain: organization?.domain || '',
    website: organization?.website || '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onUpdate(formData)
    setEditing(false)
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6 border-b">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Organization Information</h3>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
            >
              Edit
            </button>
          )}
        </div>
      </div>
      
      <div className="px-4 py-5 sm:px-6">
        {editing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Organization Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Domain
              </label>
              <input
                type="text"
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="company.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="https://company.com"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="bg-indigo-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Organization Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{organization?.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Slug</dt>
              <dd className="mt-1 text-sm text-gray-900">{organization?.slug}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Domain</dt>
              <dd className="mt-1 text-sm text-gray-900">{organization?.domain || 'Not set'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Website</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {organization?.website ? (
                  <a href={organization.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500">
                    {organization.website}
                  </a>
                ) : (
                  'Not set'
                )}
              </dd>
            </div>
          </dl>
        )}
      </div>
    </div>
  )
}

export default OrganizationSettings
```

### **B2.3: User Management Within Organization**

**Create `src/pages/Team/TeamManagement.jsx`**:
```javascript
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/context/AuthContext'
import { usePermissions } from '@/context/PermissionContext'
import api from '@/services/api'

const TeamManagement = () => {
  const { user } = useAuth()
  const permissions = usePermissions()
  const queryClient = useQueryClient()
  const [showInviteModal, setShowInviteModal] = useState(false)

  const { data: teamMembers, isLoading } = useQuery({
    queryKey: ['team-members', user?.organizationId],
    queryFn: () => api.get(`/api/organizations/${user.organizationId}/members`).then(r => r.data),
  })

  const inviteMutation = useMutation({
    mutationFn: (inviteData) => api.post(`/api/organizations/${user.organizationId}/invitations`, inviteData),
    onSuccess: () => {
      queryClient.invalidateQueries(['team-members'])
      setShowInviteModal(false)
    },
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, role }) => api.put(`/api/memberships/${memberId}`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries(['team-members'])
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: (memberId) => api.delete(`/api/memberships/${memberId}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['team-members'])
    },
  })

  if (!permissions.canManageOrgUsers) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">Access Denied</h3>
          <p className="mt-2 text-sm text-gray-500">
            You don't have permission to manage team members.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Team Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your organization's team members and their roles.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
          >
            <PlusIcon className="-ml-1 mr-2 h-4 w-4" />
            Invite Member
          </button>
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                    Member
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Role
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Joined
                  </th>
                  <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {teamMembers?.map((member) => (
                  <tr key={member.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-indigo-800">
                              {member.user.firstName[0]}{member.user.lastName[0]}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">
                            {member.user.firstName} {member.user.lastName}
                          </div>
                          <div className="text-gray-500">{member.user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <RoleSelector
                        memberId={member.id}
                        currentRole={member.role}
                        onUpdate={updateRoleMutation.mutate}
                        disabled={updateRoleMutation.isLoading}
                        canEdit={member.user.id !== user.id} // Can't change own role
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        member.user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {member.user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      {member.user.id !== user.id && (
                        <button
                          onClick={() => removeMemberMutation.mutate(member.id)}
                          disabled={removeMemberMutation.isLoading}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showInviteModal && (
        <InviteMemberModal
          onClose={() => setShowInviteModal(false)}
          onInvite={inviteMutation.mutate}
          isLoading={inviteMutation.isLoading}
        />
      )}
    </div>
  )
}

const RoleSelector = ({ memberId, currentRole, onUpdate, disabled, canEdit }) => {
  if (!canEdit) {
    return <span className="text-sm text-gray-900">{currentRole}</span>
  }

  return (
    <select
      value={currentRole}
      onChange={(e) => onUpdate({ memberId, role: e.target.value })}
      disabled={disabled}
      className="text-sm border-gray-300 rounded-md focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-50"
    >
      <option value="VIEWER">Viewer</option>
      <option value="MEMBER">Member</option>
      <option value="ADMIN">Admin</option>
      <option value="OWNER">Owner</option>
    </select>
  )
}

export default TeamManagement
```

---

## ⚡ **Phase 3: Core Feature Enhancement**

### **B3.1: Enhanced Connections Management**

**Update `src/pages/Connections/ConnectionsList.jsx`**:
```javascript
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  PlusIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline'
import { useAuth } from '@/context/AuthContext'
import { usePermissions } from '@/context/PermissionContext'
import api from '@/services/api'

const ConnectionsList = () => {
  const { user } = useAuth()
  const permissions = usePermissions()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)

  const { data: connections, isLoading } = useQuery({
    queryKey: ['connections', user?.organizationId],
    queryFn: () => api.get('/api/connections').then(r => r.data),
  })

  const testConnectionMutation = useMutation({
    mutationFn: (connectionId) => api.post(`/api/connections/${connectionId}/test`),
    onSuccess: () => {
      queryClient.invalidateQueries(['connections'])
    },
  })

  const toggleConnectionMutation = useMutation({
    mutationFn: ({ connectionId, isActive }) => 
      api.patch(`/api/connections/${connectionId}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries(['connections'])
    },
  })

  if (isLoading) {
    return <div className="p-6">Loading connections...</div>
  }

  return (
    <div className="p-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Database Connections</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your database connections for workflows and integrations.
          </p>
        </div>
        {permissions.canManageConnections && (
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <PlusIcon className="-ml-1 mr-2 h-4 w-4" />
              Add Connection
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {connections?.map((connection) => (
          <ConnectionCard
            key={connection.id}
            connection={connection}
            onTest={() => testConnectionMutation.mutate(connection.id)}
            onToggle={(isActive) => toggleConnectionMutation.mutate({ 
              connectionId: connection.id, 
              isActive 
            })}
            canManage={permissions.canManageConnections}
            isTestingConnection={testConnectionMutation.isLoading}
            isToggling={toggleConnectionMutation.isLoading}
          />
        ))}
      </div>

      {showCreateModal && (
        <CreateConnectionModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            queryClient.invalidateQueries(['connections'])
          }}
        />
      )}
    </div>
  )
}

const ConnectionCard = ({ 
  connection, 
  onTest, 
  onToggle, 
  canManage, 
  isTestingConnection, 
  isToggling 
}) => {
  const getStatusIcon = () => {
    switch (connection.status) {
      case 'connected':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'disconnected':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
      default:
        return <XCircleIcon className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusColor = () => {
    switch (connection.status) {
      case 'connected':
        return 'bg-green-100 text-green-800'
      case 'disconnected':
        return 'bg-red-100 text-red-800'
      case 'error':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {getStatusIcon()}
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-lg font-medium text-gray-900">{connection.name}</h3>
            <p className="text-sm text-gray-500">{connection.type}</p>
          </div>
          <div className="flex-shrink-0">
            <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor()}`}>
              {connection.status}
            </span>
          </div>
        </div>

        <div className="mt-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-gray-500">Host</dt>
              <dd className="text-gray-900">{connection.host}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Database</dt>
              <dd className="text-gray-900">{connection.database}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Last Tested</dt>
              <dd className="text-gray-900">
                {connection.lastTestedAt 
                  ? new Date(connection.lastTestedAt).toLocaleDateString()
                  : 'Never'
                }
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Active</dt>
              <dd className="text-gray-900">
                {connection.isActive ? 'Yes' : 'No'}
              </dd>
            </div>
          </dl>
        </div>

        {canManage && (
          <div className="mt-6 flex justify-between">
            <button
              onClick={onTest}
              disabled={isTestingConnection}
              className="text-indigo-600 hover:text-indigo-900 text-sm font-medium disabled:opacity-50"
            >
              {isTestingConnection ? 'Testing...' : 'Test Connection'}
            </button>
            
            <button
              onClick={() => onToggle(!connection.isActive)}
              disabled={isToggling}
              className={`text-sm font-medium disabled:opacity-50 ${
                connection.isActive 
                  ? 'text-red-600 hover:text-red-900' 
                  : 'text-green-600 hover:text-green-900'
              }`}
            >
              {isToggling 
                ? 'Updating...' 
                : connection.isActive 
                  ? 'Disable' 
                  : 'Enable'
              }
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ConnectionsList
```

### **B3.2: Enhanced Workflow Management**

**Update `src/pages/Workflows/WorkflowsList.jsx`**:
```javascript
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  PlusIcon, 
  PlayIcon, 
  PauseIcon, 
  PencilIcon,
  DocumentDuplicateIcon,
  TrashIcon 
} from '@heroicons/react/24/outline'
import { useAuth } from '@/context/AuthContext'
import { usePermissions } from '@/context/PermissionContext'
import { useNavigate } from 'react-router-dom'
import api from '@/services/api'

const WorkflowsList = () => {
  const { user } = useAuth()
  const permissions = usePermissions()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('all')

  const { data: workflows, isLoading } = useQuery({
    queryKey: ['workflows', user?.organizationId, filter],
    queryFn: () => api.get('/api/workflows', { params: { filter } }).then(r => r.data),
  })

  const executeWorkflowMutation = useMutation({
    mutationFn: (workflowId) => api.post(`/api/workflows/${workflowId}/execute`),
    onSuccess: () => {
      queryClient.invalidateQueries(['workflows'])
    },
  })

  const toggleWorkflowMutation = useMutation({
    mutationFn: ({ workflowId, isActive }) => 
      api.patch(`/api/workflows/${workflowId}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries(['workflows'])
    },
  })

  const duplicateWorkflowMutation = useMutation({
    mutationFn: (workflowId) => api.post(`/api/workflows/${workflowId}/duplicate`),
    onSuccess: () => {
      queryClient.invalidateQueries(['workflows'])
    },
  })

  if (isLoading) {
    return <div className="p-6">Loading workflows...</div>
  }

  return (
    <div className="p-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Workflows</h1>
          <p className="mt-2 text-sm text-gray-700">
            Create and manage automated workflows for your organization.
          </p>
        </div>
        {permissions.canManageWorkflows && (
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              onClick={() => navigate('/workflows/new')}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <PlusIcon className="-ml-1 mr-2 h-4 w-4" />
              Create Workflow
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 flex space-x-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-sm"
        >
          <option value="all">All Workflows</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="scheduled">Scheduled</option>
          <option value="manual">Manual</option>
        </select>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {workflows?.map((workflow) => (
          <WorkflowCard
            key={workflow.id}
            workflow={workflow}
            onExecute={() => executeWorkflowMutation.mutate(workflow.id)}
            onToggle={(isActive) => toggleWorkflowMutation.mutate({ 
              workflowId: workflow.id, 
              isActive 
            })}
            onDuplicate={() => duplicateWorkflowMutation.mutate(workflow.id)}
            onEdit={() => navigate(`/workflows/${workflow.id}/edit`)}
            canManage={permissions.canManageWorkflows}
            isExecuting={executeWorkflowMutation.isLoading}
            isToggling={toggleWorkflowMutation.isLoading}
            isDuplicating={duplicateWorkflowMutation.isLoading}
          />
        ))}
      </div>

      {workflows?.length === 0 && (
        <div className="text-center mt-12">
          <h3 className="text-lg font-medium text-gray-900">No workflows found</h3>
          <p className="mt-2 text-sm text-gray-500">
            Get started by creating your first automated workflow.
          </p>
          {permissions.canManageWorkflows && (
            <button
              onClick={() => navigate('/workflows/new')}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PlusIcon className="-ml-1 mr-2 h-4 w-4" />
              Create Your First Workflow
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const WorkflowCard = ({ 
  workflow, 
  onExecute, 
  onToggle, 
  onDuplicate, 
  onEdit, 
  canManage, 
  isExecuting, 
  isToggling, 
  isDuplicating 
}) => {
  const getStatusColor = () => {
    if (!workflow.isActive) return 'bg-gray-100 text-gray-800'
    
    switch (workflow.lastRunStatus) {
      case 'success':
        return 'bg-green-100 text-green-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      case 'running':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900 truncate">
              {workflow.name}
            </h3>
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">
              {workflow.description || 'No description provided'}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0">
            <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor()}`}>
              {workflow.isActive ? workflow.lastRunStatus || 'Ready' : 'Inactive'}
            </span>
          </div>
        </div>

        <div className="mt-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-gray-500">Trigger</dt>
              <dd className="text-gray-900">{workflow.triggerType}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Steps</dt>
              <dd className="text-gray-900">{workflow.stepCount || 0}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Last Run</dt>
              <dd className="text-gray-900">
                {workflow.lastRunAt 
                  ? new Date(workflow.lastRunAt).toLocaleDateString()
                  : 'Never'
                }
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Success Rate</dt>
              <dd className="text-gray-900">
                {workflow.successRate ? `${workflow.successRate}%` : 'N/A'}
              </dd>
            </div>
          </dl>
        </div>

        {canManage && (
          <div className="mt-6 flex justify-between items-center">
            <div className="flex space-x-2">
              <button
                onClick={onExecute}
                disabled={isExecuting || !workflow.isActive}
                className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Execute workflow"
              >
                <PlayIcon className="h-4 w-4" />
              </button>
              
              <button
                onClick={onEdit}
                className="text-gray-600 hover:text-gray-900"
                title="Edit workflow"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
              
              <button
                onClick={onDuplicate}
                disabled={isDuplicating}
                className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                title="Duplicate workflow"
              >
                <DocumentDuplicateIcon className="h-4 w-4" />
              </button>
            </div>
            
            <button
              onClick={() => onToggle(!workflow.isActive)}
              disabled={isToggling}
              className={`text-sm font-medium disabled:opacity-50 ${
                workflow.isActive 
                  ? 'text-red-600 hover:text-red-900' 
                  : 'text-green-600 hover:text-green-900'
              }`}
            >
              {isToggling 
                ? 'Updating...' 
                : workflow.isActive 
                  ? 'Disable' 
                  : 'Enable'
              }
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default WorkflowsList
```

---

## 🎨 **Phase 4: Customer User Experience**

### **B4.1: Improved Dashboard with Guided Tours**

**Create `src/components/GuidedTour/GuidedTour.jsx`**:
```javascript
import React, { useState, useEffect } from 'react'
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

const GuidedTour = ({ isOpen, onClose, steps, currentStep, onNext, onPrevious, onSkip }) => {
  if (!isOpen) return null

  const step = steps[currentStep]

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" />
      
      {/* Tour tooltip */}
      <div 
        className="absolute bg-white rounded-lg shadow-lg p-6 max-w-sm z-10"
        style={{
          top: step.position.top,
          left: step.position.left,
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-500">
            Step {currentStep + 1} of {steps.length}
          </span>
          <button
            onClick={onSkip}
            className="text-sm text-indigo-600 hover:text-indigo-700"
          >
            Skip tour
          </button>
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {step.title}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {step.description}
        </p>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={onPrevious}
            disabled={currentStep === 0}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeftIcon className="h-4 w-4 mr-1" />
            Previous
          </button>

          {currentStep < steps.length - 1 ? (
            <button
              onClick={onNext}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700"
            >
              Next
            </button>
          ) : (
            <button
              onClick={onClose}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700"
            >
              Finish
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export const useGuidedTour = (tourKey, steps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    const hasSeenTour = localStorage.getItem(`tour_${tourKey}_completed`)
    if (!hasSeenTour) {
      setIsOpen(true)
    }
  }, [tourKey])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    localStorage.setItem(`tour_${tourKey}_completed`, 'true')
  }

  const handleSkip = () => {
    handleClose()
  }

  return {
    isOpen,
    currentStep,
    onNext: handleNext,
    onPrevious: handlePrevious,
    onClose: handleClose,
    onSkip: handleSkip,
  }
}

export default GuidedTour
```

**Update `src/pages/Dashboard.jsx`** with guided tour:
```javascript
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useSearchParams } from 'react-router-dom'
import GuidedTour, { useGuidedTour } from '@/components/GuidedTour/GuidedTour'
import api from '@/services/api'

const Dashboard = () => {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const isWelcome = searchParams.get('welcome') === 'true'

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard', user?.organizationId],
    queryFn: () => api.get('/api/dashboard').then(r => r.data),
  })

  const tourSteps = [
    {
      title: 'Welcome to Your Dashboard!',
      description: 'This is your central hub where you can see all your organization\'s activity and key metrics.',
      position: { top: '100px', left: '100px' }
    },
    {
      title: 'Quick Stats Overview',
      description: 'These cards show your current connections, active workflows, and recent activity at a glance.',
      position: { top: '200px', left: '100px' }
    },
    {
      title: 'Navigation Menu',
      description: 'Use the sidebar to navigate between different sections like Connections, Workflows, and Team settings.',
      position: { top: '150px', left: '300px' }
    },
    {
      title: 'Get Started',
      description: 'Ready to create your first workflow? Click on the "Create Workflow" button to begin!',
      position: { top: '300px', left: '200px' }
    },
  ]

  const tour = useGuidedTour('dashboard', tourSteps)

  // Show tour if this is a welcome visit
  React.useEffect(() => {
    if (isWelcome) {
      localStorage.removeItem('tour_dashboard_completed')
      window.location.reload()
    }
  }, [isWelcome])

  if (isLoading) {
    return <div className="p-6">Loading dashboard...</div>
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-gray-600">
          Here's what's happening with your organization today.
        </p>
      </div>

      {/* Dashboard stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Active Connections"
          value={dashboardData?.connections?.active || 0}
          total={dashboardData?.connections?.total || 0}
          icon="database"
          color="blue"
        />
        <StatsCard
          title="Running Workflows"
          value={dashboardData?.workflows?.running || 0}
          total={dashboardData?.workflows?.total || 0}
          icon="workflow"
          color="green"
        />
        <StatsCard
          title="Team Members"
          value={dashboardData?.team?.active || 0}
          total={dashboardData?.team?.total || 0}
          icon="users"
          color="purple"
        />
        <StatsCard
          title="This Month's Executions"
          value={dashboardData?.executions?.thisMonth || 0}
          change={dashboardData?.executions?.changePercent || 0}
          icon="activity"
          color="orange"
        />
      </div>

      {/* Recent activity and quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivityPanel />
        <QuickActionsPanel />
      </div>

      {/* Guided tour */}
      <GuidedTour
        isOpen={tour.isOpen}
        onClose={tour.onClose}
        steps={tourSteps}
        currentStep={tour.currentStep}
        onNext={tour.onNext}
        onPrevious={tour.onPrevious}
        onSkip={tour.onSkip}
      />
    </div>
  )
}

// Additional components...
export default Dashboard
```

---

## 🔒 **Phase 5: Performance & Security**

### **B5.1: Database Query Optimization & Tenant Isolation**

**Create `server/middleware/tenantIsolation.js`**:
```javascript
const { PrismaClient } = require('@prisma/client')
const { logger } = require('../utils/logger')

// Middleware to ensure all database queries are organization-scoped
const enforceTenantIsolation = (req, res, next) => {
  // Skip for non-authenticated routes
  if (!req.user || !req.user.organizationId) {
    return next()
  }

  // Store original Prisma client
  const originalPrisma = req.prisma || global.prisma

  // Create a wrapper that automatically adds organization filters
  req.prisma = new Proxy(originalPrisma, {
    get(target, prop) {
      const originalMethod = target[prop]
      
      // Models that should be organization-scoped
      const scopedModels = [
        'connection',
        'service', 
        'application',
        'workflow',
        'workflowRun',
        'apiKey',
        'endpoint',
        'usageMetric'
      ]

      if (scopedModels.includes(prop)) {
        return new Proxy(originalMethod, {
          get(modelTarget, modelProp) {
            const originalModelMethod = modelTarget[modelProp]

            // Methods that need organization filtering
            const queryMethods = [
              'findMany',
              'findFirst', 
              'findUnique',
              'count',
              'aggregate',
              'update',
              'updateMany',
              'delete',
              'deleteMany'
            ]

            if (queryMethods.includes(modelProp)) {
              return function(args = {}) {
                // Automatically add organization filter
                const modifiedArgs = {
                  ...args,
                  where: {
                    organizationId: req.user.organizationId,
                    ...args.where,
                  },
                }

                logger.debug('Tenant-scoped query', {
                  model: prop,
                  method: modelProp,
                  organizationId: req.user.organizationId,
                  originalWhere: args.where,
                  modifiedWhere: modifiedArgs.where,
                })

                return originalModelMethod.call(modelTarget, modifiedArgs)
              }
            }

            // For create operations, automatically add organizationId
            if (modelProp === 'create') {
              return function(args = {}) {
                const modifiedArgs = {
                  ...args,
                  data: {
                    organizationId: req.user.organizationId,
                    ...args.data,
                  },
                }

                logger.debug('Tenant-scoped create', {
                  model: prop,
                  organizationId: req.user.organizationId,
                  originalData: args.data,
                  modifiedData: modifiedArgs.data,
                })

                return originalModelMethod.call(modelTarget, modifiedArgs)
              }
            }

            return originalModelMethod
          }
        })
      }

      return originalMethod
    }
  })

  next()
}

module.exports = { enforceTenantIsolation }
```

### **B5.2: Performance Optimization**

**Create `server/middleware/performanceOptimization.js`**:
```javascript
const compression = require('compression')
const { rateLimit } = require('express-rate-limit')
const { logger } = require('../utils/logger')

// Compression middleware for responses
const compressionMiddleware = compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false
    }
    return compression.filter(req, res)
  },
  level: 6,
  threshold: 1024,
})

// Rate limiting per organization
const createOrganizationRateLimit = (windowMs = 15 * 60 * 1000, max = 1000) => {
  return rateLimit({
    windowMs,
    max,
    keyGenerator: (req) => {
      // Rate limit by organization ID
      return req.user?.organizationId || req.ip
    },
    message: {
      error: 'Too many requests from your organization, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    onLimitReached: (req, res, options) => {
      logger.warn('Rate limit exceeded', {
        organizationId: req.user?.organizationId,
        ip: req.ip,
        path: req.path,
        method: req.method,
      })
    },
  })
}

// Database connection pooling optimization
const optimizeDatabaseQueries = (req, res, next) => {
  const startTime = Date.now()

  // Log slow queries
  const originalQuery = req.prisma?.$executeRaw
  if (originalQuery) {
    req.prisma.$executeRaw = async (...args) => {
      const queryStartTime = Date.now()
      const result = await originalQuery.apply(req.prisma, args)
      const queryDuration = Date.now() - queryStartTime

      if (queryDuration > 1000) { // Log queries slower than 1 second
        logger.warn('Slow database query detected', {
          duration: queryDuration,
          organizationId: req.user?.organizationId,
          path: req.path,
          method: req.method,
        })
      }

      return result
    }
  }

  // Log slow API responses
  res.on('finish', () => {
    const duration = Date.now() - startTime
    
    if (duration > 3000) { // Log responses slower than 3 seconds
      logger.warn('Slow API response detected', {
        duration,
        organizationId: req.user?.organizationId,
        path: req.path,
        method: req.method,
        statusCode: res.statusCode,
      })
    }
  })

  next()
}

// Caching middleware for expensive operations
const cacheExpensiveOperations = () => {
  const cache = new Map()
  const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next()
    }

    // Create cache key
    const cacheKey = `${req.user?.organizationId || 'anonymous'}:${req.originalUrl}`
    const cached = cache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      logger.debug('Cache hit', { cacheKey, path: req.path })
      return res.json(cached.data)
    }

    // Override res.json to cache the response
    const originalJson = res.json
    res.json = function(data) {
      // Cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
        })

        // Cleanup old cache entries
        if (cache.size > 1000) {
          const entries = Array.from(cache.entries())
          entries.slice(0, 100).forEach(([key]) => cache.delete(key))
        }
      }

      return originalJson.call(this, data)
    }

    next()
  }
}

module.exports = {
  compressionMiddleware,
  createOrganizationRateLimit,
  optimizeDatabaseQueries,
  cacheExpensiveOperations,
}
```

### **B5.3: Error Handling & Monitoring**

**Create `server/middleware/errorHandler.js`**:
```javascript
const { logger } = require('../utils/logger')

// Global error handler
const globalErrorHandler = (err, req, res, next) => {
  // Log error details
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    organizationId: req.user?.organizationId,
    userId: req.user?.userId,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  })

  // Don't expose internal errors to customers
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({
      error: 'An internal server error occurred',
      code: 'INTERNAL_ERROR',
    })
  } else {
    res.status(500).json({
      error: err.message,
      stack: err.stack,
      code: 'INTERNAL_ERROR',
    })
  }
}

// 404 handler
const notFoundHandler = (req, res) => {
  logger.warn('Route not found', {
    path: req.path,
    method: req.method,
    organizationId: req.user?.organizationId,
    ip: req.ip,
  })

  res.status(404).json({
    error: 'Route not found',
    code: 'NOT_FOUND',
  })
}

// Validation error handler
const validationErrorHandler = (err, req, res, next) => {
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
    }))

    logger.info('Validation error', {
      errors,
      organizationId: req.user?.organizationId,
      path: req.path,
      method: req.method,
    })

    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors,
    })
  }

  next(err)
}

module.exports = {
  globalErrorHandler,
  notFoundHandler,
  validationErrorHandler,
}
```

---

## 🚀 **Production Deployment Configuration**

### **Environment Variables**
```env
# Customer App Production Environment
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://customer:password@db:5432/nectar_customer

# JWT
JWT_SECRET=your-customer-app-jwt-secret-here
JWT_EXPIRES_IN=24h

# Security
CORS_ORIGINS=https://app.nectar.com
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=your-sentry-dsn

# Email
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-sendgrid-key
FROM_EMAIL=noreply@nectar.com

# File Storage
STORAGE_PROVIDER=s3
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_BUCKET_NAME=nectar-customer-files
AWS_REGION=us-east-1
```

---

This comprehensive guide provides everything needed to refactor your existing nectar-api codebase into a clean, customer-focused SaaS application with enhanced features and proper organization-scoped security.