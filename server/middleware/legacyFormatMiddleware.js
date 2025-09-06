const { logger } = require('./logger');

/**
 * Middleware to convert API responses to legacy string format for backwards compatibility
 * with DreamFactory clients. Detects legacy clients by the presence of x-dreamfactory-api-key header.
 */
const legacyFormatMiddleware = (req, res, next) => {
  // Check if this is a legacy client using the flag set by consolidatedAuthMiddleware
  const isLegacyClient = req.isLegacyClient === true;

  if (!isLegacyClient) {
    // Modern client - no formatting needed
    return next();
  }

  // Store original json method
  const originalJson = res.json;

  // Override json method to apply legacy formatting
  res.json = function (data) {
    try {
      // Apply legacy formatting to the response data
      const legacyFormattedData = convertToLegacyFormat(data);

      logger.debug('Legacy format applied for DreamFactory client', {
        endpoint: req.originalUrl,
        hasData: !!data,
      });

      return originalJson.call(this, legacyFormattedData);
    } catch (error) {
      logger.error('Error applying legacy format', {
        error: error.message,
        endpoint: req.originalUrl,
      });

      // Fallback to original data if formatting fails
      return originalJson.call(this, data);
    }
  };

  next();
};

/**
 * Recursively converts numbers and dates to strings for DreamFactory compatibility
 * @param {any} obj - The object to convert
 * @returns {any} - The converted object with numbers and dates as strings
 */
function convertToLegacyFormat(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitive types
  if (typeof obj === 'number') {
    // Convert numbers to strings
    return obj.toString();
  }

  if (typeof obj === 'string') {
    // Check if it's an ISO date string and convert to simpler format
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    if (isoDateRegex.test(obj)) {
      // Convert ISO date to more DreamFactory-like format (without T and Z)
      const date = new Date(obj);
      return date.toISOString().replace('T', ' ').replace('Z', '');
    }
    return obj;
  }

  if (typeof obj === 'boolean') {
    // Convert booleans to string representations for DreamFactory compatibility
    return obj ? '1' : '0';
  }

  // Handle Date objects (shouldn't normally occur in JSON, but just in case)
  if (obj instanceof Date) {
    return obj.toISOString().replace('T', ' ').replace('Z', '');
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => convertToLegacyFormat(item));
  }

  // Handle objects
  if (typeof obj === 'object') {
    const convertedObj = {};
    for (const [key, value] of Object.entries(obj)) {
      convertedObj[key] = convertToLegacyFormat(value);
    }
    return convertedObj;
  }

  // Return as-is for any other types
  return obj;
}

module.exports = {
  legacyFormatMiddleware,
  convertToLegacyFormat, // Export for testing
};
