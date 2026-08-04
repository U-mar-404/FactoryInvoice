import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled React error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', maxWidth: '600px', margin: '40px auto', fontFamily: 'sans-serif' }}>
          <div className="card" style={{ padding: '28px' }}>
            <h2 style={{ color: 'var(--bad, #D9432E)', marginTop: 0 }}>Application Error Caught</h2>
            <p style={{ color: 'var(--ink-dim, #5A6786)' }}>
              An unexpected UI rendering error occurred. Details below:
            </p>
            <div
              style={{
                background: '#FCE2DE',
                color: '#D9432E',
                padding: '12px 16px',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '13px',
                marginBottom: '16px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {this.state.error?.toString()}
            </div>
            <button
              className="btn b-primary"
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
            >
              Reset Session &amp; Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
