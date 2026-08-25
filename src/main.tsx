import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });
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
