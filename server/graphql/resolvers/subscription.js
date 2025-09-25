const { ForbiddenError } = require('apollo-server-express');
const prismaService = require('../../services/prismaService');

const toFloat = v => (v == null ? null : Number(v));

const subscriptionResolvers = {
  Query: {
    subscriptions: async (_, { pagination = {}, status }, { user: currentUser }) => {
      if (!currentUser?.isAdmin) throw new ForbiddenError('Admin access required');

      // Use systemPrisma for admin queries that need to see all subscriptions across organizations
      const { limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'ASC' } = pagination;
      const where = {};
      if (status) where.status = status;

      const totalCount = await prismaService.systemPrisma.subscription.count({ where });
      const subs = await prismaService.systemPrisma.subscription.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { [sortBy]: sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc' },
        include: { organization: true },
      });

      const edges = subs.map((sub, index) => ({
        node: { ...sub, monthlyRevenue: toFloat(sub.monthlyRevenue) },
        cursor: Buffer.from((offset + index).toString()).toString('base64'),
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage: offset + limit < totalCount,
          hasPreviousPage: offset > 0,
          totalCount,
          startCursor: edges.length ? edges[0].cursor : null,
          endCursor: edges.length ? edges[edges.length - 1].cursor : null,
        },
      };
    },

    subscriptionMetrics: async (_, __, { user: currentUser }) => {
      if (!currentUser?.isAdmin) throw new ForbiddenError('Admin access required');

      // Use systemPrisma for admin queries that need to see all subscriptions across organizations
      const [total, active, trial, cancelled, upcoming] = await Promise.all([
        prismaService.systemPrisma.subscription.count(),
        prismaService.systemPrisma.subscription.count({ where: { status: 'ACTIVE' } }),
        prismaService.systemPrisma.subscription.count({ where: { status: 'TRIALING' } }),
        prismaService.systemPrisma.subscription.count({ where: { status: 'CANCELED' } }),
        prismaService.systemPrisma.subscription.count({
          where: {
            status: 'ACTIVE',
            cancelAtPeriodEnd: false,
            currentPeriodEnd: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
          },
        }),
      ]);

      const agg = await prismaService.systemPrisma.subscription.aggregate({
        _sum: { monthlyRevenue: true },
        _avg: { monthlyRevenue: true },
      });

      const totalMonthlyRevenue = toFloat(agg._sum.monthlyRevenue) || 0;
      const averageSubscriptionValue = toFloat(agg._avg.monthlyRevenue) || 0;

      return {
        totalSubscriptions: total,
        activeSubscriptions: active,
        trialSubscriptions: trial,
        cancelledSubscriptions: cancelled,
        upcomingRenewals: upcoming,
        averageSubscriptionValue,
        totalMonthlyRevenue,
      };
    },

    topOrganizationsByMRR: async (_, { limit = 10 }, { user: currentUser }) => {
      if (!currentUser?.isAdmin) throw new ForbiddenError('Admin access required');

      // Use systemPrisma for admin queries that need to see all subscriptions across organizations
      const subs = await prismaService.systemPrisma.subscription.findMany({
        where: { monthlyRevenue: { not: null } },
        orderBy: { monthlyRevenue: 'desc' },
        take: Math.min(limit, 50),
        include: { organization: true },
      });

      return subs.map(s => ({
        id: s.organizationId,
        name: s.organization?.name || 'Unknown',
        plan: s.plan,
        status: s.status,
        mrr: toFloat(s.monthlyRevenue) || 0,
      }));
    },
  },
};

module.exports = subscriptionResolvers;
