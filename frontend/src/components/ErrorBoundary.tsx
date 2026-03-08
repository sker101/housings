import React, { Component, ErrorInfo, ReactNode } from 'react';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    errorMsg: string;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        errorMsg: ''
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, errorMsg: error.message };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Unhandled Exception:', error, errorInfo);

        // Attempt to log to Supabase in the background
        try {
            if (SUPABASE_URL && SUPABASE_ANON_KEY) {
                fetch(`${SUPABASE_URL}/rest/v1/error_logs`, {
                    method: 'POST',
                    headers: {
                        apikey: SUPABASE_ANON_KEY,
                        'Content-Type': 'application/json',
                        Prefer: 'return=minimal'
                    },
                    body: JSON.stringify({
                        error_msg: error.message,
                        stack_trace: error.stack?.substring(0, 1000) || errorInfo.componentStack?.substring(0, 1000),
                        route: window.location.pathname,
                        user_agent: navigator.userAgent
                    })
                }).catch(err => console.warn('Failed to remotely log error:', err));
            }
        } catch {
            // ignore logging failures
        }
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '2rem',
                    background: 'var(--bg, #fcfcfc)',
                    color: 'var(--text, #333)'
                }}>
                    <h1 style={{ fontSize: '2rem', color: 'var(--danger, #cf222e)', marginBottom: '1rem' }}>
                        Something went wrong
                    </h1>
                    <p style={{ maxWidth: 500, lineHeight: 1.6, marginBottom: '2rem' }}>
                        A critical error occurred while rendering this page. Our team has been notified.
                        Please try refreshing the page or going back to the home page.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            className="btn btn--primary"
                            onClick={() => window.location.reload()}
                        >
                            Refresh Page
                        </button>
                        <button
                            className="btn btn--ghost"
                            onClick={() => window.location.href = '/'}
                        >
                            Go to Home
                        </button>
                    </div>
                    {import.meta.env.DEV ? (
                        <pre style={{ marginTop: '2rem', background: '#f6f8fa', padding: '1rem', borderRadius: '8px', maxWidth: 800, overflowX: 'auto', textAlign: 'left', fontSize: '0.8rem' }}>
                            {this.state.errorMsg}
                        </pre>
                    ) : null}
                </div>
            );
        }

        return this.props.children;
    }
}
