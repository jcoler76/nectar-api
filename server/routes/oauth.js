/**
 * OAuth Authentication Routes
 * Social login endpoints for Google, GitHub, Facebook
 */

const express = require('express');
const router = express.Router();
const { passport, getAvailableProviders } = require('../config/passport');
const { logger } = require('../middleware/logger');
const jwt = require('jsonwebtoken');

/**
 * Create OAuth callback handler
 * @param {string} provider - OAuth provider name
 */
function createOAuthCallback(provider) {
  return (req, res) => {
    try {
      const isIntegration = req.query.integration === 'true';

      if (isIntegration) {
        // Integration flow - connect account to existing user
        const successHtml = `
          <html>
            <body>
              <script>
                if (window.opener) {
                  window.opener.postMessage({
                    type: 'oauth_success',
                    provider: '${provider}',
                    message: '${provider.charAt(0).toUpperCase() + provider.slice(1)} account connected successfully!'
                  }, '*');
                  window.close();
                } else {
                  window.location.href = '/integrations?success=${provider}_connected';
                }
              </script>
              <p>${provider.charAt(0).toUpperCase() + provider.slice(1)} account connected! You can close this window.</p>
            </body>
          </html>
        `;
        res.send(successHtml);
      } else {
        // User authentication flow (fallback)
        const token = jwt.sign(
          {
            userId: req.user.id,
            organizationId: req.user.organizationId,
            isAdmin: req.user.isAdmin || req.user.isSuperAdmin,
            provider: provider,
          },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );

        const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/callback?token=${token}`;
        res.redirect(redirectUrl);
      }

      logger.info(`${provider} OAuth successful for integration: ${isIntegration}`);
    } catch (error) {
      logger.error(`${provider} OAuth callback error:`, error);

      const errorHtml = `
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'oauth_error',
                  provider: '${provider}',
                  error: 'Failed to connect ${provider} account'
                }, '*');
                window.close();
              } else {
                window.location.href = '/integrations?error=${provider}_failed';
              }
            </script>
            <p>Failed to connect ${provider} account. You can close this window.</p>
          </body>
        </html>
      `;
      res.send(errorHtml);
    }
  };
}

/**
 * Get available OAuth providers
 */
router.get('/providers', (req, res) => {
  try {
    const providers = getAvailableProviders();
    res.json({
      providers,
      count: providers.length,
      message:
        providers.length > 0
          ? 'OAuth providers configured and ready'
          : 'No OAuth providers configured. Check environment variables.',
    });
  } catch (error) {
    logger.error('Error getting OAuth providers:', error);
    res.status(500).json({ error: 'Failed to load OAuth providers' });
  }
});

/**
 * Google OAuth Routes
 */
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  // Initiate Google OAuth
  router.get(
    '/google',
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      prompt: 'select_account', // Always show account selection
    })
  );

  // Google OAuth callback
  router.get(
    '/google/callback',
    passport.authenticate('google', { failureRedirect: '/integrations?error=oauth_failed' }),
    (req, res) => {
      try {
        const isIntegration = req.query.integration === 'true';

        if (isIntegration) {
          // Integration flow - connect account to existing user
          // TODO: Store OAuth tokens when Prisma client is available
          const successHtml = `
            <html>
              <body>
                <script>
                  if (window.opener) {
                    window.opener.postMessage({
                      type: 'oauth_success',
                      provider: 'google',
                      message: 'Google account connected successfully!'
                    }, '*');
                    window.close();
                  } else {
                    window.location.href = '/integrations?success=google_connected';
                  }
                </script>
                <p>Google account connected! You can close this window.</p>
              </body>
            </html>
          `;
          res.send(successHtml);
        } else {
          // User authentication flow (fallback)
          const token = jwt.sign(
            {
              userId: req.user.id,
              organizationId: req.user.organizationId,
              isAdmin: req.user.isAdmin || req.user.isSuperAdmin,
              provider: 'google',
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
          );

          const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/callback?token=${token}`;
          res.redirect(redirectUrl);
        }

        logger.info(`Google OAuth successful for integration: ${isIntegration}`);
      } catch (error) {
        logger.error('Google OAuth callback error:', error);

        const errorHtml = `
          <html>
            <body>
              <script>
                if (window.opener) {
                  window.opener.postMessage({
                    type: 'oauth_error',
                    provider: 'google',
                    error: 'Failed to connect Google account'
                  }, '*');
                  window.close();
                } else {
                  window.location.href = '/integrations?error=google_failed';
                }
              </script>
              <p>Failed to connect Google account. You can close this window.</p>
            </body>
          </html>
        `;
        res.send(errorHtml);
      }
    }
  );
}

/**
 * GitHub OAuth Routes
 */
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  // Initiate GitHub OAuth
  router.get(
    '/github',
    passport.authenticate('github', {
      scope: ['user:email'],
    })
  );

  // GitHub OAuth callback
  router.get(
    '/github/callback',
    passport.authenticate('github', { failureRedirect: '/integrations?error=oauth_failed' }),
    (req, res) => {
      try {
        const isIntegration = req.query.integration === 'true';

        if (isIntegration) {
          // Integration flow - connect account to existing user
          const successHtml = `
            <html>
              <body>
                <script>
                  if (window.opener) {
                    window.opener.postMessage({
                      type: 'oauth_success',
                      provider: 'github',
                      message: 'GitHub account connected successfully!'
                    }, '*');
                    window.close();
                  } else {
                    window.location.href = '/integrations?success=github_connected';
                  }
                </script>
                <p>GitHub account connected! You can close this window.</p>
              </body>
            </html>
          `;
          res.send(successHtml);
        } else {
          // User authentication flow (fallback)
          const token = jwt.sign(
            {
              userId: req.user.id,
              organizationId: req.user.organizationId,
              isAdmin: req.user.isAdmin || req.user.isSuperAdmin,
              provider: 'github',
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
          );

          const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/callback?token=${token}`;
          res.redirect(redirectUrl);
        }

        logger.info(`GitHub OAuth successful for integration: ${isIntegration}`);
      } catch (error) {
        logger.error('GitHub OAuth callback error:', error);

        const errorHtml = `
          <html>
            <body>
              <script>
                if (window.opener) {
                  window.opener.postMessage({
                    type: 'oauth_error',
                    provider: 'github',
                    error: 'Failed to connect GitHub account'
                  }, '*');
                  window.close();
                } else {
                  window.location.href = '/integrations?error=github_failed';
                }
              </script>
              <p>Failed to connect GitHub account. You can close this window.</p>
            </body>
          </html>
        `;
        res.send(errorHtml);
      }
    }
  );
}

/**
 * Facebook OAuth Routes
 */
if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
  // Initiate Facebook OAuth
  router.get(
    '/facebook',
    passport.authenticate('facebook', {
      scope: ['email'],
    })
  );

  // Facebook OAuth callback
  router.get(
    '/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/integrations?error=oauth_failed' }),
    (req, res) => {
      try {
        const isIntegration = req.query.integration === 'true';

        if (isIntegration) {
          // Integration flow - connect account to existing user
          const successHtml = `
            <html>
              <body>
                <script>
                  if (window.opener) {
                    window.opener.postMessage({
                      type: 'oauth_success',
                      provider: 'facebook',
                      message: 'Facebook account connected successfully!'
                    }, '*');
                    window.close();
                  } else {
                    window.location.href = '/integrations?success=facebook_connected';
                  }
                </script>
                <p>Facebook account connected! You can close this window.</p>
              </body>
            </html>
          `;
          res.send(successHtml);
        } else {
          // User authentication flow (fallback)
          const token = jwt.sign(
            {
              userId: req.user.id,
              organizationId: req.user.organizationId,
              isAdmin: req.user.isAdmin || req.user.isSuperAdmin,
              provider: 'facebook',
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
          );

          const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/callback?token=${token}`;
          res.redirect(redirectUrl);
        }

        logger.info(`Facebook OAuth successful for integration: ${isIntegration}`);
      } catch (error) {
        logger.error('Facebook OAuth callback error:', error);

        const errorHtml = `
          <html>
            <body>
              <script>
                if (window.opener) {
                  window.opener.postMessage({
                    type: 'oauth_error',
                    provider: 'facebook',
                    error: 'Failed to connect Facebook account'
                  }, '*');
                  window.close();
                } else {
                  window.location.href = '/integrations?error=facebook_failed';
                }
              </script>
              <p>Failed to connect Facebook account. You can close this window.</p>
            </body>
          </html>
        `;
        res.send(errorHtml);
      }
    }
  );
}

/**
 * Microsoft OAuth Routes
 */
if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
  router.get(
    '/microsoft',
    passport.authenticate('microsoft', {
      scope: ['user.read'],
    })
  );

  router.get(
    '/microsoft/callback',
    passport.authenticate('microsoft', { failureRedirect: '/integrations?error=oauth_failed' }),
    createOAuthCallback('microsoft')
  );
}

/**
 * LinkedIn OAuth Routes
 */
if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
  router.get(
    '/linkedin',
    passport.authenticate('linkedin', {
      scope: ['r_emailaddress', 'r_liteprofile'],
    })
  );

  router.get(
    '/linkedin/callback',
    passport.authenticate('linkedin', { failureRedirect: '/integrations?error=oauth_failed' }),
    createOAuthCallback('linkedin')
  );
}

/**
 * Twitter OAuth Routes
 */
if (process.env.TWITTER_CONSUMER_KEY && process.env.TWITTER_CONSUMER_SECRET) {
  router.get('/twitter', passport.authenticate('twitter'));

  router.get(
    '/twitter/callback',
    passport.authenticate('twitter', { failureRedirect: '/integrations?error=oauth_failed' }),
    createOAuthCallback('twitter')
  );
}

/**
 * Link social account to existing user (TODO: Implement when Prisma client is available)
 */
router.post('/link/:provider', (req, res) => {
  const { provider } = req.params;

  if (!['google', 'github', 'facebook', 'microsoft', 'linkedin', 'twitter'].includes(provider)) {
    return res.status(400).json({ error: 'Invalid OAuth provider' });
  }

  res.status(501).json({
    error: 'Account linking not yet implemented',
    message: 'This feature will be available after Prisma client generation is complete',
  });
});

/**
 * Unlink social account (TODO: Implement when Prisma client is available)
 */
router.delete('/unlink/:provider', async (req, res) => {
  try {
    const { provider } = req.params;

    res.status(501).json({
      error: 'Account unlinking not yet implemented',
      message: 'This feature will be available after Prisma client generation is complete',
    });
  } catch (error) {
    logger.error('Error unlinking social account:', error);
    res.status(500).json({ error: 'Failed to unlink social account' });
  }
});

/**
 * Get user's linked social accounts (TODO: Implement when Prisma client is available)
 */
router.get('/linked', async (req, res) => {
  try {
    res.json({
      linkedAccounts: [],
      count: 0,
      availableProviders: getAvailableProviders(),
      message: 'Account linking will be available after Prisma client generation is complete',
    });
  } catch (error) {
    logger.error('Error fetching linked accounts:', error);
    res.status(500).json({ error: 'Failed to fetch linked accounts' });
  }
});

module.exports = router;
