const DataLoader = require('dataloader');
// MongoDB models replaced with Prisma for PostgreSQL migration
// const Role = require('../../models/Role');

const { PrismaClient } = require('../../prisma/generated/client');
const prisma = new PrismaClient();

// Force nodemon restart by updating file

const createRoleLoader = () => {
  return new DataLoader(async roleIds => {
    // TODO: Replace MongoDB query with Prisma query during migration
    // const roles = await Role.find({ _id: { $in: roleIds } });
    // For now, return empty array to allow server startup
    const roles = [];

    // Return roles in the same order as the input IDs
    const roleMap = {};
    roles.forEach(role => {
      roleMap[role._id.toString()] = role;
    });

    return roleIds.map(id => roleMap[id.toString()] || null);
  });
};

module.exports = createRoleLoader;
