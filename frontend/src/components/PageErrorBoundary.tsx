/**
 * PageErrorBoundary.tsx — iRent
 * React class error boundary that catches JS runtime errors in any child
 * component tree and shows a clean, branded recovery UI instead of Vercel's
 * "Something went wrong" white screen.
 */
import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Optional page label for better error context */
  label?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export default class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Log to console for debugging — in production wire to Sentry/Datadog
    console.error('[iRent] Page crash caught by ErrorBoundary:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.history.back();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #f9fafb 100%)',
        padding: '2rem', fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{
          maxWidth: 480, width: '100%', textAlign: 'center',
          background: '#fff', borderRadius: 20,
          padding: '2.5rem 2rem',
          boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb',
        }}>
          {/* Logo */}
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'linear-gradient(140deg, #22c55e, #16a34a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem', fontSize: '1.4rem', color: '#fff',
            fontWeight: 800, fontFamily: 'Syne, sans-serif',
          }}>iR</div>

          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            This page ran into a problem. Your account and data are safe — this is just a display glitch.
          </p>

          {/* Error detail — helpful for reporting */}
          {this.state.errorMessage && (
            <pre style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 8, padding: '0.75rem 1rem',
              fontSize: '0.75rem', color: '#991b1b',
              textAlign: 'left', overflowX: 'auto',
              marginBottom: '1.5rem', whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {this.state.errorMessage}
            </pre>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '0.65rem 1.4rem', borderRadius: 10,
                border: '1px solid #d1d5db', background: '#fff',
                color: '#374151', fontWeight: 600, fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              ← Go Back
            </button>
            <button
              onClick={() => { window.location.href = '/'; }}
              style={{
                padding: '0.65rem 1.4rem', borderRadius: 10,
                border: 'none', background: '#22c55e',
                color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
