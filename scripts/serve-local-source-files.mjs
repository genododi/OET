import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, isAbsolute, resolve, sep } from 'node:path';

const sourceRoot = resolve(
  process.env.OET_LOCAL_SOURCE_ROOT
    ?? '/Volumes/GENODODI/oet-study-sources/Google drive Folder',
);
const port = Number.parseInt(process.env.OET_LOCAL_SOURCE_PORT ?? '4318', 10);
const host = '127.0.0.1';

const mimeTypes = new Map([
  ['.aac', 'audio/aac'],
  ['.doc', 'application/msword'],
  ['.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ['.htm', 'text/html; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.m4a', 'audio/mp4'],
  ['.mp3', 'audio/mpeg'],
  ['.mp4', 'video/mp4'],
  ['.ogg', 'audio/ogg'],
  ['.pdf', 'application/pdf'],
  ['.png', 'image/png'],
  ['.ppt', 'application/vnd.ms-powerpoint'],
  ['.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.wav', 'audio/wav'],
  ['.zip', 'application/zip'],
]);

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(body);
}

function sendError(response, status, message) {
  const escaped = message
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
  const body = `<!doctype html><html><head><meta charset="utf-8"><title>OET source file</title></head><body style="font:16px system-ui;max-width:720px;margin:64px auto;padding:0 24px"><h1>Source file unavailable</h1><p>${escaped}</p><p>Confirm that GENODODI is mounted and the OET local source gateway is running.</p></body></html>`;
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
    'Content-Type': 'text/html; charset=utf-8',
  });
  response.end(body);
}

function parseRange(rangeHeader, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader ?? '');
  if (!match) return null;
  const requestedStart = match[1] ? Number.parseInt(match[1], 10) : null;
  const requestedEnd = match[2] ? Number.parseInt(match[2], 10) : null;
  let start = requestedStart ?? Math.max(0, size - (requestedEnd ?? 0));
  let end = requestedStart === null ? size - 1 : (requestedEnd ?? size - 1);
  start = Math.max(0, start);
  end = Math.min(size - 1, end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) return null;
  return { start, end };
}

async function resolveRequestedFile(relativePath) {
  if (!relativePath || isAbsolute(relativePath) || relativePath.includes('\0')) {
    throw new Error('The requested source path is invalid.');
  }
  const rootRealPath = await realpath(sourceRoot);
  const requestedRealPath = await realpath(resolve(rootRealPath, relativePath));
  if (!requestedRealPath.startsWith(`${rootRealPath}${sep}`)) {
    throw new Error('The requested file is outside the configured source folder.');
  }
  const fileStats = await stat(requestedRealPath);
  if (!fileStats.isFile()) throw new Error('The requested source is not a file.');
  return { fileStats, requestedRealPath };
}

const server = createServer(async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Range');
  response.setHeader('Access-Control-Allow-Private-Network', 'true');
  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }

  const url = new URL(request.url ?? '/', `http://${host}:${port}`);
  if (url.pathname === '/health') {
    try {
      const rootStats = await stat(sourceRoot);
      sendJson(response, rootStats.isDirectory() ? 200 : 503, {
        available: rootStats.isDirectory(),
        sourceRoot,
      });
    } catch {
      sendJson(response, 503, { available: false, sourceRoot });
    }
    return;
  }

  if (url.pathname !== '/file' || !['GET', 'HEAD'].includes(request.method ?? '')) {
    sendError(response, 404, 'Unknown local source request.');
    return;
  }

  try {
    const relativePath = url.searchParams.get('path') ?? '';
    const { fileStats, requestedRealPath } = await resolveRequestedFile(relativePath);
    const range = request.headers.range ? parseRange(request.headers.range, fileStats.size) : null;
    if (request.headers.range && !range) {
      response.writeHead(416, { 'Content-Range': `bytes */${fileStats.size}` });
      response.end();
      return;
    }

    const extension = extname(requestedRealPath).toLowerCase();
    const contentType = mimeTypes.get(extension) ?? 'application/octet-stream';
    const inline = /^(?:audio|image|text|video)\//.test(contentType) || contentType === 'application/pdf';
    const filename = requestedRealPath.split(sep).at(-1) ?? 'source-file';
    const disposition = `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(filename)}`;
    const start = range?.start ?? 0;
    const end = range?.end ?? fileStats.size - 1;
    const headers = {
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=0, must-revalidate',
      'Content-Disposition': disposition,
      'Content-Length': end - start + 1,
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
    };
    if (range) headers['Content-Range'] = `bytes ${start}-${end}/${fileStats.size}`;
    response.writeHead(range ? 206 : 200, headers);
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    createReadStream(requestedRealPath, { start, end }).pipe(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The source file could not be opened.';
    sendError(response, 404, message);
  }
});

server.listen(port, host, () => {
  console.log(`OET local source gateway listening at http://${host}:${port}`);
  console.log(`Serving read-only files from ${sourceRoot}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
