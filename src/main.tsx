import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { CashFlowProvider } from './contexts/CashFlowContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <CashFlowProvider>
        <App />
      </CashFlowProvider>
    </AuthProvider>
  </StrictMode>
);
