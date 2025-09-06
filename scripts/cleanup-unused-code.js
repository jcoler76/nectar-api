#!/usr/bin/env node

/**
 * Automated Cleanup Script for Mirabel API
 * Removes confirmed unused files, dependencies, and code
 * 
 * Usage: node scripts/cleanup-unused-code.js [--dry-run] [--category=showcase|deps|utils|all]
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const category = args.find(arg => arg.startsWith('--category='))?.split('=')[1] || 'all';

console.log(`🧹 Mirabel API Code Cleanup Script`);
console.log(`Mode: ${isDryRun ? 'DRY RUN (simulation only)' : 'LIVE CLEANUP'}`);
console.log(`Category: ${category}`);
console.log('---'.repeat(20));

// Files to remove - confirmed safe removals
const UNUSED_FILES = {
  showcase: [
    'src/components/test/DesignSystemTest.jsx',
    'src/components/ui/FormShowcase.jsx', 
    'src/components/ui/ComponentShowcase.jsx',
    'src/components/ui/DataTableShowcase.jsx',
    'src/components/layout/NavigationShowcase.jsx',
    'src/components/rateLimits/RateLimitListTest.jsx',
    'src/setupProxy.js'
  ],
  utils: [
    'src/constants/index.js',
    'src/utils/performanceValidator.ts',
    'src/utils/cssOptimizer.ts',
    'server/middleware/_apiKeyAuth.js',
    'server/utils/_databaseEncryption.js', 
    'server/utils/_database.js'
  ],
  config: [
    'public/worker-javascript.js',
    'server/server-original.js'
  ]
};

// Dependencies to remove from package.json
const UNUSED_DEPENDENCIES = {
  frontend: {
    dependencies: [
      '@date-io/moment',
      '@azure/identity', 
      '@azure/msal-node',
      'ipaddr.js',
      'tedious',
      'express-rate-limit'
    ],
    devDependencies: []
  },
  backend: {
    dependencies: [
      'subscriptions-transport-ws',
      'basic-ftp'
    ],
    devDependencies: []
  }
};

// Specific functions to remove from files
const UNUSED_FUNCTIONS = [
  {
    file: 'server/utils/tokenService.js',
    functions: ['enhanceTokenPayload'],
    lines: [332, 369] // Lines 332-369
  }
];

let totalFilesRemoved = 0;
let totalSizeFreed = 0;
let dependenciesRemoved = 0;

/**
 * Get file size safely
 */
function getFileSize(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch (error) {
    return 0;
  }
}

/**
 * Remove unused files
 */
function removeUnusedFiles(category) {
  console.log(`\n📁 Removing unused files (${category})...`);
  
  const filesToRemove = category === 'all' ? 
    [...UNUSED_FILES.showcase, ...UNUSED_FILES.utils, ...UNUSED_FILES.config] :
    UNUSED_FILES[category] || [];

  filesToRemove.forEach(relativePath => {
    const fullPath = path.resolve(process.cwd(), relativePath);
    const size = getFileSize(fullPath);
    
    if (fs.existsSync(fullPath)) {
      console.log(`  ${isDryRun ? '🔍' : '🗑️ '} ${relativePath} (${(size/1024).toFixed(1)}KB)`);
      
      if (!isDryRun) {
        try {
          fs.unlinkSync(fullPath);
          totalFilesRemoved++;
          totalSizeFreed += size;
        } catch (error) {
          console.log(`    ❌ Error removing ${relativePath}: ${error.message}`);
        }
      } else {
        totalFilesRemoved++;
        totalSizeFreed += size;
      }
    } else {
      console.log(`  ⚠️  File not found: ${relativePath}`);
    }
  });
}

/**
 * Clean up package.json dependencies
 */
function cleanupDependencies() {
  console.log(`\n📦 Cleaning up dependencies...`);
  
  // Frontend package.json
  const frontendPackagePath = path.resolve(process.cwd(), 'package.json');
  cleanupPackageFile(frontendPackagePath, UNUSED_DEPENDENCIES.frontend, 'Frontend');
  
  // Backend package.json
  const backendPackagePath = path.resolve(process.cwd(), 'server/package.json');
  cleanupPackageFile(backendPackagePath, UNUSED_DEPENDENCIES.backend, 'Backend');
}

function cleanupPackageFile(packagePath, unusedDeps, label) {
  if (!fs.existsSync(packagePath)) {
    console.log(`  ⚠️  ${label} package.json not found: ${packagePath}`);
    return;
  }
  
  try {
    const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    let modified = false;
    
    // Remove unused dependencies
    unusedDeps.dependencies.forEach(dep => {
      if (packageContent.dependencies && packageContent.dependencies[dep]) {
        console.log(`  ${isDryRun ? '🔍' : '🗑️'} ${label} dependency: ${dep}`);
        if (!isDryRun) {
          delete packageContent.dependencies[dep];
        }
        modified = true;
        dependenciesRemoved++;
      }
    });
    
    // Remove unused devDependencies  
    unusedDeps.devDependencies.forEach(dep => {
      if (packageContent.devDependencies && packageContent.devDependencies[dep]) {
        console.log(`  ${isDryRun ? '🔍' : '🗑️'} ${label} devDependency: ${dep}`);
        if (!isDryRun) {
          delete packageContent.devDependencies[dep];
        }
        modified = true;
        dependenciesRemoved++;
      }
    });
    
    if (modified && !isDryRun) {
      fs.writeFileSync(packagePath, JSON.stringify(packageContent, null, 2) + '\n');
      console.log(`    ✅ Updated ${label} package.json`);
    }
    
  } catch (error) {
    console.log(`    ❌ Error processing ${label} package.json: ${error.message}`);
  }
}

/**
 * Remove specific unused functions from files
 */
function removeUnusedFunctions() {
  console.log(`\n🔧 Removing unused functions...`);
  
  UNUSED_FUNCTIONS.forEach(({file, functions, lines}) => {
    const fullPath = path.resolve(process.cwd(), file);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`  ⚠️  File not found: ${file}`);
      return;
    }
    
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const contentLines = content.split('\n');
      
      console.log(`  ${isDryRun ? '🔍' : '🗑️'} ${file}: Remove ${functions.join(', ')} (lines ${lines[0]}-${lines[1]})`);
      
      if (!isDryRun && lines.length === 2) {
        // Remove lines from start to end (inclusive, 0-based indexing)
        const startLine = lines[0] - 1; // Convert to 0-based
        const endLine = lines[1] - 1;   // Convert to 0-based
        
        contentLines.splice(startLine, endLine - startLine + 1);
        
        fs.writeFileSync(fullPath, contentLines.join('\n'));
        console.log(`    ✅ Removed function from ${file}`);
      }
      
    } catch (error) {
      console.log(`    ❌ Error processing ${file}: ${error.message}`);
    }
  });
}

/**
 * Main cleanup execution
 */
function main() {
  try {
    if (category === 'all' || category === 'showcase') {
      removeUnusedFiles('showcase');
    }
    
    if (category === 'all' || category === 'utils') {
      removeUnusedFiles('utils');
    }
    
    if (category === 'all' || category === 'config') {
      removeUnusedFiles('config');
    }
    
    if (category === 'all' || category === 'deps') {
      cleanupDependencies();
    }
    
    if (category === 'all' || category === 'functions') {
      removeUnusedFunctions();
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log(`📊 Cleanup Summary ${isDryRun ? '(DRY RUN)' : ''}`);
    console.log('='.repeat(60));
    console.log(`Files processed: ${totalFilesRemoved}`);
    console.log(`Storage freed: ${(totalSizeFreed/1024).toFixed(1)}KB`);
    console.log(`Dependencies removed: ${dependenciesRemoved}`);
    
    if (isDryRun) {
      console.log(`\n✨ Run without --dry-run to apply changes`);
      console.log(`💡 Use --category=showcase|deps|utils|config|functions to target specific cleanup`);
    } else {
      console.log(`\n✅ Cleanup completed successfully!`);
      console.log(`🔄 Remember to run 'npm install' to update node_modules`);
      console.log(`🧪 Run your tests to ensure nothing critical was removed`);
    }
    
  } catch (error) {
    console.error(`❌ Cleanup failed: ${error.message}`);
    process.exit(1);
  }
}

// Execute if called directly
if (require.main === module) {
  main();
}

module.exports = { main, UNUSED_FILES, UNUSED_DEPENDENCIES };