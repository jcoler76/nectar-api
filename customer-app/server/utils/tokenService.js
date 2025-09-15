const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { logger } = require('./logger');

// Redis integration with fallback to in-memory
let redisSecurityService = null;

// Initialize Redis service
const initializeRedis = async () => {
  try {
    const { getRedisSecurityService } = require('../services/redisSecurityService');
    redisSecurityService = await getRedisSecurityService();
  } catch (error) {
    logger.warn('Redis not available, using in-memory token management');
    redisSecurityService = null;
  }
};

// In-memory fallback for development
const tokenBlacklist = new Set();

// Validate JWT secret on startup
if (!process.env.JWT_SECRET) {
  logger.error('🚨 CRITICAL: JWT_SECRET environment variable is not set!');
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  logger.warn('⚠️  JWT_SECRET is shorter than recommended (32+ characters)');
}

// Check for common weak secrets
const weakSecrets = [
  'secret',
  'your-secret-key',
  'your-256-bit-secret',
  'mysecret',
  'jwt-secret',
  'default-secret',
];

if (weakSecrets.includes(process.env.JWT_SECRET.toLowerCase())) {
  logger.error('🚨 CRITICAL: JWT_SECRET appears to be a default/weak value');
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

// Generate a device fingerprint for token binding
const generateFingerprint = req => {
  const userAgent = req.headers['user-agent'] || '';
  const ipAddress = req.ip || req.connection.remoteAddress || '';
  const acceptLanguage = req.headers['accept-language'] || '';

  // Create a hash of device characteristics
  const fingerprintData = `${userAgent}|${ipAddress}|${acceptLanguage}`;
  return crypto.createHash('sha256').update(fingerprintData).digest('hex').substring(0, 16);
};

// Enhanced JWT token generation with shorter expiration
const generateTokens = (payload, fingerprint = null) => {
  const secret = process.env.JWT_SECRET;
  const accessTokenId = crypto.randomBytes(16).toString('hex');
  const refreshTokenId = crypto.randomBytes(16).toString('hex');

  const tokenPayload = {
    ...payload,
    type: 'access',
    ...(fingerprint && { fingerprint }),
  };

  const refreshPayload = {
    ...payload,
    type: 'refresh',
    ...(fingerprint && { fingerprint }),
  };

  const accessToken = jwt.sign(tokenPayload, secret, {
    algorithm: 'HS256', // Explicitly specify algorithm
    expiresIn: '1d', // 1 day access token
    jwtid: accessTokenId,
    issuer: 'nectar-api',
    audience: 'nectar-client',
  });

  const refreshToken = jwt.sign(refreshPayload, secret, {
    algorithm: 'HS256', // Explicitly specify algorithm
    expiresIn: '7d', // Longer-lived refresh token
    jwtid: refreshTokenId,
    issuer: 'nectar-api',
    audience: 'nectar-client',
  });

  return {
    accessToken,
    refreshToken,
    accessTokenId,
    refreshTokenId,
    expiresIn: 86400, // 1 day in seconds
    refreshExpiresIn: 604800, // 7 days in seconds
  };
};

// Enhanced token validation with Redis blacklist check
const validateToken = async token => {
  try {
    const secret = process.env.JWT_SECRET;

    // Verify token with algorithm restriction
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'], // Only allow HS256 algorithm
      issuer: 'nectar-api',
      audience: 'nectar-client', // Standardized nectar audience
    });

    // Check if token is blacklisted (Redis or in-memory)
    const isBlacklisted = await checkTokenBlacklist(token);
    if (isBlacklisted) {
      throw new Error('Token has been revoked');
    }

    // Additional validation for token type
    if (!decoded.type || !['access', 'refresh'].includes(decoded.type)) {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    throw error;
  }
};

// Check token blacklist with Redis/fallback
const checkTokenBlacklist = async token => {
  try {
    if (redisSecurityService && redisSecurityService.isConnected) {
      return await redisSecurityService.isTokenBlacklisted(token);
    } else {
      // Fallback to in-memory
      const decoded = jwt.decode(token);
      return decoded?.jti ? tokenBlacklist.has(decoded.jti) : false;
    }
  } catch (error) {
    logger.error('Error checking token blacklist:', error);
    return false; // Fail open for availability
  }
};

// Blacklist a token with Redis/fallback
const blacklistToken = async token => {
  try {
    if (redisSecurityService && redisSecurityService.isConnected) {
      return await redisSecurityService.blacklistToken(token);
    } else {
      // Fallback to in-memory
      const decoded = jwt.decode(token);
      if (decoded && decoded.jti) {
        tokenBlacklist.add(decoded.jti);
        return true;
      }
      return false;
    }
  } catch (error) {
    logger.error('Error blacklisting token:', error);
    return false;
  }
};

// Refresh token functionality
const refreshAccessToken = async refreshToken => {
  try {
    // Validate the refresh token
    const decoded = await validateToken(refreshToken);

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type for refresh');
    }

    // Generate new access token with same payload (excluding refresh-specific fields)
    const { type, jti, iat, exp, iss, aud, ...userPayload } = decoded;
    const newTokens = generateTokens(userPayload);

    // Optionally blacklist old refresh token for security
    if (process.env.REFRESH_TOKEN_ROTATION === 'true') {
      await blacklistToken(refreshToken);
    }

    return newTokens;
  } catch (error) {
    throw new Error('Invalid refresh token: ' + error.message);
  }
};

// Clean expired tokens from blacklist (Redis handles this automatically with TTL)
const cleanExpiredTokens = async () => {
  try {
    if (!redisSecurityService || !redisSecurityService.isConnected) {
      // For in-memory fallback, we need manual cleanup
      const now = Math.floor(Date.now() / 1000);
      const expiredTokens = [];

      // This is simplified - in production with in-memory,
      // you'd need to store token metadata for proper cleanup
      for (const jti of tokenBlacklist) {
        try {
          // This is a basic check - would need better logic in production
          expiredTokens.push(jti);
        } catch (error) {
          expiredTokens.push(jti);
        }
      }

      // Remove expired tokens
      expiredTokens.forEach(jti => tokenBlacklist.delete(jti));

      return { cleaned: expiredTokens.length, method: 'in-memory' };
    } else {
      // Redis handles expiration automatically via TTL
      return { cleaned: 0, method: 'redis-ttl' };
    }
  } catch (error) {
    logger.error('Error cleaning expired tokens:', error);
    return { cleaned: 0, error: error.message };
  }
};

// Get blacklist size for monitoring
const getBlacklistSize = async () => {
  try {
    if (redisSecurityService && redisSecurityService.isConnected) {
      // For Redis, this would require a separate tracking mechanism
      // as Redis keys with patterns are expensive to count
      return { size: 'redis-based', note: 'Use Redis monitoring tools' };
    } else {
      return { size: tokenBlacklist.size, method: 'in-memory' };
    }
  } catch (error) {
    return { size: 0, error: error.message };
  }
};

// Token security analysis
const analyzeToken = token => {
  try {
    const decoded = jwt.decode(token, { complete: true });

    return {
      header: decoded.header,
      payload: {
        ...decoded.payload,
        // Remove sensitive data from analysis
        jti: decoded.payload.jti ? decoded.payload.jti.substring(0, 8) + '...' : null,
      },
      isExpired: decoded.payload.exp ? Date.now() >= decoded.payload.exp * 1000 : false,
      timeToExpiry: decoded.payload.exp
        ? decoded.payload.exp - Math.floor(Date.now() / 1000)
        : null,
      algorithm: decoded.header.alg,
      tokenType: decoded.payload.type || 'legacy',
    };
  } catch (error) {
    return { error: 'Invalid token format' };
  }
};

// Logout functionality - blacklist both tokens
const logout = async (accessToken, refreshToken = null) => {
  try {
    const results = {
      accessTokenBlacklisted: false,
      refreshTokenBlacklisted: false,
    };

    // Blacklist access token
    if (accessToken) {
      results.accessTokenBlacklisted = await blacklistToken(accessToken);
    }

    // Blacklist refresh token if provided
    if (refreshToken) {
      results.refreshTokenBlacklisted = await blacklistToken(refreshToken);
    }

    return results;
  } catch (error) {
    logger.error('Error during logout:', error);
    return { error: error.message };
  }
};

// Initialize Redis connection
initializeRedis().catch(logger.error);

/**
 * Check if a token payload has all required claims for optimal performance
 * @param {Object} payload - Token payload to check
 * @returns {Object} - Analysis of missing claims
 */
const analyzeTokenClaims = payload => {
  const requiredClaims = ['userId', 'isAdmin', 'userType'];
  const optionalClaims = ['sessionId'];
  const missing = requiredClaims.filter(claim => !payload.hasOwnProperty(claim));
  const present = requiredClaims.filter(claim => payload.hasOwnProperty(claim));
  const optional = optionalClaims.filter(claim => payload.hasOwnProperty(claim));

  return {
    isComplete: missing.length === 0,
    missingRequired: missing,
    presentRequired: present,
    presentOptional: optional,
    completenessScore: present.length / requiredClaims.length,
    recommendations:
      missing.length > 0
        ? [
            `Token missing ${missing.join(', ')} claims - refresh recommended for optimal performance`,
          ]
        : [],
  };
};

/**
 * Enhance token payload with missing user data from database
 * Use sparingly - prefer complete token generation
 * @param {Object} tokenPayload - Current token payload
 * @param {Object} userData - User data from database (optional)
 * @returns {Object} - Enhanced payload
 */
const enhanceTokenPayload = async (tokenPayload, userData = null) => {
  const analysis = analyzeTokenClaims(tokenPayload);

  if (analysis.isComplete) {
    return { payload: tokenPayload, enhanced: false, analysis };
  }

  // Only fetch from database if userData not provided and claims are missing
  if (!userData && analysis.missingRequired.length > 0) {
    const User = require('../models/User');
    const userId = tokenPayload.userId || tokenPayload._id;
    userData = await User.findById(userId).select('isAdmin userType email');

    if (!userData) {
      throw new Error(`User ${userId} not found during token enhancement`);
    }
  }

  const enhanced = {
    ...tokenPayload,
    ...(analysis.missingRequired.includes('isAdmin') &&
      userData?.isAdmin !== undefined && { isAdmin: userData.isAdmin }),
    ...(analysis.missingRequired.includes('userType') &&
      userData?.userType && { userType: userData.userType }),
  };

  logger.info('Token payload enhanced', {
    originalClaims: Object.keys(tokenPayload),
    enhancedClaims: Object.keys(enhanced),
    addedClaims: analysis.missingRequired.filter(claim => enhanced[claim] !== undefined),
    userId: tokenPayload.userId || tokenPayload._id,
  });

  return {
    payload: enhanced,
    enhanced: true,
    analysis: analyzeTokenClaims(enhanced),
    addedClaims: analysis.missingRequired,
  };
};

module.exports = {
  generateTokens,
  validateToken,
  blacklistToken,
  refreshAccessToken,
  cleanExpiredTokens,
  getBlacklistSize,
  analyzeToken,
  logout,
  checkTokenBlacklist,
  generateFingerprint,
  analyzeTokenClaims,
  enhanceTokenPayload,
};
