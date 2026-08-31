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

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error) => {
      console.error('Service worker registration failed', error);
    });
  });
}
