# Nectar Core Platform

> **Service**: Core Application Platform
> **Version**: 2.0.0
> **Ports**: 3000 (Frontend), 3001 (Backend)
> **Type**: Multi-tenant SaaS Platform

## Overview

Nectar Core is the main application platform providing workflow automation, API management, and service orchestration for customers.

## Architecture

This is the **core service** in a microservices architecture:

- **Nectar Core** (this repo): Customer-facing platform (ports 3000/3001)
- **Nectar Marketing**: Marketing site and lead generation (ports 5000/5001)
- **Nectar Admin**: Admin portal for system management (ports 4000/4001)

### Service Communication
```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Nectar    │       │   Nectar    │       │   Nectar    │
│    Core     │◄─────►│  Marketing  │◄─────►│    Admin    │
│ :3000/3001  │       │ :5000/5001  │       │ :4000/4001  │
└─────────────┘       └─────────────┘       └─────────────┘
       │                      │                      │
       └──────────────────────┴──────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │    PostgreSQL      │
                    │  nectarstudio_ai   │
                    └────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- PostgreSQL 14+
- npm >= 8.0.0

### Installation

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Start development servers
npm run dev
```

This will start:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

### Development

```bash
# Frontend only (port 3000)
npm start

# Backend only (port 3001)
npm run start:backend

# Both simultaneously
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## 📁 Project Structure

```
nectar-core/
├── src/                    # React frontend application
│   ├── components/        # React components
│   │   ├── applications/  # Application management UI
│   │   ├── common/        # Shared components
│   │   ├── roles/         # RBAC components
│   │   ├── services/      # Service management UI
│   │   └── workflows/     # Workflow builder
│   ├── services/          # API clients
│   ├── hooks/             # Custom React hooks
│   ├── contexts/          # React context providers
│   └── utils/             # Utility functions
├── server/                # Express backend
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── middleware/       # Express middleware
│   ├── prisma/           # Database schema
│   └── utils/            # Backend utilities
├── public/               # Static assets
├── docs/                 # Documentation
└── tests/                # Test files
```

## 🔧 Key Features

- 🔐 **Multi-tenant Authentication**: Secure JWT-based auth with RLS
- 🔄 **Visual Workflow Builder**: Drag-and-drop workflow creation
- 🔌 **API Service Management**: Create and manage API services
- 📊 **Real-time Analytics**: Dashboard with usage metrics
- 🔑 **API Key Management**: Generate and manage API keys
- 📁 **File Storage System**: Secure file upload and management
- 🎯 **Role-Based Access Control**: Granular permission system
- 🔗 **Integration Hub**: Connect to third-party services
- 📈 **Usage Tracking**: Monitor API calls and resource usage

## ⚙️ Environment Variables

Key environment variables (see `.env` for full list):

```bash
# Service Configuration
NODE_ENV=development
SERVICE_NAME=nectar-core
SERVICE_VERSION=2.0.0

# Ports
PORT=3000              # Frontend port
BACKEND_PORT=3001      # Backend API port

# Database (with RLS for tenant isolation)
DATABASE_URL=postgresql://nectar_app_user:password@localhost:5432/nectarstudio_ai

# Security
JWT_SECRET=your_secret_here
SESSION_SECRET=your_session_secret

# External Services (Optional)
MARKETING_API_URL=http://localhost:5001
ADMIN_API_URL=http://localhost:4001
```

## 🗄️ Database

Uses PostgreSQL with **Row-Level Security (RLS)** for tenant isolation.

```bash
# Run migrations
cd server
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Open Prisma Studio
npx prisma studio
```

### Database Access
- **Core Service**: Uses tenant-scoped access with RLS enabled
- **Tables**: Users, Organizations, Services, Workflows, Applications, API Keys, etc.
- **Isolation**: Each organization's data is completely isolated via RLS

## 📚 API Documentation

### Core Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/logout` - User logout

#### Services
- `GET /api/services` - List services
- `POST /api/services` - Create service
- `GET /api/services/:id` - Get service details
- `PUT /api/services/:id` - Update service
- `DELETE /api/services/:id` - Delete service

#### Workflows
- `GET /api/workflows` - List workflows
- `POST /api/workflows` - Create workflow
- `GET /api/workflows/:id` - Get workflow
- `PUT /api/workflows/:id` - Update workflow
- `POST /api/workflows/:id/execute` - Execute workflow

#### Applications
- `GET /api/applications` - List applications
- `POST /api/applications` - Create application
- `GET /api/applications/:id` - Get application
- `PUT /api/applications/:id` - Update application

#### API Keys
- `GET /api/apikeys` - List API keys
- `POST /api/apikeys` - Generate new API key
- `DELETE /api/apikeys/:id` - Revoke API key

### GraphQL Endpoint
- `POST /graphql` - GraphQL queries and mutations

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --grep "authentication"

# Run with coverage
npm test -- --coverage

# Lint code
npm run lint

# Type check
npm run type-check
```

## 🎯 Role-Based Access Control (RBAC)

The platform implements a comprehensive RBAC system with the following roles:

| Role | Level | Permissions |
|------|-------|-------------|
| **SUPER_ADMIN** | 100 | Full platform access |
| **ORGANIZATION_OWNER** | 80 | Full organization control |
| **ORGANIZATION_ADMIN** | 60 | Admin operations |
| **DEVELOPER** | 40 | API management |
| **MEMBER** | 20 | Basic access |
| **VIEWER** | 10 | Read-only |

See [RBAC Documentation](./docs/RBAC-DOCUMENTATION.md) for details.

## 🚢 Production Deployment

### Build for Production
```bash
# Build optimized frontend
npm run build

# Test production build locally
npx serve -s build -l 3000
```

### Environment Setup
1. Set `NODE_ENV=production`
2. Configure production database URL
3. Set secure JWT_SECRET
4. Enable HTTPS
5. Configure CORS origins

### Deployment Options
- **Railway**: One-click deployment
- **Heroku**: Buildpack deployment
- **Docker**: Containerized deployment
- **PM2**: Process management

## 🔍 Monitoring & Health

### Health Check
```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "service": "nectar-core",
  "status": "healthy",
  "timestamp": "2025-10-01T10:00:00.000Z",
  "version": "2.0.0",
  "database": "connected"
}
```

## 🔒 Security

### Features
- JWT authentication with secure token storage
- Row-Level Security (RLS) for tenant isolation
- CORS protection
- Rate limiting
- SQL injection prevention via Prisma
- XSS protection
- CSRF tokens
- Encrypted secrets

### Security Testing
```bash
npm audit
npm run security:audit
```

## 🐛 Troubleshooting

### Common Issues

**Port already in use**:
```bash
# Find process using port
netstat -ano | findstr "3000"

# Kill process
taskkill /PID <PID> /F
```

**Database connection failed**:
```bash
# Check PostgreSQL is running
psql -U nectar_app_user -d nectarstudio_ai

# Verify DATABASE_URL in .env
```

**Module not found**:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## 🔗 Related Services

- **Nectar Marketing**: Marketing site and lead generation (separate repo)
- **Nectar Admin**: Admin portal and system management (separate repo)

## 📖 Documentation

- [API Documentation](./docs/API_DOCUMENTATION.md)
- [Architecture Overview](./docs/ARCHITECTURE.md)
- [RBAC System](./docs/RBAC-DOCUMENTATION.md)
- [Production Testing Plan](./docs/PRODUCTION_TESTING_PLAN.md)
- [Microservices Separation](./docs/MICROSERVICES_SEPARATION_PLAN.md)
- [Safe Core Cleanup Plan](./docs/SAFE_CORE_CLEANUP_PLAN.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📧 Support

- **Documentation**: `/docs` folder
- **Issues**: GitHub Issues
- **Email**: support@nectarstudio.ai

## 📄 License

Proprietary - All Rights Reserved

---

**Version**: 2.0.0 - Core Service (Post-Microservices Separation)
**Last Updated**: October 1, 2025
**Status**: ✅ Production Ready
