/**
 * Converts a string to title case (first letter of each word capitalized)
 * @param {string} str - The string to convert
 * @returns {string} - String in title case
 */
export const formatStringToTitleCase = str => {
  if (!str || typeof str !== 'string') {
    return '';
  }

  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Truncates a string to a specified length and adds ellipsis
 * @param {string} str - The string to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @param {string} ellipsis - Ellipsis character(s) to add (default: '...')
 * @returns {string} - Truncated string with ellipsis
 */
export const truncateString = (str, maxLength, ellipsis = '...') => {
  if (!str || typeof str !== 'string') {
    return '';
  }

  if (typeof maxLength !== 'number' || maxLength < 0) {
    return str;
  }

  if (str.length <= maxLength) {
    return str;
  }

  const truncateLength = maxLength - ellipsis.length;
  return truncateLength > 0 ? str.slice(0, truncateLength) + ellipsis : ellipsis;
};

/**
 * Capitalizes the first letter of a string
 * @param {string} str - The string to capitalize
 * @returns {string} - String with first letter capitalized
 */
export const capitalizeFirst = str => {
  if (!str || typeof str !== 'string') {
    return '';
  }

  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Removes extra whitespace from a string (multiple spaces become single spaces)
 * @param {string} str - The string to clean
 * @returns {string} - String with normalized whitespace
 */
export const normalizeWhitespace = str => {
  if (!str || typeof str !== 'string') {
    return '';
  }

  return str.replace(/\s+/g, ' ').trim();
};
