/**
 * Error Boundary Component
 * Catches and reports React component errors to monitoring service
 */

import React from 'react';
import monitoringService from '../services/monitoringService.js';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const errorId = this.generateErrorId();
    
    // Track the error with monitoring service
    monitoringService.trackError({
      type: 'react_error_boundary',
      message: error.message,
      stack: error.stack,
      name: error.name,
      componentStack: errorInfo.componentStack,
      errorId,
      boundary: this.props.name || 'unnamed',
      props: this.sanitizeProps(this.props),
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now()
    });

    // Track error in business context
    monitoringService.trackBusinessEvent('application_error', {
      errorId,
      boundary: this.props.name,
      severity: this.determineSeverity(error),
      userImpact: this.assessUserImpact(error),
      recoverable: this.isRecoverable(error)
    });

    this.setState({
      error,
      errorInfo,
      errorId
    });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    }

    // Call parent error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorId);
    }
  }

  generateErrorId() {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  sanitizeProps(props) {
    // Remove sensitive data and limit size
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth'];
    const sanitized = {};
    
    Object.keys(props).forEach(key => {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof props[key] === 'function') {
        sanitized[key] = '[FUNCTION]';
      } else {
        try {
          const value = JSON.stringify(props[key]);
          sanitized[key] = value.length > 100 ? value.substring(0, 100) + '...' : props[key];
        } catch {
          sanitized[key] = '[UNSERIALIZABLE]';
        }
      }
    });
    
    return sanitized;
  }

  determineSeverity(error) {
    const criticalErrors = ['ChunkLoadError', 'SecurityError', 'OutOfMemoryError'];
    const highErrors = ['TypeError', 'ReferenceError', 'SyntaxError'];
    
    if (criticalErrors.some(type => error.name.includes(type) || error.message.includes(type))) {
      return 'critical';
    }
    if (highErrors.includes(error.name)) {
      return 'high';
    }
    return 'medium';
  }

  assessUserImpact(error) {
    // Assess the impact on user experience
    if (error.message.includes('loading chunk')) {
      return 'navigation_blocked';
    }
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'data_unavailable';
    }
    if (error.name === 'TypeError' && error.message.includes('undefined')) {
      return 'feature_broken';
    }
    return 'ui_degraded';
  }

  isRecoverable(error) {
    const recoverableErrors = ['ChunkLoadError', 'NetworkError'];
    return recoverableErrors.some(type => 
      error.name.includes(type) || error.message.includes(type)
    );
  }

  handleRetry = () => {
    // Track retry attempt
    monitoringService.trackEvent('error_recovery', 'user_retry', {
      errorId: this.state.errorId,
      boundary: this.props.name,
      timestamp: Date.now()
    });

    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  handleReport = () => {
    // Track user feedback
    monitoringService.trackEvent('error_feedback', 'user_report', {
      errorId: this.state.errorId,
      boundary: this.props.name,
      timestamp: Date.now()
    });

    // Here you could open a feedback modal or redirect to support
    if (this.props.onReport) {
      this.props.onReport(this.state.error, this.state.errorId);
    }
  };

  handleReload = () => {
    // Track page reload
    monitoringService.trackEvent('error_recovery', 'page_reload', {
      errorId: this.state.errorId,
      boundary: this.props.name,
      timestamp: Date.now()
    });

    // Force page reload
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error,
          this.state.errorInfo,
          this.handleRetry,
          this.state.errorId
        );
      }

      // Default error UI
      const isRecoverable = this.isRecoverable(this.state.error);
      const severity = this.determineSeverity(this.state.error);

      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
            <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${
              severity === 'critical' ? 'bg-red-100' : 
              severity === 'high' ? 'bg-orange-100' : 'bg-yellow-100'
            }`}>
              <svg 
                className={`h-6 w-6 ${
                  severity === 'critical' ? 'text-red-600' : 
                  severity === 'high' ? 'text-orange-600' : 'text-yellow-600'
                }`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                />
              </svg>
            </div>
            
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              {severity === 'critical' ? 'Critical Error' : 'Something went wrong'}
            </h2>
            
            <p className="text-sm text-gray-500 mb-6">
              {severity === 'critical' 
                ? 'We encountered a critical error that prevented the application from working properly.'
                : 'Don\'t worry, we\'ve been notified and are working on a fix.'
              }
            </p>

            {process.env.NODE_ENV === 'development' && (
              <div className="mb-6 p-4 bg-red-50 rounded-lg text-left">
                <p className="text-xs font-mono text-red-800 mb-2">
                  {this.state.error?.message}
                </p>
                <details className="text-xs">
                  <summary className="cursor-pointer text-red-600 mb-2">Stack Trace</summary>
                  <pre className="text-red-700 overflow-auto max-h-32">
                    {this.state.error?.stack}
                  </pre>
                </details>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              {isRecoverable && (
                <button
                  onClick={this.handleRetry}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Try Again
                </button>
              )}
              
              <button
                onClick={this.handleReload}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Reload Page
              </button>
              
              <button
                onClick={this.handleReport}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Report Issue
              </button>
            </div>

            {this.state.errorId && (
              <p className="text-xs text-gray-400 mt-4">
                Error ID: {this.state.errorId}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
  return function WrappedComponent(props) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
};

// Hook for programmatic error reporting
export const useErrorHandler = () => {
  const reportError = React.useCallback((error, context = {}) => {
    // Track error manually
    monitoringService.trackError({
      type: 'manual_error_report',
      message: error.message,
      stack: error.stack,
      name: error.name,
      context,
      url: window.location.href,
      timestamp: Date.now()
    });
  }, []);

  return { reportError };
};

export default ErrorBoundary;