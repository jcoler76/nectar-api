import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import React from 'react';

import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

class RateLimitErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorStack: null,
      componentStack: null,
    };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('RateLimitErrorBoundary: Caught error:', error);
    console.error('RateLimitErrorBoundary: Error info:', errorInfo);

    this.setState({
      error: error,
      errorStack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[500px] p-8">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-red-800">Rate Limit Component Error</CardTitle>
              <CardDescription>
                This rate limit component encountered an error and needs attention.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-semibold text-red-800 mb-2">Error Details:</h4>
                  <div className="text-sm text-red-700">
                    <strong>Message:</strong> {this.state.error?.message || 'Unknown error'}
                  </div>
                  {this.state.error?.response && (
                    <div className="text-sm text-red-700 mt-2">
                      <strong>Status:</strong> {this.state.error.response.status} -{' '}
                      {this.state.error.response.statusText}
                    </div>
                  )}
                </div>

                {process.env.NODE_ENV === 'development' && (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">Developer Info:</h4>
                    <details className="text-sm">
                      <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                        View Error Stack
                      </summary>
                      <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                        {this.state.errorStack}
                      </pre>
                    </details>
                    <details className="text-sm mt-2">
                      <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                        View Component Stack
                      </summary>
                      <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                        {this.state.componentStack}
                      </pre>
                    </details>
                  </div>
                )}

                <div className="flex gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={() =>
                      this.setState({
                        hasError: false,
                        error: null,
                        errorStack: null,
                        componentStack: null,
                      })
                    }
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                  <Button onClick={() => (window.location.href = '/dashboard')}>
                    <Home className="w-4 h-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RateLimitErrorBoundary;
