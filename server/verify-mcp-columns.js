const { PrismaClient } = require('./prisma/generated/client');

async function verifyMCPColumns() {
  const prisma = new PrismaClient();

  try {
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'file_folders'
      AND column_name IN ('mcp_enabled', 'mcp_config', 'embedding_count', 'last_indexed_at', 'indexing_status')
      ORDER BY column_name
    `;

    console.log('✅ MCP Columns Found in file_folders table:');
    console.table(result);

    if (result.length === 5) {
      console.log('\n✅ SUCCESS: All 5 MCP columns exist!');
    } else {
      console.log(`\n⚠️  WARNING: Expected 5 columns, found ${result.length}`);
    }
  } catch (error) {
    console.error('❌ Error querying database:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyMCPColumns();
