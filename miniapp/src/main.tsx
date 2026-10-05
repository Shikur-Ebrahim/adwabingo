import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const BACKGROUND_THRESHOLD_MS = 15_000; // 15 seconds away = force fresh remount

function Root() {
  const [appKey, setAppKey] = useState(0);
  const hiddenAtRef = useRef<number | null>(null);

  const forceRemount = useCallback(() => {
    setAppKey(k => k + 1);
  }, []);

  const handleReturn = useCallback(() => {
    const hidden = hiddenAtRef.current;
    hiddenAtRef.current = null;
    if (hidden !== null && Date.now() - hidden > BACKGROUND_THRESHOLD_MS) {
      forceRemount();
    }
  }, [forceRemount]);

  const handleHide = useCallback(() => {
    hiddenAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    // 1. visibilitychange — fires when tab/window visibility changes
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') handleHide();
      else handleReturn();
    };
    document.addEventListener('visibilitychange', onVisibility);

    // 2. window focus — fires when window regains focus
    window.addEventListener('focus', handleReturn);

    // 3. pageshow — fires on BFCache restore (back/forward cache)
    window.addEventListener('pageshow', handleReturn);

    // 4. Telegram-specific 'activated' event (fires when mini app becomes active)
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.onEvent) {
        tg.onEvent('activated', handleReturn);
        tg.onEvent('deactivated', handleHide);
      }
    } catch (_) {}

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', handleReturn);
      window.removeEventListener('pageshow', handleReturn);
      try {
        const tg = (window as any).Telegram?.WebApp;
        if (tg?.offEvent) {
          tg.offEvent('activated', handleReturn);
          tg.offEvent('deactivated', handleHide);
        }
      } catch (_) {}
    };
  }, [handleReturn, handleHide]);

  return <App key={appKey} />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><Root /></React.StrictMode>
);
