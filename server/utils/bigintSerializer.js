/**
 * Utilities for handling BigInt serialization in Prisma responses
 */

/**
 * Recursively converts BigInt values to strings in an object
 * @param {any} obj - The object to process
 * @returns {any} - Object with BigInt values converted to strings
 */
function serializeBigInt(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }

  if (typeof obj === 'object') {
    const serialized = {};
    for (const [key, value] of Object.entries(obj)) {
      serialized[key] = serializeBigInt(value);
    }
    return serialized;
  }

  return obj;
}

/**
 * Express middleware to automatically handle BigInt serialization in JSON responses
 */
function bigIntMiddleware(req, res, next) {
  const originalJson = res.json;

  res.json = function (obj) {
    const serializedObj = serializeBigInt(obj);
    return originalJson.call(this, serializedObj);
  };

  next();
}

module.exports = {
  serializeBigInt,
  bigIntMiddleware,
};
