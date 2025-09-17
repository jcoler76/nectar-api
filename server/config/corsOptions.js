// Dynamic CORS configuration (built at request time from env)
function parseList(val) {
  return (val || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

const defaultAllowedHeaders = [
  'Content-Type',
  'Authorization',
  'x-nectarstudio-api-key',
  'x-api-key',
  'x-csrf-token',
];

function buildCorsOptions() {
  const envOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:4000',
    'http://localhost:5000',
    'http://localhost:8000',
  ];
  const allowedOrigins = envOrigins.length ? envOrigins : defaultOrigins;

  const configuredPrimaryHeader = process.env.API_AUTH_HEADER || 'x-nectarstudio-api-key';
  const configuredAliases = parseList(process.env.API_HEADER_ALIASES || '');
  const allowedHeadersSet = new Set([
    ...defaultAllowedHeaders,
    configuredPrimaryHeader,
    ...configuredAliases,
  ]);
  const allowedHeaders = Array.from(allowedHeadersSet);

  return {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (process.env.NODE_ENV === 'development' && origin.endsWith('.app.github.dev')) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders,
    exposedHeaders: ['X-Total-Count'],
    credentials: true,
    maxAge: 600, // 10 minutes
  };
}

module.exports = buildCorsOptions;
