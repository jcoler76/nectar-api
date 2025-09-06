# Webpack Bundle Analyzer Guide

This guide explains how to use the webpack bundle analyzer tools to optimize bundle size and identify performance improvement opportunities.

## 🔍 Available Commands

### Quick Analysis
```bash
# Generate text-based bundle report
npm run analyze:report

# Quick analysis of existing build (basic, no dependencies)
npm run analyze:quick
```

### Detailed Analysis
```bash
# Build with analyzer and open interactive server
npm run analyze:build

# Analyze existing build with interactive server
npm run analyze

# Generate static HTML report
npm run analyze:static

# Force rebuild and analyze
npm run analyze:force
```

## 📊 Understanding Bundle Analysis

### Bundle Report Output
The `npm run analyze:report` command provides a quick overview:

```
📊 Bundle Analysis Report
==================================================

📁 JavaScript Bundles (2 files)
--------------------------------------------------
main.053ed1d5.js           5.41 MB ( 1.43 MB gzipped)
453.c5293798.chunk.js      4.38 KB ( 1.73 KB gzipped)
--------------------------------------------------
Total JS:                     5.41 MB ( 1.43 MB gzipped)

💡 Optimization Recommendations
--------------------------------------------------
⚠️  Found 1 large JavaScript file(s). Consider splitting:
   - main.053ed1d5.js: 5.41 MB
```

### Interactive Analysis
For detailed dependency analysis, use `npm run analyze:build` which:
1. Builds the application with webpack stats generation
2. Opens an interactive treemap visualization at `http://localhost:8888`
3. Shows exact package sizes and dependencies

## 🎯 Bundle Optimization Strategies

### 1. Code Splitting
**Target**: Large main bundle (>1MB uncompressed)
**Solution**: Implement route-based code splitting

```jsx
// Before: All components in main bundle
import Dashboard from './pages/Dashboard';
import WorkflowBuilder from './features/workflows/WorkflowBuilder';

// After: Dynamic imports for route splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const WorkflowBuilder = lazy(() => import('./features/workflows/WorkflowBuilder'));
```

### 2. Large Dependency Analysis
Use the interactive analyzer to identify:
- Unused dependencies that can be removed
- Large libraries with smaller alternatives
- Dependencies that can be loaded dynamically

### 3. Bundle Size Targets
- **Total Bundle (gzipped)**: < 1MB for optimal performance
- **Initial Bundle**: < 500KB gzipped
- **Individual Chunks**: < 250KB gzipped

## 🔧 Configuration Details

### Webpack Configuration
The bundle analyzer is configured in `config-overrides.js`:

```javascript
// Add Bundle Analyzer plugin when ANALYZE env variable is set
if (process.env.ANALYZE === 'true') {
  config.plugins.push(
    new BundleAnalyzerPlugin({
      analyzerMode: 'server',
      analyzerPort: 8888,
      openAnalyzer: true,
      generateStatsFile: true,
      statsFilename: 'bundle-stats.json'
    })
  );
}
```

### Generated Files
- `build/bundle-stats.json`: Webpack compilation statistics
- Bundle analyzer report: Accessible at `http://localhost:8888` (server mode)
- Static HTML report: `build/report.html` (static mode)

## 📈 Regular Monitoring

### CI/CD Integration
Consider adding bundle size monitoring to your deployment pipeline:

```bash
# In your CI pipeline
npm run build
npm run analyze:report
# Add checks for bundle size limits
```

### Performance Budget
Set up performance budgets based on your analysis:

```json
{
  "budgets": [
    {
      "type": "initial",
      "maximumWarning": "500kb",
      "maximumError": "1mb"
    },
    {
      "type": "anyComponentStyle",
      "maximumWarning": "50kb"
    }
  ]
}
```

## 🚨 Common Issues

### Large Dependencies
If the analyzer shows large packages:
1. Check if they're actually being used
2. Look for tree-shaking opportunities
3. Consider dynamic imports for non-critical features
4. Evaluate lighter alternatives

### Duplicate Dependencies
Watch for:
- Multiple versions of the same package
- Overlapping functionality in different packages
- Dependencies that could be peer dependencies

### Bundle Splitting Opportunities
Look for:
- Large vendor chunks that could be split
- Route-specific code that could be lazy-loaded
- Feature modules that could be dynamically imported

## 🔍 Next Steps

Based on your bundle analysis, consider implementing:

1. **Route-based code splitting** for main application routes
2. **Component-level splitting** for large feature components  
3. **Vendor chunk optimization** for third-party dependencies
4. **Tree-shaking improvements** to eliminate unused code
5. **Dynamic imports** for conditional features

## 📚 Additional Resources

- [Webpack Bundle Analyzer Documentation](https://github.com/webpack-contrib/webpack-bundle-analyzer)
- [React Code Splitting Guide](https://react.dev/reference/react/lazy)
- [Web Performance Budgets](https://web.dev/performance-budgets-101/)