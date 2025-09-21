/**
 * Google Analytics utility functions
 */

/**
 * Track a custom event
 * @param {string} action - The action that was performed
 * @param {Object} parameters - Additional parameters for the event
 */
export const trackEvent = (action, parameters = {}) => {
  if (typeof window.gtag === 'function' && process.env.REACT_APP_GA_MEASUREMENT_ID) {
    window.gtag('event', action, {
      measurement_id: process.env.REACT_APP_GA_MEASUREMENT_ID,
      ...parameters,
    });
  }
};

/**
 * Track button clicks
 * @param {string} buttonName - Name/identifier of the button
 * @param {string} section - Section/page where the button is located
 */
export const trackButtonClick = (buttonName, section = '') => {
  trackEvent('click', {
    event_category: 'button',
    event_label: buttonName,
    section: section,
  });
};

/**
 * Track form submissions
 * @param {string} formName - Name/identifier of the form
 * @param {string} action - Type of submission (submit, error, etc.)
 */
export const trackFormSubmission = (formName, action = 'submit') => {
  trackEvent('form_submit', {
    event_category: 'form',
    event_label: formName,
    form_action: action,
  });
};

/**
 * Track downloads
 * @param {string} fileName - Name of the downloaded file
 * @param {string} fileType - Type/extension of the file
 */
export const trackDownload = (fileName, fileType = '') => {
  trackEvent('file_download', {
    event_category: 'download',
    event_label: fileName,
    file_type: fileType,
  });
};

/**
 * Track page engagement (scroll depth, time on page, etc.)
 * @param {string} metric - The engagement metric
 * @param {number} value - The value of the metric
 */
export const trackEngagement = (metric, value) => {
  trackEvent('engagement', {
    event_category: 'engagement',
    event_label: metric,
    value: value,
  });
};

/**
 * Track conversion events (signups, purchases, etc.)
 * @param {string} conversionType - Type of conversion
 * @param {number} value - Monetary value (optional)
 * @param {string} currency - Currency code (optional)
 */
export const trackConversion = (conversionType, value = null, currency = 'USD') => {
  const eventParams = {
    event_category: 'conversion',
    event_label: conversionType,
  };

  if (value !== null) {
    eventParams.value = value;
    eventParams.currency = currency;
  }

  trackEvent('conversion', eventParams);
};

export default {
  trackEvent,
  trackButtonClick,
  trackFormSubmission,
  trackDownload,
  trackEngagement,
  trackConversion,
};