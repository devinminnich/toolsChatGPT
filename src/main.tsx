import React from 'react';
import ReactDOM from 'react-dom/client';
import AppShell from './AppShell';
import './styles.css';
import './workspace.css';
import './auth.css';
import './projectbar.css';
import './comparison.css';
import './quoteedit.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppShell />
  </React.StrictMode>,
);

// Temporarily run network-first without a service worker. This also cleans up
// older PWA registrations/caches that can strand Safari on a stale app shell.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch((error) => console.error('Service worker cleanup failed', error));

    if ('caches' in window) {
      caches.keys()
        .then((keys) => Promise.all(keys.filter((key) => key.startsWith('renovation-planner-')).map((key) => caches.delete(key))))
        .catch((error) => console.error('Cache cleanup failed', error));
    }
  });
}
