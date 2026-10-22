import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Blob as NodeBlob } from 'node:buffer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
beforeEach(() => vi.stubGlobal('Blob', NodeBlob));
afterEach(() => vi.unstubAllGlobals());

const template = readFileSync('scripts/study-service-worker.js', 'utf8');
function worker() {
  const listeners = {}; const files = new Map();
  const cacheNames = ['oet-study-packs-v1', 'unrelated-site-cache', 'oet-shell-old1', 'oet-shell-old2', 'oet-shell-old3', 'oet-runtime-old'];
  const deleted = [];
  const cache = {
    match: async request => files.get(typeof request === 'string' ? request : request.url)?.clone(),
    addAll: vi.fn(async () => {}),
  };
  const self = { location: { origin: 'https://example.org' }, addEventListener: (name, listener) => { listeners[name] = listener; }, skipWaiting: vi.fn(), clients: { claim: vi.fn() } };
  const caches = { open: async () => cache, keys: async () => cacheNames, delete: async name => { deleted.push(name); }, match: cache.match };
  class WorkerRequest extends Request { constructor(url, options) { super(new URL(url, 'https://example.org'), options); } }
  const api = vm.runInNewContext(template.replace('__OET_VERSION__', '"new"').replace('__OET_SHELL_FILES__', '["/OET/index.html"]') + '\n({ savedResponse })', { self, caches, Request: WorkerRequest, Response, URL, fetch: vi.fn() });
  return { ...api, listeners, files, cache, deleted, self };
}

describe('iOS offline media worker', () => {
  it('serves cached byte ranges for seeking and resuming without downloading audio again', async () => {
    const sw = worker(); const url = 'https://example.org/OET/audio.mp3';
    sw.files.set(url, new Response(new Uint8Array([0, 1, 2, 3, 4, 5]), { headers: { 'Content-Type': 'audio/mpeg' } }));
    for (const [range, expected, contentRange] of [
      ['bytes=1-3', [1, 2, 3], 'bytes 1-3/6'],
      ['bytes=4-', [4, 5], 'bytes 4-5/6'],
      ['bytes=-2', [4, 5], 'bytes 4-5/6'],
      ['bytes=0-999', [0, 1, 2, 3, 4, 5], 'bytes 0-5/6'],
    ]) {
      const response = await sw.savedResponse(new Request(url, { headers: { Range: range } }));
      expect(response.status).toBe(206);
      expect(response.headers.get('Content-Range')).toBe(contentRange);
      expect([...new Uint8Array(await response.arrayBuffer())]).toEqual(expected);
    }
    expect((await sw.savedResponse(new Request(url, { headers: { Range: 'bytes=9-' } }))).status).toBe(416);
    expect((await sw.savedResponse(new Request(url, { headers: { Range: 'bytes=2-1' } }))).status).toBe(416);
  });

  it('opens a verified saved external PDF using the controlled same-origin document route', async () => {
    const sw = worker(); const url = 'https://github.com/genododi/OET/releases/download/library/source.pdf';
    sw.files.set(url, new Response('%PDF-exact saved original', { headers: { 'Content-Type': 'application/pdf' } }));
    let result;
    sw.listeners.fetch({ request: new Request(`https://example.org/OET/offline-file?source=${encodeURIComponent(url)}`), respondWith: value => { result = value; } });
    expect(await (await result).text()).toBe('%PDF-exact saved original');
    const respondWith = vi.fn(); sw.listeners.fetch({ request: new Request(url, { method: 'POST', body: 'private draft' }), respondWith });
    expect(respondWith).not.toHaveBeenCalled();
  });

  it('waits for an explicit update action and keeps downloaded papers across releases', async () => {
    const sw = worker(); let work;
    sw.listeners.install({ waitUntil: value => { work = value; } }); await work;
    expect(sw.self.skipWaiting).not.toHaveBeenCalled();
    sw.listeners.message({ data: { type: 'unrelated' } }); expect(sw.self.skipWaiting).not.toHaveBeenCalled();
    sw.listeners.message({ data: { type: 'OET_APPLY_UPDATE' } }); expect(sw.self.skipWaiting).toHaveBeenCalledOnce();
    sw.listeners.activate({ waitUntil: value => { work = value; } }); await work;
    expect(sw.deleted).toEqual(['oet-shell-old1', 'oet-runtime-old']);
    expect(sw.deleted).not.toContain('oet-study-packs-v1');
    expect(sw.self.clients.claim).toHaveBeenCalledOnce();
  });
});
