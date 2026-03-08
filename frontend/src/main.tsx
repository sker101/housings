import React from 'react';
console.log('CampusStay TZ: Entry point main.tsx loaded');

import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles/global.css';
import './lib/i18n';


const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('CampusStay TZ: Fatal Error - #root element not found in DOM.');
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );
}

