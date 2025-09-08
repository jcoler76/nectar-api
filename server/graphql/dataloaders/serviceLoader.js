const DataLoader = require('dataloader');
// MongoDB models replaced with Prisma for PostgreSQL migration
// const Service = require('../../models/Service');

const { PrismaClient } = require('../../prisma/generated/client');
const prisma = new PrismaClient();

const createServiceLoader = () => {
  return new DataLoader(async serviceIds => {
    // TODO: Replace MongoDB query with Prisma query during migration
    // const services = await Service.find({ _id: { $in: serviceIds } })
    //   .populate('createdBy')
    //   .populate('connectionId');
    // For now, return empty array to allow server startup
    const services = [];

    // Return services in the same order as the input IDs
    const serviceMap = {};
    services.forEach(service => {
      serviceMap[service._id.toString()] = service;
    });

    return serviceIds.map(id => serviceMap[id.toString()] || null);
  });
};

module.exports = createServiceLoader;
