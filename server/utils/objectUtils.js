/**
 * Safe object property access utility - replaces lodash.get functionality
 * @param {object} obj - The object to query
 * @param {string} path - The path of the property to get (e.g., 'user.profile.name')
 * @param {*} defaultValue - The value returned for undefined resolved values
 * @returns {*} The resolved value or defaultValue
 */
const get = (obj, path, defaultValue) => {
  if (!obj || !path) return defaultValue;

  // Handle array notation like 'items[0].name'
  const normalizedPath = path.replace(/\[(\w+)\]/g, '.$1');
  const keys = normalizedPath.split('.');

  let result = obj;
  for (const key of keys) {
    if (result === null || result === undefined) {
      return defaultValue;
    }
    result = result[key];
  }

  return result === undefined ? defaultValue : result;
};

module.exports = {
  get,
};

// ES module export for TypeScript compatibility
module.exports.get = get;
