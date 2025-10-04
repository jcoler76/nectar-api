const DataLoader = require('dataloader');
const { PrismaClient } = require('../../prisma/generated/client');
const prisma = new PrismaClient();

const createApplicationLoader = () => {
  return new DataLoader(async applicationIds => {
    const applications = await prisma.application.findMany({
      where: {
        id: {
          in: applicationIds,
        },
      },
      include: {
        creator: true,
        defaultRole: true,
        organization: true,
      },
    });

    // Return applications in the same order as the input IDs
    const applicationMap = {};
    applications.forEach(application => {
      applicationMap[application.id] = application;
    });

    return applicationIds.map(id => applicationMap[id] || null);
  });
};

module.exports = createApplicationLoader;
