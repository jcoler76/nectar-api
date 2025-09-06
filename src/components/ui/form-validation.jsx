import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';

// Validation message component
const ValidationMessage = React.forwardRef(
  ({ className, type = 'error', children, ...props }, ref) => {
    const icons = {
      error: AlertCircle,
      success: CheckCircle,
      info: Info,
    };

    const styles = {
      error: 'text-destructive bg-destructive/10 border-destructive/20',
      success: 'text-green-700 bg-green-50 border-green-200',
      info: 'text-blue-700 bg-blue-50 border-blue-200',
    };

    const Icon = icons[type];

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center gap-2 p-3 text-sm border rounded-lg transition-all duration-200',
          styles[type],
          className
        )}
        {...props}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        <div className="flex-1">{children}</div>
      </div>
    );
  }
);
ValidationMessage.displayName = 'ValidationMessage';

// Field error component
const FieldError = React.forwardRef(({ className, children, ...props }, ref) => {
  if (!children) return null;

  return (
    <p
      ref={ref}
      className={cn('text-sm font-medium text-destructive flex items-center gap-1', className)}
      {...props}
    >
      <AlertCircle className="h-3 w-3" />
      {children}
    </p>
  );
});
FieldError.displayName = 'FieldError';

// Field success component
const FieldSuccess = React.forwardRef(({ className, children, ...props }, ref) => {
  if (!children) return null;

  return (
    <p
      ref={ref}
      className={cn('text-sm font-medium text-green-700 flex items-center gap-1', className)}
      {...props}
    >
      <CheckCircle className="h-3 w-3" />
      {children}
    </p>
  );
});
FieldSuccess.displayName = 'FieldSuccess';

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

// Custom validation hook
export const useFormValidation = schema => {
  const [errors, setErrors] = React.useState({});
  const [touched, setTouched] = React.useState({});

  const validate = React.useCallback(
    (name, value) => {
      const fieldSchema = schema[name];
      if (!fieldSchema) return null;

      // Required validation
      if (fieldSchema.required && (!value || value.toString().trim() === '')) {
        return fieldSchema.required.message || 'This field is required';
      }

      // Pattern validation
      if (fieldSchema.pattern && value && !fieldSchema.pattern.value.test(value)) {
        return fieldSchema.pattern.message;
      }

      // Min length validation
      if (fieldSchema.minLength && value && value.length < fieldSchema.minLength.value) {
        return fieldSchema.minLength.message;
      }

      // Max length validation
      if (fieldSchema.maxLength && value && value.length > fieldSchema.maxLength.value) {
        return fieldSchema.maxLength.message;
      }

      return null;
    },
    [schema]
  );

  const validateField = React.useCallback(
    (name, value) => {
      const error = validate(name, value);
      setErrors(prev => ({
        ...prev,
        [name]: error,
      }));
      return !error;
    },
    [validate]
  );

  const validateAll = React.useCallback(
    data => {
      const newErrors = {};
      let isValid = true;

      Object.keys(schema).forEach(name => {
        const error = validate(name, data[name]);
        if (error) {
          newErrors[name] = error;
          isValid = false;
        }
      });

      setErrors(newErrors);
      return isValid;
    },
    [schema, validate]
  );

  const setFieldTouched = React.useCallback((name, isTouched = true) => {
    setTouched(prev => ({
      ...prev,
      [name]: isTouched,
    }));
  }, []);

  const clearErrors = React.useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  return {
    errors,
    touched,
    validateField,
    validateAll,
    setFieldTouched,
    clearErrors,
  };
};

export { FieldError, FieldSuccess, ValidationMessage };
