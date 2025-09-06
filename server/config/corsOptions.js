// Dynamic CORS configuration
const allowedOrigins = [
  'https://mirabelconnect.mirabeltechnologies.com',
  'http://localhost:3000',
  'http://localhost:8000',
];

// In Codespaces, allow any *.app.github.dev origin
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    // Check if it's an allowed origin
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // In development, allow GitHub Codespaces URLs
    if (process.env.NODE_ENV === 'development' && origin.endsWith('.app.github.dev')) {
      return callback(null, true);
    }

    // Reject other origins
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-mirabel-api-key', 'x-csrf-token'],
  exposedHeaders: ['X-Total-Count'],
  credentials: true,
  maxAge: 600, // 10 minutes
};

module.exports = corsOptions;
