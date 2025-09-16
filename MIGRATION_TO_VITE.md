# Migration Guide: Create React App to Vite

## Overview

This document outlines the steps to migrate the main application from Create React App (CRA) to Vite for consistency with the admin portal and improved development experience.

## Current State

- **Main App (ports 3000/3001)**: Create React App with react-app-rewired
- **Admin App (ports 4000/4001)**: Vite with React
- **Problem**: Two different build systems causing environment variable conflicts and maintenance complexity

## Benefits of Migration

### Performance Improvements
- **Faster dev server**: Vite uses native ES modules, ~10x faster than webpack
- **Faster builds**: Rollup-based production builds are typically 2-3x faster
- **Hot Module Replacement**: Near-instantaneous updates during development

### Developer Experience
- **Unified tooling**: Same build system across all apps
- **Modern standards**: Native ES modules, better TypeScript support
- **Better debugging**: Source maps and error reporting

### Maintenance
- **Single build pipeline**: Reduce complexity and maintenance overhead
- **Consistent environment variables**: `VITE_*` across all applications
- **Modern ecosystem**: Better plugin ecosystem and community support

## Migration Complexity Assessment

**Risk Level**: Medium-High ⚠️
**Estimated Time**: 2-3 days focused work
**Testing Required**: Extensive (all features, integrations, build pipeline)

## Pre-Migration Checklist

- [ ] Backup current working state
- [ ] Document all current webpack customizations
- [ ] Identify all environment variables (`REACT_APP_*`)
- [ ] List all custom webpack plugins and loaders
- [ ] Test current functionality thoroughly
- [ ] Plan rollback strategy

## Step-by-Step Migration Plan

### Phase 1: Preparation (4-6 hours)

1. **Environment Audit**
   ```bash
   # Find all REACT_APP_ environment variables
   grep -r "REACT_APP_" src/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx"
   ```

2. **Dependency Analysis**
   - Review current `config-overrides.js` customizations
   - Document Node.js polyfills requirements
   - List webpack-specific dependencies

3. **Create Migration Branch**
   ```bash
   git checkout -b migrate-to-vite
   git push -u origin migrate-to-vite
   ```

### Phase 2: Vite Configuration (6-8 hours)

1. **Install Vite Dependencies**
   ```bash
   npm install --save-dev vite @vitejs/plugin-react
   npm install --save-dev @types/node  # if using TypeScript
   ```

2. **Create `vite.config.ts`**
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
     define: {
       global: 'globalThis',
     },
     server: {
       port: 3000,
       host: true,
     },
     build: {
       outDir: 'build',
       sourcemap: true,
     },
   })
   ```

3. **Configure Node.js Polyfills** (Critical - see detailed config below)

4. **Update package.json scripts**
   ```json
   {
     "scripts": {
       "start": "vite",
       "build": "vite build",
       "preview": "vite preview",
       "test": "vitest"
     }
   }
   ```

### Phase 3: Code Updates (4-6 hours)

1. **Environment Variables**
   - Change all `process.env.REACT_APP_*` to `import.meta.env.VITE_*`
   - Update `.env` files to use `VITE_` prefix

2. **Import Updates**
   - Change `import.meta.url` usage if any
   - Update dynamic imports if needed

3. **Index.html Migration**
   - Move `public/index.html` to project root
   - Update script references to use `/src/main.jsx` or `/src/main.tsx`

### Phase 4: Testing Migration (6-8 hours)

1. **Development Testing**
   ```bash
   npm start  # Should start Vite dev server
   ```

2. **Build Testing**
   ```bash
   npm run build
   npm run preview
   ```

3. **Feature Testing**
   - Test all major application features
   - Verify all integrations work
   - Check bundle analyzer functionality
   - Test environment variables

### Phase 5: Production Deployment (2-4 hours)

1. **Update CI/CD pipelines**
2. **Update deployment scripts**
3. **Performance benchmarking**

## Critical Configuration Details

### Node.js Polyfills Configuration

Your current app requires extensive Node.js polyfills. In Vite, add to `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['buffer', 'process'],
  },
  build: {
    rollupOptions: {
      plugins: [
        NodeGlobalsPolyfillPlugin({
          process: true,
          buffer: true,
        }),
        NodeModulesPolyfillPlugin(),
      ],
    },
  },
})
```

**Required Dependencies**:
```bash
npm install --save-dev @esbuild-plugins/node-globals-polyfill @esbuild-plugins/node-modules-polyfill
npm install buffer process
```

### Environment Variables Migration

**Current (CRA)**:
```javascript
const apiUrl = process.env.REACT_APP_API_URL
```

**New (Vite)**:
```javascript
const apiUrl = import.meta.env.VITE_API_URL
```

**Environment Files**:
- `.env.local` → `.env.local`
- `REACT_APP_*` → `VITE_*`

### Bundle Analyzer Migration

**Current**: webpack-bundle-analyzer in config-overrides.js
**New**: rollup-plugin-visualizer

```bash
npm install --save-dev rollup-plugin-visualizer
```

```typescript
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    process.env.ANALYZE && visualizer({
      filename: 'dist/stats.html',
      open: true,
    }),
  ].filter(Boolean),
})
```

## Testing Strategy

### Pre-Migration Testing
- [ ] Document current functionality
- [ ] Run all tests and record results
- [ ] Performance baseline (build time, bundle size)
- [ ] Screenshot key UI components

### Post-Migration Testing
- [ ] Development server startup
- [ ] Hot reload functionality
- [ ] Production build
- [ ] All environment variables work
- [ ] Bundle analyzer integration
- [ ] All existing tests pass
- [ ] Performance comparison

## Rollback Plan

If issues arise:

1. **Immediate Rollback**
   ```bash
   git checkout main
   npm install  # Restore CRA dependencies
   npm start
   ```

2. **Preserve Migration Work**
   ```bash
   git stash  # Save current progress
   git checkout main
   # Fix immediate issues, then return to migration branch
   ```

## Files That Need Updates

Based on current analysis:

### Environment Variable Files (30+ occurrences)
- `src/config.ts`
- `src/services/api.js`
- `src/services/rateLimitApiSafe.js`
- `src/services/rateLimitApi.js`
- `src/index.js`
- `src/utils/captcha.js`
- `src/utils/testUtils.js`
- `src/setupTests.js`
- All workflow panel components
- Various UI components

### Configuration Files
- `config-overrides.js` → Delete
- `package.json` → Update scripts
- Create `vite.config.ts`
- Update `index.html`

## Success Metrics

- [ ] Dev server starts in <2 seconds (vs current ~30 seconds)
- [ ] Hot reload works in <500ms
- [ ] Production build completes in <50% current time
- [ ] All tests pass
- [ ] Bundle size remains similar or smaller
- [ ] All features work identically

## Potential Issues & Solutions

### Issue: "process is not defined"
**Solution**: Add Node.js polyfills configuration

### Issue: Dynamic imports fail
**Solution**: Update import syntax for Vite compatibility

### Issue: Environment variables undefined
**Solution**: Verify `VITE_` prefix and restart dev server

### Issue: CSS/TailwindCSS not working
**Solution**: Ensure PostCSS config is correct for Vite

## Timeline Recommendation

**Option 1: Phased Migration (Recommended)**
- Week 1: Preparation and planning
- Week 2: Development environment migration
- Week 3: Testing and refinement
- Week 4: Production deployment

**Option 2: Sprint Migration**
- 3 consecutive days of focused work
- Higher risk but faster completion

## Next Steps

1. **Review this document** with the team
2. **Schedule migration window** when breaking changes are acceptable
3. **Create feature branch** for migration work
4. **Begin with Phase 1** (Preparation)

---

**Note**: This migration should be treated as a significant infrastructure change. Thorough testing is essential before production deployment.