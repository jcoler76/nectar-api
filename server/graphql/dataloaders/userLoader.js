const DataLoader = require('dataloader');
// MongoDB models replaced with Prisma for PostgreSQL migration
// const User = require('../../models/User');

const { PrismaClient } = require('../../prisma/generated/client');
const prisma = new PrismaClient();

const createUserLoader = () => {
  return new DataLoader(async userIds => {
    // TODO: Replace MongoDB query with Prisma query during migration
    // const users = await User.find({ _id: { $in: userIds } }).populate('roles');
    // For now, return empty array to allow server startup
    const users = [];

    // Return users in the same order as the input IDs
    const userMap = {};
    users.forEach(user => {
      userMap[user._id.toString()] = user;
    });

    return userIds.map(id => userMap[id.toString()] || null);
  });
};

module.exports = createUserLoader;
