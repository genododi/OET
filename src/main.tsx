import './lib/webProfileBoot';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { DesktopWorkspace } from './components/DesktopWorkspace';
import { registerWebApp } from './lib/webApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DesktopWorkspace><App /></DesktopWorkspace>
  </StrictMode>,
);
void registerWebApp();
