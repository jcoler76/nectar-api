# Bundle Analysis Guide

This document describes the webpack bundle analysis setup for the Mirabel API frontend.

## Overview

The project uses `webpack-bundle-analyzer` to provide insights into:
- Bundle size composition
- Module dependencies
- Optimization opportunities
- Duplicate dependencies

## Available Commands

### Primary Commands

```bash
# Interactive analysis (opens browser with bundle visualization)
npm run analyze

# Generate static HTML report
npm run analyze:static

# Force rebuild and analyze (ignores existing build)
npm run analyze:force

# Analyze existing build files only
npm run analyze:existing
```

### Advanced Usage

```bash
# Direct script usage with options
node scripts/bundleAnalyzer.js --help
node scripts/bundleAnalyzer.js --static
node scripts/bundleAnalyzer.js --force
```

## How It Works

1. **Build Detection**: Script checks if build files exist in `build/static/js/`
2. **Conditional Building**: Only rebuilds if necessary (unless `--force` is used)
3. **Analysis Modes**:
   - **Server Mode** (default): Opens interactive browser interface on port 8888
   - **Static Mode**: Generates `bundle-report.html` file

## Bundle Optimization Insights

The analyzer helps identify:

### Performance Issues
- Large dependencies that could be code-split
- Duplicate modules across chunks
- Unused code that could be tree-shaken

### Optimization Opportunities
- **Code Splitting**: Split large routes/components into separate chunks
- **Dynamic Imports**: Load components only when needed  
- **Dependency Analysis**: Find opportunities to replace heavy libraries

## Integration with Development Workflow

### After Major Changes
Run bundle analysis after:
- Adding new dependencies
- Implementing new features
- Performance optimization work

### Monitoring Bundle Size
- Current bundle size targets are documented in `CODESCOREIMPROVEMENT.md`
- Target: Bundle size < 1.5MB (gzipped)
- Use analyzer to track progress toward size goals

## Technical Details

### Configuration
- Bundle analyzer is integrated via `config-overrides.js`
- Uses environment variable `ANALYZE=true` to conditionally enable
- Generates stats file at `build/bundle-stats.json` when enabled

### Script Features
- Cross-platform compatibility (Windows/Linux/Mac)
- Automatic build detection and conditional building
- Multiple analysis modes for different use cases
- Comprehensive error handling and user feedback

## Troubleshooting

### Build Issues
If analysis fails due to build issues:
```bash
# Force clean build
npm run analyze:force
```

### Port Conflicts
If port 8888 is in use:
- The analyzer will automatically find an available port
- Or use static mode: `npm run analyze:static`

### No Bundle Files Found
Ensure the build completed successfully:
- Check `build/static/js/` directory exists
- Verify JavaScript files are present (not just .map files)
- Run `npm run build` manually to debug build issues

## Next Steps

This bundle analysis setup enables the next medium-risk items in the code improvement plan:
- **Route-based code splitting** - Use analyzer to identify largest components
- **Performance optimizations** - Target highest-impact modules first
- **Bundle size monitoring** - Track progress toward < 1.5MB target