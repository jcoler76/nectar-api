# Rate Limiting Documentation

## Overview
The Nectar Studio implements advanced rate limiting with Redis backing, fallback mechanisms, and granular control.

## Features

### 1. Redis-Backed Storage
- **Primary Storage**: Redis for distributed rate limiting
- **Fallback**: In-memory storage when Redis is unavailable
- **Automatic Failover**: Seamless transition between storage backends

### 2. Multiple Rate Limit Tiers

#### API Rate Limiting
- **Standard API**: 100 requests per 15 minutes (production)
- **Development**: 1000 requests per 15 minutes
- **Headers**: Standard RateLimit-* headers

#### Authentication Rate Limiting
- **Login Attempts**: 5 per 15 minutes
- **Block Duration**: 1 hour after limit exceeded
- **Skip Successful**: Successful logins don't count toward limit

#### Upload Rate Limiting
- **File Uploads**: 20 per hour
- **Points System**: Each upload consumes 5 points
- **Separate Tracking**: Independent from API limits

#### GraphQL Rate Limiting
- **Simple Queries**: 200 per 5 minutes
- **Complex Queries**: 50 per 5 minutes (>1000 chars)
- **Dynamic Adjustment**: Based on query complexity

#### User-Based Rate Limiting
- **Free Tier**: 100 requests per hour
- **Basic Tier**: 500 requests per hour
- **Premium Tier**: 2000 requests per hour
- **Enterprise Tier**: 10000 requests per hour

### 3. Advanced Features

#### Distributed Rate Limiting
- Automatic adjustment for multiple server nodes
- Node registration and tracking
- Fair distribution of limits across nodes

#### Block Duration
- Temporary blocking after limit exceeded
- Configurable block periods
- Separate from rate limit windows

#### Dynamic Rate Limiting
- Adjust limits based on user tier
- Query complexity analysis
- Request-specific limit calculation

#### Skip Options
- Skip successful requests (for auth)
- Skip failed requests
- Conditional counting

## Implementation

### Basic Usage
```javascript
const { apiRateLimiter } = require('./middleware/rateLimiter');
app.use('/api', apiRateLimiter);
```

### Custom Rate Limiter
```javascript
const { createCustomRateLimiter } = require('./middleware/rateLimiter');

const customLimiter = createCustomRateLimiter('custom', {
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Custom rate limit exceeded',
  keyPrefix: 'custom:',
  blockDuration: 300 // 5 minutes
});
```

### Headers
```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 2024-01-19T12:00:00.000Z
RateLimit-Policy: 100;w=900
```

## Management API

### Get Rate Limit Status
```
GET /api/rate-limits/status/:key
```

### Reset Rate Limit
```
POST /api/rate-limits/reset/:key
```

### Get Active Rate Limits
```
GET /api/rate-limits/active
```

### Get Statistics
```
GET /api/rate-limits/stats
```

### Block IP/Key
```
POST /api/rate-limits/block
{
  "key": "192.168.1.100",
  "duration": 3600,
  "reason": "Suspicious activity"
}
```

### Unblock IP/Key
```
POST /api/rate-limits/unblock
{
  "key": "192.168.1.100"
}
```

## Error Responses

### Rate Limit Exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later.",
    "retryAfter": 523,
    "limit": 100,
    "current": 101
  }
}
```

### Temporarily Blocked
```json
{
  "error": {
    "code": "TEMPORARILY_BLOCKED",
    "message": "You have been temporarily blocked due to too many requests",
    "retryAfter": 3577
  }
}
```

## Configuration

### Environment Variables
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password
REDIS_DB=0
NODE_ID=server-1  # For distributed setups
```

### Rate Limit Configuration
```javascript
{
  windowMs: 15 * 60 * 1000,    // Time window
  max: 100,                     // Max requests
  standardHeaders: true,        // RateLimit headers
  legacyHeaders: false,         // X-RateLimit headers
  keyGenerator: (req) => req.ip,// Key generation
  skip: () => false,            // Skip function
  blockDuration: 3600,          // Block duration in seconds
  enableDistributed: true,      // Distributed limiting
  dynamicRateLimit: async (req) => {...} // Dynamic limits
}
```

## Best Practices

1. **Use Appropriate Limits**: Different endpoints need different limits
2. **Monitor Usage**: Use the management API to track patterns
3. **Block Abusers**: Use blocking for persistent violators
4. **Test Fallbacks**: Ensure in-memory fallback works correctly
5. **Set Headers**: Always return rate limit headers for transparency

## Testing

Run rate limiting tests:
```bash
npm test -- rateLimiting.test.js
```

## Monitoring

- Monitor Redis memory usage
- Track rate limit violations
- Alert on repeated blocks
- Review usage patterns regularly