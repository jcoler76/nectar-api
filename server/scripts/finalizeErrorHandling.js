const fs = require('fs');
const path = require('path');

// Final cleanup patterns
const cleanupPatterns = [
  // Pattern 1: Replace console.log with logger.info
  {
    pattern: /console\.log\(/g,
    replacement: 'logger.info(',
    description: 'Console.log statements',
    needsLogger: true,
  },

  // Pattern 2: Fix remaining status(500).json patterns
  {
    pattern: /res\.status\(500\)\.json\(\s*\{\s*message:\s*error\.message\s*\}\s*\)/g,
    replacement: 'errorResponses.serverError(res, error)',
    description: 'Direct error.message in 500 responses',
    needsErrorResponses: true,
  },

  // Pattern 3: Fix 404 responses to be consistent
  {
    pattern: /return\s+res\.status\(404\)\.json\(\s*\{\s*message:\s*['"`]([^'"`]+)['"`]\s*\}\s*\)/g,
    replacement: (match, message) => {
      // Keep specific 404 messages for clarity
      return `return res.status(404).json({ error: { code: 'NOT_FOUND', message: '${message}' } })`;
    },
    description: '404 response format',
  },

  // Pattern 4: Fix 400 responses to be consistent
  {
    pattern: /return\s+res\.status\(400\)\.json\(\s*\{\s*message:\s*['"`]([^'"`]+)['"`]\s*\}\s*\)/g,
    replacement: (match, message) => {
      return `return res.status(400).json({ error: { code: 'BAD_REQUEST', message: '${message}' } })`;
    },
    description: '400 response format',
  },

  // Pattern 5: Fix 401 responses
  {
    pattern: /return\s+res\.status\(401\)\.json\(\s*\{\s*message:\s*['"`]([^'"`]+)['"`]\s*\}\s*\)/g,
    replacement: (match, message) => {
      return `return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: '${message}' } })`;
    },
    description: '401 response format',
  },

  // Pattern 6: Fix 403 responses
  {
    pattern: /return\s+res\.status\(403\)\.json\(\s*\{\s*message:\s*['"`]([^'"`]+)['"`]\s*\}\s*\)/g,
    replacement: (match, message) => {
      return `return res.status(403).json({ error: { code: 'FORBIDDEN', message: '${message}' } })`;
    },
    description: '403 response format',
  },

  // Pattern 7: Fix 409 responses
  {
    pattern: /return\s+res\.status\(409\)\.json\(\s*\{\s*message:\s*['"`]([^'"`]+)['"`]\s*\}\s*\)/g,
    replacement: (match, message) => {
      return `return res.status(409).json({ error: { code: 'CONFLICT', message: '${message}' } })`;
    },
    description: '409 response format',
  },
];

// Process all route files
function processAllRoutes() {
  const routesDir = path.join(__dirname, '..', 'routes');
  const files = fs.readdirSync(routesDir).filter(file => file.endsWith('.js'));

  console.log(`🔍 Processing ${files.length} route files for final cleanup\n`);

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
    let needsLogger = false;
    let needsErrorResponses = false;

    // Apply each pattern
    for (const pattern of cleanupPatterns) {
      const matches = [...content.matchAll(pattern.pattern)];
      if (matches.length > 0) {
        content = content.replace(pattern.pattern, pattern.replacement);
        updated = true;
        updateCount += matches.length;
        changes.push(`  - ${pattern.description}: ${matches.length} occurrences`);

        if (pattern.needsLogger) needsLogger = true;
        if (pattern.needsErrorResponses) needsErrorResponses = true;
      }
    }

    // Add imports if needed
    if (updated && (needsLogger || needsErrorResponses)) {
      content = addImportsIfNeeded(content, needsLogger, needsErrorResponses);
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
function addImportsIfNeeded(content, needsLogger, needsErrorResponses) {
  // Check what's already imported
  const hasLogger =
    content.includes("require('../middleware/logger')") ||
    content.includes("require('../utils/logger')");
  const hasErrorResponses = content.includes("require('../utils/errorHandler')");

  if (needsLogger && hasLogger && needsErrorResponses && hasErrorResponses) {
    return content;
  }

  // Find the last require statement
  const requirePattern = /const\s+.*=\s*require\(.*\);/g;
  const matches = [...content.matchAll(requirePattern)];

  if (matches.length > 0) {
    const lastRequire = matches[matches.length - 1];
    const insertPosition = lastRequire.index + lastRequire[0].length;

    let imports = '';

    if (needsLogger && !hasLogger) {
      imports += "\nconst { logger } = require('../middleware/logger');";
    }

    if (needsErrorResponses && !hasErrorResponses) {
      // Check if we need to add to existing errorHandler import
      const errorHandlerMatch = content.match(
        /const\s*\{([^}]+)\}\s*=\s*require\(['"]\.\.\/utils\/errorHandler['"]\)/
      );
      if (errorHandlerMatch) {
        // Add errorResponses to existing import
        const currentImports = errorHandlerMatch[1];
        if (!currentImports.includes('errorResponses')) {
          const newImports = currentImports.trim() + ', errorResponses';
          content = content.replace(
            errorHandlerMatch[0],
            `const { ${newImports} } = require('../utils/errorHandler')`
          );
        }
      } else {
        imports += "\nconst { errorResponses } = require('../utils/errorHandler');";
      }
    }

    if (imports) {
      return content.slice(0, insertPosition) + imports + content.slice(insertPosition);
    }
  }

  return content;
}

// Main execution
console.log('🧹 Final Error Handling Cleanup\n');
console.log('This script will finalize error handling and logging.\n');

const totalUpdates = processAllRoutes();

console.log('\n✨ Final cleanup complete!');
console.log(`📊 Total updates made: ${totalUpdates}`);
console.log('\n✅ Error handling implementation is now complete!');
