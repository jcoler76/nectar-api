import { AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import React, { useState } from 'react';

import JsonViewer from './JsonViewer';
import { Alert, AlertDescription } from './alert';
import { Button } from './button';

const ErrorDetails = ({
  error,
  errorDetails,
  onDismiss,
  className = '',
  showDetailsButton = true,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!error) return null;

  // Check if error is an object with details
  const hasDetails = errorDetails || (typeof error === 'object' && error !== null);
  const errorMessage = typeof error === 'string' ? error : error?.message || 'An error occurred';
  const details = errorDetails || (typeof error === 'object' ? error : null);

  return (
    <Alert variant="destructive" className={`mb-6 ${className}`}>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="flex-1">{errorMessage}</span>
          <div className="flex items-center gap-2">
            {hasDetails && showDetailsButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="text-destructive hover:text-destructive/80"
              >
                {showDetails ? (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <ChevronRight className="h-3 w-3 mr-1" />
                    Show Details
                  </>
                )}
              </Button>
            )}
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="text-destructive hover:text-destructive/80"
              >
                Dismiss
              </Button>
            )}
          </div>
        </div>

        {showDetails && hasDetails && (
          <div className="mt-3 pt-3 border-t border-destructive/20">
            <JsonViewer
              data={details}
              title="Error Details"
              theme="monokai"
              collapsed={false}
              maxHeight="200px"
              enableActions={true}
              className="bg-destructive/5 border-destructive/20"
            />
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default ErrorDetails;
