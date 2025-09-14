import { AlertCircle } from 'lucide-react';
import * as React from 'react';

import { Alert, AlertDescription } from '../../ui/alert';
import { Button } from '../../ui/button';

// Type assertions for JavaScript alert components
const TypedAlert = Alert as React.ComponentType<
  React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode; variant?: string }
>;
const TypedAlertDescription = AlertDescription as React.ComponentType<
  React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }
>;

export interface ErrorDisplayProps {
  error: string | null | undefined;
  onDismiss?: () => void;
  className?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onDismiss, className = '' }) => {
  if (!error) return null;

  return (
    <TypedAlert variant="destructive" className={`mb-6 ${className}`}>
      <AlertCircle className="h-4 w-4" />
      <TypedAlertDescription className="flex items-center justify-between">
        <span>{error}</span>
        {onDismiss && (
          <Button variant="ghost" size="sm" onClick={onDismiss} className="ml-4">
            Dismiss
          </Button>
        )}
      </TypedAlertDescription>
    </TypedAlert>
  );
};
