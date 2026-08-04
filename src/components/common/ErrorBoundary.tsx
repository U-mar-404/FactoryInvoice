import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_error: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Unhandled React rendering error caught:', error, errorInfo);

    // Silently reset session in localStorage to prevent crash loops
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.clear();
    } catch (e) {
      console.error('[ErrorBoundary] Error clearing session:', e);
    }

    // Automatically redirect cleanly to login screen
    setTimeout(() => {
      window.location.href = '/';
    }, 100);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0B1B42', color: '#fff', fontFamily: 'sans-serif' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 16px', borderTopColor: '#2F6FED' }}></div>
            <div style={{ fontSize: '14px', opacity: 0.8 }}>Redirecting to sign in...</div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
