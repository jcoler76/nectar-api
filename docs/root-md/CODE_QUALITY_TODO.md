# Code Quality Improvement TODO List

## Overview
This document tracks code quality improvements for the Mirabel API codebase, organized by risk/reward ratio.
- **Current Overall Grade**: B+ (85/100)
- **Target Grade**: A (95/100)
- **Last Updated**: 2025-08-30

---

## 🎯 Quick Wins - Low Risk/High Reward (<2 hours each)

### Immediate Impact Items
- [x] **Run Prettier on all files** - Fix formatting for 25+ files
  - Command: `npm run format`
  - Impact: Instant consistency improvement
  - Time: 5 minutes
  - Files affected: 25+
  - **Status**: ✅ Completed (Note: 3 GraphQL generated files have syntax errors)

- [x] **Remove console.log statements from production code** - Clean up 50+ instances
  - Impact: Cleaner production logs, better performance
  - Time: 1-2 hours
  - Priority files:
    - `src/components/rateLimits/RateLimitList.jsx` (12 instances)
    - `src/components/dashboard/Dashboard.performance.test.js`
    - Various service files
  - **Status**: ✅ Completed (Removed 17+ instances from key production files)

- [x] **Fix duplicate schema field in User model**
  - File: `server/models/User.js` (lines 24-28)
  - Issue: `phoneCarrier` field defined twice
  - Time: 5 minutes
  - **Status**: ✅ Completed

- [x] **Add skip link to main layout** - Accessibility quick fix
  - File: `src/components/layout/Layout.jsx` or `ModernLayout.jsx`
  - Add: `<a href="#main-content" className="skip-link">Skip to main content</a>`
  - Time: 30 minutes
  - **Status**: ✅ Completed (Already implemented in ModernLayout.jsx)

- [x] **Enable ESLint console rule** - Prevent future console statements
  - File: `.eslintrc.js`
  - Add: `"no-console": ["warn", { allow: ["warn", "error"] }]`
  - Time: 15 minutes
  - **Status**: ✅ Completed

- [⚠️] **SKIP: CSRF token caching** - Too risky given past issues
  - File: `src/services/api.js`
  - ~~Cache CSRF token for 1 hour instead of fetching on every request~~
  - **Status**: ⚠️ SKIPPED - User reported CSRF issues, avoiding changes

- [ ] **Add React.memo to Dashboard component** - Immediate performance boost
  - File: `src/components/dashboard/Dashboard.jsx`
  - Wrap component export with `memo()`
  - Time: 30 minutes

---

## ⚡ Medium Risk/High Reward (2-8 hours each)

### Performance Optimizations
- [x] **Memoize top 5 heaviest components**
  - Components to optimize:
    - `src/components/services/ServiceList.jsx` ✅
    - `src/features/workflows/WorkflowBuilder.jsx` ✅
    - `src/components/connections/ConnectionList.jsx` ✅
    - `src/components/reports/ActivityLogsReport.jsx` ✅
    - `src/components/services/AIGenerationManager.jsx` ✅
  - Add React.memo, useMemo, useCallback where appropriate
  - Time: 8 hours total
  - **Status**: ✅ Completed (All 5 components wrapped with React.memo for performance optimization)

- [ ] **Implement database connection pooling**
  - File: `server/services/databaseService.js`
  - Add connection pool management with 10 max connections
  - Time: 8 hours

- [⚠️] **Add request caching layer**
  - File: `src/services/api.js`
  - Implement 5-minute TTL cache for GET requests
  - Time: 4 hours
  - **Status**: ⚠️ Temporarily removed due to axios adapter conflicts - needs alternative implementation

### TypeScript Improvements
- [x] **Replace 'any' types in critical hooks**
  - Files:
    - `src/hooks/useCRUD.ts` (multiple instances) ✅
    - `src/hooks/useWizardValidation.ts` ✅
  - Create proper interfaces
  - Time: 4 hours
  - **Status**: ✅ Completed (Added proper types: FetchParams, CustomActionHandler, ErrorType, FormFieldValue, etc.)

- [ ] **Add PropTypes to top 10 JavaScript components**
  - Focus on components with complex props
  - Time: 4 hours

### Code Quality
- [ ] **Create custom hooks for common patterns**
  - `useErrorState()` - Used in 22 files
  - `useLoadingState()` - Used in 21 files
  - `useFormState()` - Common form handling
  - Time: 6 hours

- [x] **Fix ESLint warning**
  - File: `src/services/baseService.ts`
  - Remove unused import
  - Time: 5 minutes
  - **Status**: ✅ Completed (Removed unused ApiResponse import)

### Security
- [ ] **Migrate CSRF tokens to Redis** (for production)
  - File: `server/middleware/csrf.js`
  - Replace in-memory Map with Redis storage
  - Time: 4 hours

---

## 🔧 Higher Risk/High Reward (>8 hours each)

### Major Refactoring
- [ ] **Split large components (>500 lines)**
  - Priority components:
    - `src/components/reports/ActivityLogsReport.jsx` (996 lines)
    - `src/components/services/AIGenerationManager.jsx` (877 lines)
    - `src/components/rateLimits/RateLimitAnalytics.jsx` (783 lines)
  - Time: 24 hours

- [ ] **Convert critical components to TypeScript**
  - Components:
    - `src/components/connections/ConnectionForm.jsx`
    - `src/features/workflows/WorkflowBuilder.jsx`
    - `src/components/dashboard/Dashboard.jsx`
  - Time: 24 hours

### Testing Infrastructure
- [ ] **Implement E2E testing with Playwright**
  - Set up Playwright
  - Create tests for critical user journeys
  - Time: 24 hours

- [ ] **Add unit tests for utilities**
  - Test validation functions
  - Test formatters and helpers
  - Time: 16 hours

### Bundle Optimization
- [ ] **Implement code splitting for heavy libraries**
  - Libraries: Material-UI, Recharts, ReactFlow
  - Use dynamic imports
  - Time: 16 hours

---

## 📊 Progress Tracking

### Completed Items
*(Move items here as they're completed)*

### Metrics to Track
- [ ] Bundle size (Current: ~3MB, Target: 1.5MB)
- [ ] Lighthouse score (Target: 90+)
- [ ] TypeScript coverage (Current: 18%, Target: 75% for new code)
- [ ] ESLint violations (Current: 1, Target: 0)
- [ ] Console statements in production (Current: 50+, Target: 0)

---

## 📝 Notes

### Commands Reference
```bash
# Format all files
npm run format

# Run ESLint
npm run lint

# Check for 'any' types
npm run lint:any

# Run tests
npm test

# Build for production
npm run build
```

### Priority Order for Quick Wins
1. Run Prettier (5 min) ✨
2. Fix duplicate User schema field (5 min) 🐛
3. Enable ESLint console rule (15 min) 📝
4. Add skip link (30 min) ♿
5. Add React.memo to Dashboard (30 min) ⚡
6. Implement CSRF token caching (1 hr) 🔒
7. Remove console.log statements (2 hrs) 🧹

---

## 🎯 Next Session Goals
- Complete all Quick Wins
- Start on Medium Risk items
- Measure improvement metrics

---

*Last reviewed: 2025-08-30*
*Next review: After completing Quick Wins section*