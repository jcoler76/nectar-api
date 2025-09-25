const prismaService = require('./services/prismaService');
const bcryptjs = require('bcryptjs');

async function checkApiKey() {
  try {
    console.log('=== API Key Investigation ===');
    const apiKey = '83494fcaefc28d958dfe5e30e1349100cd762abc98331445e56b6986f15ba409';
    const apiKeyPrefix = apiKey.substring(0, 8);
    console.log('API Key Prefix:', apiKeyPrefix);

    // Use system client for cross-org lookup
    const systemPrisma = prismaService.getSystemClient();

    console.log('\n=== 1. Finding Applications by Prefix ===');
    const potentialApps = await systemPrisma.application.findMany({
      where: { apiKeyPrefix },
      include: {
        defaultRole: {
          include: {
            service: true,
          },
        },
        organization: true,
      },
    });

    console.log('Found applications:', potentialApps.length);

    for (const app of potentialApps) {
      console.log('\nApplication:', {
        id: app.id,
        name: app.name,
        isActive: app.isActive,
        organizationId: app.organizationId,
        orgName: app.organization?.name,
        defaultRoleId: app.defaultRoleId,
      });

      // Test API key hash
      console.log('\n=== 2. Testing API Key Hash ===');
      const isValid = await bcryptjs.compare(apiKey, app.apiKeyHash);
      console.log('API Key Valid:', isValid);

      if (isValid) {
        console.log('\n=== 3. Role Information ===');
        console.log('Default Role:', {
          id: app.defaultRole?.id,
          name: app.defaultRole?.name,
          isActive: app.defaultRole?.isActive,
          permissions: app.defaultRole?.permissions?.length || 0,
        });

        if (app.defaultRole?.permissions) {
          console.log('\n=== 4. Role Permissions ===');
          app.defaultRole.permissions.forEach((perm, index) => {
            console.log(`Permission ${index + 1}:`, {
              serviceId: perm.serviceId,
              objectName: perm.objectName,
              actions: perm.actions,
            });
          });
        }

        console.log('\n=== 5. Looking for test service ===');
        const service = await prismaService.withTenantContext(app.organizationId, async tx => {
          return await tx.service.findFirst({
            where: {
              name: 'test',
              isActive: true,
            },
          });
        });

        console.log(
          'Test Service:',
          service
            ? {
                id: service.id,
                name: service.name,
                isActive: service.isActive,
              }
            : 'NOT FOUND'
        );

        if (service) {
          console.log('\n=== 6. Checking Permission Match ===');
          const hasPermission = app.defaultRole?.permissions?.some(perm => {
            const matches =
              perm.serviceId &&
              perm.serviceId === service.id &&
              (perm.objectName === 'api_ContactsGet' ||
                perm.objectName === '/proc/api_ContactsGet') &&
              perm.actions &&
              perm.actions['GET'];

            if (matches) {
              console.log('✅ PERMISSION MATCH:', perm);
            } else {
              console.log('❌ No match:', {
                serviceIdMatch: perm.serviceId === service.id,
                objectNameMatch:
                  perm.objectName === 'api_ContactsGet' ||
                  perm.objectName === '/proc/api_ContactsGet',
                actionMatch: perm.actions && perm.actions['GET'],
                perm,
              });
            }

            return matches;
          });

          console.log('\nFinal Permission Result:', hasPermission);
        }
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await prismaService.disconnect();
    process.exit(0);
  }
}

checkApiKey();
