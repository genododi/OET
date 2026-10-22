import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { Blob as NodeBlob } from 'node:buffer';
import { importOfflineAsset, missingOfflineAssets, removeStudyPack, savedStudyPacks, saveStudyPack, STUDY_CACHE, verifyOfflineFile } from '../../src/lib/offlineStudy';

let files;
beforeEach(() => {
  files = new Map();
  vi.stubGlobal('crypto', webcrypto);
  vi.stubGlobal('Blob', NodeBlob);
  vi.stubGlobal('isSecureContext', true);
  vi.stubGlobal('caches', { open: vi.fn(async () => ({
    match: async (url) => files.get(url)?.clone(),
    put: async (url, response) => { files.set(url, response); },
    delete: async (url) => files.delete(url),
  })) });
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { controller: {}, ready: Promise.resolve({}) } });
});
afterEach(() => { vi.unstubAllGlobals(); Reflect.deleteProperty(navigator, 'serviceWorker'); });
const pack = (id, urls) => ({ id, title: id, route: '#benchmark/reading', assets: urls.map(url => ({ url, label: url })), savedAt: '' });

it('does not label failed downloads as available offline and can resume missing files', async () => {
  const valid = 'https://example.org/paper.json';
  const missing = 'https://example.org/audio.mp3';
  vi.stubGlobal('fetch', vi.fn(async (url) => new Response(url === valid ? '{"questions":[]}' : 'Unavailable', { status: url === valid ? 200 : 404 })));
  const selection = pack('paper', [valid, missing]);
  expect((await saveStudyPack(selection)).map(asset => asset.url)).toEqual([missing]);
  expect(savedStudyPacks()[0].id).toBe('paper');
  expect((await missingOfflineAssets(selection.assets)).map(asset => asset.url)).toEqual([missing]);
  vi.stubGlobal('fetch', vi.fn(async () => new Response('Real recording bytes')));
  expect(await saveStudyPack(selection)).toEqual([]);
  expect(await missingOfflineAssets(selection.assets)).toEqual([]);
});

it('rejects an unrelated original and a web error page instead of saving it as a paper', async () => {
  const blob = new Blob(['exact original']);
  const sha256 = Buffer.from(await webcrypto.subtle.digest('SHA-256', await blob.arrayBuffer())).toString('hex');
  const asset = { url: 'https://example.org/source.pdf', label: 'Original', sha256, mimeType: 'application/pdf' };
  await expect(importOfflineAsset(new Blob(['wrong original']), asset)).rejects.toThrow('does not match');
  expect(files.size).toBe(0);
  await importOfflineAsset(blob, asset);
  expect(files.get(asset.url)?.headers.get('X-OET-SHA256')).toBe(sha256);
  await expect(verifyOfflineFile(new Blob(['<!doctype html><title>Sign in</title>']), { url: asset.url, label: 'Paper' })).rejects.toThrow('web page');
});

it('removes only unshared downloads and never deletes profile answers', async () => {
  const shared = 'https://example.org/shared.json'; const unique = 'https://example.org/unique.json';
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}')));
  await saveStudyPack(pack('first', [shared, unique])); await saveStudyPack(pack('second', [shared]));
  localStorage.setItem('oet-reading-answer', 'B');
  await removeStudyPack('first');
  expect(files.has(shared)).toBe(true); expect(files.has(unique)).toBe(false);
  expect(localStorage.getItem('oet-reading-answer')).toBe('B');
  expect(await missingOfflineAssets(pack('second', [shared]).assets)).toEqual([]);
  expect(STUDY_CACHE).toBe('oet-study-packs-v1');
});
