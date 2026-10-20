export interface OfflineProfile { id: string; name: string; createdAt: string }
export interface DesktopInfo { profile: OfflineProfile | null; profiles: OfflineProfile[]; offline: boolean; build?: { gitCommit: string; builtAt: string } | null }
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
    };
  }
}
export const isDesktop = () => typeof window !== 'undefined' && !!window.oetDesktop;
export const studyAssetUrl = (url: string) => isDesktop() && /^https?:\/\//.test(url) ? `${import.meta.env.BASE_URL}desktop/remote/${encodeURIComponent(url)}` : url;
