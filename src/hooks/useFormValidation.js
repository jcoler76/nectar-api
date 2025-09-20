import * as React from 'react';

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
