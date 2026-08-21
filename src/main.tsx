import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/react';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import './index.css';

const CLERK_PUBLISHABLE_KEY =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  'pk_live_Y2xlcmsua2FuYmFuLnRoZXVtYWlyMDcuY29tJA';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
      <BrowserRouter>
        <AuthProvider>
          <AppProvider>
            <App />
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </ClerkProvider>
  </React.StrictMode>
);
