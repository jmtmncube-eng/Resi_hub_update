import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Was 5min — too long; lists felt stale after admin actions even
      // when the user had clearly acted. 30s + refetchOnWindowFocus is
      // a much fresher feel without hammering the API.
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);

// ── PWA service worker ─────────────────────────────────────────
// Production only — registering it in dev would shadow Vite's HMR.
// public/sw.js makes the app installable and gives an offline shell.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* SW registration is best-effort — the app works fine without it */
    });
  });
}
