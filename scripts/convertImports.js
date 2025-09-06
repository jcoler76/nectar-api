#!/usr/bin/env node

/**
 * Convert Relative Imports to Absolute Imports Script
 * Converts ../../../ imports to @/ imports for better maintainability
 */

const fs = require('fs');
const path = require('path');

function convertImportsInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Convert relative imports to absolute imports
    let convertedContent = content
      // Convert ../../components/* to @/components/*
      .replace(/from\s+['"]\.\.\/\.\.\/components\/([^'"]+)['"]/g, "from '@/components/$1'")
      // Convert ../../hooks/* to @/hooks/*
      .replace(/from\s+['"]\.\.\/\.\.\/hooks\/([^'"]+)['"]/g, "from '@/hooks/$1'")
      // Convert ../../utils/* to @/utils/*
      .replace(/from\s+['"]\.\.\/\.\.\/utils\/([^'"]+)['"]/g, "from '@/utils/$1'")
      // Convert ../../services/* to @/services/*
      .replace(/from\s+['"]\.\.\/\.\.\/services\/([^'"]+)['"]/g, "from '@/services/$1'")
      // Convert ../../context/* to @/context/*
      .replace(/from\s+['"]\.\.\/\.\.\/context\/([^'"]+)['"]/g, "from '@/context/$1'")
      // Convert import statements too
      .replace(/import\s+([^'"]+)\s+from\s+['"]\.\.\/\.\.\/components\/([^'"]+)['"]/g, "import $1 from '@/components/$2'")
      .replace(/import\s+([^'"]+)\s+from\s+['"]\.\.\/\.\.\/hooks\/([^'"]+)['"]/g, "import $1 from '@/hooks/$2'")
      .replace(/import\s+([^'"]+)\s+from\s+['']\.\.\/\.\.\/utils\/([^'"]+)['"]/g, "import $1 from '@/utils/$2'")
      .replace(/import\s+([^'"]+)\s+from\s+['"]\.\.\/\.\.\/services\/([^'"]+)['"]/g, "import $1 from '@/services/$2'")
      .replace(/import\s+([^'"]+)\s+from\s+['"]\.\.\/\.\.\/context\/([^'"]+)['"]/g, "import $1 from '@/context/$2'");
    
    if (content !== convertedContent) {
      fs.writeFileSync(filePath, convertedContent, 'utf8');
      console.log(`✅ Converted imports in: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function findFiles(dir, pattern = /\.(js|jsx|ts|tsx)$/) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (stat.isFile() && pattern.test(item)) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

function main() {
  const srcDir = path.join(__dirname, '..', 'src');
  const files = findFiles(srcDir);
  
  console.log('🔄 Converting relative imports to absolute imports...');
  console.log(`Found ${files.length} files to process`);
  
  let convertedCount = 0;
  
  for (const file of files) {
    if (convertImportsInFile(file)) {
      convertedCount++;
    }
  }
  
  console.log(`\n📊 Conversion complete!`);
  console.log(`   Files processed: ${files.length}`);
  console.log(`   Files converted: ${convertedCount}`);
  console.log(`   Files unchanged: ${files.length - convertedCount}`);
  
  if (convertedCount > 0) {
    console.log('\n💡 Remember to test your application after conversion!');
    console.log('   Run: npm start');
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { convertImportsInFile, findFiles };