import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.txt':'text/plain; charset=utf-8', '.pdf': 'application/pdf', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.flac':'audio/flac', '.aac':'audio/aac', '.webm':'video/webm', '.mov':'video/quicktime', '.mp4': 'video/mp4', '.png': 'image/png', '.webp':'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
export async function confined(root, relative) {
  const file = path.resolve(root, relative);
  const rel = path.relative(root, file);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel) || relative.includes('\0')) throw Error('Invalid asset path');
  // Source imports copy regular files only; also reject a symlink escaping the bundle.
  try { if (path.relative(await fs.promises.realpath(root), await fs.promises.realpath(file)).startsWith('..')) throw Error('Invalid asset link'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  return file;
}
export async function assetResponse(file, request) {
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405 });
  let size;
  try { const stat = await fs.promises.stat(file); if (!stat.isFile()) throw Error(); size = stat.size; }
  catch { return new Response('This file is not included in this installation.', { status: 404 }); }
  const headers = { 'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' };
  let start = 0, end = size - 1, status = 200;
  const range = request.headers.get('range');
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
    end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    if (start >= size || start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    headers['Content-Range'] = `bytes ${start}-${end}/${size}`; status = 206;
  }
  headers['Content-Length'] = String(Math.max(0, end - start + 1));
  const body = request.method === 'HEAD' || !size ? null : Readable.toWeb(fs.createReadStream(file, { start, end }));
  return new Response(body, { status, headers });
}
