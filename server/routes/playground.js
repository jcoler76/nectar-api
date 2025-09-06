const express = require('express');
const router = express.Router();
const { logger } = require('../middleware/logger');
const { authMiddleware } = require('../middleware/auth');

// Simple GraphQL Playground HTML
const playgroundHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset=utf-8/>
  <meta name="viewport" content="user-scalable=no, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, minimal-ui">
  <title>GraphQL Playground</title>
  <link rel="stylesheet" href="//cdn.jsdelivr.net/npm/graphql-playground-react/build/static/css/index.css" />
  <link rel="shortcut icon" href="//cdn.jsdelivr.net/npm/graphql-playground-react/build/favicon.png" />
  <script src="//cdn.jsdelivr.net/npm/graphql-playground-react/build/static/js/middleware.js"></script>
</head>
<body>
  <div id="root">
    <style>
      body {
        background-color: rgb(23, 42, 58);
        font-family: Open Sans, sans-serif;
        height: 90vh;
      }
      #root {
        height: 100%;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .loading {
        font-size: 32px;
        font-weight: 200;
        color: rgba(255, 255, 255, .6);
        margin-left: 20px;
      }
      img {
        width: 78px;
        height: 78px;
      }
      .title {
        font-weight: 400;
      }
    </style>
    <img src="//cdn.jsdelivr.net/npm/graphql-playground-react/build/logo.png" alt="">
    <div class="loading"> Loading
      <span class="title">GraphQL Playground</span>
    </div>
  </div>
  <script>
    window.addEventListener('load', function (event) {
      GraphQLPlayground.init(document.getElementById('root'), {
        endpoint: '/graphql',
        settings: {
          'editor.theme': 'dark',
          'editor.reuseHeaders': true,
          'tracing.hideTracingResponse': false,
          'editor.fontSize': 14,
          'request.credentials': 'include'
        },
        tabs: [
          {
            endpoint: '/graphql',
            query: \`# Welcome to GraphQL Playground
# 
# GraphQL Playground is a modern GraphQL IDE for exploring APIs
# 
# Try this example query:

query GetTypes {
  __schema {
    types {
      name
      description
    }
  }
}

# For authenticated queries, you'll need to set headers like:
# {
#   "Authorization": "Bearer YOUR_JWT_TOKEN"
# }
\`
          }
        ]
      })
    })
  </script>
</body>
</html>
`;

// Middleware to check if playground should be accessible
const checkPlaygroundAccess = (req, res, next) => {
  // Disable in production unless explicitly allowed
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_GRAPHQL_PLAYGROUND !== 'true') {
    logger.warn('GraphQL Playground access attempted in production', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
  }

  // In development, allow access
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  // In production with playground enabled, require authentication
  authMiddleware(req, res, err => {
    if (err || !req.user) {
      logger.warn('Unauthenticated GraphQL Playground access attempt', {
        ip: req.ip,
      });
      return res
        .status(401)
        .json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    // Check if user is admin
    if (!req.user.isAdmin) {
      logger.warn('Non-admin GraphQL Playground access attempt', {
        userId: req.user.userId,
        email: req.user.email,
      });
      return res
        .status(403)
        .json({ error: { code: 'FORBIDDEN', message: 'Admin access required' } });
    }

    logger.info('GraphQL Playground accessed', {
      userId: req.user.userId,
      email: req.user.email,
    });

    next();
  });
};

// Serve GraphQL Playground with access control
router.get('/', checkPlaygroundAccess, (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(playgroundHTML);
});

module.exports = router;
