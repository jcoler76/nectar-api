const jwt = require('jsonwebtoken');
const { validateToken } = require('../../utils/tokenService');
const { PrismaClient } = require('../../prisma/generated/client');
const prisma = new PrismaClient();

const getUser = async req => {
  console.log(
    '🚀 getUser function called with headers:',
    req.headers?.authorization ? 'Bearer token present' : 'No auth header'
  );
  let token = req.headers.authorization;

  if (token && token.startsWith('Bearer ')) {
    token = token.slice(7);
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) return null;

  try {
    console.log(
      '🔍 Attempting standard token validation for token starting with:',
      token.substring(0, 50) + '...'
    );
    // First try standard user token validation (audience: nectar-users)
    const decoded = await validateToken(token);
    console.log('✅ Standard token validation successful:', decoded);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        isActive: true,
        isSuperAdmin: true,
        firstName: true,
        lastName: true,
        memberships: {
          include: { organization: true },
        },
      },
    });

    if (!user || !user.isActive) return null;

    // Get the primary organization ID from memberships
    const primaryMembership = user.memberships?.[0]; // Get first membership as primary
    const organizationId = primaryMembership?.organization?.id;

    return {
      userId: user.id,
      email: user.email,
      isAdmin: user.isSuperAdmin,
      organizationId: organizationId,
      roles: user.memberships || [],
      user: user,
    };
  } catch (primaryError) {
    console.log('❌ Standard token validation failed:', primaryError.message);
    // If standard validation fails, attempt to validate as platform admin
    try {
      const adminSecret = process.env.ADMIN_JWT_SECRET;
      console.log('🔑 Admin JWT Secret configured:', !!adminSecret);
      if (!adminSecret) {
        throw new Error('ADMIN_JWT_SECRET not configured');
      }

      const adminDecoded = jwt.verify(token, adminSecret);
      console.log('🔓 Admin token decoded:', adminDecoded);
      // Only accept platform admin tokens
      if (adminDecoded?.type !== 'platform_admin' || !adminDecoded.userId) {
        throw new Error('Not a platform admin token');
      }

      // Look up the admin user to confirm status/flags
      const adminUser = await prisma.user.findUnique({
        where: { id: adminDecoded.userId },
        select: {
          id: true,
          email: true,
          isActive: true,
          isSuperAdmin: true,
          firstName: true,
          lastName: true,
        },
      });

      if (!adminUser || !adminUser.isActive || !adminUser.isSuperAdmin) {
        throw new Error('Admin user not active or not super admin');
      }

      // Return a minimal admin context. Note: no organization scoping.
      return {
        userId: adminUser.id,
        email: adminUser.email,
        isAdmin: true,
        roles: [],
        user: {
          id: adminUser.id,
          email: adminUser.email,
          isAdmin: true,
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
        },
      };
    } catch (adminError) {
      console.error('GraphQL Auth Error (both user and admin tokens failed):', {
        primary: primaryError?.message,
        admin: adminError?.message,
      });
      return null;
    }
  }
};

module.exports = {
  getUser,
};
