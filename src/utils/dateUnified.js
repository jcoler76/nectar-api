/**
 * Unified Date Utility - Gradual Migration from Moment.js to date-fns
 *
 * This utility provides a consistent interface while we migrate from moment.js to date-fns.
 * It allows for gradual migration without breaking existing functionality.
 */

import { parseISO, isValid, startOfDay, endOfDay, addDays, subDays } from 'date-fns';
import { formatInTimeZone, utcToZonedTime } from 'date-fns-tz';

// Timezone configuration
const DEFAULT_TIMEZONE = 'America/New_York';

/**
 * Format a date with timezone support
 * Replaces: moment.tz(date, timezone).format(formatString)
 */
export const formatDateInTimezone = (
  date,
  formatString = 'yyyy-MM-dd HH:mm:ss',
  timezone = DEFAULT_TIMEZONE
) => {
  if (!date) return '';

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';

    return formatInTimeZone(dateObj, timezone, formatString);
  } catch (error) {
    console.warn('Date formatting error:', error);
    return '';
  }
};

/**
 * Format date for EST display
 * Replaces: formatTimestampEST function from dateUtils
 */
export const formatTimestampEST = (timestamp, formatString = 'MM/dd/yyyy') => {
  if (!timestamp) return 'Never';

  // Convert moment format strings to date-fns format
  const formatMap = {
    'MM/DD/YYYY': 'MM/dd/yyyy',
    'MM/DD/YY': 'MM/dd/yy',
    'YYYY-MM-DD': 'yyyy-MM-dd',
    'MM/DD/YYYY h:mm:ss A': 'MM/dd/yyyy h:mm:ss a',
    'MM/DD/YY h:mm:ss A': 'MM/dd/yy h:mm:ss a',
    'h:mm:ss A': 'h:mm:ss a',
    PPpp: 'PPpp', // date-fns predefined format
  };

  const dateFnsFormat = formatMap[formatString] || formatString;
  return formatDateInTimezone(timestamp, dateFnsFormat);
};

/**
 * Get start of day in timezone
 * Replaces: moment.tz(date, timezone).startOf('day')
 */
export const getStartOfDay = (date, timezone = DEFAULT_TIMEZONE) => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const zonedDate = utcToZonedTime(dateObj, timezone);
  return startOfDay(zonedDate);
};

/**
 * Get end of day in timezone
 * Replaces: moment.tz(date, timezone).endOf('day')
 */
export const getEndOfDay = (date, timezone = DEFAULT_TIMEZONE) => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const zonedDate = utcToZonedTime(dateObj, timezone);
  return endOfDay(zonedDate);
};

/**
 * Add days to a date
 * Replaces: moment(date).add(days, 'days')
 */
export const addDaysToDate = (date, days) => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return addDays(dateObj, days);
};

/**
 * Subtract days from a date
 * Replaces: moment(date).subtract(days, 'days')
 */
export const subtractDaysFromDate = (date, days) => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return subDays(dateObj, days);
};

/**
 * Check if date is valid
 * Replaces: moment(date).isValid()
 */
export const isValidDate = date => {
  if (!date) return false;
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isValid(dateObj);
};

/**
 * Convert to ISO string
 * Replaces: moment(date).toISOString()
 */
export const toISOString = date => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateObj.toISOString();
};

/**
 * Parse ISO date string
 * Replaces: moment(isoString)
 */
export const parseISODate = isoString => {
  return parseISO(isoString);
};

/**
 * Current date in timezone
 * Replaces: moment.tz(timezone)
 */
export const nowInTimezone = (timezone = DEFAULT_TIMEZONE) => {
  return utcToZonedTime(new Date(), timezone);
};

/**
 * Legacy moment compatibility layer (temporary)
 * Use these for gradual migration
 */
export const momentCompat = {
  format: (date, formatString) => formatDateInTimezone(date, formatString),
  isValid: isValidDate,
  toISOString: toISOString,
  startOf: (date, unit) => {
    if (unit === 'day') return getStartOfDay(date);
    // Add more units as needed
    return date;
  },
  endOf: (date, unit) => {
    if (unit === 'day') return getEndOfDay(date);
    // Add more units as needed
    return date;
  },
};

// Export default interface for easier migration
const dateUtils = {
  formatDateInTimezone,
  formatTimestampEST,
  getStartOfDay,
  getEndOfDay,
  addDaysToDate,
  subtractDaysFromDate,
  isValidDate,
  toISOString,
  parseISODate,
  nowInTimezone,
  momentCompat,
};

export default dateUtils;
