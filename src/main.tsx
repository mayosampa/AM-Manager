import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register the Service Worker with autoUpdate.
// When a new SW is waiting (new deploy detected), reload the page automatically
// so users never need incognito mode to get the latest version.
registerSW({
  immediate: true,
  onNeedRefresh() {
    // New content available — reload immediately to activate new SW
    window.location.reload();
  },
  onOfflineReady() {
    console.log('[PWA] App ready for offline use.');
  },
});

import { SessionProvider } from './context/SessionContext.tsx';
import { TeamProvider } from './context/TeamContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionProvider>
      <TeamProvider>
        <App />
      </TeamProvider>
    </SessionProvider>
  </StrictMode>,
);
