const DataLoader = require('dataloader');
const { PrismaClient } = require('../../prisma/generated/client');
const prisma = new PrismaClient();

const createUserLoader = () => {
  return new DataLoader(async userIds => {
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    // Return users in the same order as the input IDs
    const userMap = {};
    users.forEach(user => {
      userMap[user.id] = user;
    });

    return userIds.map(id => userMap[id] || null);
  });
};

module.exports = createUserLoader;
