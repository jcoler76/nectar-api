import { sanitizeString } from '../../utils/xssUtils';

/**
 * Higher-order component that adds XSS protection to any component
 * @param {React.Component} WrappedComponent - Component to protect
 * @returns {React.Component} - Protected component
 */
export const withXSSProtection = WrappedComponent => {
  return function XSSProtectedComponent(props) {
    // Sanitize all string props
    const sanitizedProps = Object.keys(props).reduce((acc, key) => {
      const value = props[key];
      acc[key] = typeof value === 'string' ? sanitizeString(value) : value;
      return acc;
    }, {});

    return <WrappedComponent {...sanitizedProps} />;
  };
};

export default withXSSProtection;
