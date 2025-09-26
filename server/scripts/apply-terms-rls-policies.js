const { PrismaClient } = require('../prisma/generated/client');

async function applyTermsRLSPolicies() {
  const prisma = new PrismaClient({
    datasources: {
      db: { url: process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL },
    },
  });

  try {
    console.log('🔧 Applying RLS policies for Terms-related tables...\n');

    // Create TermsAcceptance RLS policy
    console.log('Creating RLS policy for TermsAcceptance table...');
    await prisma.$executeRaw`
      DROP POLICY IF EXISTS tenant_isolation ON "TermsAcceptance"
    `;
    await prisma.$executeRaw`
      CREATE POLICY tenant_isolation ON "TermsAcceptance"
      FOR ALL
      USING ("organizationId" = current_organization_id())
      WITH CHECK ("organizationId" = current_organization_id())
    `;
    console.log('✅ TermsAcceptance RLS policy created');

    // Create AuditLog RLS policy
    console.log('Creating RLS policy for AuditLog table...');
    await prisma.$executeRaw`
      DROP POLICY IF EXISTS tenant_isolation ON "AuditLog"
    `;
    await prisma.$executeRaw`
      CREATE POLICY tenant_isolation ON "AuditLog"
      FOR ALL
      USING ("organizationId" = current_organization_id())
      WITH CHECK ("organizationId" = current_organization_id())
    `;
    console.log('✅ AuditLog RLS policy created');

    // Verify policies were created
    console.log('\n🔍 Verifying policies were created...');
    const policies = await prisma.$queryRaw`
      SELECT tablename, policyname, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      AND tablename IN ('TermsAcceptance', 'AuditLog')
      ORDER BY tablename, policyname
    `;

    if (policies.length === 2) {
      console.log('✅ SUCCESS: Both RLS policies created successfully');
      policies.forEach(policy => {
        console.log(`  ${policy.tablename}: ${policy.policyname}`);
        console.log(`    USING: ${policy.qual}`);
        console.log(`    WITH CHECK: ${policy.with_check}`);
      });
    } else {
      console.log(`❌ ERROR: Expected 2 policies, found ${policies.length}`);
      policies.forEach(policy => {
        console.log(`  ${policy.tablename}: ${policy.policyname}`);
      });
    }

    await prisma.$disconnect();
    console.log('\n🎉 RLS Policy Application Complete');
  } catch (error) {
    console.error('❌ Error applying RLS policies:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

if (require.main === module) {
  applyTermsRLSPolicies();
}

module.exports = applyTermsRLSPolicies;
