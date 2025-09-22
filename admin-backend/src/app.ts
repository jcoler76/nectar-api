// Load environment variables FIRST before any other imports that might use them
import dotenv from 'dotenv'
dotenv.config()

// Validate environment configuration before starting application
import { EnvironmentValidator } from '@/utils/envValidation'
EnvironmentValidator.validateOrExit()

import compression from 'compression'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { Application, Request, Response } from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { createServer } from 'http'
import { apiRateLimiter } from '@/middleware/rateLimiter'

// Import routes
import authRoutes from '@/routes/auth'
import usersRoutes from '@/routes/users'
import adminUsersRoutes from '@/routes/adminUsers'
import adminRoutes from '@/routes/admin'
import licenseRoutes from '@/routes/licenses'
// Re-enabled Stripe-related routes for production launch
import analyticsRoutes from '@/routes/analytics'
import stripeConfigRoutes from '@/routes/stripeConfig'
import billingRoutes from '@/routes/billing'
import webhookRoutes from '@/routes/webhooks'
import marketingBillingRoutes from '@/routes/marketingBilling'
import crmRoutes from '@/routes/crm'

const app: Application = express()
const PORT = Number(process.env.PORT || process.env.ADMIN_PORT || 4001)
let httpServer: any

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}))

// CORS configuration - strict for production
const isDevelopment = process.env.NODE_ENV === 'development'
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || (
  isDevelopment
    ? ['http://localhost:4000', 'http://localhost:3000']
    : ['https://admin.nectarstudio.ai']
)

app.use(cors({
  origin: (origin, callback) => {
    // In production, reject requests with no origin
    if (!origin && !isDevelopment) {
      return callback(new Error('Origin header required'))
    }
    
    // Allow no-origin requests only in development (for testing tools)
    if (!origin && isDevelopment) {
      return callback(null, true)
    }

    if (origin && allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // Cache preflight requests for 24 hours
}))

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Cookie parsing middleware
app.use(cookieParser())

// Compression middleware
app.use(compression())

// Logging middleware
const logFormat = process.env.NODE_ENV === 'production'
  ? 'combined'
  : 'dev'
app.use(morgan(logFormat))

// Trust proxy (important for getting real IP addresses)
app.set('trust proxy', 1)

// Apply general API rate limiting to all routes
app.use(apiRateLimiter)

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'nectar-admin-backend',
    version: '1.0.0', // restart
  })
})

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/admin/users', adminUsersRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/licenses', licenseRoutes)
// Re-enabled Stripe-related routes for production launch
app.use('/api/analytics', analyticsRoutes)
app.use('/api/stripe', stripeConfigRoutes)
app.use('/api/billing', billingRoutes)
app.use('/api/webhooks', webhookRoutes)
app.use('/api/marketing', marketingBillingRoutes)
app.use('/api/crm', crmRoutes)

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
  })
})

// Global error handler
app.use((error: Error, req: Request, res: Response, next: any) => {
  // Log error internally without exposing sensitive details

  // CORS error
  if ((error as any).message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS policy violation',
      code: 'CORS_ERROR',
    })
  }

  // JSON parsing error
  if (error instanceof SyntaxError && 'body' in (error as any)) {
    return res.status(400).json({
      error: 'Invalid JSON payload',
      code: 'INVALID_JSON',
    })
  }

  // Default error response
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : (error as any).message,
    code: 'INTERNAL_ERROR',
  })
})

// Prepare HTTP server with resilient EADDRINUSE retry
let __bindAttempts = 0
const __maxRetries = parseInt(process.env.PORT_BIND_RETRIES || '40', 10)
const __retryDelayMs = parseInt(process.env.PORT_BIND_RETRY_DELAY_MS || '250', 10)

const logListening = () => {
  console.log(`dYs? Admin Portal Backend running on port ${PORT}`)
  console.log(`dY"S Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`dY"' CORS origins: ${allowedOrigins.join(', ')}`)
}

const setupServer = () => {
  httpServer = createServer(app)
  httpServer.on('error', (err: any) => {
    if (err && (err.code === 'EADDRINUSE' || err.errno === -4091)) {
      if (__bindAttempts < __maxRetries) {
        const waitMs = __retryDelayMs
        console.warn(`Port ${PORT} in use (attempt ${__bindAttempts}/${__maxRetries}); retrying in ${waitMs}ms...`)
        setTimeout(() => {
          try { try { (httpServer as any).close() } catch {}; setupServer(); attemptListen() } catch (retryErr) {
            console.error('Error during listen retry:', retryErr)
          }
        }, waitMs)
        return
      }
      console.error(`Failed to bind port ${PORT} after ${__bindAttempts} attempts. Exiting.`)
      process.exit(1)
    }
    console.error('HTTP server error:', err)
    process.exit(1)
  })
}

const attemptListen = () => {
  __bindAttempts += 1
  try {
    httpServer.listen(PORT, () => { logListening() })
  } catch (err: any) {
    if (err && (err.code === 'EADDRINUSE' || err.errno === -4091)) {
      if (__bindAttempts < __maxRetries) {
        const waitMs = __retryDelayMs
        console.warn(`Port ${PORT} in use (attempt ${__bindAttempts}/${__maxRetries}); retrying in ${waitMs}ms...`)
        setTimeout(() => { try { try { (httpServer as any).close() } catch {}; setupServer(); attemptListen() } catch {} }, waitMs)
        return
      }
      console.error(`Failed to bind port ${PORT} after ${__bindAttempts} attempts. Exiting.`)
      process.exit(1)
    }
    throw err
  }
}
// Start server
setupServer()
attemptListen()

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  httpServer.close(() => {
    console.log('Process terminated')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  httpServer.close(() => {
    console.log('Process terminated')
    process.exit(0)
  })
})

export default app


// trigger restart
// trigger restart
