import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// When the app comes back from background after >30 seconds, force a clean reload.
// This clears stale timers, dead Supabase channels and frozen React state that
// pile up while Android suspends the Telegram WebView.
let hiddenAt: number | null = null;
const RELOAD_THRESHOLD_MS = 30_000; // 30 seconds

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    hiddenAt = Date.now();
  } else if (document.visibilityState === 'visible') {
    if (hiddenAt !== null && Date.now() - hiddenAt > RELOAD_THRESHOLD_MS) {
      window.location.reload();
    }
    hiddenAt = null;
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);
