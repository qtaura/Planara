import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

// Optional Sentry monitoring for UI (runtime-only import to avoid bundler resolution)
if (import.meta.env.VITE_SENTRY_DSN) {
  (async () => {
    try {
      const Sentry = await (new Function('return import("@sentry/react")'))();
      (Sentry as any).init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0),
      });
      // Capture React errors
      window.addEventListener('error', (e) => {
        try { (Sentry as any).captureException(e.error || e); } catch {}
      });
      window.addEventListener('unhandledrejection', (e: any) => {
        try { (Sentry as any).captureException(e.reason || e); } catch {}
      });
      console.log('[monitoring] UI Sentry initialized');
    } catch (err) {
      console.warn('[monitoring] UI Sentry init failed or not installed:', err instanceof Error ? err.message : String(err));
    }
  })();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);