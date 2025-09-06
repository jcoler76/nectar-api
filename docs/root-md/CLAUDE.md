# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

No temporary solutions, mock data, or unnecessary fallbacks.

Reuse shared components any time possible.

Evaluate the agents available to you and add instructions on usage to CLAUDE.md. Make sure that the end of EVERY to do list is to use the CLAUDE.md checker, and ensure each stop point or new feature utilizes the quality control agent.

## 🚨 CRITICAL DEPLOYMENT FIXES (Updated: 2025-07-26)

### TailwindCSS PostCSS Configuration Issue

**Problem**: Build fails with error "It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin. The PostCSS plugin has moved to a separate package..."

**Root Cause**: React Scripts 5.0.1 has bundled TailwindCSS 3.4.17 internally, but project uses TailwindCSS 4.1.11. PostCSS configuration conflicts between versions.

**SOLUTION**: Use `config-overrides.js` to force override React Scripts' internal PostCSS configuration:

```javascript
module.exports = function override(config, env) {
  // Add fallbacks for node core modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "stream": require.resolve("stream-browserify"),
    "vm": require.resolve("vm-browserify"),
    "crypto": require.resolve("crypto-browserify"),
    "buffer": require.resolve("buffer/"),
    "util": require.resolve("util/"),
    "assert": require.resolve("assert/"),
    "http": require.resolve("stream-http"),
    "https": require.resolve("https-browserify"),
    "os": require.resolve("os-browserify/browser"),
    "url": require.resolve("url/")
  };

  // FORCE override PostCSS with TailwindCSS
  const oneOfRule = config.module.rules.find(rule => rule.oneOf);
  if (oneOfRule) {
    oneOfRule.oneOf.forEach(rule => {
      if (rule.use) {
        rule.use.forEach(loader => {
          if (loader.loader && loader.loader.includes('postcss-loader')) {
            loader.options = {
              postcssOptions: {
                plugins: [
                  require('tailwindcss'),
                  require('autoprefixer'),
                ],
              },
            };
          }
        });
      }
    });
  }

  return config;
};
```

**Key Points**:

- External `postcss.config.js` is IGNORED by React Scripts
- Must use `config-overrides.js` to override webpack PostCSS loader
- Keep TailwindCSS traditional format: `require('tailwindcss')`
- Do NOT use `@tailwindcss/postcss` plugin with this approach

### Environment Variable Recovery

**Problem**: Server crashes with "JWT_SECRET must be at least 32 characters long" after deployment.

**Solution**:

1. Check backup directory: `/home/ubuntu/deployment-backups/YYYYMMDD_HHMMSS/`
2. Restore from `.env` or `.env.bak` (NOT `.env.production.bak` which has placeholders)
3. Copy working environment file to `./server/.env.production`

**Critical Files to Restore**:

- `JWT_SECRET`: For token signing
- `ENCRYPTION_KEY`: For data encryption (NEVER regenerate - invalidates all encrypted data)
- `SESSION_SECRET`: For session management

## LOCAL-ONLY GitHub Issue Resolution (SAFE)

### 🔒 Everything Runs on YOUR Machine - No Production Risks

**IMPORTANT:** All AI calls, polling, and development happen ONLY on your local machine. Nothing runs in production.

### Quick Start - Interactive Mode (Recommended)
```powershell
# Safe interactive menu - full control over every action
.\scripts\safe-local-workflow.ps1 -Interactive
```

### Manual Workflow (Most Common)
```bash
# 1. Check for issues on YOUR machine
gh issue list --label "auto-resolve"

# 2. Pick an issue to work on
gh issue view 5

# 3. Let Claude Code implement it locally
claude "Resolve GitHub issue #5"

# 4. Test, commit, and push as normal
git add . && git commit -m "Resolve issue #5" && git push
```

### Quick Issue Checker Command

**NEW: Use the `checkgit` command for easy issue management:**

```powershell
# List all auto-resolve issues
.\checkgit

# View specific issue details  
.\checkgit view 5

# Set up branch and prepare to resolve issue
.\checkgit resolve 5
# Then tell Claude Code: "Resolve GitHub issue #5"
```

### Optional: Local AI Acceptance Criteria
```powershell
# Generate criteria on YOUR machine (uses YOUR OpenAI API key)
.\scripts\enhanced-issue-poller.ps1 -PollInterval 300

# This runs LOCALLY - never in production
# You control when it runs and can stop it anytime
```

**AI Acceptance Criteria Features:**
- **Context-Aware** - Analyzes project architecture (React/Node.js/MongoDB)
- **Issue Type Specific** - Different criteria for bugs, features, technical tasks
- **Comprehensive Coverage** - Includes functional, technical, security, and testing requirements
- **BDD Format** - Uses Given-When-Then format for clear specifications
- **Fallback Support** - Basic template if AI service unavailable

**Supported Issue Types:**
- `feature` - New functionality with UI/API/database requirements
- `bug` - Root cause analysis and fix requirements with regression prevention
- `technical` - Code quality, architecture, and documentation improvements
- `enhancement` - Performance and usability improvements

**Files Created:**
- `.processed_issues` - Tracks already processed issue numbers
- `issue-poller.log` - Polling activity log with AI generation status
- `pending_claude_commands.txt` - Queued Claude Code commands
- `command-processor.log` - Command execution log

## Essential Commands

### Development

```bash
# Start frontend (React dev server on port 3000)
npm start

# Start backend (Express server on port 3001) 
npm run start:backend

# Start both frontend and backend together
npm run dev
```

### Testing and Quality

```bash
# Run tests
npm test

# Run specific test file
npm test -- --testNamePattern="filename"

# Backend database operations
cd server && npm run db:init      # Initialize database
cd server && npm run db:validate  # Validate database schema
cd server && npm run db:cleanup   # Clean up database

# MongoDB backup operations
cd server && npm run db:backup         # Create manual backup
cd server && npm run db:restore        # Interactive restore
cd server && npm run db:backup-health  # Check backup system health
```

### Production Deployment

```bash
# Build for production
npm run build

# Deploy with PM2 process manager
npm run pm2:start
npm run pm2:restart
npm run pm2:stop
```

### MCP Server

```bash
# Start Model Context Protocol server
cd server && npm run mcp
```

## Architecture Overview

**Mirabel API** is a full-stack business intelligence and workflow automation platform with hybrid database architecture:

- **Frontend**: React 18 + Material-UI with feature-driven component organization
- **Backend**: Express.js + Apollo GraphQL server with layered architecture
- **Databases**: MongoDB (application data) + SQL Server (business data)
- **Queues**: Redis-backed Bull.js for asynchronous workflow processing
- **Authentication**: JWT with role-based access control

### Key Architectural Patterns

#### Layered Backend Structure (`/server/`)

```
server/
├── models/          # MongoDB schemas (Mongoose)
├── routes/          # REST API endpoints  
├── controllers/     # Request handlers
├── services/        # Business logic (workflows, database, queues)
├── middleware/      # Auth, validation, logging, rate limiting
├── graphql/         # Schema, resolvers, DataLoader optimizations
└── mcp/            # Model Context Protocol tools
```

#### Frontend Organization (`/src/`)

```
src/
├── components/      # Reusable UI components
├── contexts/        # Global state (Auth, Notifications, Permissions)
├── pages/          # Route-based page components
├── services/       # API communication layer
└── utils/          # Helper functions
```

#### Event-Driven Workflow Engine

- **Location**: `server/services/workflows/`
- **Pattern**: Node-based execution with pluggable processors
- **Queue Processing**: Bull.js with Redis for scalable async execution
- **Triggers**: Database polling, webhooks, forms, schedules

#### Dual Database Strategy

- **MongoDB**: Application metadata, user management, workflow definitions
- **SQL Server**: Business data accessed via stored procedures and MCP tools
- **Connection**: Encrypted credentials with connection pooling

#### GraphQL + REST Coexistence  

- **GraphQL**: Complex queries with relationships via Apollo Server
- **REST**: Simple CRUD operations and file uploads
- **Authentication**: JWT for users, API keys for applications
- **Optimization**: DataLoader pattern prevents N+1 queries

### Security Architecture

#### Authentication Flow

1. JWT tokens with refresh mechanism
2. Role-based permissions stored in MongoDB
3. API key management for external applications
4. Session tracking and audit logging

#### Critical Security Middleware (order matters)

```javascript
// In server.js
app.use(helmet())           # Security headers
app.use(cors(corsOptions))  # CORS with explicit allowlist
app.use(rateLimiter)        # Rate limiting by tier
app.use(express.json({ limit: '10mb' }))
app.use('/api', authMiddleware)  # JWT validation
```

#### Database Security

- SQL injection prevention via parameterized queries
- Encrypted database credentials in MongoDB
- Connection pooling with timeout controls
- IP whitelisting for MCP access

### Business Intelligence Integration

#### MCP (Model Context Protocol) System

- **Purpose**: AI-powered database querying and schema discovery
- **Tools**: 11+ business entities (customers, invoices, proposals)
- **Management**: Web GUI for configuring database objects
- **Security**: IP restrictions and encrypted access controls

#### Natural Language Processing

- Converts business questions to SQL/GraphQL queries
- Real-time data analysis with conversational interface
- Query history and result caching

## Development Patterns

### Error Handling

Always use structured error responses:

```javascript
// Controllers should return consistent error format
return res.status(400).json({
  success: false,
  message: 'Validation failed',
  errors: validationErrors
});
```

### Database Operations

- **MongoDB**: Use Mongoose schemas with validation
- **SQL Server**: Use stored procedures and parameterized queries
- **Connection**: Always use connection pooling and error handling

### GraphQL Resolver Pattern

```javascript
// Use DataLoader for optimization
const resolvers = {
  User: {
    roles: async (user, args, { dataSources }) => {
      return dataSources.roleLoader.load(user.id);
    }
  }
};
```

### Workflow Node Development

New workflow node types must implement:

- `processNode(nodeData, workflowData, context)`
- Input/output validation schemas
- Error handling with workflow state preservation

### Component Development

- Use functional components with hooks
- Implement Material-UI theming patterns
- Follow existing context patterns for state management

## Environment Configuration

### Required Environment Variables

```bash
# Backend (.env in /server/)
NODE_ENV=development
JWT_SECRET=your-secret-key
MONGODB_URI=mongodb://localhost:27017/mirabel
REDIS_HOST=localhost
REDIS_PORT=6379

# Database connections (encrypted in production)
SQL_SERVER_HOST=your-sql-server
SQL_SERVER_USER=your-username
SQL_SERVER_PASSWORD=your-password
SQL_SERVER_DATABASE=your-database

# MongoDB Backup Configuration
DB_BACKUP_ENABLED=true              # Enable/disable automated backups
DB_BACKUP_SCHEDULE=0 2 * * *        # Daily at 2 AM (cron format)
DB_BACKUP_RETENTION_DAYS=30         # Keep backups for 30 days
BACKUP_ALERT_EMAIL=admin@domain.com # Email for backup alerts
```

### Development vs Production

- **Development**: Uses nodemon with file watching
- **Production**: PM2 process management with clustering
- **Database**: Development uses local instances, production uses encrypted connections
- **Logging**: Winston with different levels per environment

## Testing Approach

### Jest Configuration

- **Environment**: Node.js for backend, jsdom for frontend
- **Coverage**: Enabled with text and lcov reports
- **Mocking**: Database connections mocked in test environment

### Test Patterns

```javascript
// API endpoint testing
describe('POST /api/workflows', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });
  
  it('creates workflow with valid data', async () => {
    const response = await request(app)
      .post('/api/workflows')
      .send(validWorkflowData)
      .expect(201);
  });
});
```

## Workflow Engine Specifics

### Node Types and Processing

- **HTTP Request**: External API calls with retry logic
- **Database Trigger**: Polling-based change detection
- **Code Execution**: Sandboxed JavaScript evaluation
- **Email Action**: SMTP integration with templates
- **Filter/Logic**: Conditional branching based on data

### Queue Management

- **Bull Queue**: Redis-backed with job retry and failure handling
- **Concurrency**: Configurable workers per queue type
- **Monitoring**: Built-in queue monitoring dashboard

### Performance Considerations

- Database polling limited to 1-minute intervals
- Queue processing batched for efficiency
- Connection pooling prevents resource exhaustion
- Workflow state persisted for failure recovery

## MongoDB Backup System

The Mirabel API includes a comprehensive MongoDB backup system with automated scheduling, health monitoring, and restoration capabilities.

### Backup Architecture

The backup system consists of several key components:

1. **MongoBackup Script** (`server/scripts/mongoBackup.js`): Core backup functionality using `mongodump`
2. **MongoRestore Script** (`server/scripts/mongoRestore.js`): Interactive and automated restoration using `mongorestore`  
3. **MongoBackupService** (`server/services/mongoBackupService.js`): Service layer with logging and queue integration
4. **BackupHealthChecker** (`server/scripts/backupHealthCheck.js`): Comprehensive health monitoring and alerting
5. **Scheduler Integration**: Automated backup scheduling in `server/services/scheduler.js`

### Backup Features

#### Automated Scheduling

- Configurable cron-based scheduling (default: daily at 2 AM UTC)
- Weekly cleanup of old backups (Sundays at 3 AM UTC)
- Integrated with existing node-cron scheduler system

#### Backup Management

- Compressed backups using gzip (significant space savings)
- Timestamped backup files with format: `backup_YYYY-MM-DD-HH-MM.gz`
- Configurable retention period (default: 30 days)
- Pre-restore safety backups created automatically

#### Health Monitoring

- Comprehensive health checks covering:
  - Backup configuration validation
  - Directory permissions and storage space
  - Backup file integrity verification
  - Tool availability (mongodump/mongorestore)
  - Backup freshness and frequency analysis
- Email alerts for critical issues
- Integration with existing logging and monitoring infrastructure

#### Restoration Capabilities

- Interactive restoration with safety prompts
- Command-line restoration with options
- Backup validation before restoration
- Dry-run mode for testing
- Automatic database verification after restoration

### Production Deployment Setup

#### 1. Install MongoDB Database Tools

On the Linux production server, install MongoDB tools:

```bash
# Ubuntu/Debian
sudo apt install mongodb-database-tools

# Or download from MongoDB official site
wget https://fastdl.mongodb.org/tools/db/mongodb-database-tools-ubuntu2004-x86_64-100.5.4.tgz
tar -zxvf mongodb-database-tools-*.tgz
sudo cp mongodb-database-tools-*/bin/* /usr/local/bin/
```

#### 2. Configure Environment Variables

In production `.env.production` file:

```bash
# Enable automated backups
DB_BACKUP_ENABLED=true
DB_BACKUP_SCHEDULE=0 2 * * *
DB_BACKUP_RETENTION_DAYS=30
BACKUP_ALERT_EMAIL=admin@mirabeltechnologies.com

# Email configuration for alerts
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@domain.com
EMAIL_PASS=your-app-password
EMAIL_FROM="Mirabel API Backup <no-reply@mirabeltechnologies.com>"
```

#### 3. Manual Operations

```bash
# Create manual backup
cd server && npm run db:backup

# Interactive restoration (with prompts)
cd server && npm run db:restore

# Run backup health check
cd server && npm run db:backup-health

# Command line restoration with options
cd server && node scripts/mongoRestore.js backup_2025-08-27-02-00.gz --dry-run
```

### Integration with Deployment

The backup system is automatically initialized during application startup and integrates with existing infrastructure:

- **Scheduler Integration**: Automatic initialization with node-cron
- **PM2 Supervision**: Backup processes run under PM2 management
- **Winston Logging**: All operations logged via existing logging system
- **Queue Integration**: Uses Bull.js message queue for notifications
- **Health Monitoring**: Integrated with existing monitoring infrastructure

### Security and Reliability

- Database connections use encrypted credentials
- Backup files stored with appropriate permissions
- Email notifications for backup failures and health issues
- Comprehensive audit trail in backup history
- Pre-restoration safety backups prevent data loss
- Backup integrity verification before restoration

# Quality Control & Code Standards

## 🚨 MANDATORY QUALITY GATES

**ALL CODE CHANGES MUST PASS THESE CHECKS BEFORE COMMIT:**

### 1. Linting Requirements (Zero Tolerance)
- ✅ **No ESLint errors or warnings** - All files must pass `npm run lint` with zero issues
- ✅ **No console statements** in production code (except in test files)
- ✅ **No unused variables or imports** 
- ✅ **Consistent formatting** - All files must pass `npm run format:check`

### 2. Testing Requirements
- ✅ **Unit tests** for all new components and functions
- ✅ **Integration tests** for API endpoints
- ✅ **Test coverage** must not decrease from baseline
- ✅ **All tests pass** - `npm test` must complete successfully

### 3. Security Requirements (CRITICAL)
- ✅ **No hardcoded secrets** - API keys, passwords, tokens must use environment variables
- ✅ **Input validation** - All user inputs must be validated and sanitized
- ✅ **SQL injection prevention** - Use parameterized queries only
- ✅ **HTTPS only** - All external API calls must use HTTPS
- ✅ **Authentication checks** - All protected endpoints must verify auth tokens
- ✅ **Complete security checklist** - See SECURITY_CHECKLIST.md

### 4. Code Quality Standards
- ✅ **TypeScript compliance** - All .ts/.tsx files must pass type checking
- ✅ **Dependency security** - `npm audit` must show no high-severity vulnerabilities
- ✅ **Performance impact** - No significant performance degradation
- ✅ **Error handling** - All potential errors must be properly handled

## 🔧 Automated Quality Controls

### Pre-commit Hooks (Enforced)
```bash
# These run automatically on every commit attempt
npm run precommit:all  # Comprehensive quality check
npx lint-staged        # Format and lint staged files
```

## 🚫 COMMIT REJECTION CRITERIA

**Commits will be automatically rejected for:**

1. **Linting failures** - Any ESLint errors or warnings
2. **Test failures** - Any failing unit or integration tests  
3. **Type errors** - TypeScript compilation errors
4. **Security vulnerabilities** - High or critical npm audit findings
5. **Formatting issues** - Code not formatted with Prettier
6. **Missing tests** - New functionality without corresponding tests

## 📋 Code Review Requirements

**All pull requests must be reviewed for:**

### Security (CRITICAL)
- ✅ No security vulnerabilities introduced
- ✅ Authentication and authorization properly implemented
- ✅ Input validation and sanitization present
- ✅ Sensitive data properly protected

### Code Quality  
- ✅ Code follows existing patterns and conventions
- ✅ Functions and variables have clear, descriptive names
- ✅ Complex logic is well-commented
- ✅ Code is DRY (Don't Repeat Yourself)

**CRITICAL**: NEVER commit code that fails quality checks. All code must pass linting, testing, security, and formatting requirements.

## 🧪 Runtime Testing Requirements (MANDATORY)

### Component Runtime Verification
Before committing any React component changes, you MUST verify:

1. **Component Rendering** - Component renders without errors in browser
2. **Props Interface** - All expected props are correctly passed and used
3. **Interactive Functionality** - User interactions work as expected
4. **Integration Points** - Component integrates properly with parent components

### Workflow Panel Testing Protocol
For workflow node panels specifically, you MUST test:

1. **Panel Opening** - Node can be added to workflow without errors
2. **Properties Editing** - Properties panel opens and displays correctly
3. **Data Persistence** - Changes are saved and persist when panel is reopened
4. **Form Validation** - Input validation works correctly
5. **API Integration** - Any API calls function properly

### Runtime Testing Commands
```bash
# Start development server
npm start

# Open browser to workflow builder
# Navigate to: http://localhost:3000/workflows/new

# Test workflow node:
# 1. Add node to canvas
# 2. Click to edit node
# 3. Verify all form fields work
# 4. Test any API connections
# 5. Save changes and reopen to verify persistence
```

### When Runtime Testing is Required
- ✅ Any changes to React components
- ✅ New workflow node types
- ✅ Changes to props interfaces
- ✅ API integration modifications
- ✅ Form validation changes
- ✅ State management updates

**FAILURE TO RUNTIME TEST WORKFLOW COMPONENTS WILL RESULT IN BROKEN USER EXPERIENCE**

## 🔒 Security Review Integration (AUTO-RESOLVE PROCESS)

### Claude Code Security Review Requirement

**CRITICAL**: The auto-resolve process now includes mandatory Claude Code `/security-review` integration to prevent security vulnerabilities from being committed.

#### Pre-Commit Security Gates

The pre-commit process executes:
```bash
npm run precommit:all
```

Which includes the **mandatory security review step**:
```bash
npm run security:review
```

This command:
1. Runs `claude /security-review` on all changed files
2. **BLOCKS COMMIT** if security review fails
3. Provides security recommendations that must be addressed
4. Only allows commit after successful security review

#### Security Review Process Flow

```
Code Changes → Format Check → Lint → Type Check → Tests → npm audit → SECURITY REVIEW → Runtime Reminder → Commit
```

**If security review fails:**
- ❌ Commit is blocked
- 🔍 Security issues are reported
- 🛠️ Developer must fix issues
- 🔄 Process repeats until security review passes

#### Manual Security Review

You can run security review independently:
```bash
npm run security:review
```

#### Integration Points

- **Pre-commit hooks**: Automatic execution via Husky
- **GitHub Actions**: CI/CD pipeline includes security gates
- **Auto-resolve process**: All automated commits go through security review
- **Manual commits**: All developer commits require security approval

**ZERO TOLERANCE**: No code passes through the auto-resolve process without successful Claude Code security review.
