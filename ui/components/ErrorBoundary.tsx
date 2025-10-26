import React, { Component, ErrorInfo, ReactNode } from 'react';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Update state with error info
    this.setState({ error, errorInfo });
    
    // Show user-friendly toast notification
    toast.error('Something went wrong. Please refresh the page or try again.');
    
    // Optional: Send to Sentry if available (commented out since @sentry/react is not installed)
    // if (import.meta.env.VITE_SENTRY_DSN) {
    //   try {
    //     // Dynamic import to avoid bundling Sentry if not needed
    //     import('@sentry/react').then((Sentry) => {
    //       Sentry.withScope((scope) => {
    //         scope.setTag('errorBoundary', true);
    //         scope.setContext('errorInfo', {
    //           componentStack: errorInfo.componentStack,
    //           errorBoundary: true
    //         });
    //         Sentry.captureException(error);
    //       });
    //     }).catch(() => {
    //       // Silently fail if Sentry is not available
    //     });
    //   } catch {
    //     // Silently fail if Sentry is not available
    //   }
    // }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-md w-full mx-4 p-6 bg-card rounded-lg border shadow-lg">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-destructive/10 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-destructive"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Something went wrong
              </h2>
              
              <p className="text-muted-foreground mb-6">
                We encountered an unexpected error. This has been logged and we'll look into it.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={this.handleRetry}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Try Again
                </button>
                
                <button
                  onClick={() => window.location.reload()}
                  className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
                >
                  Refresh Page
                </button>
              </div>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    Error Details (Development)
                  </summary>
                  <div className="mt-2 p-3 bg-muted rounded text-xs font-mono overflow-auto max-h-40">
                    <div className="text-destructive font-semibold mb-2">
                      {this.state.error.name}: {this.state.error.message}
                    </div>
                    <pre className="whitespace-pre-wrap text-muted-foreground">
                      {this.state.error.stack}
                    </pre>
                    {this.state.errorInfo && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <div className="text-muted-foreground font-semibold mb-1">
                          Component Stack:
                        </div>
                        <pre className="whitespace-pre-wrap text-muted-foreground">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;