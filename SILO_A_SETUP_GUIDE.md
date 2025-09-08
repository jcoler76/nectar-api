# Platform Admin Portal Setup Guide (Silo A)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- PostgreSQL 14+ (shared database)
- Git
- Docker (optional for containerized development)

### 1. Create New Repository
```bash
mkdir nectar-admin-portal
cd nectar-admin-portal
git init
git remote add origin <your-admin-portal-repo>
```

### 2. Initialize React + TypeScript Project
```bash
# Using Vite for fast development
npm create vite@latest . -- --template react-ts
npm install

# Essential dependencies
npm install @tanstack/react-query axios react-router-dom
npm install @headlessui/react @heroicons/react tailwindcss
npm install jwt-decode date-fns recharts

# Development dependencies
npm install -D @types/node eslint-config-prettier prettier
npm install -D @testing-library/react @testing-library/jest-dom vitest jsdom
```

### 3. Backend Setup
```bash
mkdir admin-backend
cd admin-backend
npm init -y

# Core dependencies
npm install fastify @fastify/cors @fastify/jwt @fastify/env
npm install prisma @prisma/client bcryptjs jsonwebtoken
npm install winston compression helmet

# Development dependencies
npm install -D @types/node typescript ts-node nodemon
npm install -D jest @types/jest supertest @types/supertest
```

### 4. Database Configuration
```bash
# In admin-backend directory
npx prisma init

# Update .env
echo "DATABASE_URL='postgresql://admin_user:password@localhost:5432/nectar_shared'" > .env
echo "ADMIN_JWT_SECRET='admin-super-secret-key'" >> .env
echo "NODE_ENV='development'" >> .env
```

### 5. Project Structure
```
nectar-admin-portal/
├── admin-frontend/          # React admin app
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Admin portal pages
│   │   ├── services/       # API service layer
│   │   ├── hooks/          # Custom React hooks
│   │   ├── types/          # TypeScript definitions
│   │   └── utils/          # Utility functions
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
├── admin-backend/          # Node.js admin API
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── middleware/     # Auth and validation
│   │   ├── services/       # Business logic
│   │   ├── types/          # TypeScript definitions
│   │   └── utils/          # Helper functions
│   ├── prisma/            # Database schema
│   ├── tests/             # Test files
│   └── package.json
└── docker-compose.yml     # Development environment
```

## 🔧 Configuration Files

### Frontend Vite Config (`admin-frontend/vite.config.ts`)
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
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
    },
  },
})
```

### Backend Server Config (`admin-backend/src/server.ts`)
```typescript
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'

const server = Fastify({ logger: true })

// Register plugins
await server.register(cors, {
  origin: ['http://localhost:3001', 'https://admin.nectarstudio.ai']
})

await server.register(jwt, {
  secret: process.env.ADMIN_JWT_SECRET!
})

// Routes
server.register(import('./routes/auth'), { prefix: '/api/auth' })
server.register(import('./routes/organizations'), { prefix: '/api/organizations' })
server.register(import('./routes/monitoring'), { prefix: '/api/monitoring' })

const start = async () => {
  try {
    await server.listen({ port: 8001, host: '0.0.0.0' })
    console.log('🚀 Admin portal backend running on http://localhost:8001')
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
```

### Environment Variables (`.env`)
```env
# Database
DATABASE_URL="postgresql://admin_user:password@localhost:5432/nectar_shared"

# Authentication
ADMIN_JWT_SECRET="your-admin-jwt-secret-here"
ADMIN_SESSION_TIMEOUT="8h"

# Server
NODE_ENV="development"
PORT=8001

# Logging
LOG_LEVEL="debug"

# CORS
ALLOWED_ORIGINS="http://localhost:3001,https://admin.nectarstudio.ai"

# External Services
NOTIFICATION_SERVICE_URL="http://localhost:9000"
MONITORING_API_KEY="your-monitoring-api-key"
```

## 🗄️ Database Schema

### Admin-Specific Tables (`prisma/schema.prisma` additions)
```prisma
model AdminUser {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String
  role      AdminRole @default(ADMIN)
  isActive  Boolean  @default(true)
  lastLogin DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  auditLogs AdminAuditLog[]

  @@map("admin_users")
}

model AdminAuditLog {
  id          String    @id @default(cuid())
  adminUserId String
  action      String
  resource    String
  resourceId  String?
  details     Json?
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime  @default(now())

  adminUser AdminUser @relation(fields: [adminUserId], references: [id])

  @@map("admin_audit_logs")
}

enum AdminRole {
  SUPER_ADMIN
  ADMIN
  SUPPORT
}
```

## 🚦 Development Scripts

### Frontend Scripts (`admin-frontend/package.json`)
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "lint": "eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint src --ext ts,tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,json,css,md}\""
  }
}
```

### Backend Scripts (`admin-backend/package.json`)
```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "db:push": "npx prisma db push",
    "db:migrate": "npx prisma migrate dev",
    "db:generate": "npx prisma generate",
    "db:studio": "npx prisma studio"
  }
}
```

## 🔐 Authentication Setup

### Admin Auth Service (`admin-backend/src/services/adminAuth.ts`)
```typescript
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../utils/database'

export class AdminAuthService {
  static async createAdminUser(email: string, password: string, name: string) {
    const hashedPassword = await bcrypt.hash(password, 12)
    
    return prisma.adminUser.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    })
  }

  static async validateAdmin(email: string, password: string) {
    const admin = await prisma.adminUser.findUnique({
      where: { email, isActive: true },
    })

    if (!admin || !await bcrypt.compare(password, admin.password)) {
      return null
    }

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    })

    return admin
  }

  static generateToken(admin: AdminUser) {
    return jwt.sign(
      { 
        adminId: admin.id, 
        email: admin.email,
        role: admin.role,
        type: 'admin'
      },
      process.env.ADMIN_JWT_SECRET!,
      { expiresIn: process.env.ADMIN_SESSION_TIMEOUT || '8h' }
    )
  }
}
```

### Frontend Auth Hook (`admin-frontend/src/hooks/useAuth.ts`)
```typescript
import { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../services/authService'

interface AdminUser {
  id: string
  email: string
  name: string
  role: string
}

interface AuthContextType {
  user: AdminUser | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

## 🐳 Docker Development

### Docker Compose (`docker-compose.yml`)
```yaml
version: '3.8'

services:
  admin-frontend:
    build:
      context: ./admin-frontend
      dockerfile: Dockerfile.dev
    ports:
      - "3001:3001"
    volumes:
      - ./admin-frontend:/app
      - /app/node_modules
    environment:
      - VITE_API_URL=http://localhost:8001

  admin-backend:
    build:
      context: ./admin-backend
      dockerfile: Dockerfile.dev
    ports:
      - "8001:8001"
    volumes:
      - ./admin-backend:/app
      - /app/node_modules
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/nectar_shared
      - ADMIN_JWT_SECRET=admin-development-secret
    depends_on:
      - postgres

  postgres:
    image: postgres:14-alpine
    environment:
      - POSTGRES_DB=nectar_shared
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## 🧪 Testing Setup

### Frontend Test Setup (`admin-frontend/vitest.config.ts`)
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

### Backend Test Setup (`admin-backend/jest.config.js`)
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
}
```

## 🚀 Getting Started Commands

```bash
# 1. Clone and setup
git clone <admin-portal-repo> nectar-admin-portal
cd nectar-admin-portal

# 2. Setup frontend
cd admin-frontend
npm install
npm run dev # Runs on http://localhost:3001

# 3. Setup backend (in new terminal)
cd admin-backend
npm install
npx prisma generate
npx prisma db push
npm run dev # Runs on http://localhost:8001

# 4. Create first admin user
node scripts/createAdminUser.js admin.nectarstudio.ai password123 "Admin User"

# 5. Access admin portal
# Open http://localhost:3001
# Login with admin.nectarstudio.ai / password123
```

## 📋 First Sprint Tasks

1. **Setup project structure** ✅
2. **Implement admin authentication** 
3. **Build basic dashboard layout**
4. **Create organization overview page**
5. **Add user management interface**
6. **Implement audit logging**

## 🔍 Useful Development URLs

- **Admin Portal**: http://localhost:3001
- **API Documentation**: http://localhost:8001/docs
- **Database Studio**: http://localhost:5555 (after `npx prisma studio`)
- **Test Coverage**: http://localhost:3001/coverage

This setup guide provides everything needed to start developing the platform admin portal with proper authentication, database integration, and modern development practices.