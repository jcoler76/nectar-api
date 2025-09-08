#!/usr/bin/env node

/**
 * Bundle Analysis Script
 * 
 * This script provides bundle analysis capabilities for the Nectar Studio frontend.
 * It integrates with webpack-bundle-analyzer to provide insights into bundle size
 * and optimization opportunities.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '..', 'build');
const jsDir = path.join(buildDir, 'static', 'js');

function checkBuildExists() {
  if (!fs.existsSync(jsDir)) {
    console.log('❌ No build directory found. Running build first...');
    return false;
  }
  
  const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith('.js') && !f.endsWith('.map'));
  if (jsFiles.length === 0) {
    console.log('❌ No JavaScript bundle files found. Running build first...');
    return false;
  }
  
  console.log(`✅ Found ${jsFiles.length} JavaScript bundles to analyze`);
  return true;
}

function runAnalyzer(mode = 'server') {
  const statsFile = path.join(buildDir, 'bundle-stats.json');
  
  // Check if we have webpack stats file (from ANALYZE=true build)
  if (fs.existsSync(statsFile)) {
    console.log(`🔍 Analyzing bundles using stats file in ${mode} mode...`);
    
    const args = [
      'webpack-bundle-analyzer',
      statsFile,
      '--mode', mode
    ];
    
    if (mode === 'server') {
      args.push('--port', '8888');
    }
    
    const child = spawn('npx', args, {
      stdio: 'inherit',
      shell: true
    });
    
    child.on('error', (error) => {
      console.error('❌ Error running bundle analyzer:', error);
    });
    
    child.on('exit', (code) => {
      if (code === 0) {
        console.log('✅ Bundle analysis complete');
      } else {
        console.error(`❌ Bundle analyzer exited with code ${code}`);
      }
    });
  } else {
    // Fallback to analyzing individual JS files (less detailed)
    console.log('📝 No stats file found. Using basic bundle analysis...');
    console.log('💡 For detailed analysis, run: npm run analyze:build');
    
    const jsFiles = fs.readdirSync(jsDir)
      .filter(f => f.endsWith('.js') && !f.endsWith('.map'))
      .map(f => path.join(jsDir, f));

    console.log(`🔍 Analyzing ${jsFiles.length} bundle files in ${mode} mode...`);
    
    const args = [
      'webpack-bundle-analyzer',
      ...jsFiles,
      '--mode', mode
    ];
    
    if (mode === 'server') {
      args.push('--port', '8888');
    }
    
    const child = spawn('npx', args, {
      stdio: 'inherit',
      shell: true
    });
    
    child.on('error', (error) => {
      console.error('❌ Error running bundle analyzer:', error);
    });
    
    child.on('exit', (code) => {
      if (code === 0) {
        console.log('✅ Bundle analysis complete');
      } else {
        console.error(`❌ Bundle analyzer exited with code ${code}`);
      }
    });
  }
}

function buildAndAnalyze() {
  console.log('🔨 Building application...');
  
  const buildProcess = spawn('npm', ['run', 'build'], {
    stdio: 'inherit',
    shell: true
  });
  
  buildProcess.on('exit', (code) => {
    if (code === 0) {
      console.log('✅ Build complete. Starting analysis...');
      setTimeout(() => runAnalyzer(), 1000);
    } else {
      console.error(`❌ Build failed with code ${code}`);
    }
  });
}

// Parse command line arguments
const args = process.argv.slice(2);
const mode = args.includes('--static') ? 'static' : 'server';

if (args.includes('--help')) {
  console.log(`
Bundle Analyzer Script

Usage: node scripts/bundleAnalyzer.js [options]

Options:
  --help     Show this help message
  --static   Generate static HTML report instead of server mode
  --force    Force rebuild even if bundle files exist

Examples:
  node scripts/bundleAnalyzer.js           # Interactive server mode
  node scripts/bundleAnalyzer.js --static  # Generate static HTML report
  node scripts/bundleAnalyzer.js --force   # Force rebuild and analyze
`);
  process.exit(0);
}

// Main execution
if (args.includes('--force') || !checkBuildExists()) {
  buildAndAnalyze();
} else {
  runAnalyzer(mode);
}