const DataLoader = require('dataloader');
const { PrismaClient } = require('../../prisma/generated/client');
const prisma = new PrismaClient();

const createConnectionLoader = () => {
  return new DataLoader(async connectionIds => {
    const connections = await prisma.databaseConnection.findMany({
      where: {
        id: {
          in: connectionIds,
        },
      },
      include: {
        creator: true,
        organization: true,
      },
    });

    // Return connections in the same order as the input IDs
    const connectionMap = {};
    connections.forEach(connection => {
      connectionMap[connection.id] = connection;
    });

    return connectionIds.map(id => connectionMap[id] || null);
  });
};

module.exports = createConnectionLoader;
