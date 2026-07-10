import React from 'react';
import { useLocation } from 'react-router-dom';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.location?.pathname !== this.props.location?.pathname) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#222', color: 'white', minHeight: '100vh', zIndex: 9999, position: 'relative' }}>
          <h2>Something went wrong.</h2>
          <button 
            onClick={this.resetErrorBoundary}
            style={{ padding: '8px 16px', marginTop: '16px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Try Again
          </button>
          {import.meta.env.DEV && (
            <details style={{ whiteSpace: 'pre-wrap', marginTop: '20px' }}>
              {this.state.error && this.state.error.toString()}
              <br />
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default function ErrorBoundaryWithLocation(props) {
  const location = useLocation();
  return <ErrorBoundary {...props} location={location} />;
}
