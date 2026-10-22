/* Built into dist/sw.js. The worker is scoped to /OET/ and never caches user
   submissions, mentor requests, credentials or unrelated GitHub Pages sites. */
const VERSION = __OET_VERSION__;
const FILES = __OET_SHELL_FILES__;
const SHELL = `oet-shell-${VERSION}`;
const RUNTIME = `oet-runtime-${VERSION}`;
const PACKS = 'oet-study-packs-v1';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL).then(cache => cache.addAll(FILES.map(url => new Request(url, { cache: 'reload' })))));
  // An update waits. Only the learner's explicit update action replaces it.
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    const oldShells = names.filter(name => name.startsWith('oet-shell-') && name !== SHELL);
    // Retain two older shells so another open study window can finish safely.
    await Promise.all(oldShells.slice(0, -2).map(name => caches.delete(name)));
    await Promise.all(names.filter(name => name.startsWith('oet-runtime-') && name !== RUNTIME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'OET_APPLY_UPDATE') void self.skipWaiting();
});

async function savedResponse(request) {
  const cached = await (await caches.open(PACKS)).match(request.url);
  if (!cached) return null;
  const range = request.headers.get('Range');
  if (!range) return cached;
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || (!match[1] && !match[2])) return new Response(null, { status: 416 });
  const blob = await cached.blob();
  const start = match[1] ? Number(match[1]) : Math.max(0, blob.size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), blob.size - 1) : blob.size - 1;
  if (start >= blob.size || start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${blob.size}` } });
  return new Response(blob.slice(start, end + 1), { status: 206, headers: {
    'Content-Type': cached.headers.get('Content-Type') || 'application/octet-stream',
    'Content-Length': String(end - start + 1), 'Content-Range': `bytes ${start}-${end}/${blob.size}`, 'Accept-Ranges': 'bytes',
  } });
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!['https:', 'http:'].includes(url.protocol)) return;
  event.respondWith((async () => {
    if (url.origin === self.location.origin && url.pathname === '/OET/offline-file') {
      const original = url.searchParams.get('source') || '';
      if (!/^https:\/\/github\.com\/genododi\/OET\/releases\/download\/.+\.pdf(?:[?#]|$)/.test(original)) return new Response('Unsupported original file.', { status: 400 });
      const saved = await savedResponse(new Request(original, { headers: request.headers }));
      return saved || Response.redirect(original, 302);
    }
    const pinned = await savedResponse(request);
    if (pinned) return pinned;
    if (url.origin !== self.location.origin || !url.pathname.startsWith('/OET/')) return fetch(request);
    if (request.mode === 'navigate') return (await (await caches.open(SHELL)).match('/OET/index.html')) || fetch(request);
    const shell = await (await caches.open(SHELL)).match(request);
    if (shell) return shell;
    if (url.pathname.startsWith('/OET/assets/')) {
      const older = await caches.match(request);
      if (older) return older;
    }
    const cache = await caches.open(RUNTIME);
    try {
      const response = await fetch(request);
      // Downloaded packs are pinned separately. Background caching is limited
      // to visited text/question data; never silently download large recordings.
      if (response.ok && response.status === 200 && /\.(?:json|webp)$/.test(url.pathname) && !request.headers.has('Range')) {
        await cache.put(request, response.clone());
        const keys = await cache.keys();
        await Promise.all(keys.slice(0, Math.max(0, keys.length - 300)).map(key => cache.delete(key)));
      }
      return response;
    } catch {
      return (await cache.match(request)) || new Response('This test is not saved on this device. Connect, then save it for offline study.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    }
  })());
});
