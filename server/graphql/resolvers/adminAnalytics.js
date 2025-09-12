const { PrismaClient } = require('../../prisma/generated/client');
const { ForbiddenError } = require('apollo-server-express');

const prisma = new PrismaClient();
const toFloat = v => (v == null ? null : Number(v));

const adminAnalyticsResolvers = {
  Query: {
    adminMetrics: async (_, __, { user: currentUser }) => {
      if (!currentUser?.isAdmin) throw new ForbiddenError('Admin access required');

      const [totalUsers, activeUsers, subAgg] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.subscription.aggregate({ _sum: { monthlyRevenue: true }, _count: { _all: true } }),
      ]);

      return {
        totalUsers,
        activeUsers,
        totalSubscriptions: subAgg._count?._all || 0,
        monthlyRevenue: toFloat(subAgg._sum.monthlyRevenue) || 0,
      };
    },
  },
};

module.exports = adminAnalyticsResolvers;
