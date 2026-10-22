import { isDesktop } from './desktop';
let registration: ServiceWorkerRegistration | undefined;
let registrationError = '';
export const webAppError = () => registrationError;
export const webAppChanged = () => window.dispatchEvent(new Event('oet-webapp-change'));
export const standaloneApp = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
export async function registerWebApp() {
  if (isDesktop() || !import.meta.env.PROD || !('serviceWorker' in navigator) || !window.isSecureContext) return;
  try {
    registrationError = '';
    registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL, updateViaCache: 'none' });
    registration.addEventListener('updatefound', () => {
      registration?.installing?.addEventListener('statechange', webAppChanged);
      webAppChanged();
    });
    navigator.serviceWorker.addEventListener('controllerchange', webAppChanged);
    void navigator.serviceWorker.ready.then(webAppChanged);
    webAppChanged();
  } catch { registrationError = 'The core app could not be saved. Connect to the internet, allow website data, then retry the update check.'; webAppChanged(); }
}
export const webAppRegistration = () => registration;
export async function checkWebAppUpdate() {
  if (!registration) await registerWebApp();
  if (!registration) throw Error(registrationError || 'Offline installation needs a supported secure browser. Open this page in Safari.');
  await registration.update(); webAppChanged();
}
export function applyWebAppUpdate() {
  if (!registration?.waiting) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
  registration.waiting.postMessage({ type: 'OET_APPLY_UPDATE' });
}
