const jwt = require('jsonwebtoken');
const { validateToken } = require('../../utils/tokenService');
const { PrismaClient } = require('../../prisma/generated/client');
const prisma = new PrismaClient();

const getUser = async req => {
  let token = req.headers.authorization;

  if (token && token.startsWith('Bearer ')) {
    token = token.slice(7);
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) return null;

  try {
    // First try standard user token validation (audience: nectar-users)
    const decoded = await validateToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        memberships: {
          include: { organization: true },
        },
      },
    });

    if (!user || !user.isActive) return null;

    return {
      userId: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
      roles: user.memberships || [],
      user: user,
    };
  } catch (primaryError) {
    // If standard validation fails, attempt to validate as platform admin
    try {
      const adminSecret = process.env.ADMIN_JWT_SECRET;
      if (!adminSecret) {
        throw new Error('ADMIN_JWT_SECRET not configured');
      }

      const adminDecoded = jwt.verify(token, adminSecret);
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
