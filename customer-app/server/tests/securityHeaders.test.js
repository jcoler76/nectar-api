const request = require('supertest');
const express = require('express');
const helmet = require('helmet');

describe('Security Headers', () => {
  let app;

  beforeEach(() => {
    app = express();

    // Apply the same security headers as in server.js
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
          },
        },
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        },
        frameguard: {
          action: 'deny',
        },
        hidePoweredBy: true,
        noSniff: true,
        referrerPolicy: {
          policy: 'strict-origin-when-cross-origin',
        },
        dnsPrefetchControl: {
          allow: false,
        },
        ieNoOpen: true,
        xssFilter: true,
        permittedCrossDomainPolicies: false,
      })
    );

    // Additional security headers
    app.use((req, res, next) => {
      res.setHeader(
        'Permissions-Policy',
        'camera=(), microphone=(), geolocation=(), interest-cohort=(), ' +
          'payment=(), usb=(), sync-xhr=(), accelerometer=(), gyroscope=(), magnetometer=()'
      );
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

      if (req.url.includes('/api/')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
      }

      next();
    });

    // Test routes
    app.get('/test', (req, res) => {
      res.json({ message: 'test' });
    });

    app.get('/api/test', (req, res) => {
      res.json({ message: 'api test' });
    });
  });

  describe('Helmet Security Headers', () => {
    test('should set Strict-Transport-Security header', async () => {
      const response = await request(app).get('/test').expect(200);

      expect(response.headers['strict-transport-security']).toBe(
        'max-age=31536000; includeSubDomains; preload'
      );
    });

    test('should set X-Frame-Options header', async () => {
      const response = await request(app).get('/test').expect(200);

      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    test('should set X-Content-Type-Options header', async () => {
      const response = await request(app).get('/test').expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('should not have X-Powered-By header', async () => {
      const response = await request(app).get('/test').expect(200);

      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    test('should set Referrer-Policy header', async () => {
      const response = await request(app).get('/test').expect(200);

      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });

    test('should set X-DNS-Prefetch-Control header', async () => {
      const response = await request(app).get('/test').expect(200);

      expect(response.headers['x-dns-prefetch-control']).toBe('off');
    });

    test('should set X-Download-Options header for IE', async () => {
      const response = await request(app).get('/test').expect(200);

      expect(response.headers['x-download-options']).toBe('noopen');
    });

    test('should set X-XSS-Protection header', async () => {
      const response = await request(app).get('/test').expect(200);

      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });

    test('should set X-Permitted-Cross-Domain-Policies header', async () => {
      const response = await request(app).get('/test').expect(200);

      expect(response.headers['x-permitted-cross-domain-policies']).toBe('none');
    });

    test('should set Content-Security-Policy header', async () => {
      const response = await request(app).get('/test').expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("form-action 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain('upgrade-insecure-requests');
    });
  });

  describe('Additional Security Headers', () => {
    test('should set Permissions-Policy header', async () => {
      const response = await request(app).get('/test').expect(200);

      const permissionsPolicy = response.headers['permissions-policy'];
      expect(permissionsPolicy).toContain('camera=()');
      expect(permissionsPolicy).toContain('microphone=()');
      expect(permissionsPolicy).toContain('geolocation=()');
      expect(permissionsPolicy).toContain('interest-cohort=()');
      expect(permissionsPolicy).toContain('payment=()');
      expect(permissionsPolicy).toContain('usb=()');
      expect(permissionsPolicy).toContain('sync-xhr=()');
      expect(permissionsPolicy).toContain('accelerometer=()');
      expect(permissionsPolicy).toContain('gyroscope=()');
      expect(permissionsPolicy).toContain('magnetometer=()');
    });

    test('should set Cross-Origin headers', async () => {
      const response = await request(app).get('/test').expect(200);

      expect(response.headers['cross-origin-embedder-policy']).toBe('require-corp');
      expect(response.headers['cross-origin-opener-policy']).toBe('same-origin');
      expect(response.headers['cross-origin-resource-policy']).toBe('same-origin');
    });

    test('should set cache control headers for API routes', async () => {
      const response = await request(app).get('/api/test').expect(200);

      expect(response.headers['cache-control']).toBe(
        'no-store, no-cache, must-revalidate, proxy-revalidate'
      );
      expect(response.headers['pragma']).toBe('no-cache');
      expect(response.headers['expires']).toBe('0');
      expect(response.headers['surrogate-control']).toBe('no-store');
    });

    test('should not set cache control headers for non-API routes', async () => {
      const response = await request(app).get('/test').expect(200);

      expect(response.headers['cache-control']).not.toBe(
        'no-store, no-cache, must-revalidate, proxy-revalidate'
      );
    });
  });

  describe('Security Header Values', () => {
    test('all security headers should have secure values', async () => {
      const response = await request(app).get('/test').expect(200);

      const headers = response.headers;

      // Check that no headers contain unsafe values
      expect(headers['x-frame-options']).not.toBe('SAMEORIGIN');
      expect(headers['referrer-policy']).not.toBe('no-referrer-when-downgrade');
      expect(headers['x-xss-protection']).not.toBe('0');

      // Ensure HSTS is properly configured
      const hsts = headers['strict-transport-security'];
      expect(hsts).toContain('max-age=');
      expect(parseInt(hsts.match(/max-age=(\d+)/)[1])).toBeGreaterThanOrEqual(31536000);
    });
  });
});
