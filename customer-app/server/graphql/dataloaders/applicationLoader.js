const DataLoader = require('dataloader');
// MongoDB models replaced with Prisma for PostgreSQL migration
// const Application = require('../../models/Application');

const { PrismaClient } = require('../../prisma/generated/client');
const prisma = new PrismaClient();

const createApplicationLoader = () => {
  return new DataLoader(async applicationIds => {
    // TODO: Replace MongoDB query with Prisma query during migration
    // const applications = await Application.find({ _id: { $in: applicationIds } })
    //   .populate('createdBy')
    //   .populate('defaultRole');
    // For now, return empty array to allow server startup
    const applications = [];

    // Return applications in the same order as the input IDs
    const applicationMap = {};
    applications.forEach(application => {
      applicationMap[application._id.toString()] = application;
    });

    return applicationIds.map(id => applicationMap[id.toString()] || null);
  });
};

module.exports = createApplicationLoader;
