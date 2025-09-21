const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.MARKETING_PORT || process.env.PORT || 5001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline styles for development
}));

// CORS configuration
app.use(cors({
  origin: process.env.MARKETING_FRONTEND_URL || 'http://localhost:5000',
  credentials: true,
}));

// Logging middleware
app.use(morgan('combined'));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'nectar-marketing-backend',
    timestamp: new Date().toISOString()
  });
});

// Marketing billing routes
const marketingBillingRoutes = require('./routes/marketingBilling');
app.use('/api/marketing', marketingBillingRoutes);

// Contact and lead capture routes
const contactRoutes = require('./routes/contact');
app.use('/api/contact-chat', contactRoutes);

// Auth proxy routes - forward to main API
app.use('/api/auth', async (req, res) => {
  try {
    const mainApiUrl = process.env.MAIN_API_URL || 'http://localhost:3001';
    const fetch = require('node-fetch');

    // Forward all headers including Origin, but exclude host-specific ones
    const forwardHeaders = { ...req.headers };
    delete forwardHeaders.host;
    delete forwardHeaders['content-length'];

    const response = await fetch(`${mainApiUrl}/api/auth${req.path}`, {
      method: req.method,
      headers: forwardHeaders,
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Auth proxy error:', error);
    res.status(500).json({
      success: false,
      message: 'Auth proxy error'
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Marketing backend error:', error);

  res.status(error.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Marketing backend server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`💳 Marketing API: http://localhost:${PORT}/api/marketing`);
});

module.exports = app;