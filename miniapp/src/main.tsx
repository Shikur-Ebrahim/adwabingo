import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Ensure HashRouter always starts at root if no hash is present
if (!window.location.hash || window.location.hash === '#') {
  window.location.replace(window.location.href.split('#')[0] + '#/');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);
