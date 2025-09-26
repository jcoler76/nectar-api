const DataLoader = require('dataloader');
// SECURITY: Use tenant-aware Prisma service per CLAUDE.md requirements
const prismaService = require('../../services/prismaService');

// Force nodemon restart by updating file

/**
 * SECURITY: Create tenant-aware role DataLoader
 * @param {string} organizationId - Tenant context for RLS enforcement
 * @returns {DataLoader} - Configured DataLoader instance
 */
const createRoleLoader = organizationId => {
  return new DataLoader(async roleIds => {
    if (!organizationId) {
      throw new Error('Organization ID required for tenant-aware role loading');
    }

    // CRITICAL: Use tenant-aware Prisma client per CLAUDE.md requirements
    const roles = await prismaService.withTenantContext(organizationId, async tx => {
      return await tx.role.findMany({
        where: {
          id: { in: roleIds },
        },
        include: {
          permissions: true,
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });
    });

    // Return roles in the same order as the input IDs
    const roleMap = {};
    roles.forEach(role => {
      roleMap[role.id] = role;
    });

    return roleIds.map(id => roleMap[id] || null);
  });
};

module.exports = createRoleLoader;
