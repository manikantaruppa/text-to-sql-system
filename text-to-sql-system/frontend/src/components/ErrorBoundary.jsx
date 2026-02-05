import React, { Component } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Catch errors in any components below and re-render with error message
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // You can also log error messages to an error reporting service here
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="p-6 mx-auto max-w-3xl my-8 bg-white rounded-lg shadow-lg">
          <div className="flex items-center mb-4 text-red-600">
            <ExclamationTriangleIcon className="h-10 w-10 mr-2" />
            <h2 className="text-xl font-bold">Something went wrong</h2>
          </div>
          
          <div className="bg-red-50 p-4 rounded-md mb-4">
            <p className="text-red-700">
              {this.state.error && this.state.error.toString()}
            </p>
          </div>
          
          <div className="mt-4">
            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-gray-700 mb-2">Technical Details</summary>
              <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-xs">
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </details>
          </div>

          <div className="mt-6">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    // If there's no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;