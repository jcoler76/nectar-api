#!/usr/bin/env node

/**
 * Unified Prisma Management Script
 *
 * This script manages the single source of truth Prisma schema
 * and generates clients for all applications from one location.
 *
 * Usage:
 *   node prisma-unified.js generate    - Generate all Prisma clients
 *   node prisma-unified.js migrate     - Run database migrations
 *   node prisma-unified.js push       - Push schema changes to database
 *   node prisma-unified.js studio     - Open Prisma Studio
 *   node prisma-unified.js seed       - Seed the database
 *   node prisma-unified.js reset      - Reset the database
 */

const { execSync } = require('child_process');
const path = require('path');

const SCHEMA_PATH = path.join(__dirname, 'server', 'shared-schema.prisma');
const SERVER_DIR = path.join(__dirname, 'server');

function runCommand(command, cwd = SERVER_DIR) {
  console.log(`\n🔧 Running: ${command}`);
  console.log(`📁 Working directory: ${cwd}`);

  try {
    const result = execSync(command, {
      cwd,
      stdio: 'inherit',
      env: { ...process.env }
    });
    return result;
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

function printUsage() {
  console.log(`
📚 Unified Prisma Management Script

Available commands:
  generate    - Generate all Prisma clients from shared schema
  migrate     - Create and apply database migrations
  push        - Push schema changes directly to database (dev only)
  studio      - Open Prisma Studio database browser
  seed        - Seed the database with initial data
  reset       - Reset database and apply all migrations
  status      - Show migration status

Examples:
  node prisma-unified.js generate
  node prisma-unified.js migrate
  node prisma-unified.js push
  node prisma-unified.js studio
  `);
}

function main() {
  const command = process.argv[2];

  console.log('🎯 Unified Prisma Management');
  console.log(`📋 Schema Location: ${SCHEMA_PATH}`);

  switch (command) {
    case 'generate':
      console.log('\n🏗️  Generating Prisma clients for all applications...');
      runCommand(`npx prisma generate --schema=shared-schema.prisma`);
      console.log('\n✅ All Prisma clients generated successfully!');
      console.log('📦 Generated clients:');
      console.log('   - Server: server/prisma/generated/client');
      console.log('   - Admin Backend: admin-backend/prisma/generated/client');
      console.log('   - Root: prisma/generated/client');
      break;

    case 'migrate':
      console.log('\n🚀 Creating and applying database migration...');
      const migrationName = process.argv[3] || `migration_${Date.now()}`;
      runCommand(`npx prisma migrate dev --name "${migrationName}" --schema=shared-schema.prisma`);
      console.log('✅ Migration completed successfully!');
      break;

    case 'push':
      console.log('\n⚡ Pushing schema changes to database...');
      runCommand(`npx prisma db push --schema=shared-schema.prisma`);
      console.log('✅ Schema pushed successfully!');
      break;

    case 'studio':
      console.log('\n🎨 Opening Prisma Studio...');
      runCommand(`npx prisma studio --schema=shared-schema.prisma`);
      break;

    case 'seed':
      console.log('\n🌱 Seeding database...');
      // Run both main server seed and admin seed
      runCommand(`npm run seed`, SERVER_DIR);
      runCommand(`npm run seed`, path.join(__dirname, 'admin-backend'));
      console.log('✅ Database seeded successfully!');
      break;

    case 'reset':
      console.log('\n🔄 Resetting database...');
      runCommand(`npx prisma migrate reset --schema=shared-schema.prisma --force`);
      console.log('✅ Database reset completed!');
      break;

    case 'status':
      console.log('\n📊 Migration status:');
      runCommand(`npx prisma migrate status --schema=shared-schema.prisma`);
      break;

    case 'help':
    case '--help':
    case '-h':
      printUsage();
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

main();