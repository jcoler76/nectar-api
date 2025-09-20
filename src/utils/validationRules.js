// Form validation utilities
export const validationRules = {
  required: (message = 'This field is required') => ({
    required: { value: true, message },
  }),

  email: (message = 'Please enter a valid email address') => ({
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message,
    },
  }),

  minLength: (length, message) => ({
    minLength: {
      value: length,
      message: message || `Must be at least ${length} characters`,
    },
  }),

  maxLength: (length, message) => ({
    maxLength: {
      value: length,
      message: message || `Must be no more than ${length} characters`,
    },
  }),

  pattern: (regex, message) => ({
    pattern: {
      value: regex,
      message,
    },
  }),

  password: (
    message = 'Password must be at least 8 characters with uppercase, lowercase, number and special character'
  ) => ({
    pattern: {
      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      message,
    },
  }),

  phone: (message = 'Please enter a valid phone number') => ({
    pattern: {
      value: /^[+]?[1-9][\d]{0,15}$/,
      message,
    },
  }),

  url: (message = 'Please enter a valid URL') => ({
    pattern: {
      value: /^https?:\/\/.+\..+/,
      message,
    },
  }),

  number: (message = 'Please enter a valid number') => ({
    pattern: {
      value: /^\d+$/,
      message,
    },
  }),

  decimal: (message = 'Please enter a valid decimal number') => ({
    pattern: {
      value: /^\d*\.?\d+$/,
      message,
    },
  }),
};

// Combine validation rules
export const combineRules = (...rules) => {
  return rules.reduce((acc, rule) => ({ ...acc, ...rule }), {});
};
