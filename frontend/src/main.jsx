import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './i18n'

/* ── Silence known-benign unhandled rejections ────────────────────────
   SW registration fails in dev mode (devOptions.enabled = false) and
   emits an "Uncaught (in promise)" error that confuses the console.
   We catch it here so it doesn't pollute animal page debugging.        */
window.addEventListener('unhandledrejection', (evt) => {
  const msg = evt.reason?.message || String(evt.reason || '');
  if (
    msg.includes('ServiceWorker')     ||
    msg.includes('service worker')    ||
    msg.includes('SW not ready')      ||
    msg.includes('Failed to register')
  ) {
    evt.preventDefault(); // suppress console noise
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
