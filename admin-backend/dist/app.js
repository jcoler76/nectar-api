"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Load environment variables FIRST before any other imports that might use them
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Validate environment configuration before starting application
const envValidation_1 = require("@/utils/envValidation");
envValidation_1.EnvironmentValidator.validateOrExit();
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const http_1 = require("http");
const rateLimiter_1 = require("@/middleware/rateLimiter");
// Import routes
const auth_1 = __importDefault(require("@/routes/auth"));
const users_1 = __importDefault(require("@/routes/users"));
const adminUsers_1 = __importDefault(require("@/routes/adminUsers"));
const admin_1 = __importDefault(require("@/routes/admin"));
const licenses_1 = __importDefault(require("@/routes/licenses"));
// Re-enabled Stripe-related routes for production launch
const analytics_1 = __importDefault(require("@/routes/analytics"));
const stripeConfig_1 = __importDefault(require("@/routes/stripeConfig"));
const billing_1 = __importDefault(require("@/routes/billing"));
const webhooks_1 = __importDefault(require("@/routes/webhooks"));
const marketingBilling_1 = __importDefault(require("@/routes/marketingBilling"));
const crm_1 = __importDefault(require("@/routes/crm"));
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT || process.env.ADMIN_PORT || 4001);
let httpServer;
// Security middleware
app.use((0, helmet_1.default)({
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
}));
// CORS configuration - strict for production
const isDevelopment = process.env.NODE_ENV === 'development';
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || (isDevelopment
    ? ['http://localhost:4000', 'http://localhost:3000']
    : ['https://admin.nectarstudio.ai']);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // In production, reject requests with no origin
        if (!origin && !isDevelopment) {
            return callback(new Error('Origin header required'));
        }
        // Allow no-origin requests only in development (for testing tools)
        if (!origin && isDevelopment) {
            return callback(null, true);
        }
        if (origin && allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400 // Cache preflight requests for 24 hours
}));
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Cookie parsing middleware
app.use((0, cookie_parser_1.default)());
// Compression middleware
app.use((0, compression_1.default)());
// Logging middleware
const logFormat = process.env.NODE_ENV === 'production'
    ? 'combined'
    : 'dev';
app.use((0, morgan_1.default)(logFormat));
// Trust proxy (important for getting real IP addresses)
app.set('trust proxy', 1);
// Apply general API rate limiting to all routes
app.use(rateLimiter_1.apiRateLimiter);
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'nectar-admin-backend',
        version: '1.0.0', // restart
    });
});
// API routes
app.use('/api/auth', auth_1.default);
app.use('/api/users', users_1.default);
app.use('/api/admin/users', adminUsers_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/licenses', licenses_1.default);
// Re-enabled Stripe-related routes for production launch
app.use('/api/analytics', analytics_1.default);
app.use('/api/stripe', stripeConfig_1.default);
app.use('/api/billing', billing_1.default);
app.use('/api/webhooks', webhooks_1.default);
app.use('/api/marketing', marketingBilling_1.default);
app.use('/api/crm', crm_1.default);
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
    });
});
// Global error handler
app.use((error, req, res, next) => {
    // Log error internally without exposing sensitive details
    // CORS error
    if (error.message === 'Not allowed by CORS') {
        return res.status(403).json({
            error: 'CORS policy violation',
            code: 'CORS_ERROR',
        });
    }
    // JSON parsing error
    if (error instanceof SyntaxError && 'body' in error) {
        return res.status(400).json({
            error: 'Invalid JSON payload',
            code: 'INVALID_JSON',
        });
    }
    // Default error response
    res.status(500).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : error.message,
        code: 'INTERNAL_ERROR',
    });
});
// Prepare HTTP server with resilient EADDRINUSE retry
let __bindAttempts = 0;
const __maxRetries = parseInt(process.env.PORT_BIND_RETRIES || '40', 10);
const __retryDelayMs = parseInt(process.env.PORT_BIND_RETRY_DELAY_MS || '250', 10);
const logListening = () => {
    console.log(`dYs? Admin Portal Backend running on port ${PORT}`);
    console.log(`dY"S Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`dY"' CORS origins: ${allowedOrigins.join(', ')}`);
};
const setupServer = () => {
    httpServer = (0, http_1.createServer)(app);
    httpServer.on('error', (err) => {
        if (err && (err.code === 'EADDRINUSE' || err.errno === -4091)) {
            if (__bindAttempts < __maxRetries) {
                const waitMs = __retryDelayMs;
                console.warn(`Port ${PORT} in use (attempt ${__bindAttempts}/${__maxRetries}); retrying in ${waitMs}ms...`);
                setTimeout(() => {
                    try {
                        try {
                            httpServer.close();
                        }
                        catch { }
                        ;
                        setupServer();
                        attemptListen();
                    }
                    catch (retryErr) {
                        console.error('Error during listen retry:', retryErr);
                    }
                }, waitMs);
                return;
            }
            console.error(`Failed to bind port ${PORT} after ${__bindAttempts} attempts. Exiting.`);
            process.exit(1);
        }
        console.error('HTTP server error:', err);
        process.exit(1);
    });
};
const attemptListen = () => {
    __bindAttempts += 1;
    try {
        httpServer.listen(PORT, () => { logListening(); });
    }
    catch (err) {
        if (err && (err.code === 'EADDRINUSE' || err.errno === -4091)) {
            if (__bindAttempts < __maxRetries) {
                const waitMs = __retryDelayMs;
                console.warn(`Port ${PORT} in use (attempt ${__bindAttempts}/${__maxRetries}); retrying in ${waitMs}ms...`);
                setTimeout(() => { try {
                    try {
                        httpServer.close();
                    }
                    catch { }
                    ;
                    setupServer();
                    attemptListen();
                }
                catch { } }, waitMs);
                return;
            }
            console.error(`Failed to bind port ${PORT} after ${__bindAttempts} attempts. Exiting.`);
            process.exit(1);
        }
        throw err;
    }
};
// Start server
setupServer();
attemptListen();
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    httpServer.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    httpServer.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});
exports.default = app;
// trigger restart
// trigger restart
//# sourceMappingURL=app.js.map