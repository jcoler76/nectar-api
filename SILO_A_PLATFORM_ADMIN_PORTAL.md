# SILO A: Platform Admin Portal Development Guide

## 🎯 **Overview**
Build a brand-new internal platform administration portal for cross-tenant monitoring, customer support, and system management. This application will be used exclusively by internal team members.

**Domain:** `admin.nectarstudio.ai`  
**Repository:** `nectar-admin-portal` (new)  
**Technology:** React 18 + TypeScript + Node.js + PostgreSQL  

---

## 📂 **Project Structure**

```
nectar-admin-portal/
├── 📁 admin-frontend/           # React TypeScript admin app
│   ├── 📁 src/
│   │   ├── 📁 components/       # Reusable UI components
│   │   ├── 📁 pages/           # Page-level components
│   │   ├── 📁 hooks/           # Custom React hooks
│   │   ├── 📁 services/        # API service functions
│   │   ├── 📁 store/           # State management (Zustand/Redux)
│   │   ├── 📁 types/           # TypeScript type definitions
│   │   ├── 📁 utils/           # Utility functions
│   │   └── 📁 assets/          # Images, icons, etc.
│   ├── 📁 public/
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── 📁 admin-backend/            # Node.js Express API
│   ├── 📁 src/
│   │   ├── 📁 controllers/     # Route handlers
│   │   ├── 📁 middleware/      # Custom middleware
│   │   ├── 📁 models/          # Database models (Prisma)
│   │   ├── 📁 routes/          # API routes
│   │   ├── 📁 services/        # Business logic
│   │   ├── 📁 utils/           # Utility functions
│   │   ├── 📁 types/           # TypeScript types
│   │   └── app.ts              # Express app setup
│   ├── 📁 prisma/
│   │   ├── schema.prisma
│   │   └── 📁 migrations/
│   ├── tsconfig.json
│   └── package.json
├── 📁 docker/                   # Docker configuration
├── 📁 docs/                     # Documentation
├── README.md
└── docker-compose.yml
```

---

## 🚀 **Phase 1: Project Setup & Foundation**

### **A1.1: Initialize Frontend Project**

```bash
# Create new Vite React TypeScript project
npm create vite@latest admin-frontend -- --template react-ts
cd admin-frontend

# Install core dependencies
npm install @tanstack/react-query axios react-router-dom
npm install @headlessui/react @heroicons/react
npm install tailwindcss @tailwindcss/forms @tailwindcss/typography
npm install zustand immer date-fns
npm install @types/node

# Install development dependencies
npm install -D @types/react @types/react-dom
npm install -D eslint @typescript-eslint/eslint-plugin
npm install -D prettier eslint-config-prettier
npm install -D @vitejs/plugin-react
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

**Frontend Configuration Files:**

**`vite.config.ts`**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:4001',
        changeOrigin: true,
      },
    },
  },
})
```

**`tailwind.config.js`**
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
```

### **A1.2: Initialize Backend Project**

```bash
# Create backend directory
mkdir admin-backend && cd admin-backend

# Initialize Node.js project
npm init -y

# Install core dependencies
npm install express cors helmet morgan compression
npm install prisma @prisma/client bcryptjs jsonwebtoken
npm install dotenv express-validator
npm install axios node-cron

# Install TypeScript dependencies
npm install -D typescript @types/node @types/express
npm install -D @types/cors @types/bcryptjs @types/jsonwebtoken
npm install -D ts-node nodemon concurrently
npm install -D jest @types/jest supertest @types/supertest
```

**Backend Configuration Files:**

**`tsconfig.json`**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**`package.json` scripts**
```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/app.ts",
    "build": "tsc",
    "start": "node dist/app.js",
    "test": "jest",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio"
  }
}
```

### **A1.3: Database Schema Design**

**`prisma/schema.prisma`**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Platform Admin Users (separate from customer users)
model PlatformAdmin {
  id                String    @id @default(uuid())
  email             String    @unique
  passwordHash      String
  firstName         String
  lastName          String
  role              AdminRole @default(ADMIN)
  isActive          Boolean   @default(true)
  lastLoginAt       DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  // Relations
  auditLogs         AdminAuditLog[]
  
  @@map("platform_admins")
}

enum AdminRole {
  SUPER_ADMIN
  ADMIN
  VIEWER
}

// Admin Audit Logging
model AdminAuditLog {
  id            String           @id @default(uuid())
  adminId       String
  action        String          // login, view_user, impersonate, config_change, etc.
  resource      String?         // user_id, organization_id, etc.
  details       Json?           // Additional context
  ipAddress     String
  userAgent     String?
  timestamp     DateTime        @default(now())
  
  // Relations
  admin         PlatformAdmin   @relation(fields: [adminId], references: [id])
  
  @@map("admin_audit_logs")
}

// System Configuration
model SystemConfig {
  id            String          @id @default(uuid())
  key           String          @unique
  value         Json
  description   String?
  updatedBy     String?
  updatedAt     DateTime        @updatedAt
  
  @@map("system_config")
}

// Platform Announcements
model PlatformAnnouncement {
  id            String          @id @default(uuid())
  title         String
  message       String
  type          AnnouncementType @default(INFO)
  targetAudience String         // 'all', 'customers', 'specific_orgs'
  targetOrgs    String[]        // Array of organization IDs
  isActive      Boolean         @default(true)
  scheduledFor  DateTime?
  expiresAt     DateTime?
  createdBy     String
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
  
  @@map("platform_announcements")
}

enum AnnouncementType {
  INFO
  WARNING
  MAINTENANCE
  FEATURE
}
```

---

## 🔐 **Phase 2: Authentication & Security**

### **A2.1: Admin Authentication Backend**

**`src/models/PlatformAdmin.ts`**
```typescript
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export interface CreateAdminData {
  email: string
  password: string
  firstName: string
  lastName: string
  role?: 'SUPER_ADMIN' | 'ADMIN' | 'VIEWER'
}

export class PlatformAdminModel {
  static async create(data: CreateAdminData) {
    const passwordHash = await bcrypt.hash(data.password, 12)
    
    return prisma.platformAdmin.create({
      data: {
        ...data,
        passwordHash,
        password: undefined,
      },
    })
  }

  static async authenticate(email: string, password: string) {
    const admin = await prisma.platformAdmin.findUnique({
      where: { email, isActive: true },
    })

    if (!admin || !await bcrypt.compare(password, admin.passwordHash)) {
      return null
    }

    // Update last login
    await prisma.platformAdmin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    })

    return admin
  }

  static generateToken(admin: any) {
    return jwt.sign(
      {
        adminId: admin.id,
        email: admin.email,
        role: admin.role,
        type: 'platform_admin',
      },
      process.env.ADMIN_JWT_SECRET!,
      { expiresIn: '8h' }
    )
  }
}
```

**`src/controllers/authController.ts`**
```typescript
import { Request, Response } from 'express'
import { PlatformAdminModel } from '@/models/PlatformAdmin'
import { AdminAuditLogger } from '@/services/auditService'

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body

      const admin = await PlatformAdminModel.authenticate(email, password)
      
      if (!admin) {
        await AdminAuditLogger.log({
          action: 'failed_login',
          details: { email },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        })
        
        return res.status(401).json({ error: 'Invalid credentials' })
      }

      const token = PlatformAdminModel.generateToken(admin)

      await AdminAuditLogger.log({
        adminId: admin.id,
        action: 'login',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      })

      res.json({
        token,
        admin: {
          id: admin.id,
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          role: admin.role,
        },
      })
    } catch (error) {
      console.error('Login error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      await AdminAuditLogger.log({
        adminId: req.admin.id,
        action: 'logout',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      })

      res.json({ message: 'Logged out successfully' })
    } catch (error) {
      console.error('Logout error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}
```

### **A2.2: Authentication Middleware**

**`src/middleware/adminAuth.ts`**
```typescript
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

declare global {
  namespace Express {
    interface Request {
      admin?: any
    }
  }
}

export const authenticateAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' })
    }

    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET!) as any
    
    if (decoded.type !== 'platform_admin') {
      return res.status(401).json({ error: 'Invalid token type' })
    }

    const admin = await prisma.platformAdmin.findUnique({
      where: { id: decoded.adminId, isActive: true },
    })

    if (!admin) {
      return res.status(401).json({ error: 'Admin not found' })
    }

    req.admin = admin
    next()
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' })
  }
}

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.admin?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Super admin access required' })
  }
  next()
}
```

### **A2.3: Frontend Authentication**

**`src/services/authService.ts`**
```typescript
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export interface LoginCredentials {
  email: string
  password: string
}

export interface AdminUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'VIEWER'
}

class AuthService {
  private token: string | null = localStorage.getItem('admin_token')

  constructor() {
    this.setupInterceptors()
  }

  private setupInterceptors() {
    axios.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`
      }
      return config
    })

    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.logout()
        }
        return Promise.reject(error)
      }
    )
  }

  async login(credentials: LoginCredentials): Promise<AdminUser> {
    const response = await axios.post(`${API_BASE}/auth/login`, credentials)
    
    this.token = response.data.token
    localStorage.setItem('admin_token', this.token)
    
    return response.data.admin
  }

  logout() {
    this.token = null
    localStorage.removeItem('admin_token')
    window.location.href = '/login'
  }

  getToken(): string | null {
    return this.token
  }

  isAuthenticated(): boolean {
    return !!this.token
  }
}

export default new AuthService()
```

**`src/hooks/useAuth.ts`**
```typescript
import { create } from 'zustand'
import { AdminUser } from '@/services/authService'

interface AuthState {
  user: AdminUser | null
  isLoading: boolean
  setUser: (user: AdminUser | null) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
}))

export const useAuth = () => {
  const { user, isLoading, setUser, setLoading } = useAuthStore()
  
  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    setUser,
    setLoading,
  }
}
```

---

## 📊 **Phase 3: Cross-Tenant Monitoring Dashboard**

### **A3.1: Dashboard Backend Services**

**`src/services/analyticsService.ts`**
```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export class AnalyticsService {
  static async getOrganizationStats() {
    const [totalOrgs, activeOrgs, trialOrgs] = await Promise.all([
      prisma.organization.count(),
      prisma.organization.count({ where: { isActive: true } }),
      prisma.subscription.count({ where: { status: 'TRIALING' } }),
    ])

    return {
      total: totalOrgs,
      active: activeOrgs,
      trials: trialOrgs,
      paid: activeOrgs - trialOrgs,
    }
  }

  static async getUserStats() {
    const [totalUsers, activeUsers, last30Days] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ])

    return {
      total: totalUsers,
      active: activeUsers,
      newThisMonth: last30Days,
    }
  }

  static async getSystemHealth() {
    // Check database connection
    const dbStatus = await this.checkDatabase()
    
    // Get recent error rates
    const errorRate = await this.getErrorRate()
    
    // Check response times
    const responseTime = await this.getAverageResponseTime()

    return {
      database: dbStatus,
      errorRate,
      responseTime,
      status: dbStatus && errorRate < 5 && responseTime < 1000 ? 'healthy' : 'warning',
    }
  }

  private static async checkDatabase(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`
      return true
    } catch {
      return false
    }
  }

  private static async getErrorRate(): Promise<number> {
    // Implementation would check error logs from last hour
    return 0.5 // placeholder
  }

  private static async getAverageResponseTime(): Promise<number> {
    // Implementation would check response time metrics
    return 250 // placeholder
  }

  static async getRecentActivity(limit = 20) {
    return prisma.adminAuditLog.findMany({
      take: limit,
      orderBy: { timestamp: 'desc' },
      include: {
        admin: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })
  }

  static async getOrganizationActivity(organizationId: string, limit = 50) {
    // This would need to query the shared customer database
    // Implementation depends on your activity logging structure
    return []
  }
}
```

### **A3.2: Dashboard Frontend Components**

**`src/components/Dashboard/StatsCard.tsx`**
```typescript
import React from 'react'

interface StatsCardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ReactNode
  color?: 'blue' | 'green' | 'yellow' | 'red'
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  icon,
  color = 'blue',
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
  }

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`inline-flex items-center justify-center p-3 rounded-md ${colorClasses[color]}`}>
              {icon}
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">{value}</div>
                {change !== undefined && (
                  <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                    change >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {change > 0 ? '+' : ''}{change}%
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
```

**`src/pages/Dashboard.tsx`**
```typescript
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { StatsCard } from '@/components/Dashboard/StatsCard'
import { UsersIcon, BuildingOfficeIcon, ChartBarIcon, CpuChipIcon } from '@heroicons/react/24/outline'
import axios from 'axios'

const Dashboard: React.FC = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [orgs, users, health] = await Promise.all([
        axios.get('/api/analytics/organizations').then(r => r.data),
        axios.get('/api/analytics/users').then(r => r.data),
        axios.get('/api/analytics/health').then(r => r.data),
      ])
      return { orgs, users, health }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading dashboard...</div>
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Platform Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Organizations"
          value={stats?.orgs.total || 0}
          icon={<BuildingOfficeIcon className="h-6 w-6" />}
          color="blue"
        />
        <StatsCard
          title="Active Users"
          value={stats?.users.active || 0}
          icon={<UsersIcon className="h-6 w-6" />}
          color="green"
        />
        <StatsCard
          title="Trial Organizations"
          value={stats?.orgs.trials || 0}
          icon={<ChartBarIcon className="h-6 w-6" />}
          color="yellow"
        />
        <StatsCard
          title="System Health"
          value={stats?.health.status === 'healthy' ? 'Healthy' : 'Warning'}
          icon={<CpuChipIcon className="h-6 w-6" />}
          color={stats?.health.status === 'healthy' ? 'green' : 'yellow'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivityPanel />
        <SystemHealthPanel health={stats?.health} />
      </div>
    </div>
  )
}

const RecentActivityPanel: React.FC = () => {
  const { data: activity } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: () => axios.get('/api/analytics/activity').then(r => r.data),
    refetchInterval: 15000,
  })

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6 border-b">
        <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
      </div>
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {activity?.map((item: any, index: number) => (
          <div key={index} className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-900">
                {item.admin.firstName} {item.admin.lastName} {item.action}
              </div>
              <div className="text-xs text-gray-500">
                {new Date(item.timestamp).toLocaleTimeString()}
              </div>
            </div>
            {item.resource && (
              <div className="text-xs text-gray-500 mt-1">
                Resource: {item.resource}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const SystemHealthPanel: React.FC<{ health: any }> = ({ health }) => {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6 border-b">
        <h3 className="text-lg font-medium text-gray-900">System Health</h3>
      </div>
      <div className="p-6">
        <dl className="space-y-4">
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Database</dt>
            <dd className={`text-sm font-medium ${health?.database ? 'text-green-600' : 'text-red-600'}`}>
              {health?.database ? 'Connected' : 'Disconnected'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Error Rate</dt>
            <dd className="text-sm font-medium text-gray-900">
              {health?.errorRate}%
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Response Time</dt>
            <dd className="text-sm font-medium text-gray-900">
              {health?.responseTime}ms
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

export default Dashboard
```

---

## 🛠️ **Phase 4: Customer Support Tools**

### **A4.1: Organization Management**

**`src/pages/Organizations.tsx`**
```typescript
import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MagnifyingGlassIcon, EyeIcon, PencilIcon } from '@heroicons/react/24/outline'
import axios from 'axios'

const Organizations: React.FC = () => {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const { data: organizations, isLoading } = useQuery({
    queryKey: ['organizations', search, filter],
    queryFn: () => axios.get('/api/organizations', {
      params: { search, filter }
    }).then(r => r.data),
  })

  return (
    <div className="p-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Organizations</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage customer organizations and their settings.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search organizations..."
            className="block w-full rounded-md border-gray-300 pl-11 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <select
          className="rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All Organizations</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                    Organization
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Plan
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Users
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Created
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {organizations?.map((org: any) => (
                  <tr key={org.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                      <div className="flex items-center">
                        <div>
                          <div className="font-medium text-gray-900">{org.name}</div>
                          <div className="text-gray-500">{org.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        org.subscription?.plan === 'ENTERPRISE' ? 'bg-green-100 text-green-800' :
                        org.subscription?.plan === 'PRO' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {org.subscription?.plan || 'Free'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {org._count?.memberships || 0}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        org.subscription?.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                        org.subscription?.status === 'TRIALING' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {org.subscription?.status || 'Unknown'}
                      </span>
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium">
                      <button className="text-indigo-600 hover:text-indigo-900 mr-4">
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button className="text-indigo-600 hover:text-indigo-900">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Organizations
```

### **A4.2: User Impersonation System**

**`src/services/impersonationService.ts`**
```typescript
import axios from 'axios'

export class ImpersonationService {
  static async startImpersonation(userId: string) {
    const response = await axios.post('/api/impersonation/start', { userId })
    
    // Store impersonation token
    localStorage.setItem('impersonation_token', response.data.token)
    localStorage.setItem('original_admin_token', localStorage.getItem('admin_token') || '')
    
    return response.data
  }

  static async endImpersonation() {
    await axios.post('/api/impersonation/end')
    
    // Restore original admin token
    const originalToken = localStorage.getItem('original_admin_token')
    if (originalToken) {
      localStorage.setItem('admin_token', originalToken)
    }
    
    localStorage.removeItem('impersonation_token')
    localStorage.removeItem('original_admin_token')
  }

  static isImpersonating(): boolean {
    return !!localStorage.getItem('impersonation_token')
  }

  static getImpersonationData() {
    const token = localStorage.getItem('impersonation_token')
    if (!token) return null

    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return {
        userId: payload.userId,
        organizationId: payload.organizationId,
        impersonatedBy: payload.impersonatedBy,
      }
    } catch {
      return null
    }
  }
}
```

---

## ⚙️ **Phase 5: Platform Configuration**

### **A5.1: System Configuration Management**

**`src/pages/Configuration.tsx`**
```typescript
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Switch } from '@headlessui/react'
import axios from 'axios'

const Configuration: React.FC = () => {
  const queryClient = useQueryClient()

  const { data: config } = useQuery({
    queryKey: ['system-config'],
    queryFn: () => axios.get('/api/config').then(r => r.data),
  })

  const updateConfigMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: any }) =>
      axios.put(`/api/config/${key}`, { value }),
    onSuccess: () => {
      queryClient.invalidateQueries(['system-config'])
    },
  })

  const handleToggle = (key: string, enabled: boolean) => {
    updateConfigMutation.mutate({ key, value: enabled })
  }

  const configSections = [
    {
      title: 'User Registration',
      configs: [
        {
          key: 'allow_user_registration',
          label: 'Allow User Registration',
          description: 'Allow new users to register for accounts',
          type: 'boolean',
        },
        {
          key: 'require_email_verification',
          label: 'Require Email Verification',
          description: 'Require users to verify their email before accessing the platform',
          type: 'boolean',
        },
      ],
    },
    {
      title: 'Rate Limiting',
      configs: [
        {
          key: 'api_rate_limit_per_minute',
          label: 'API Rate Limit (per minute)',
          description: 'Maximum API requests per minute per user',
          type: 'number',
        },
        {
          key: 'workflow_execution_limit',
          label: 'Workflow Execution Limit',
          description: 'Maximum concurrent workflow executions per organization',
          type: 'number',
        },
      ],
    },
  ]

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Platform Configuration</h1>

      <div className="space-y-8">
        {configSections.map((section) => (
          <div key={section.title} className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">{section.title}</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {section.configs.map((configItem) => (
                <ConfigItem
                  key={configItem.key}
                  config={configItem}
                  value={config?.[configItem.key]}
                  onUpdate={(value) => updateConfigMutation.mutate({ key: configItem.key, value })}
                  isUpdating={updateConfigMutation.isLoading}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface ConfigItemProps {
  config: {
    key: string
    label: string
    description: string
    type: 'boolean' | 'number' | 'string'
  }
  value: any
  onUpdate: (value: any) => void
  isUpdating: boolean
}

const ConfigItem: React.FC<ConfigItemProps> = ({ config, value, onUpdate, isUpdating }) => {
  const [localValue, setLocalValue] = useState(value)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdate(localValue)
  }

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900">{config.label}</h4>
          <p className="text-sm text-gray-500">{config.description}</p>
        </div>
        <div className="ml-6">
          {config.type === 'boolean' ? (
            <Switch
              checked={value || false}
              onChange={(checked) => onUpdate(checked)}
              disabled={isUpdating}
              className={`${
                value ? 'bg-indigo-600' : 'bg-gray-200'
              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50`}
            >
              <span
                className={`${
                  value ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </Switch>
          ) : (
            <form onSubmit={handleSubmit} className="flex items-center space-x-2">
              <input
                type={config.type}
                value={localValue || ''}
                onChange={(e) => setLocalValue(
                  config.type === 'number' ? parseInt(e.target.value) : e.target.value
                )}
                className="block w-20 rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                disabled={isUpdating}
              />
              <button
                type="submit"
                disabled={isUpdating || localValue === value}
                className="rounded bg-indigo-600 px-2 py-1 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                Save
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default Configuration
```

---

## 🚀 **Deployment & Production Setup**

### **Docker Configuration**

**`docker-compose.yml`**
```yaml
version: '3.8'

services:
  admin-frontend:
    build:
      context: ./admin-frontend
      dockerfile: Dockerfile
    ports:
      - "3001:80"
    environment:
      - VITE_API_URL=http://admin-backend:4001/api
    depends_on:
      - admin-backend

  admin-backend:
    build:
      context: ./admin-backend
      dockerfile: Dockerfile
    ports:
      - "4001:4001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://admin:password@postgres:5432/nectar_admin
      - ADMIN_JWT_SECRET=your-super-secure-secret
      - CUSTOMER_DB_URL=postgresql://customer:password@postgres:5432/nectar_customer
    depends_on:
      - postgres
    volumes:
      - ./admin-backend/uploads:/app/uploads

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_USER=admin
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=nectar_admin
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

### **Environment Variables**

**`admin-backend/.env.production`**
```env
NODE_ENV=production
PORT=4001

# Database
DATABASE_URL=postgresql://admin:password@localhost:5432/nectar_admin
CUSTOMER_DATABASE_URL=postgresql://customer:password@localhost:5432/nectar_customer

# JWT
ADMIN_JWT_SECRET=your-super-secure-admin-jwt-secret-here
JWT_EXPIRES_IN=8h

# Security
CORS_ORIGINS=https://admin.nectarstudio.ai
BCRYPT_ROUNDS=12

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=your-sentry-dsn-here

# Email (for notifications)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-sendgrid-key
FROM_EMAIL=admin.nectarstudio.ai
```

---

## 📚 **Additional Documentation**

### **API Documentation Structure**
Create OpenAPI/Swagger documentation for all admin endpoints:
- Authentication endpoints
- Analytics and reporting
- Organization management
- User impersonation
- Configuration management

### **Testing Strategy**
- Unit tests for all service functions
- Integration tests for API endpoints
- E2E tests for critical admin workflows
- Load testing for dashboard queries

### **Security Checklist**
- [ ] JWT tokens use secure secrets
- [ ] All admin actions are logged
- [ ] Rate limiting on all endpoints
- [ ] Input validation on all forms
- [ ] HTTPS enforced in production
- [ ] Database connections encrypted
- [ ] Sensitive data encrypted at rest
- [ ] Regular security audits scheduled

---

This comprehensive guide provides everything needed to build a professional platform admin portal. The structure is modular, secure, and scalable for your growing platform needs.