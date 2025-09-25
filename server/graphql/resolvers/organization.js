const { AuthenticationError, ForbiddenError, UserInputError } = require('apollo-server-express');
const prismaService = require('../../services/prismaService');

const organizationResolvers = {
  Query: {
    organization: async (_, { id }, { user: currentUser }) => {
      if (!currentUser?.isAdmin) throw new ForbiddenError('Admin access required');

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        const org = await tx.organization.findFirst({
          where: { id },
          include: {
            subscription: true,
            _count: { select: { memberships: true } },
          },
        });
        return org
          ? {
              ...org,
              membershipCount: org._count?.memberships || 0,
              _count: { memberships: org._count?.memberships || 0 },
            }
          : null;
      });
    },

    organizations: async (_, { pagination = {}, search }, { user: currentUser }) => {
      if (!currentUser?.isAdmin) throw new ForbiddenError('Admin access required');

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        const { limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'ASC' } = pagination;

        const where = {};
        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { domain: { contains: search, mode: 'insensitive' } },
            { slug: { contains: search, mode: 'insensitive' } },
          ];
        }

        const totalCount = await tx.organization.count({ where });
        const orgs = await tx.organization.findMany({
          where,
          skip: offset,
          take: limit,
          orderBy: { [sortBy]: sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc' },
          include: {
            subscription: true,
            _count: { select: { memberships: true } },
          },
        });

        const edges = orgs.map((org, index) => ({
          node: {
            ...org,
            membershipCount: org._count?.memberships || 0,
            _count: { memberships: org._count?.memberships || 0 },
          },
          cursor: Buffer.from((offset + index).toString()).toString('base64'),
        }));

        return {
          edges,
          pageInfo: {
            hasNextPage: offset + limit < totalCount,
            hasPreviousPage: offset > 0,
            totalCount,
            startCursor: edges.length > 0 ? edges[0].cursor : null,
            endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
          },
        };
      });
    },
  },
  Organization: {
    memberships: async (org, _, { user: currentUser }) => {
      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        const memberships = await tx.membership.findMany({
          where: { organizationId: org.id },
          include: { user: true },
          orderBy: { joinedAt: 'desc' },
        });
        return memberships.map(m => ({ user: m.user, role: m.role, joinedAt: m.joinedAt }));
      });
    },
  },
  Mutation: {
    createOrganization: async (_, { input }, { user: currentUser }) => {
      if (!currentUser?.isAdmin)
        throw new (require('apollo-server-express').ForbiddenError)('Admin access required');

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        const org = await tx.organization.create({
          data: {
            name: input.name,
            slug: input.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)+/g, ''),
            domain: input.domain || null,
            website: input.website || null,
          },
          include: {
            subscription: true,
            _count: { select: { memberships: true } },
          },
        });

        return {
          ...org,
          membershipCount: org._count?.memberships || 0,
          _count: { memberships: org._count?.memberships || 0 },
        };
      });
    },

    updateOrganization: async (_, { id, input }, { user: currentUser }) => {
      if (!currentUser?.isAdmin)
        throw new (require('apollo-server-express').ForbiddenError)('Admin access required');

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        const org = await tx.organization.update({
          where: { id },
          data: {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.domain !== undefined ? { domain: input.domain } : {}),
            ...(input.website !== undefined ? { website: input.website } : {}),
            ...(input.logo !== undefined ? { logo: input.logo } : {}),
          },
          include: {
            subscription: true,
            _count: { select: { memberships: true } },
          },
        });

        return {
          ...org,
          membershipCount: org._count?.memberships || 0,
          _count: { memberships: org._count?.memberships || 0 },
        };
      });
    },

    deleteOrganization: async (_, { id }, { user: currentUser }) => {
      if (!currentUser?.isAdmin)
        throw new (require('apollo-server-express').ForbiddenError)('Admin access required');

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        try {
          await tx.organization.delete({ where: { id } });
          return true;
        } catch (e) {
          // If there are dependent records, consider soft-delete or cascade at DB level
          return false;
        }
      });
    },

    addOrganizationMember: async (
      _,
      { organizationId, userId, role = 'MEMBER' },
      { user: currentUser }
    ) => {
      if (!currentUser?.isAdmin)
        throw new (require('apollo-server-express').ForbiddenError)('Admin access required');

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        // Ensure org and user exist
        const [org, user] = await Promise.all([
          tx.organization.findFirst({ where: { id: organizationId } }),
          tx.user.findUnique({ where: { id: userId } }),
        ]);
        if (!org || !user) {
          throw new (require('apollo-server-express').UserInputError)(
            'Organization or user not found'
          );
        }
        await tx.membership.upsert({
          where: { userId_organizationId: { userId, organizationId } },
          update: { role },
          create: { userId, organizationId, role },
        });
        const updated = await tx.organization.findFirst({
          where: { id: organizationId },
          include: { subscription: true, _count: { select: { memberships: true } } },
        });
        return {
          ...updated,
          membershipCount: updated._count?.memberships || 0,
          _count: { memberships: updated._count?.memberships || 0 },
        };
      });
    },

    removeOrganizationMember: async (_, { organizationId, userId }, { user: currentUser }) => {
      if (!currentUser?.isAdmin)
        throw new (require('apollo-server-express').ForbiddenError)('Admin access required');

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        try {
          await tx.membership.delete({
            where: { userId_organizationId: { userId, organizationId } },
          });
          return true;
        } catch (_) {
          return false;
        }
      });
    },

    updateOrganizationMemberRole: async (
      _,
      { organizationId, userId, role },
      { user: currentUser }
    ) => {
      if (!currentUser?.isAdmin)
        throw new (require('apollo-server-express').ForbiddenError)('Admin access required');

      return await prismaService.withTenantContext(currentUser.organizationId, async tx => {
        try {
          await tx.membership.update({
            where: { userId_organizationId: { userId, organizationId } },
            data: { role },
          });
          return true;
        } catch (_) {
          return false;
        }
      });
    },
  },
};

module.exports = organizationResolvers;
