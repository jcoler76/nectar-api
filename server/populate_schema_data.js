const { PrismaClient } = require('./prisma/generated/client');
const prisma = new PrismaClient();

async function populateSchemaData() {
  try {
    const service = await prisma.service.findFirst({
      where: { name: 'goldsuite', isActive: true },
    });

    if (!service) {
      console.error('Service not found');
      return;
    }

    console.log('🔍 Found service:', service.id);

    // Parse the objects JSON
    const objects = JSON.parse(service.objects || '[]');
    console.log('📊 Found', objects.length, 'objects in service.objects');

    // Filter to only tables (not procedures, functions, etc.)
    const tables = objects.filter(
      obj =>
        obj.object_category === 'TABLE' ||
        (obj.type && obj.type.includes('U')) || // User table
        obj.type_desc === 'USER_TABLE'
    );

    console.log('🏪 Found', tables.length, 'tables to import');

    // Sample the first few to see the structure
    console.log('Sample tables:', tables.slice(0, 3));

    // Create DatabaseObject records
    let imported = 0;
    for (const table of tables) {
      try {
        await prisma.databaseObject.create({
          data: {
            organizationId: service.organizationId,
            serviceId: service.id,
            name: table.name,
            schema: table.schema_name || 'dbo',
            type: 'table',
            metadata: {
              type_desc: table.type_desc,
              object_category: table.object_category,
              type: table.type,
            },
          },
        });
        imported++;
      } catch (error) {
        // Skip duplicates
        if (!error.message.includes('Unique constraint')) {
          console.error('Error importing table', table.name, ':', error.message);
        }
      }
    }

    console.log('✅ Imported', imported, 'tables to DatabaseObject');

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

populateSchemaData();
