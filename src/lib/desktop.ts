export interface OfflineProfile { id: string; name: string; createdAt: string }
export interface StartupUpdateStatus { state: string; checking: boolean; message: string; checkedAt?: string; files?: { state: string; checkedFiles?: number; changedFiles?: number; pendingPracticeFiles?: number }; published?: { state: string; remoteCommit?: string } }
export interface DesktopInfo { profile: OfflineProfile | null; profiles: OfflineProfile[]; offline: boolean; build?: { gitCommit: string; builtAt: string } | null; updates?: StartupUpdateStatus }
export interface LocalAiStatus { installed: boolean; state: string; model: string; message: string }
declare global {
  interface Window {
    oetDesktop?: {
      info(): Promise<DesktopInfo>;
      createProfile(name: string): Promise<OfflineProfile>;
      switchProfile(id: string): Promise<boolean>;
      renameProfile(name: string): Promise<OfflineProfile>;
      backup(data: Record<string, string>): Promise<boolean>;
      restore(): Promise<Record<string, string> | null>;
      aiStatus(): Promise<LocalAiStatus>;
      checkUpdates?(): Promise<StartupUpdateStatus>;
      onUpdateStatus?(callback: (status: StartupUpdateStatus) => void): () => void;
    };
  }
}
export const isDesktop = () => typeof window !== 'undefined' && !!window.oetDesktop;
export const studyAssetUrl = (url: string) => {
  if (isDesktop() && /^https?:\/\//.test(url)) return `${import.meta.env.BASE_URL}desktop/remote/${encodeURIComponent(url)}`;
  // A same-origin document route lets iOS open a saved external PDF offline.
  // Cross-origin top-level navigations cannot be controlled by this app's worker.
  if (typeof navigator !== 'undefined' && navigator.serviceWorker?.controller && /^https:\/\/github\.com\/genododi\/OET\/releases\/download\/.+\.pdf(?:[?#]|$)/.test(url)) return `${import.meta.env.BASE_URL}offline-file?source=${encodeURIComponent(url)}`;
  return url;
};
