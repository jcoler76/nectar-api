// Import advanced rate limiter with Redis support
const { rateLimiters, createCustomRateLimiter } = require('./advancedRateLimiter');

// Export pre-configured rate limiters
module.exports = {
  // Standard API rate limiter with Redis support
  apiRateLimiter: rateLimiters.api,

  // Authentication rate limiter with blocking
  loginRateLimiter: rateLimiters.auth,

  // Additional rate limiters
  uploadRateLimiter: rateLimiters.upload,
  graphqlRateLimiter: rateLimiters.graphql,
  userRateLimiter: rateLimiters.user,
  websocketRateLimiter: rateLimiters.websocket,

  // Function to create custom rate limiters
  createCustomRateLimiter,
};
