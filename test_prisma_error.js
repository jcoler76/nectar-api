const { PrismaClient } = require('@prisma/client');

async function testPrismaError() {
  const prisma = new PrismaClient();

  try {
    // This should fail due to missing required fields
    await prisma.apiKey.create({
      data: {
        name: 'test'
        // Missing required fields like organizationId, createdById, keyHash, etc.
      }
    });
  } catch (error) {
    console.log('Error constructor:', error.constructor.name);
    console.log('Error code:', error.code || 'No code');
    console.log('Error message (first 300 chars):');
    console.log(error.message.substring(0, 300));
    console.log('\nFull error message length:', error.message.length);

    if (error.meta) {
      console.log('Meta keys:', Object.keys(error.meta));
      console.log('Meta content:', JSON.stringify(error.meta, null, 2));
    }
  } finally {
    await prisma.$disconnect();
  }
}

testPrismaError();