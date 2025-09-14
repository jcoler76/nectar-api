/**
 * Centralized date formatting utilities
 * Replaces duplicate date formatting logic found in 25+ files
 */

import moment from 'moment-timezone';

// Eastern Time Zone (handles both EST and EDT automatically)
export const EASTERN_TIMEZONE = 'America/New_York';

// Type definitions
export type DateInput = Date | string | number;
export type FormatterFunction = (date: Date) => string;

/**
 * Formats a date for API consumption, avoiding timezone conversion issues
 * Converts any date input to YYYY-MM-DD format (date only, no time component)
 * This allows the backend to handle timezone conversion properly
 */
export const formatDateForAPI = (date: DateInput): string => {
  const dateObj = new Date(date); // Ensure it's a Date object
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formats a timestamp for display in Eastern Time
 */
export const formatTimestampEST = (
  timestamp: DateInput,
  format: string = 'YYYY-MM-DD HH:mm:ss'
): string => {
  if (!timestamp) return 'N/A';

  const momentDate = moment(timestamp).tz(EASTERN_TIMEZONE);
  const formatted = momentDate.format(format);
  const timezoneName = momentDate.isDST() ? 'EDT' : 'EST';

  return `${formatted} ${timezoneName}`;
};

/**
 * Formats file size in bytes to human-readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Safe date formatter that handles null/undefined values
 */
const safeFormat = (date: DateInput | null | undefined, formatter: FormatterFunction): string => {
  if (!date) return 'Never';

  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    return formatter(dateObj);
  } catch (error) {
    console.warn('Date formatting error:', error);
    return 'Invalid Date';
  }
};

/**
 * Date formatting utilities
 */
export const formatDate = {
  /**
   * Full date and time with locale formatting
   */
  full: (date: DateInput): string => safeFormat(date, d => d.toLocaleString()),

  /**
   * Date only with locale formatting
   */
  date: (date: DateInput): string => safeFormat(date, d => d.toLocaleDateString()),

  /**
   * Time only with locale formatting
   */
  time: (date: DateInput): string => safeFormat(date, d => d.toLocaleTimeString()),

  /**
   * Relative time formatting (e.g., "2 days ago", "Just now")
   */
  relative: (date: DateInput): string =>
    safeFormat(date, d => {
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);
      const diffWeek = Math.floor(diffDay / 7);
      const diffMonth = Math.floor(diffDay / 30);
      const diffYear = Math.floor(diffDay / 365);

      if (diffSec < 60) return 'Just now';
      if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
      if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
      if (diffDay < 7) {
        if (diffDay === 0) return 'Today';
        if (diffDay === 1) return 'Yesterday';
        return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
      }
      if (diffWeek < 4) return `${diffWeek} week${diffWeek !== 1 ? 's' : ''} ago`;
      if (diffMonth < 12) return `${diffMonth} month${diffMonth !== 1 ? 's' : ''} ago`;
      return `${diffYear} year${diffYear !== 1 ? 's' : ''} ago`;
    }),

  /**
   * ISO string formatting
   */
  iso: (date: DateInput): string => safeFormat(date, d => d.toISOString()),

  /**
   * Short date formatting (MM/DD/YYYY)
   */
  short: (date: DateInput): string => safeFormat(date, d => d.toLocaleDateString('en-US')),

  /**
   * Long date formatting (January 1, 2023)
   */
  long: (date: DateInput): string =>
    safeFormat(date, d =>
      d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    ),

  /**
   * Database-friendly timestamp
   */
  timestamp: (date: DateInput): string =>
    safeFormat(date, d => d.toISOString().slice(0, 19).replace('T', ' ')),

  /**
   * Time ago in words (more human-readable than relative)
   */
  timeAgo: (date: DateInput): string =>
    safeFormat(date, d => {
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 14) return 'Last week';
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      if (diffDays < 60) return 'Last month';
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
      return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) !== 1 ? 's' : ''} ago`;
    }),
};

/**
 * Date validation utilities
 */
export const dateValidation = {
  /**
   * Check if a date is valid
   */
  isValid: (date: DateInput | null | undefined): boolean => {
    if (!date) return false;
    const dateObj = date instanceof Date ? date : new Date(date);
    return !isNaN(dateObj.getTime());
  },

  /**
   * Check if a date is in the future
   */
  isFuture: (date: DateInput): boolean => {
    if (!dateValidation.isValid(date)) return false;
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj > new Date();
  },

  /**
   * Check if a date is in the past
   */
  isPast: (date: DateInput): boolean => {
    if (!dateValidation.isValid(date)) return false;
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj < new Date();
  },

  /**
   * Check if a date is today
   */
  isToday: (date: DateInput): boolean => {
    if (!dateValidation.isValid(date)) return false;
    const dateObj = date instanceof Date ? date : new Date(date);
    const today = new Date();
    return dateObj.toDateString() === today.toDateString();
  },
};

/**
 * Date parsing utilities
 */
export const dateParsing = {
  /**
   * Parse various date formats safely
   */
  parse: (date: string | Date | null | undefined): Date | null => {
    if (!date) return null;
    if (date instanceof Date) return date;

    // Try parsing various formats
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? null : parsed;
  },

  /**
   * Parse date from common API formats
   */
  parseAPI: (dateString: string | null | undefined): Date | null => {
    if (!dateString) return null;

    // Handle common API date formats
    const commonFormats = [
      dateString,
      dateString.replace('Z', '+00:00'), // Convert Z to timezone offset
      dateString + 'T00:00:00Z', // Add time if missing
    ];

    for (const format of commonFormats) {
      const parsed = new Date(format);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    return null;
  },
};

export default formatDate;
