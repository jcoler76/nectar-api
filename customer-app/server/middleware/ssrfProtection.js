const { URL } = require('url');
const ipaddr = require('ipaddr.js');
const { logger } = require('../utils/logger');

/**
 * SSRF (Server-Side Request Forgery) Protection Middleware
 * Validates URLs to prevent attacks against internal infrastructure
 */

// Configuration from environment variables
const ALLOWED_DOMAINS = process.env.ALLOWED_DOMAINS
  ? process.env.ALLOWED_DOMAINS.split(',').map(domain => domain.trim())
  : [
      // Production API domains
      'api.mirabeltechnologies.com',
      'staging-api.magazinemanager.biz',
      'mirabelconnect.mirabeltechnologies.com',
      // Add other trusted external APIs as needed
      // 'api.stripe.com',
      // 'hooks.slack.com',
      // 'api.openai.com'
    ];

// Allow localhost/internal IPs only in development
const ALLOW_INTERNAL_IPS = process.env.NODE_ENV !== 'production';

/**
 * Private/Internal IP ranges to block
 */
const BLOCKED_IP_RANGES = [
  // IPv4 Private ranges
  '10.0.0.0/8', // Private-Use Networks (RFC 1918)
  '172.16.0.0/12', // Private-Use Networks (RFC 1918)
  '192.168.0.0/16', // Private-Use Networks (RFC 1918)
  '127.0.0.0/8', // Loopback (RFC 5735)
  '169.254.0.0/16', // Link-Local (RFC 3927) - AWS metadata
  '224.0.0.0/4', // Multicast (RFC 3171)
  '240.0.0.0/4', // Reserved for Future Use (RFC 1112)

  // IPv6 ranges
  '::1/128', // Loopback
  'fc00::/7', // Unique local addresses
  'fe80::/10', // Link-local addresses
  'ff00::/8', // Multicast addresses
];

/**
 * Cloud metadata endpoints to block
 */
const BLOCKED_HOSTS = [
  // AWS
  '169.254.169.254',
  'metadata.google.internal',
  'metadata',

  // Azure
  '169.254.169.254',

  // Google Cloud
  'metadata.google.internal',
  '169.254.169.254',

  // Generic localhost variations
  'localhost',
  '127.0.0.1',
  '::1',
  '0.0.0.0',
];

/**
 * Blocked URL schemes that could be dangerous
 */
const BLOCKED_SCHEMES = ['file', 'ftp', 'gopher', 'dict', 'ldap', 'ldaps', 'tftp', 'jar'];

/**
 * Validate a URL for SSRF vulnerabilities
 * @param {string} url - The URL to validate
 * @param {Object} options - Validation options
 * @returns {Object} - {isValid: boolean, error?: string, sanitizedUrl?: string}
 */
const validateUrl = (url, options = {}) => {
  const {
    allowInternal = ALLOW_INTERNAL_IPS,
    allowedDomains = ALLOWED_DOMAINS,
    enforceHttps = false,
    maxRedirects = 0,
  } = options;

  try {
    // Parse and validate URL format
    const parsedUrl = new URL(url);
    const { protocol, hostname, port } = parsedUrl;

    // 1. Check protocol/scheme
    if (!['http:', 'https:'].includes(protocol)) {
      if (BLOCKED_SCHEMES.includes(protocol.slice(0, -1))) {
        return {
          isValid: false,
          error: `Blocked protocol: ${protocol}. Only HTTP and HTTPS are allowed.`,
        };
      }
      return {
        isValid: false,
        error: `Invalid protocol: ${protocol}. Only HTTP and HTTPS are allowed.`,
      };
    }

    // 2. Enforce HTTPS if required
    if (enforceHttps && protocol !== 'https:') {
      return {
        isValid: false,
        error: 'HTTPS is required for this request.',
      };
    }

    // 3. Check for blocked hostnames
    if (BLOCKED_HOSTS.includes(hostname.toLowerCase())) {
      return {
        isValid: false,
        error: `Blocked hostname: ${hostname}`,
      };
    }

    // 4. Validate IP addresses
    if (ipaddr.isValid(hostname)) {
      const addr = ipaddr.process(hostname);
      const range = addr.range();

      // Block private/internal IPs unless explicitly allowed
      if (['private', 'loopback', 'linkLocal', 'multicast', 'reserved'].includes(range)) {
        if (!allowInternal) {
          return {
            isValid: false,
            error: `Requests to ${range} IP addresses (${hostname}) are not allowed in production.`,
          };
        }
        logger.info(`SSRF: Allowing ${range} IP ${hostname} (development mode)`);
      }

      // Special handling for cloud metadata IP
      if (hostname === '169.254.169.254') {
        return {
          isValid: false,
          error: 'Requests to cloud metadata service are blocked for security.',
        };
      }
    }

    // 5. Domain allowlist validation (skip for internal IPs in development)
    const isInternalIP =
      ipaddr.isValid(hostname) &&
      ['private', 'loopback', 'linkLocal'].includes(ipaddr.process(hostname).range());
    const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(hostname.toLowerCase());

    if (allowedDomains.length > 0 && !allowedDomains.includes(hostname)) {
      // Allow internal addresses in development without domain check
      if (allowInternal && (isLocalhost || isInternalIP)) {
        logger.info(
          `SSRF: Skipping domain allowlist for internal address: ${hostname} (development mode)`
        );
      } else {
        return {
          isValid: false,
          error: `Domain ${hostname} is not in the allowed domains list.`,
        };
      }
    }

    // 6. Port validation (block common internal service ports)
    const blockedPorts = [22, 25, 53, 135, 139, 445, 1433, 1521, 3389, 5432, 6379, 27017];
    const urlPort = port ? parseInt(port) : protocol === 'https:' ? 443 : 80;

    if (blockedPorts.includes(urlPort) && !allowInternal) {
      return {
        isValid: false,
        error: `Port ${urlPort} is blocked for security reasons.`,
      };
    }

    // 7. Create sanitized URL (normalize and remove potential bypass attempts)
    const sanitizedUrl = new URL(parsedUrl.href);

    return {
      isValid: true,
      sanitizedUrl: sanitizedUrl.href,
      hostname,
      protocol,
      port: urlPort,
    };
  } catch (error) {
    return {
      isValid: false,
      error: `Invalid URL format: ${error.message}`,
    };
  }
};

/**
 * Express middleware for SSRF protection
 * Validates URLs in request body and blocks dangerous requests
 */
const ssrfProtectionMiddleware = (urlField = 'url', options = {}) => {
  return (req, res, next) => {
    const url = req.body[urlField];

    if (!url) {
      return next(); // No URL to validate
    }

    const validation = validateUrl(url, options);

    if (!validation.isValid) {
      logger.warn('SSRF protection blocked request:', {
        url,
        error: validation.error,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      });

      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: validation.error,
        },
      });
    }

    // Add validation result to request for use by route handlers
    req.urlValidation = validation;
    req.body[urlField] = validation.sanitizedUrl; // Use sanitized URL

    next();
  };
};

/**
 * Validate URL for workflow HTTP nodes
 * @param {string} url - URL to validate
 * @param {Object} context - Workflow context for logging
 * @returns {Object} - Validation result
 */
const validateWorkflowUrl = (url, context = {}) => {
  const { workflowId, nodeId, nodeLabel } = context;

  const validation = validateUrl(url, {
    allowInternal: ALLOW_INTERNAL_IPS,
    allowedDomains: ALLOWED_DOMAINS,
  });

  if (!validation.isValid) {
    logger.warn('Workflow SSRF protection blocked request:', {
      url,
      error: validation.error,
      workflowId,
      nodeId,
      nodeLabel,
    });
  } else {
    logger.debug('Workflow URL validated successfully:', {
      url: validation.sanitizedUrl,
      workflowId,
      nodeId,
      nodeLabel,
    });
  }

  return validation;
};

/**
 * Get current SSRF protection configuration
 */
const getConfig = () => ({
  allowedDomains: ALLOWED_DOMAINS,
  allowInternalIPs: ALLOW_INTERNAL_IPS,
  blockedHosts: BLOCKED_HOSTS,
  blockedSchemes: BLOCKED_SCHEMES,
  environment: process.env.NODE_ENV,
});

module.exports = {
  validateUrl,
  validateWorkflowUrl,
  ssrfProtectionMiddleware,
  getConfig,
  ALLOWED_DOMAINS,
  ALLOW_INTERNAL_IPS,
  BLOCKED_HOSTS,
  BLOCKED_SCHEMES,
};
