import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Gracefully handle benign dev environment websocket / HMR disconnects
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (
      event.reason &&
      (typeof event.reason === 'string' || typeof event.reason?.message === 'string')
    ) {
      const msg = String(event.reason?.message || event.reason);
      if (
        msg.includes('WebSocket closed without opened') ||
        msg.includes('[vite] failed to connect') ||
        msg.includes('WebSocket connection to')
      ) {
        event.preventDefault();
        console.info('[Vite / Network Notice]: Dev server connection event safely caught.');
      }
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
