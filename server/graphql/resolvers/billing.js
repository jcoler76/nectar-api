const { PrismaClient } = require('../../prisma/generated/client');
const { ForbiddenError } = require('apollo-server-express');

const prisma = new PrismaClient();

const toFloat = v => (v == null ? null : Number(v));

const billingResolvers = {
  Query: {
    billingMetrics: async (_, __, { user: currentUser }) => {
      if (!currentUser?.isAdmin) throw new ForbiddenError('Admin access required');

      const now = new Date();
      const sinceDay = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sinceMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sinceYear = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

      const [dayAgg, monthAgg, yearAgg, totalEvents] = await Promise.all([
        prisma.billingEvent.aggregate({
          _sum: { amount: true },
          where: { createdAt: { gte: sinceDay } },
        }),
        prisma.billingEvent.aggregate({
          _sum: { amount: true },
          where: { createdAt: { gte: sinceMonth } },
        }),
        prisma.billingEvent.aggregate({
          _sum: { amount: true },
          where: { createdAt: { gte: sinceYear } },
        }),
        prisma.billingEvent.count(),
      ]);

      return {
        dailyRevenue: toFloat(dayAgg._sum.amount) || 0,
        monthlyRevenue: toFloat(monthAgg._sum.amount) || 0,
        yearlyRevenue: toFloat(yearAgg._sum.amount) || 0,
        totalEvents,
      };
    },

    billingEvents: async (_, { pagination = {}, since, until }, { user: currentUser }) => {
      if (!currentUser?.isAdmin) throw new ForbiddenError('Admin access required');
      const { limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'DESC' } = pagination;

      const where = {};
      if (since || until) {
        where.createdAt = {};
        if (since) where.createdAt.gte = since;
        if (until) where.createdAt.lte = until;
      }

      const totalCount = await prisma.billingEvent.count({ where });
      const events = await prisma.billingEvent.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { [sortBy]: sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc' },
        include: { organization: true, subscription: true },
      });

      const edges = events.map((e, index) => ({
        node: { ...e, amount: toFloat(e.amount) },
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
  },
};

module.exports = billingResolvers;
