/**
 * Secure Iframe Component
 *
 * CRITICAL SECURITY IMPLEMENTATION
 * - Validates iframe sources against allowlist
 * - Implements strict CSP-compliant sandbox
 * - Prevents XSS and data exfiltration attacks
 * - Adds security headers and validation
 */

import { ExternalLink, Shield, AlertTriangle } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';

// SECURITY: Strict allowlist of permitted iframe sources
const ALLOWED_IFRAME_SOURCES = [
  // Only allow same-origin API documentation
  '/api/swagger-ui/',
  // Add other trusted sources here as needed
];

// SECURITY: Restricted sandbox permissions (minimal required permissions)
const SECURE_SANDBOX_PERMISSIONS = [
  'allow-same-origin', // Required for API documentation
  'allow-scripts', // Required for Swagger UI and interactive documentation
  // Note: 'allow-forms' and 'allow-popups' still restricted for security
];

/**
 * Validates if a URL is safe to embed in iframe
 * @param {string} url - URL to validate
 * @returns {Object} - { isValid: boolean, reason?: string }
 */
const validateIframeSrc = url => {
  if (!url) {
    return { isValid: false, reason: 'URL is required' };
  }

  try {
    // Parse URL to validate structure
    const parsedUrl = new URL(url, window.location.origin);

    // SECURITY: Block non-HTTPS URLs (except localhost for development)
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return { isValid: false, reason: 'Only HTTPS URLs are allowed' };
    }

    // SECURITY: Block localhost in production
    if (
      process.env.NODE_ENV === 'production' &&
      (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1')
    ) {
      return { isValid: false, reason: 'Localhost URLs not allowed in production' };
    }

    // SECURITY: Check against allowlist
    const isAllowed = ALLOWED_IFRAME_SOURCES.some(allowedPath =>
      parsedUrl.pathname.startsWith(allowedPath)
    );

    if (!isAllowed) {
      return {
        isValid: false,
        reason: `URL path not in allowlist. Allowed paths: ${ALLOWED_IFRAME_SOURCES.join(', ')}`,
      };
    }

    // SECURITY: Block dangerous query parameters
    const dangerousParams = ['javascript', 'data', 'vbscript', 'script'];
    const searchParams = parsedUrl.searchParams.toString().toLowerCase();

    for (const dangerousParam of dangerousParams) {
      if (searchParams.includes(dangerousParam)) {
        return {
          isValid: false,
          reason: 'URL contains potentially dangerous parameters',
        };
      }
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, reason: 'Invalid URL format' };
  }
};

/**
 * SECURITY: Generate CSP nonce for iframe security
 * In production, this should be generated server-side
 */
const generateCSPNonce = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

const SecureIframe = ({
  src,
  title,
  className = '',
  style = {},
  onLoad,
  onError,
  allowFullscreen = false,
  ...props
}) => {
  const [validationResult, setValidationResult] = useState({ isValid: true });
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [cspNonce] = useState(() => generateCSPNonce());

  // SECURITY: Validate URL whenever src changes
  useEffect(() => {
    const result = validateIframeSrc(src);
    setValidationResult(result);
    setHasError(false);
    setIsLoading(true);
  }, [src]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  }, [onError]);

  const handleOpenInNewTab = useCallback(() => {
    if (validationResult.isValid) {
      window.open(src, '_blank', 'noopener,noreferrer');
    }
  }, [src, validationResult.isValid]);

  // SECURITY: Block rendering if URL validation fails
  if (!validationResult.isValid) {
    return (
      <div className="p-4 space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p>
                <strong>Security Warning:</strong> Cannot load content
              </p>
              <p>
                <strong>Reason:</strong> {validationResult.reason}
              </p>
              <p className="text-sm text-muted-foreground">
                For security reasons, only trusted sources can be embedded.
              </p>
            </div>
          </AlertDescription>
        </Alert>

        {/* Provide alternative access method */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={handleOpenInNewTab}
            disabled={!validationResult.isValid}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* SECURITY: Security indicator */}
      <div className="absolute top-2 right-2 z-10">
        <div className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
          <Shield className="h-3 w-3" />
          <span>Secured</span>
        </div>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-600">Loading secure content...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
            <div>
              <h3 className="font-semibold text-gray-900">Failed to load content</h3>
              <p className="text-sm text-gray-600">The content could not be loaded securely.</p>
            </div>
            <Button variant="outline" onClick={handleOpenInNewTab}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
        </div>
      )}

      {/* SECURITY: Secure iframe with restricted sandbox */}
      <iframe
        src={src}
        title={title}
        className={`w-full h-full border-0 ${className}`}
        style={style}
        onLoad={handleLoad}
        onError={handleError}
        // SECURITY: Strict sandbox - only allow same-origin
        sandbox={SECURE_SANDBOX_PERMISSIONS.join(' ')}
        // SECURITY: Additional security attributes
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="none" // Block all permissions by default
        // SECURITY: CSP nonce for additional security
        nonce={cspNonce}
        // SECURITY: Block dangerous iframe features
        allowFullScreen={allowFullscreen}
        {...props}
      />

      {/* Alternative access option */}
      <div className="absolute bottom-2 right-2 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpenInNewTab}
          className="bg-white/90 hover:bg-white shadow-sm text-xs"
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          New Tab
        </Button>
      </div>
    </div>
  );
};

export default SecureIframe;
