import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

/* ─── Config ──────────────────────────────────────────────────────────────── */
const THRESHOLD_MS = 15_000; // 15 s in background → show resume overlay
let appKey       = 0;
let hiddenAt: number | null = null;
let root: ReturnType<typeof ReactDOM.createRoot>;

/* ─── React mount ─────────────────────────────────────────────────────────── */
function render() {
  root.render(
    <React.StrictMode>
      <App key={appKey} />
    </React.StrictMode>
  );
}

/* ─── Force fresh remount ─────────────────────────────────────────────────── */
function forceRemount() {
  document.getElementById('freeze-overlay')?.remove();
  try { (window as any).Telegram?.WebApp?.expand(); } catch (_) {}
  appKey++;
  render();
}

/* ─── Native DOM overlay (works even when React events are dead) ──────────── */
function showOverlay() {
  if (document.getElementById('freeze-overlay')) return;

  // Always try to re-expand the WebView first
  try { (window as any).Telegram?.WebApp?.expand(); } catch (_) {}

  const overlay = document.createElement('div');
  overlay.id = 'freeze-overlay';
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:2147483647',
    'background:#0f172a', 'display:flex', 'flex-direction:column',
    'align-items:center', 'justify-content:center', 'gap:20px',
    'font-family:sans-serif',
  ].join(';');

  const icon = document.createElement('div');
  icon.textContent = '⏸️';
  icon.style.fontSize = '48px';

  const msg = document.createElement('p');
  msg.textContent = 'App paused in background';
  msg.style.cssText = 'color:#94a3b8;font-size:14px;margin:0;text-align:center;padding:0 24px;';

  const btn = document.createElement('button');
  btn.textContent = '🔄  Tap to Resume';
  // native onclick — not affected by React synthetic event system
  btn.onclick = forceRemount;
  btn.style.cssText = [
    'background:#eab308', 'color:#000', 'border:none',
    'border-radius:16px', 'padding:18px 40px',
    'font-size:17px', 'font-weight:900', 'cursor:pointer',
    'letter-spacing:0.3px',
  ].join(';');

  overlay.appendChild(icon);
  overlay.appendChild(msg);
  overlay.appendChild(btn);
  document.body.appendChild(overlay);
}

/* ─── Resume logic ────────────────────────────────────────────────────────── */
function tryResume() {
  try { (window as any).Telegram?.WebApp?.expand(); } catch (_) {}
  if (hiddenAt !== null && Date.now() - hiddenAt > THRESHOLD_MS) {
    hiddenAt = null;
    showOverlay();
  } else {
    hiddenAt = null;
  }
}

function markHidden() {
  hiddenAt = Date.now();
}

/* ─── Event listeners (outside React) ────────────────────────────────────── */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') markHidden();
  else tryResume();
});
window.addEventListener('focus',    tryResume);
window.addEventListener('pageshow', tryResume);

try {
  const tg = (window as any).Telegram?.WebApp;
  if (tg?.onEvent) {
    tg.onEvent('activated',   tryResume);
    tg.onEvent('deactivated', markHidden);
  }
} catch (_) {}

/* ─── Heartbeat detector (most reliable for JS suspension) ───────────────── */
// While JS is suspended this interval doesn't fire.
// On resume: gap > THRESHOLD → show overlay.
let lastBeat = Date.now();
setInterval(() => {
  const now = Date.now();
  const gap = now - lastBeat;
  lastBeat = now;
  if (gap > THRESHOLD_MS) showOverlay();
}, 3000);

/* ─── Initial mount ───────────────────────────────────────────────────────── */
root = ReactDOM.createRoot(document.getElementById('root')!);
render();
