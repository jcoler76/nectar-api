const moment = require('moment-timezone');

/**
 * Timezone utility functions for consistent EST/EDT handling across the backend
 * Uses Eastern Time (America/New_York) which automatically handles EST/EDT transitions
 */

// Constants
const EASTERN_TIMEZONE = 'America/New_York';

/**
 * Convert a date string/object to the start of Eastern Time day (00:00:00 EST/EDT)
 * @param {string|Date} dateInput - Date to convert
 * @returns {Date} - UTC Date representing start of Eastern Time day
 */
function toEasternTimeStart(dateInput) {
  return moment.tz(dateInput, EASTERN_TIMEZONE).startOf('day').utc().toDate();
}

/**
 * Convert a date string/object to the end of Eastern Time day (23:59:59.999 EST/EDT)
 * @param {string|Date} dateInput - Date to convert
 * @returns {Date} - UTC Date representing end of Eastern Time day
 */
function toEasternTimeEnd(dateInput) {
  return moment.tz(dateInput, EASTERN_TIMEZONE).endOf('day').utc().toDate();
}

/**
 * Create date range filter for MongoDB queries with proper Eastern Time handling
 * @param {string} startDate - Start date (YYYY-MM-DD format)
 * @param {string} endDate - End date (YYYY-MM-DD format)
 * @returns {Object} - MongoDB date range filter
 */
function createEasternDateRange(startDate, endDate) {
  const filter = {};

  if (startDate) {
    filter.$gte = toEasternTimeStart(startDate);
  }

  if (endDate) {
    filter.$lte = toEasternTimeEnd(endDate);
  }

  return filter;
}

/**
 * Format a date for display in Eastern Time with EST/EDT suffix
 * @param {string|Date} dateInput - Date to format
 * @param {string} format - Moment.js format string (default: 'YYYY-MM-DD HH:mm:ss')
 * @returns {string} - Formatted date string with timezone suffix
 */
function formatEasternTime(dateInput, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!dateInput) return 'N/A';

  const momentDate = moment.tz(dateInput, EASTERN_TIMEZONE);
  const formatted = momentDate.format(format);
  const timezoneName = momentDate.isDST() ? 'EDT' : 'EST';

  return `${formatted} ${timezoneName}`;
}

/**
 * Get current Eastern Time
 * @returns {Date} - Current time in Eastern timezone as UTC Date
 */
function getCurrentEasternTime() {
  return moment.tz(EASTERN_TIMEZONE).utc().toDate();
}

/**
 * Check if a date is in Daylight Saving Time (EDT)
 * @param {string|Date} dateInput - Date to check
 * @returns {boolean} - True if date is in EDT period
 */
function isEasternDST(dateInput) {
  return moment.tz(dateInput, EASTERN_TIMEZONE).isDST();
}

/**
 * Convert UTC date to Eastern Time for aggregation grouping
 * @param {string} fieldName - MongoDB field name (e.g., 'timestamp', 'createdAt')
 * @returns {Object} - MongoDB aggregation expression for Eastern Time conversion
 */
function createEasternTimeGrouping(fieldName) {
  return {
    $dateToString: {
      format: '%Y-%m-%d',
      date: {
        $dateAdd: {
          startDate: `$${fieldName}`,
          unit: 'hour',
          amount: {
            $cond: {
              // Check if date is during DST (roughly March-November)
              if: {
                $and: [
                  { $gte: [{ $month: `$${fieldName}` }, 3] },
                  { $lte: [{ $month: `$${fieldName}` }, 11] },
                ],
              },
              then: -4, // EDT offset
              else: -5, // EST offset
            },
          },
        },
      },
      timezone: 'UTC',
    },
  };
}

module.exports = {
  EASTERN_TIMEZONE,
  toEasternTimeStart,
  toEasternTimeEnd,
  createEasternDateRange,
  formatEasternTime,
  getCurrentEasternTime,
  isEasternDST,
  createEasternTimeGrouping,
};
