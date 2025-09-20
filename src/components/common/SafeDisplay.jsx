import { sanitizeString } from '../../utils/xssUtils';

/**
 * React component wrapper that automatically sanitizes children
 * @param {Object} props - Component props
 * @returns {JSX.Element} - Safe component
 */
export const SafeDisplay = ({ children, maxLength = 1000, ...props }) => {
  let safeChildren = children;

  if (typeof children === 'string') {
    safeChildren = sanitizeString(children);
    if (safeChildren.length > maxLength) {
      safeChildren = safeChildren.substring(0, maxLength) + '...';
    }
  }

  return <span {...props}>{safeChildren}</span>;
};

export default SafeDisplay;
