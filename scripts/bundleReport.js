#!/usr/bin/env node

/**
 * Bundle Report Generator
 * 
 * Generates detailed reports about bundle size, dependencies, and optimization opportunities
 */

const fs = require('fs');
const path = require('path');
const { gzipSync } = require('zlib');

const buildDir = path.join(__dirname, '..', 'build');
const staticDir = path.join(buildDir, 'static');
const jsDir = path.join(staticDir, 'js');
const cssDir = path.join(staticDir, 'css');

function formatSize(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
}

function analyzeFile(filePath) {
  const stats = fs.statSync(filePath);
  const content = fs.readFileSync(filePath);
  const gzipSize = gzipSync(content).length;
  
  return {
    path: filePath,
    name: path.basename(filePath),
    size: stats.size,
    gzipSize,
    sizeFormatted: formatSize(stats.size),
    gzipSizeFormatted: formatSize(gzipSize),
    compressionRatio: (gzipSize / stats.size * 100).toFixed(2) + '%'
  };
}

function generateReport() {
  console.log('📊 Bundle Analysis Report');
  console.log('=' .repeat(50));
  
  if (!fs.existsSync(jsDir)) {
    console.log('❌ Build directory not found. Run npm run build first.');
    return;
  }

  // Analyze JavaScript files
  const jsFiles = fs.readdirSync(jsDir)
    .filter(f => f.endsWith('.js') && !f.endsWith('.map'))
    .map(f => analyzeFile(path.join(jsDir, f)))
    .sort((a, b) => b.size - a.size);

  // Analyze CSS files
  const cssFiles = fs.readdirSync(cssDir)
    .filter(f => f.endsWith('.css') && !f.endsWith('.map'))
    .map(f => analyzeFile(path.join(cssDir, f)))
    .sort((a, b) => b.size - a.size);

  // Calculate totals
  const totalJSSize = jsFiles.reduce((sum, file) => sum + file.size, 0);
  const totalJSGzipSize = jsFiles.reduce((sum, file) => sum + file.gzipSize, 0);
  const totalCSSSize = cssFiles.reduce((sum, file) => sum + file.size, 0);
  const totalCSSGzipSize = cssFiles.reduce((sum, file) => sum + file.gzipSize, 0);

  console.log(`\n📁 JavaScript Bundles (${jsFiles.length} files)`);
  console.log('-' .repeat(50));
  jsFiles.forEach(file => {
    console.log(`${file.name.padEnd(25)} ${file.sizeFormatted.padStart(8)} (${file.gzipSizeFormatted.padStart(8)} gzipped)`);
  });
  console.log('-' .repeat(50));
  console.log(`Total JS:                    ${formatSize(totalJSSize).padStart(8)} (${formatSize(totalJSGzipSize).padStart(8)} gzipped)`);

  console.log(`\n🎨 CSS Files (${cssFiles.length} files)`);
  console.log('-' .repeat(50));
  cssFiles.forEach(file => {
    console.log(`${file.name.padEnd(25)} ${file.sizeFormatted.padStart(8)} (${file.gzipSizeFormatted.padStart(8)} gzipped)`);
  });
  console.log('-' .repeat(50));
  console.log(`Total CSS:                   ${formatSize(totalCSSSize).padStart(8)} (${formatSize(totalCSSGzipSize).padStart(8)} gzipped)`);

  console.log(`\n📈 Overall Statistics`);
  console.log('-' .repeat(50));
  console.log(`Total Bundle Size:           ${formatSize(totalJSSize + totalCSSSize).padStart(8)} (${formatSize(totalJSGzipSize + totalCSSGzipSize).padStart(8)} gzipped)`);
  console.log(`JavaScript Ratio:            ${(totalJSSize / (totalJSSize + totalCSSSize) * 100).toFixed(1)}%`);
  console.log(`CSS Ratio:                   ${(totalCSSSize / (totalJSSize + totalCSSSize) * 100).toFixed(1)}%`);
  console.log(`Overall Compression:         ${((totalJSGzipSize + totalCSSGzipSize) / (totalJSSize + totalCSSSize) * 100).toFixed(1)}%`);

  // Size recommendations
  console.log(`\n💡 Optimization Recommendations`);
  console.log('-' .repeat(50));
  
  const totalGzipSize = totalJSGzipSize + totalCSSGzipSize;
  if (totalGzipSize > 1024 * 1024 * 2) { // > 2MB
    console.log('🔴 Bundle is quite large. Consider code splitting for better performance.');
  } else if (totalGzipSize > 1024 * 500) { // > 500KB
    console.log('🟡 Bundle size is moderate. Code splitting could help with initial load time.');
  } else {
    console.log('🟢 Bundle size looks good for performance.');
  }

  // Check for large individual files
  const largeFiles = jsFiles.filter(f => f.size > 500 * 1024);
  if (largeFiles.length > 0) {
    console.log(`⚠️  Found ${largeFiles.length} large JavaScript file(s). Consider splitting:`);
    largeFiles.forEach(file => {
      console.log(`   - ${file.name}: ${file.sizeFormatted}`);
    });
  }

  console.log(`\n🔍 Analysis Tips:`);
  console.log('• Run "npm run analyze:build" for interactive analysis');
  console.log('• Run "npm run analyze" to view existing bundle composition');
  console.log('• Consider implementing code splitting for routes or large components');
  console.log('• Review third-party dependencies for size optimization opportunities');
}

// Run the analysis
generateReport();