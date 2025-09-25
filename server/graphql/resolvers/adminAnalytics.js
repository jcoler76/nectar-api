const { ForbiddenError } = require('apollo-server-express');
const prismaService = require('../../services/prismaService');

const toFloat = v => (v == null ? null : Number(v));

const adminAnalyticsResolvers = {
  Query: {
    adminMetrics: async (_, __, { user: currentUser }) => {
      if (!currentUser?.isAdmin) throw new ForbiddenError('Admin access required');

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        const [totalUsers, activeUsers, subAgg] = await Promise.all([
          tx.user.count(),
          tx.user.count({ where: { isActive: true } }),
          tx.subscription.aggregate({ _sum: { monthlyRevenue: true }, _count: { _all: true } }),
        ]);

        return {
          totalUsers,
          activeUsers,
          totalSubscriptions: subAgg._count?._all || 0,
          monthlyRevenue: toFloat(subAgg._sum.monthlyRevenue) || 0,
        };
      });
    },
  },
};

module.exports = adminAnalyticsResolvers;
