# Contributing to Mirabel API

Welcome to the Mirabel API project! This document provides guidelines and standards for contributing to the codebase.

## Table of Contents
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Code Quality Scripts](#code-quality-scripts)

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/mirabel-api.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes following the guidelines below
5. Submit a pull request

## Development Setup

### Prerequisites
- Node.js 18+ 
- npm 9+
- MongoDB 5+
- Redis (optional, falls back to in-memory)

### Installation
```bash
# Install dependencies
npm install
cd server && npm install

# Set up environment variables
cp server/.env.example server/.env
# Edit server/.env with your configuration

# Initialize database
cd server && npm run db:init
```

### Running the Application
```bash
# Development mode (frontend + backend)
npm run dev

# Frontend only
npm start

# Backend only
npm run start:backend
```

## Coding Standards

### File Naming Conventions
- **React Components**: PascalCase (e.g., `Dashboard.jsx`, `UserList.jsx`)
- **Utilities/Services**: camelCase (e.g., `authService.js`, `exportUtils.ts`)
- **Test Files**: Component/Service name + `.test.js` (e.g., `Login.test.jsx`)
- **TypeScript Files**: Use `.ts` for logic, `.tsx` for React components

### Code Style
- **Indentation**: 2 spaces
- **Quotes**: Single quotes for JavaScript, double quotes for JSX attributes
- **Semicolons**: Always use semicolons
- **Line Length**: Max 100 characters (configured in Prettier)
- **Trailing Commas**: ES5 style (configured in Prettier)

### JavaScript/TypeScript Guidelines

#### Prefer Modern ES6+ Syntax
```javascript
// Good
const getUserData = async (userId) => {
  const user = await User.findById(userId);
  return user;
};

// Avoid
function getUserData(userId) {
  return User.findById(userId).then(function(user) {
    return user;
  });
}
```

#### Use TypeScript Strict Mode
TypeScript strict mode is enabled. All new TypeScript files must be strict-compliant:
- No implicit `any` types
- No unchecked null/undefined
- Explicit return types for functions

#### Avoid Console Statements
Use the configured logger instead of console:
```javascript
// Good
const { logger } = require('./utils/logger');
logger.info('User logged in', { userId: user.id });

// Bad
console.log('User logged in', user.id);
```

### React Component Guidelines

#### Functional Components with Hooks
Always use functional components with hooks:
```jsx
// Good
const Dashboard = () => {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetchData();
  }, []);
  
  return <div>{/* content */}</div>;
};

// Avoid class components unless absolutely necessary
```

#### Prop Types and TypeScript
For TypeScript components, define proper interfaces:
```typescript
interface DashboardProps {
  userId: string;
  onRefresh: () => void;
  isAdmin?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ userId, onRefresh, isAdmin = false }) => {
  // component logic
};
```

#### Component Organization
1. Imports (grouped by type)
2. Type definitions/interfaces
3. Component definition
4. Hooks (useState, useEffect, custom hooks)
5. Event handlers
6. Helper functions
7. JSX return

### API Response Format
All API endpoints should return consistent response formats:

#### Success Response
```javascript
res.json({
  success: true,
  data: result,
  message: 'Operation successful' // optional
});
```

#### Error Response
```javascript
res.status(400).json({
  success: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'User-friendly error message',
    details: {} // optional, only in development
  }
});
```

## Commit Guidelines

We follow the Conventional Commits specification:

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, semicolons, etc.)
- **refactor**: Code refactoring without changing functionality
- **test**: Adding or updating tests
- **chore**: Maintenance tasks, dependency updates
- **perf**: Performance improvements

### Examples
```bash
feat(auth): add two-factor authentication support

fix(workflow): resolve race condition in node execution

docs(api): update endpoint documentation for connections

refactor(dashboard): extract metric cards into separate components

test(auth): add accessibility tests for login component
```

## Testing Requirements

### Test Coverage Goals
- New features: Minimum 80% coverage
- Bug fixes: Include regression tests
- Critical paths: 100% coverage (auth, payments, data operations)

### Test Types

#### Unit Tests
Test individual functions and components in isolation:
```javascript
describe('authService', () => {
  it('should hash passwords correctly', async () => {
    const password = 'TestPassword123!';
    const hash = await authService.hashPassword(password);
    expect(hash).not.toBe(password);
  });
});
```

#### Integration Tests
Test component interactions and API endpoints:
```javascript
describe('POST /api/auth/login', () => {
  it('should return JWT token for valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    
    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
  });
});
```

#### Accessibility Tests
All UI components must pass accessibility tests:
```javascript
it('should not have accessibility violations', async () => {
  const { container } = render(<Component />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test Login.test.jsx

# Run backend tests
cd server && npm test
```

## Pull Request Process

### Before Submitting
1. **Run quality checks**: `npm run quality:check`
2. **Fix any issues**: `npm run quality:fix`
3. **Run tests**: `npm test`
4. **Update documentation** if needed
5. **Update CHANGELOG.md** for significant changes

### PR Requirements
- [ ] Code follows project style guidelines
- [ ] Tests pass with adequate coverage
- [ ] No console.log statements (check with `npm run lint:console`)
- [ ] No TypeScript `any` types (check with `npm run lint:any`)
- [ ] Commits follow conventional format
- [ ] Documentation updated if needed
- [ ] No merge conflicts

### PR Title Format
Follow the same convention as commit messages:
```
feat(component): add new feature
fix(api): resolve critical bug
```

## Code Quality Scripts

### Available Commands
```bash
# Check for console statements
npm run lint:console

# Check for TypeScript 'any' types
npm run lint:any

# Run all quality checks
npm run quality:check

# Auto-fix issues
npm run quality:fix

# Format code
npm run format

# Run ESLint
npm run lint

# Analyze bundle size
npm run analyze
```

### Pre-commit Hooks
Husky and lint-staged are configured to automatically:
1. Run ESLint on staged files
2. Format code with Prettier
3. Prevent commits with linting errors

To bypass hooks in emergency (not recommended):
```bash
git commit --no-verify
```

## Security Guidelines

### Never Commit Secrets
- Use environment variables for sensitive data
- Add sensitive files to `.gitignore`
- Use `ADMIN_EMAILS` env variable for admin access

### Input Validation
- Always validate and sanitize user input
- Use parameterized queries for database operations
- Implement rate limiting on sensitive endpoints

### Dependencies
- Regularly update dependencies: `npm update`
- Check for vulnerabilities: `npm audit`
- Fix vulnerabilities: `npm audit fix`

## Getting Help

- Create an issue for bugs or feature requests
- Join discussions in existing issues
- Check `CODE_QUALITY_ASSESSMENT.md` for improvement areas
- Review `CODESCOREIMPROVEMENT.md` for ongoing initiatives

## License

By contributing to Mirabel API, you agree that your contributions will be licensed under the project's license terms.