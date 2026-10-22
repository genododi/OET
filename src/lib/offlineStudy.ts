export const STUDY_CACHE = 'oet-study-packs-v1';
const PACK_KEY = 'oet-webapp-packs-v1';
export type OfflineAsset = { url: string; label: string; sha256?: string; mimeType?: string; optional?: boolean };
export type OfflinePack = { id: string; title: string; route: string; assets: OfflineAsset[]; savedAt: string };
export type OfflineProgress = { done: number; total: number; label: string };
export const deviceOfflineSupported = () => typeof caches !== 'undefined' && window.isSecureContext;
export const offlineUrl = (value: string) => new URL(value, window.location.href).href.split('#')[0];
export const offlineAssets = (assets: OfflineAsset[]) => [...new Map(assets.filter(a => a.url && !/^(blob:|oet:|data:)/.test(a.url)).map(a => [offlineUrl(a.url), { ...a, url: offlineUrl(a.url) }])).values()];

export function savedStudyPacks(): OfflinePack[] {
  try { const data = JSON.parse(localStorage.getItem(PACK_KEY) || '[]'); return Array.isArray(data) ? data.filter(p => p && typeof p.id === 'string' && Array.isArray(p.assets)) : []; } catch { return []; }
}
function recordPack(pack: OfflinePack) {
  localStorage.setItem(PACK_KEY, JSON.stringify([...savedStudyPacks().filter(p => p.id !== pack.id), pack]));
  window.dispatchEvent(new Event('oet-offline-packs-change'));
}
export async function missingOfflineAssets(assets: OfflineAsset[]) {
  if (!deviceOfflineSupported()) return offlineAssets(assets);
  const cache = await caches.open(STUDY_CACHE);
  const missing: OfflineAsset[] = [];
  for (const asset of offlineAssets(assets)) if (!(await cache.match(asset.url))) missing.push(asset);
  return missing;
}
export async function verifyOfflineFile(blob: Blob, asset: OfflineAsset) {
  if (asset.sha256) {
    const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
    const hex = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
    if (hex !== asset.sha256) throw Error('That file does not match this recording or paper. Choose the exact original offered below.');
  }
  if (/\.json(?:\?|$)/.test(asset.url)) JSON.parse(await blob.text());
  const head = (await blob.slice(0, 200).text()).trimStart().toLowerCase();
  if (/^<!doctype html|^<html/.test(head)) throw Error('The download returned a web page instead of the study file.');
  if (!blob.size) throw Error('The study file is empty.');
}
async function storeOfflineFile(blob: Blob, asset: OfflineAsset) {
  await verifyOfflineFile(blob, asset);
  const type = asset.mimeType || (/\.json(?:\?|$)/.test(asset.url) ? 'application/json' : blob.type || 'application/octet-stream');
  await (await caches.open(STUDY_CACHE)).put(offlineUrl(asset.url), new Response(blob, { headers: {
    'Content-Type': type, 'Content-Length': String(blob.size), 'Accept-Ranges': 'bytes', ...(asset.sha256 ? { 'X-OET-SHA256': asset.sha256 } : {}),
  } }));
}
export async function saveStudyPack(pack: OfflinePack, progress?: (value: OfflineProgress) => void, refresh = false) {
  if (!deviceOfflineSupported()) throw Error('Offline downloads need Safari or another secure browser with website storage enabled.');
  const cache = await caches.open(STUDY_CACHE);
  const assets = offlineAssets(pack.assets);
  if (!('serviceWorker' in navigator)) throw Error('This browser cannot reopen the app offline. Use Safari on iPhone or iPad.');
  if (!navigator.serviceWorker.controller) {
    await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => window.setTimeout(() => reject(Error('The core app is not ready yet. Keep the app open online, then retry.')), 20000))]);
  }
  recordPack({ ...pack, assets });
  const missing: OfflineAsset[] = [];
  let done = 0;
  for (const asset of assets) {
    progress?.({ done, total: assets.length, label: asset.label });
    const existing = await cache.match(asset.url);
    if (existing && (!refresh || (asset.sha256 && existing.headers.get('X-OET-SHA256') === asset.sha256))) { done++; continue; }
    if (asset.optional && /\.pdf(?:\?|$)/i.test(asset.url) && !existing) { missing.push(asset); done++; continue; }
    try {
      const response = await fetch(asset.url, { mode: 'cors', credentials: new URL(asset.url).origin === location.origin ? 'same-origin' : 'omit', cache: 'no-cache' });
      if (!response.ok || response.status !== 200 || response.type === 'opaque') throw Error('File unavailable');
      await storeOfflineFile(await response.blob(), asset);
    } catch (error) {
      if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'SecurityError')) throw Error('Device storage is full or unavailable. Your answers were kept. Free space or remove a saved test, then retry.', { cause: error });
      if (!existing) missing.push(asset);
    }
    done++;
  }
  recordPack({ ...pack, assets, savedAt: new Date().toISOString() });
  progress?.({ done, total: assets.length, label: '' });
  return missing;
}
export async function importOfflineAsset(file: File, asset: OfflineAsset) {
  if (!asset.sha256) throw Error('This file has no verified original checksum; use the normal download button.');
  await storeOfflineFile(file, asset);
  window.dispatchEvent(new Event('oet-offline-packs-change'));
}
export async function removeStudyPack(id: string) {
  const all = savedStudyPacks(); const removed = all.find(p => p.id === id);
  const remaining = all.filter(p => p.id !== id);
  localStorage.setItem(PACK_KEY, JSON.stringify(remaining));
  if (removed) {
    const shared = new Set(remaining.flatMap(p => p.assets.map(a => offlineUrl(a.url))));
    const cache = await caches.open(STUDY_CACHE);
    for (const asset of removed.assets) if (!shared.has(offlineUrl(asset.url))) await cache.delete(offlineUrl(asset.url));
  }
  window.dispatchEvent(new Event('oet-offline-packs-change'));
}
