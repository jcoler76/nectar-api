/**
 * Passport.js Configuration
 * Social OAuth authentication strategies for BaaS platform
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const TwitterStrategy = require('@passport-js/passport-twitter').Strategy;
const { getPrismaClient } = require('./prisma');
const { logger } = require('../middleware/logger');

const prisma = getPrismaClient();

/**
 * Serialize user for session storage
 */
passport.serializeUser((user, done) => {
  done(null, user.id);
});

/**
 * Deserialize user from session
 */
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        organization: true,
        userRoles: {
          include: { role: true },
        },
      },
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

/**
 * Find or create user from OAuth profile
 */
async function findOrCreateOAuthUser(provider, profile, accessToken, refreshToken) {
  try {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new Error('No email address provided by OAuth provider');
    }

    // Check if user already exists by email
    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        organization: true,
        socialAccounts: true,
        userRoles: { include: { role: true } },
      },
    });

    // Check if this social account is already linked
    let socialAccount = null;
    if (user) {
      socialAccount = user.socialAccounts.find(
        account => account.provider === provider && account.providerId === profile.id
      );
    }

    // If no user exists, create one
    if (!user) {
      // Create organization for new user
      const organization = await prisma.organization.create({
        data: {
          name: profile.displayName || `${profile.name?.givenName || 'User'}'s Organization`,
          description: `Organization for ${email}`,
        },
      });

      // Create default role for new organization
      const defaultRole = await prisma.role.create({
        data: {
          name: 'Default',
          description: 'Default role for organization members',
          organizationId: organization.id,
          isDefault: true,
          permissions: {
            canViewDashboard: true,
            canManageServices: true,
            canManageApplications: true,
            canManageUsers: false,
            canManageRoles: false,
          },
        },
      });

      // Create user
      user = await prisma.user.create({
        data: {
          email,
          firstName: profile.name?.givenName || profile.displayName?.split(' ')[0] || 'User',
          lastName:
            profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || '',
          organizationId: organization.id,
          isVerified: true, // OAuth users are pre-verified
          profilePicture: profile.photos?.[0]?.value,
          userRoles: {
            create: {
              roleId: defaultRole.id,
            },
          },
        },
        include: {
          organization: true,
          userRoles: { include: { role: true } },
        },
      });

      logger.info(`Created new user from ${provider} OAuth: ${email}`);
    }

    // Link social account if not already linked
    if (!socialAccount) {
      socialAccount = await prisma.socialAccount.create({
        data: {
          userId: user.id,
          provider,
          providerId: profile.id,
          email,
          name: profile.displayName,
          profileUrl: profile.profileUrl,
          avatarUrl: profile.photos?.[0]?.value,
          accessToken,
          refreshToken,
          profileData: JSON.stringify(profile._json || {}),
        },
      });

      logger.info(`Linked ${provider} account to user: ${email}`);
    } else {
      // Update existing social account tokens
      socialAccount = await prisma.socialAccount.update({
        where: { id: socialAccount.id },
        data: {
          accessToken,
          refreshToken,
          profileData: JSON.stringify(profile._json || {}),
          updatedAt: new Date(),
        },
      });
    }

    return user;
  } catch (error) {
    logger.error(`OAuth user creation/update error:`, error);
    throw error;
  }
}

/**
 * Google OAuth Strategy
 */
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await findOrCreateOAuthUser('google', profile, accessToken, refreshToken);
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
}

/**
 * GitHub OAuth Strategy
 */
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL || '/api/auth/github/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await findOrCreateOAuthUser('github', profile, accessToken, refreshToken);
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
}

/**
 * Facebook OAuth Strategy
 */
if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        callbackURL: process.env.FACEBOOK_CALLBACK_URL || '/api/auth/facebook/callback',
        profileFields: ['id', 'displayName', 'name', 'emails', 'photos'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await findOrCreateOAuthUser('facebook', profile, accessToken, refreshToken);
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
}

/**
 * Microsoft OAuth Strategy
 */
if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
  passport.use(
    new MicrosoftStrategy(
      {
        clientID: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        callbackURL: process.env.MICROSOFT_CALLBACK_URL || '/api/auth/microsoft/callback',
        scope: ['user.read'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await findOrCreateOAuthUser('microsoft', profile, accessToken, refreshToken);
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
}

/**
 * LinkedIn OAuth Strategy
 */
if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
  passport.use(
    new LinkedInStrategy(
      {
        clientID: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        callbackURL: process.env.LINKEDIN_CALLBACK_URL || '/api/auth/linkedin/callback',
        scope: ['r_emailaddress', 'r_liteprofile'],
        state: true,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await findOrCreateOAuthUser('linkedin', profile, accessToken, refreshToken);
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
}

/**
 * Twitter OAuth Strategy
 */
if (process.env.TWITTER_CONSUMER_KEY && process.env.TWITTER_CONSUMER_SECRET) {
  passport.use(
    new TwitterStrategy(
      {
        consumerKey: process.env.TWITTER_CONSUMER_KEY,
        consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
        callbackURL: process.env.TWITTER_CALLBACK_URL || '/api/auth/twitter/callback',
        includeEmail: true,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await findOrCreateOAuthUser('twitter', profile, accessToken, refreshToken);
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
}

/**
 * Get available OAuth providers
 */
function getAvailableProviders() {
  const providers = [];

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push({
      name: 'google',
      displayName: 'Google',
      icon: '🔍',
      color: '#DB4437',
    });
  }

  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    providers.push({
      name: 'github',
      displayName: 'GitHub',
      icon: '🐙',
      color: '#333',
    });
  }

  if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
    providers.push({
      name: 'facebook',
      displayName: 'Facebook',
      icon: '👤',
      color: '#1877F2',
    });
  }

  if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
    providers.push({
      name: 'microsoft',
      displayName: 'Microsoft',
      icon: '🪟',
      color: '#00BCF2',
    });
  }

  if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
    providers.push({
      name: 'linkedin',
      displayName: 'LinkedIn',
      icon: '💼',
      color: '#0077B5',
    });
  }

  if (process.env.TWITTER_CONSUMER_KEY && process.env.TWITTER_CONSUMER_SECRET) {
    providers.push({
      name: 'twitter',
      displayName: 'Twitter',
      icon: '🐦',
      color: '#1DA1F2',
    });
  }

  return providers;
}

module.exports = {
  passport,
  getAvailableProviders,
};
