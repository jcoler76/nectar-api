const DataLoader = require('dataloader');
// MongoDB models replaced with Prisma for PostgreSQL migration
// const Connection = require('../../models/Connection');

const { PrismaClient } = require('../../prisma/generated/client');
const prisma = new PrismaClient();

const createConnectionLoader = () => {
  return new DataLoader(async connectionIds => {
    // TODO: Replace MongoDB query with Prisma query during migration
    // const connections = await Connection.find({ _id: { $in: connectionIds } }).populate(
    //   'createdBy'
    // );
    // For now, return empty array to allow server startup
    const connections = [];

    // Return connections in the same order as the input IDs
    const connectionMap = {};
    connections.forEach(connection => {
      connectionMap[connection._id.toString()] = connection;
    });

    return connectionIds.map(id => connectionMap[id.toString()] || null);
  });
};

module.exports = createConnectionLoader;
