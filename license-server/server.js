const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('./prisma/generated/client');
const winston = require('winston');
require('dotenv').config();

// Initialize Prisma Client
const prisma = new PrismaClient();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 6000;

// Configure Winston Logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS Configuration
const corsOptions = {
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
if (process.env.ENABLE_REQUEST_LOGGING === 'true') {
  app.use((req, res, next) => {
    logger.info({
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    next();
  });
}

// Import route modules
const licenseRoutes = require('./src/controllers/licenseController');
const validationRoutes = require('./src/controllers/validationController');
const usageRoutes = require('./src/controllers/usageController');
const customerRoutes = require('./src/controllers/customerController');
const webhookRoutes = require('./src/controllers/webhookController');
const adminRoutes = require('./src/controllers/adminController');

// API Routes
app.use('/api/licenses', licenseRoutes);
app.use('/api/validation', validationRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: 'connected'
    });
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
});

// Metrics endpoint (if enabled)
if (process.env.METRICS_ENDPOINT_ENABLED === 'true') {
  app.get('/metrics', async (req, res) => {
    try {
      const [
        totalLicenses,
        activeLicenses,
        totalCustomers,
        totalValidations
      ] = await Promise.all([
        prisma.license.count(),
        prisma.license.count({ where: { isActive: true, isSuspended: false } }),
        prisma.customer.count({ where: { isActive: true } }),
        prisma.validationLog.count({
          where: {
            validatedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        })
      ]);

      res.json({
        licenses: {
          total: totalLicenses,
          active: activeLicenses,
          inactive: totalLicenses - activeLicenses
        },
        customers: {
          total: totalCustomers
        },
        validations: {
          last24Hours: totalValidations
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Metrics endpoint error', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  });
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Nectar License Server',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    url: req.originalUrl
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url,
    ip: req.ip
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(error.status || 500).json({
    error: isDevelopment ? error.message : 'Internal server error',
    ...(isDevelopment && { stack: error.stack }),
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
app.listen(PORT, process.env.HOST || '0.0.0.0', () => {
  logger.info(`License server running on port ${PORT}`, {
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

module.exports = app;