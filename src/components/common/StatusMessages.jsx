import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import React from 'react';

import { Card, CardContent } from '../ui/card';

/**
 * Unified StatusMessages component for consistent error/success/info/warning message display
 * Consolidates message patterns from BaseListView and ValidationMessage components
 *
 * @param {Object} props - Component props
 * @param {string} props.error - Error message to display
 * @param {string} props.success - Success message to display
 * @param {string} props.info - Info message to display
 * @param {string} props.warning - Warning message to display
 * @param {string} props.variant - Display variant: 'card' (default) or 'inline'
 * @param {string} props.className - Additional CSS classes
 */
export const StatusMessages = ({
  error,
  success,
  info,
  warning,
  variant = 'card',
  className = '',
}) => {
  const messages = [
    {
      content: error,
      type: 'error',
      icon: AlertCircle,
      cardClasses: 'border-destructive/50 bg-destructive/10',
      textClasses: 'text-destructive',
      inlineClasses: 'text-destructive bg-destructive/10 border-destructive/20',
    },
    {
      content: success,
      type: 'success',
      icon: CheckCircle,
      cardClasses: 'border-green-500/50 bg-green-50',
      textClasses: 'text-green-700',
      inlineClasses: 'text-green-700 bg-green-50 border-green-200',
    },
    {
      content: warning,
      type: 'warning',
      icon: AlertTriangle,
      cardClasses: 'border-yellow-500/50 bg-yellow-50',
      textClasses: 'text-yellow-700',
      inlineClasses: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    },
    {
      content: info,
      type: 'info',
      icon: Info,
      cardClasses: 'border-blue-500/50 bg-blue-50',
      textClasses: 'text-blue-700',
      inlineClasses: 'text-blue-700 bg-blue-50 border-blue-200',
    },
  ];

  const activeMessages = messages.filter(msg => msg.content);

  if (activeMessages.length === 0) return null;

  if (variant === 'inline') {
    return (
      <div className={`space-y-2 ${className}`}>
        {activeMessages.map(({ content, type, icon: Icon, inlineClasses }) => (
          <div
            key={type}
            className={`flex items-center gap-2 p-3 rounded-md border text-sm font-medium ${inlineClasses}`}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span>{content}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {activeMessages.map(({ content, type, icon: Icon, cardClasses, textClasses }) => (
        <Card key={type} className={cardClasses}>
          <CardContent className="flex items-center gap-2 p-4">
            <Icon className={`h-4 w-4 ${textClasses}`} />
            <span className={`font-medium ${textClasses}`}>{content}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

/**
 * Individual message components for specific use cases
 */
export const ErrorMessage = ({ children, variant = 'card', className = '' }) => (
  <StatusMessages error={children} variant={variant} className={className} />
);

export const SuccessMessage = ({ children, variant = 'card', className = '' }) => (
  <StatusMessages success={children} variant={variant} className={className} />
);

export const InfoMessage = ({ children, variant = 'card', className = '' }) => (
  <StatusMessages info={children} variant={variant} className={className} />
);

export const WarningMessage = ({ children, variant = 'card', className = '' }) => (
  <StatusMessages warning={children} variant={variant} className={className} />
);

export default StatusMessages;
