import rateLimit from 'express-rate-limit'
import { Request, Response } from 'express'

// Rate limiter for authentication endpoints (strict)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many authentication attempts',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: req.rateLimit?.resetTime
    })
  },
  skip: (req: Request) => {
    // Skip rate limiting in development for easier testing
    return process.env.NODE_ENV === 'development' && process.env.SKIP_RATE_LIMIT === 'true'
  }
})

// Rate limiter for password change endpoint (very strict)
export const passwordChangeRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password change requests per hour
  message: 'Too many password change attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many password change attempts',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: req.rateLimit?.resetTime
    })
  }
})

// General API rate limiter (more permissive)
export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per minute
  message: 'Too many requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: req.rateLimit?.resetTime
    })
  },
  skip: (req: Request) => {
    // Skip rate limiting for health check endpoint
    return req.path === '/health'
  }
})

// Failed login attempt tracker (for brute force protection)
const failedAttempts = new Map<string, { count: number; firstAttempt: number }>()

export const trackFailedLogin = (identifier: string) => {
  const now = Date.now()
  const attempt = failedAttempts.get(identifier)
  
  if (!attempt) {
    failedAttempts.set(identifier, { count: 1, firstAttempt: now })
  } else {
    // Reset if it's been more than 15 minutes since first attempt
    if (now - attempt.firstAttempt > 15 * 60 * 1000) {
      failedAttempts.set(identifier, { count: 1, firstAttempt: now })
    } else {
      attempt.count++
    }
  }
}

export const getFailedAttempts = (identifier: string): number => {
  const attempt = failedAttempts.get(identifier)
  if (!attempt) return 0
  
  const now = Date.now()
  // Reset if it's been more than 15 minutes
  if (now - attempt.firstAttempt > 15 * 60 * 1000) {
    failedAttempts.delete(identifier)
    return 0
  }
  
  return attempt.count
}

export const clearFailedAttempts = (identifier: string) => {
  failedAttempts.delete(identifier)
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of failedAttempts.entries()) {
    if (now - value.firstAttempt > 15 * 60 * 1000) {
      failedAttempts.delete(key)
    }
  }
}, 5 * 60 * 1000) // Clean up every 5 minutes