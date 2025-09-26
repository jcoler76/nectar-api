const fs = require('fs');
const path = require('path');

// Patterns to find and replace
const errorPatterns = [
  // Pattern 1: res.status(500).json({ ... error: error.message })
  {
    pattern: /res\.status\((\d+)\)\.json\(\{([^}]*?)error:\s*error\.message[^}]*?\}\)/g,
    replacement: 'errorResponses.serverError(res, error)',
    description: 'Direct error.message exposure',
  },
  // Pattern 2: res.status(500).json({ ... message: '...' + error.message })
  {
    pattern:
      /res\.status\(500\)\.json\(\{[^}]*?message:\s*['"`][^'"`]*?['"`]\s*\+\s*error\.message[^}]*?\}\)/g,
    replacement: 'errorResponses.serverError(res, error)',
    description: 'Concatenated error.message',
  },
  // Pattern 3: res.json({ ... error: error.message })
  {
    pattern: /res\.json\(\{([^}]*?)error:\s*error\.message[^}]*?\}\)/g,
    replacement: 'errorResponses.serverError(res, error)',
    description: 'Direct error.message in res.json',
  },
  // Pattern 4: console.error with stack trace
  {
    pattern: /console\.error\(['"`]Stack trace:['"]\s*,\s*error\.stack\)/g,
    replacement: "logger.error('Error occurred', { error: error.message })",
    description: 'Stack trace logging',
  },
];

// Files to update
const routeFiles = [
  'routes/services.js',
  'routes/ai.js',
  'routes/workflows.js',
  'routes/publicApi.js',
  'routes/developer.js',
  'routes/endpoints.js',
  'routes/users.js',
  'routes/roles.js',
  'routes/applications.js',
  // 'routes/schemaIntelligence.js', // REMOVED - deprecated route
  'routes/files.js',
  'routes/email.js',
  'routes/webhooks.js',
  'routes/forms.js',
];

// Add import statement if not present
function addImportIfNeeded(content, filename) {
  const hasErrorResponses = content.includes('errorResponses');
  const hasImport = content.includes("require('../utils/errorHandler')");

  if (hasErrorResponses && !hasImport) {
    // Find the last require statement
    const requirePattern = /const\s+.*=\s*require\(.*\);/g;
    const matches = [...content.matchAll(requirePattern)];

    if (matches.length > 0) {
      const lastRequire = matches[matches.length - 1];
      const insertPosition = lastRequire.index + lastRequire[0].length;

      const importStatement =
        "\nconst { asyncHandler, errorResponses } = require('../utils/errorHandler');";

      return content.slice(0, insertPosition) + importStatement + content.slice(insertPosition);
    }
  }

  return content;
}

// Process a single file
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;
    const changes = [];

    // Apply each pattern
    for (const { pattern, replacement, description } of errorPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, replacement);
        updated = true;
        changes.push(`  - ${description}: ${matches.length} occurrences`);
      }
    }

    // Add import if needed
    if (updated) {
      content = addImportIfNeeded(content, filePath);
    }

    // Write back if changes were made
    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated ${filePath}`);
      changes.forEach(change => console.log(change));
    } else {
      console.log(`⏭️  No changes needed in ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

// Main execution
console.log('🔍 Scanning for error handling issues...\n');

routeFiles.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    processFile(fullPath);
  } else {
    console.log(`⚠️  File not found: ${file}`);
  }
});

console.log('\n✨ Error handling update complete!');
console.log('\n📝 Next steps:');
console.log('1. Review the changes to ensure they are correct');
console.log('2. Test error handling in different scenarios');
console.log('3. Update any custom error handling logic');
console.log('4. Ensure logger is properly imported where needed');
