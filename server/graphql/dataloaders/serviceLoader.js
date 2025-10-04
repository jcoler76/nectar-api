const DataLoader = require('dataloader');
const { PrismaClient } = require('../../prisma/generated/client');
const prisma = new PrismaClient();

const createServiceLoader = () => {
  return new DataLoader(async serviceIds => {
    const services = await prisma.service.findMany({
      where: {
        id: {
          in: serviceIds,
        },
      },
      include: {
        creator: true,
        connection: true,
        organization: true,
      },
    });

    // Return services in the same order as the input IDs
    const serviceMap = {};
    services.forEach(service => {
      serviceMap[service.id] = service;
    });

    return serviceIds.map(id => serviceMap[id] || null);
  });
};

module.exports = createServiceLoader;
