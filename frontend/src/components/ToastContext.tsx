import React, { createContext, useCallback, useContext } from 'react';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────
// Toast Context — wraps react-hot-toast with design system colours
// ─────────────────────────────────────────────────────────────

type ToastVariant = 'success' | 'error' | 'info';

interface ToastContextValue {
  showToast: (_message: string, _variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const showToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const styles: Record<ToastVariant, { background: string; color: string }> = {
      success: { background: 'var(--jade)',  color: '#fff' },
      error:   { background: 'var(--red)',   color: '#fff' },
      info:    { background: '#1a4b8c',      color: '#fff' },
    };

    toast(message, {
      duration: 4000,
      position: 'bottom-right',
      style: {
        ...styles[variant],
        borderRadius: '10px',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '0.88rem',
        fontWeight: 500,
        boxShadow: 'var(--shadow-hard)',
        maxWidth: '340px',
      },
    });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
