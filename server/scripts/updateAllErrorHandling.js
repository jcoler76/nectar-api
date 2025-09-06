const fs = require('fs');
const path = require('path');

// Comprehensive patterns to find and replace
const errorPatterns = [
  // Pattern 1: Generic 500 error with message exposing details
  {
    pattern: /res\.status\(500\)\.json\(\s*\{\s*message:\s*['"`]Failed to[^'"`]+['"`]\s*\}\s*\)/g,
    replacement: 'errorResponses.serverError(res, error)',
    description: 'Generic 500 error messages',
  },

  // Pattern 2: Error with details field
  {
    pattern: /res\.status\(500\)\.json\(\s*\{[^}]*details:\s*error\.message[^}]*\}\s*\)/g,
    replacement: 'errorResponses.serverError(res, error)',
    description: 'Error details exposure',
  },

  // Pattern 3: Console.error statements (need to be replaced with logger)
  {
    pattern: /console\.error\((['"`][^'"`]+['"`],?\s*)(error|err|e)\)/g,
    replacement: (match, prefix, errorVar) =>
      `logger.error(${prefix}{ error: ${errorVar}.message })`,
    description: 'Console.error statements',
  },

  // Pattern 4: Console.error with object details
  {
    pattern: /console\.error\((['"`][^'"`]+['"`],?\s*)\{[^}]*error:[^}]*\}\)/g,
    replacement: (match, prefix) => {
      // Extract just the message part
      return `logger.error(${prefix}{ error: error.message })`;
    },
    description: 'Console.error with object details',
  },

  // Pattern 5: res.json with error field exposing details
  {
    pattern: /res\.json\(\s*\{\s*error:\s*error\.message\s*\}\s*\)/g,
    replacement: 'errorResponses.serverError(res, error)',
    description: 'res.json with error.message',
  },

  // Pattern 6: Status with error object containing message
  {
    pattern: /res\.status\((\d+)\)\.json\(\s*\{\s*error:\s*\{\s*message:[^}]+\}\s*\}\s*\)/g,
    replacement: (match, statusCode) => {
      const codeMap = {
        400: 'errorResponses.badRequest(res)',
        401: 'errorResponses.unauthorized(res)',
        403: 'errorResponses.forbidden(res)',
        404: 'errorResponses.notFound(res)',
        409: 'errorResponses.conflict(res)',
        422: 'errorResponses.validationError(res)',
        500: 'errorResponses.serverError(res, error)',
        503: 'errorResponses.serviceUnavailable(res)',
      };
      return codeMap[statusCode] || 'errorResponses.serverError(res, error)';
    },
    description: 'Status codes with error objects',
  },

  // Pattern 7: Direct error message concatenation
  {
    pattern:
      /res\.status\(500\)\.json\(\s*\{\s*message:\s*['"`][^'"`]+['"`]\s*\+\s*error\.message[^}]*\}\s*\)/g,
    replacement: 'errorResponses.serverError(res, error)',
    description: 'Concatenated error messages',
  },

  // Pattern 8: Error stack exposure
  {
    pattern: /res\.status\(500\)\.json\(\s*\{[^}]*stack:\s*error\.stack[^}]*\}\s*\)/g,
    replacement: 'errorResponses.serverError(res, error)',
    description: 'Stack trace exposure',
  },
];

// Process all route files
function processAllRoutes() {
  const routesDir = path.join(__dirname, '..', 'routes');
  const files = fs.readdirSync(routesDir).filter(file => file.endsWith('.js'));

  console.log(`🔍 Found ${files.length} route files to process\n`);

  let totalUpdates = 0;

  files.forEach(file => {
    const filePath = path.join(routesDir, file);
    const updates = processFile(filePath);
    totalUpdates += updates;
  });

  return totalUpdates;
}

// Process a single file
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;
    const changes = [];
    let updateCount = 0;

    // Apply each pattern
    for (const { pattern, replacement, description } of errorPatterns) {
      const matches = [...content.matchAll(pattern)];
      if (matches.length > 0) {
        content = content.replace(pattern, replacement);
        updated = true;
        updateCount += matches.length;
        changes.push(`  - ${description}: ${matches.length} occurrences`);
      }
    }

    // Add imports if needed
    if (updated) {
      content = addImportsIfNeeded(content);
    }

    // Write back if changes were made
    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated ${path.basename(filePath)}`);
      changes.forEach(change => console.log(change));
      console.log('');
    }

    return updateCount;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return 0;
  }
}

// Add import statements if needed
function addImportsIfNeeded(content) {
  const needsErrorResponses =
    content.includes('errorResponses') && !content.includes('errorResponses');
  const needsLogger = content.includes('logger.error') && !content.includes('logger');

  if (!needsErrorResponses && !needsLogger) {
    return content;
  }

  // Find the last require statement
  const requirePattern = /const\s+.*=\s*require\(.*\);/g;
  const matches = [...content.matchAll(requirePattern)];

  if (matches.length > 0) {
    const lastRequire = matches[matches.length - 1];
    const insertPosition = lastRequire.index + lastRequire[0].length;

    let imports = '';

    // Check if we already have errorHandler import
    if (needsErrorResponses && !content.includes("require('../utils/errorHandler')")) {
      imports += "\nconst { errorResponses } = require('../utils/errorHandler');";
    }

    // Check if we already have logger import
    if (
      needsLogger &&
      !content.includes("require('../middleware/logger')") &&
      !content.includes("require('../utils/logger')")
    ) {
      imports += "\nconst { logger } = require('../middleware/logger');";
    }

    if (imports) {
      return content.slice(0, insertPosition) + imports + content.slice(insertPosition);
    }
  }

  return content;
}

// Main execution
console.log('🔧 Comprehensive Error Handling Update\n');
console.log('This script will update all route files to use safe error responses.\n');

const totalUpdates = processAllRoutes();

console.log('\n✨ Error handling update complete!');
console.log(`📊 Total updates made: ${totalUpdates}`);
console.log('\n📝 Next steps:');
console.log('1. Review the changes in your version control system');
console.log('2. Run your test suite to ensure everything works');
console.log('3. Check that logger imports are correct');
console.log('4. Verify error responses in different scenarios');
