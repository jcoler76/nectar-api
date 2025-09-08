#!/usr/bin/env node

/**
 * Create PostgreSQL Admin User for Silo B
 * Creates organization and admin user using Prisma/PostgreSQL
 */

const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createPostgreSQLAdmin() {
  const email = 'meadmin@jestincoler.com';
  const password = '<password>';
  const organizationName = 'Jestin Coler Organization';

  try {
    console.log('🗄️ Connecting to PostgreSQL...');

    // Use raw PostgreSQL client for direct connection
    const { Client } = require('pg');
    const client = new Client({
      host: 'localhost',
      port: 5432,
      database: 'nectar_core',
      user: 'nectar_admin',
      password: 'password123',
      ssl: false, // Disable SSL for local development
    });
    await client.connect();

    console.log('✅ Connected to PostgreSQL successfully');
    console.log('🔍 Creating organization and admin user...');

    // Check if organization exists
    const orgCheck = await client.query('SELECT id FROM organizations WHERE slug = $1', [
      'jestin-coler',
    ]);

    let organizationId;
    if (orgCheck.rows.length > 0) {
      organizationId = orgCheck.rows[0].id;
      console.log(`📋 Using existing organization: ${organizationId}`);
    } else {
      // Create organization
      const orgResult = await client.query(
        `INSERT INTO organizations (id, name, slug, "isActive", settings, "createdAt", "updatedAt") 
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) 
         RETURNING id`,
        [
          'org_' + Date.now(), // Simple ID generation
          organizationName,
          'jestin-coler',
          true,
          JSON.stringify({ allowInvitations: true, maxUsers: 100 }),
        ]
      );
      organizationId = orgResult.rows[0].id;
      console.log(`🏢 Created organization: ${organizationId}`);
    }

    // Check if user exists
    const userCheck = await client.query('SELECT id FROM users WHERE email = $1', [email]);

    if (userCheck.rows.length > 0) {
      console.log(`👤 User ${email} already exists`);
      console.log('✅ Setup complete - user can login with existing credentials');
    } else {
      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const userResult = await client.query(
        `INSERT INTO users (
          id, email, password, "firstName", "lastName", "organizationId", 
          role, "isActive", "isEmailVerified", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()) 
        RETURNING id`,
        [
          'user_' + Date.now(), // Simple ID generation
          email,
          hashedPassword,
          'Jestin',
          'Coler',
          organizationId,
          'OWNER',
          true,
          true,
        ]
      );

      const userId = userResult.rows[0].id;

      console.log('🎉 PostgreSQL Admin User Created Successfully!');
      console.log('');
      console.log('📋 Details:');
      console.log(`  User ID: ${userId}`);
      console.log(`  Organization ID: ${organizationId}`);
      console.log(`  Email: ${email}`);
      console.log(`  Password: ${password}`);
      console.log(`  Role: OWNER (Organization Owner)`);
      console.log(`  Database: PostgreSQL`);
      console.log('');
      console.log('🔑 Login Information:');
      console.log(`  Email: ${email}`);
      console.log(`  Password: ${password}`);
      console.log('');
      console.log('✅ Ready for Silo B (Customer Application) access!');
    }

    await client.end();
    console.log('🔌 PostgreSQL connection closed');
  } catch (error) {
    console.error('❌ Error creating PostgreSQL admin:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run the script
createPostgreSQLAdmin()
  .then(() => {
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('1. Login at http://localhost:3000/login');
    console.log('2. Or use the JWT token from generateSiloBToken.js');
    console.log('3. User has full organization owner permissions');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
