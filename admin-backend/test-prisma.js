const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log('Available models:', Object.getOwnPropertyNames(prisma).filter(name =>
  !name.startsWith('_') &&
  !name.startsWith('$') &&
  typeof prisma[name] === 'object' &&
  prisma[name] !== null
));

console.log('Contact available:', typeof prisma.contact);
console.log('ContactConversation available:', typeof prisma.contactConversation);