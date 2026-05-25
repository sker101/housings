import React from 'react';
console.log('iRent: Entry point main.tsx loaded');

import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles/global.css';
import './lib/i18n';

import { HelmetProvider } from 'react-helmet-async';

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('iRent: Fatal Error - #root element not found in DOM.');
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <HelmetProvider>
        <ErrorBoundary>
          <BrowserRouter>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </ErrorBoundary>
      </HelmetProvider>
    </React.StrictMode>
  );

  // Dismiss splash screen once React has painted its first frame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const splash = document.getElementById('splash');
      if (splash) {
        splash.classList.add('splash-hidden');
        // Remove from DOM after fade-out transition (450ms)
        setTimeout(() => splash.remove(), 500);
      }
    });
  });
}

