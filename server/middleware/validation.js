const { validationResult, matchedData } = require('express-validator');
const { errorResponses, ERROR_CODES } = require('../utils/errorHandler');

// Sanitize validation error details to avoid exposing internal structure
const sanitizeValidationErrors = errors => {
  return errors.map(error => {
    // Only expose safe information
    const safeError = {
      field: error.path || error.param,
      message: sanitizeErrorMessage(error.msg),
      code: getErrorCode(error),
    };

    // Only include value in development
    if (process.env.NODE_ENV === 'development') {
      safeError.value =
        typeof error.value === 'string'
          ? error.value.substring(0, 50) // Truncate long values
          : '[non-string value]';
    }

    return safeError;
  });
};

// Sanitize error messages to avoid exposing internals
const sanitizeErrorMessage = message => {
  // Map technical messages to user-friendly ones
  const messageMappings = {
    'Invalid value': 'Please provide a valid value',
    'Field must be a string': 'Please provide text',
    'Field must be numeric': 'Please provide a number',
    'Required field': 'This field is required',
    'Invalid email': 'Please provide a valid email address',
    'Too short': 'This value is too short',
    'Too long': 'This value is too long',
  };

  // Check if we have a mapping
  for (const [pattern, replacement] of Object.entries(messageMappings)) {
    if (message.includes(pattern)) {
      return replacement;
    }
  }

  // Default safe message
  return 'Invalid value provided';
};

// Get appropriate error code for validation error
const getErrorCode = error => {
  if (error.msg.includes('required')) return 'FIELD_REQUIRED';
  if (error.msg.includes('email')) return 'INVALID_EMAIL';
  if (error.msg.includes('length')) return 'INVALID_LENGTH';
  if (error.msg.includes('numeric')) return 'INVALID_TYPE';
  return 'INVALID_VALUE';
};

// Middleware to validate requests and handle validation errors
const validate = validations => {
  return async (req, res, next) => {
    // Execute all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    // Check if there are validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Sanitize errors before sending
      const sanitizedErrors = sanitizeValidationErrors(errors.array());

      // Return validation errors as a response
      return res.status(422).json({
        error: {
          code: ERROR_CODES.VALIDATION_FAILED,
          message: 'Please check your input and try again',
          details: sanitizedErrors,
        },
      });
    }

    // Add sanitized data to the request object
    req.validatedData = matchedData(req);

    // Continue to the next middleware/route handler
    next();
  };
};

module.exports = {
  validate,
};
