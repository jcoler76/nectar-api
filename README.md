# Nectar API

A comprehensive full-stack business intelligence and workflow automation platform with hybrid database architecture.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **MongoDB** (local or hosted)
- **Redis** (optional, will fallback to in-memory cache)
- **SQL Server** (for business data integration)

### 1. Clone and Install

```bash
git clone <repository-url>
cd nectar-api

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 2. Environment Setup

```bash
# Copy environment files
cp .env.example .env
cp server/env.example server/.env

# Edit server/.env with your database credentials
# Edit .env with your frontend configuration
```

### 3. Database Setup

```bash
# Initialize MongoDB collections and indexes
cd server
npm run db:init

# Validate database schema
npm run db:validate
```

### 4. Start Development

```bash
# Start both frontend and backend concurrently
npm run dev

# Or start individually:
npm run start:frontend  # React app on :3000
npm run start:backend   # Express API on :3001
```

## 📁 Project Structure

```
nectar-api/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── context/           # Global state management
│   ├── features/          # Feature-specific modules
│   └── services/          # API communication
├── server/                # Express backend
│   ├── routes/            # API endpoints
│   ├── models/            # Database schemas
│   ├── services/          # Business logic
│   ├── middleware/        # Auth, validation, security
│   └── graphql/           # GraphQL schema & resolvers
└── public/                # Static assets
```

## 🛠 Available Scripts

### Frontend
```bash
npm start          # Start development server
npm run build      # Build for production
npm test           # Run tests
npm run analyze    # Analyze bundle size
```

### Backend
```bash
cd server
npm run dev        # Start with nodemon
npm start          # Start production server
npm test           # Run backend tests
npm run db:init    # Initialize database
npm run mcp        # Start MCP server
```

### Full Stack
```bash
npm run dev        # Start both frontend and backend
npm run deploy     # Build and deploy with PM2
```

## 🔧 Configuration

### Environment Variables

**Frontend (.env):**
- `REACT_APP_API_URL` - Backend API URL
- `REACT_APP_GRAPHQL_URL` - GraphQL endpoint

**Backend (server/.env):**
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret (32+ characters)
- `ENCRYPTION_KEY` - Data encryption key
- `REDIS_HOST` - Redis server (optional)

See `.env.example` files for complete configuration options.

### Database Setup

1. **MongoDB**: User accounts, workflows, application metadata
2. **SQL Server**: Business data via stored procedures
3. **Redis**: Session storage and caching (optional)

## 🏗 Architecture

### Frontend Stack
- **React 18** with hooks and context
- **Material-UI + Radix UI** for components
- **React Router** for navigation
- **React Query** for API state management
- **TailwindCSS** for styling

### Backend Stack
- **Express.js** with async/await patterns
- **Apollo GraphQL** server with DataLoader
- **MongoDB** with Mongoose ODM
- **JWT** authentication with 2FA
- **Bull** queues with Redis

### Key Features
- 🔐 **Enterprise Authentication** (JWT + 2FA + trusted devices)
- 🛡️ **Advanced Security** (CORS, CSRF, rate limiting, input validation)
- 🚀 **Performance Optimized** (caching, connection pooling, code splitting)
- 📊 **Business Intelligence** (AI-powered natural language queries)
- ⚡ **Workflow Engine** (visual builder with 15+ node types)
- 🔄 **Real-time Updates** (WebSocket connections, live notifications)

## 🧪 Testing

```bash
# Frontend tests
npm test

# Backend tests
cd server && npm test

# Run specific test file
npm test -- --testNamePattern="ComponentName"
```

## 📦 Production Deployment

```bash
# Build and deploy with PM2
npm run deploy

# Manual deployment
npm run build
cd server
pm2 start ecosystem.config.js
```

## 🐛 Troubleshooting

**Common Issues:**

1. **Port conflicts**: Change ports in `.env` files
2. **Database connection**: Verify MongoDB URI and credentials
3. **Build failures**: Clear node_modules and reinstall
4. **Memory issues**: Increase Node.js heap size with `--max-old-space-size=4096`

**Debug Commands:**
```bash
cd server
npm run db:validate     # Check database health
node scripts/testAuth.js # Test authentication flow
```

## 📚 Documentation

- **API Documentation**: Available at `/api/docs` when server is running
- **GraphQL Playground**: Available at `/graphql`
- **Architecture Guide**: See `CLAUDE.md`
- **Security Checklist**: See `server/docs/`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.
