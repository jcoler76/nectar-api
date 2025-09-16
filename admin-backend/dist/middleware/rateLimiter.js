"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearFailedAttempts = exports.getFailedAttempts = exports.trackFailedLogin = exports.apiRateLimiter = exports.passwordChangeRateLimiter = exports.authRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Rate limiter for authentication endpoints (strict)
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: 'Too many authentication attempts, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many authentication attempts',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: req.rateLimit?.resetTime
        });
    },
    skip: (req) => {
        // Skip rate limiting in development for easier testing
        return process.env.NODE_ENV === 'development' && process.env.SKIP_RATE_LIMIT === 'true';
    }
});
// Rate limiter for password change endpoint (very strict)
exports.passwordChangeRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 password change requests per hour
    message: 'Too many password change attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many password change attempts',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: req.rateLimit?.resetTime
        });
    }
});
// General API rate limiter (more permissive)
exports.apiRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 requests per minute
    message: 'Too many requests, please slow down.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many requests',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: req.rateLimit?.resetTime
        });
    },
    skip: (req) => {
        // Skip rate limiting for health check endpoint
        return req.path === '/health';
    }
});
// Failed login attempt tracker (for brute force protection)
const failedAttempts = new Map();
const trackFailedLogin = (identifier) => {
    const now = Date.now();
    const attempt = failedAttempts.get(identifier);
    if (!attempt) {
        failedAttempts.set(identifier, { count: 1, firstAttempt: now });
    }
    else {
        // Reset if it's been more than 15 minutes since first attempt
        if (now - attempt.firstAttempt > 15 * 60 * 1000) {
            failedAttempts.set(identifier, { count: 1, firstAttempt: now });
        }
        else {
            attempt.count++;
        }
    }
};
exports.trackFailedLogin = trackFailedLogin;
const getFailedAttempts = (identifier) => {
    const attempt = failedAttempts.get(identifier);
    if (!attempt)
        return 0;
    const now = Date.now();
    // Reset if it's been more than 15 minutes
    if (now - attempt.firstAttempt > 15 * 60 * 1000) {
        failedAttempts.delete(identifier);
        return 0;
    }
    return attempt.count;
};
exports.getFailedAttempts = getFailedAttempts;
const clearFailedAttempts = (identifier) => {
    failedAttempts.delete(identifier);
};
exports.clearFailedAttempts = clearFailedAttempts;
// Clean up old entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of failedAttempts.entries()) {
        if (now - value.firstAttempt > 15 * 60 * 1000) {
            failedAttempts.delete(key);
        }
    }
}, 5 * 60 * 1000); // Clean up every 5 minutes
//# sourceMappingURL=rateLimiter.js.map