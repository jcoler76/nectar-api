const prismaService = require('./services/prismaService');

async function fixPermission() {
  try {
    console.log('=== Fixing Permission Prefix ===');

    // Use system client for cross-org lookup
    const systemPrisma = prismaService.getSystemClient();

    // Find the application with the problematic permission
    const app = await systemPrisma.application.findFirst({
      where: { apiKeyPrefix: '83494fca' },
      include: {
        defaultRole: true,
        organization: true,
      },
    });

    if (!app) {
      console.log('Application not found');
      return;
    }

    console.log('Found application:', app.name);
    console.log('Role:', app.defaultRole.name);
    console.log('Current permissions:', JSON.stringify(app.defaultRole.permissions, null, 2));

    // Update the permission to use /proc/ prefix instead of /table/
    const updatedPermissions = app.defaultRole.permissions.map(perm => {
      if (perm.objectName === '/table/api_ContactsGet') {
        console.log('Fixing permission:', perm.objectName, '-> /proc/api_ContactsGet');
        return {
          ...perm,
          objectName: '/proc/api_ContactsGet',
        };
      }
      return perm;
    });

    // Update the role with fixed permissions
    await prismaService.withTenantContext(app.organizationId, async tx => {
      const updatedRole = await tx.role.update({
        where: { id: app.defaultRoleId },
        data: { permissions: updatedPermissions },
      });

      console.log('Updated permissions:', JSON.stringify(updatedRole.permissions, null, 2));
    });

    console.log('✅ Permission fixed successfully!');
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await prismaService.disconnect();
    process.exit(0);
  }
}

fixPermission();
