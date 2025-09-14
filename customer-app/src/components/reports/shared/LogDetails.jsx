import { AlertCircle, Server, User } from 'lucide-react';
import PropTypes from 'prop-types';

import { formatTimestampEST } from '../../../utils/dateUtils';
import { Card } from '../../ui/card';

const LogDetails = ({ log }) => {
  if (!log) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">No log data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Basic Info */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Server className="h-4 w-4" />
            Request Details
          </h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Method:</span> {log.method || 'N/A'}
            </div>
            <div>
              <span className="font-medium">URL:</span>{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">{log.url || 'N/A'}</code>
            </div>
            <div>
              <span className="font-medium">Endpoint:</span>{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">{log.endpoint || 'N/A'}</code>
            </div>
            <div>
              <span className="font-medium">Status:</span> {log.responseStatus || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Duration:</span>{' '}
              {log.duration ? Math.round(log.duration) + 'ms' : 'N/A'}
            </div>
            <div>
              <span className="font-medium">Success:</span>{' '}
              {log.success !== undefined ? (log.success ? 'Yes' : 'No') : 'N/A'}
            </div>
            <div>
              <span className="font-medium">Timestamp:</span>{' '}
              {log.timestamp ? formatTimestampEST(log.timestamp, 'YYYY-MM-DD h:mm:ss A') : 'N/A'}
            </div>
            <div>
              <span className="font-medium">Request Size:</span>{' '}
              {log.requestSize ? `${(log.requestSize / 1024).toFixed(2)} KB` : 'N/A'}
            </div>
            <div>
              <span className="font-medium">Response Size:</span>{' '}
              {log.responseSize ? `${(log.responseSize / 1024).toFixed(2)} KB` : 'N/A'}
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <User className="h-4 w-4" />
            User Context
          </h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">User:</span>{' '}
              {log.userEmail || log.userId?.email || 'Anonymous'}
            </div>
            <div>
              <span className="font-medium">Role:</span> {log.role || log.userId?.role || 'N/A'}
            </div>
            <div>
              <span className="font-medium">IP Address:</span> {log.ipAddress || 'N/A'}
            </div>
            <div>
              <span className="font-medium">User Agent:</span>{' '}
              <span className="break-all">{log.userAgent || 'N/A'}</span>
            </div>
            <div>
              <span className="font-medium">Category:</span> {log.category || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Endpoint Type:</span> {log.endpointType || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Application:</span> {log.application || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Session ID:</span> {log.sessionId || 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Error Details */}
      {!log.success && (
        <div className="space-y-3">
          <h4 className="font-semibold text-red-600 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Error Details
          </h4>
          <div className="bg-red-50 border border-red-200 rounded p-3 space-y-2 text-sm">
            <div>
              <span className="font-medium">Error Type:</span> {log.errorType || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Error Message:</span> {log.errorMessage || 'N/A'}
            </div>
            {log.errorCode && (
              <div>
                <span className="font-medium">Error Code:</span> {log.errorCode}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Request/Response Data */}
      <div className="space-y-3">
        <h4 className="font-semibold">Request/Response Data</h4>

        {/* Summary Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {log.requestSize ? `${(log.requestSize / 1024).toFixed(2)} KB` : '0 KB'}
              </div>
              <div className="text-sm text-muted-foreground">Request Size</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {log.responseSize ? `${(log.responseSize / 1024).toFixed(2)} KB` : '0 KB'}
              </div>
              <div className="text-sm text-muted-foreground">Response Size</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {(() => {
                  try {
                    if (!log.responseBody) return 'N/A';

                    // Parse the response body if it's a string
                    let parsedBody = log.responseBody;
                    if (typeof log.responseBody === 'string') {
                      parsedBody = JSON.parse(log.responseBody);
                    }

                    if (parsedBody && Array.isArray(parsedBody.data)) {
                      return parsedBody.data.length;
                    } else if (
                      parsedBody &&
                      parsedBody.data &&
                      typeof parsedBody.data === 'object'
                    ) {
                      return Object.keys(parsedBody.data).length;
                    } else if (parsedBody && Array.isArray(parsedBody)) {
                      return parsedBody.length;
                    }
                    return 'N/A';
                  } catch (e) {
                    return 'N/A';
                  }
                })()}
              </div>
              <div className="text-sm text-muted-foreground">Records Returned</div>
            </div>
          </Card>
        </div>

        {/* Detailed Data */}
        {(log.requestBody || log.responseBody) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {log.requestBody && (
              <div>
                <h5 className="font-medium text-sm mb-2">Request Body:</h5>
                <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40 whitespace-pre-wrap">
                  {typeof log.requestBody === 'object'
                    ? JSON.stringify(log.requestBody, null, 2)
                    : log.requestBody}
                </pre>
              </div>
            )}
            {log.responseBody && (
              <div>
                <h5 className="font-medium text-sm mb-2">Response Body:</h5>
                <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40 whitespace-pre-wrap">
                  {(() => {
                    try {
                      if (typeof log.responseBody === 'string') {
                        // Try to parse and pretty-print JSON strings
                        const parsed = JSON.parse(log.responseBody);
                        return JSON.stringify(parsed, null, 2);
                      }
                      return typeof log.responseBody === 'object'
                        ? JSON.stringify(log.responseBody, null, 2)
                        : log.responseBody;
                    } catch (e) {
                      // If parsing fails, show as-is
                      return log.responseBody;
                    }
                  })()}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Headers Information */}
        {(log.requestHeaders || log.responseHeaders) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            {log.requestHeaders && Object.keys(log.requestHeaders).length > 0 && (
              <div>
                <h5 className="font-medium text-sm mb-2">Request Headers:</h5>
                <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-32 whitespace-pre-wrap">
                  {JSON.stringify(log.requestHeaders, null, 2)}
                </pre>
              </div>
            )}
            {log.responseHeaders && Object.keys(log.responseHeaders).length > 0 && (
              <div>
                <h5 className="font-medium text-sm mb-2">Response Headers:</h5>
                <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-32 whitespace-pre-wrap">
                  {JSON.stringify(log.responseHeaders, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Additional Context */}
      {log.metadata && Object.keys(log.metadata).length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold">Additional Context</h4>
          <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40 whitespace-pre-wrap">
            {JSON.stringify(log.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

LogDetails.propTypes = {
  log: PropTypes.object,
};

export default LogDetails;
