import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

export async function checkSharedMedia(catalogRoot, { repository, installed = false } = {}) {
  const raw = await fs.readFile(path.join(catalogRoot, 'page-manifest.json'));
  const manifest = JSON.parse(raw);
  if (manifest.version !== 1 || !manifest.files) throw Error('Invalid shared media manifest.');
  let files = 0, bytes = 0, repositoryFiles = 0;
  for (const [name, entry] of Object.entries(manifest.files)) {
    if (!/^[a-f0-9]{64}\.webp$/.test(name) || !['pages', 'repository'].includes(entry.storage)) throw Error('Invalid shared media identity.');
    const folder = !installed && entry.storage === 'repository' ? path.join(repository, 'shared-usmle-media') : path.join(catalogRoot, 'pages');
    const directory = await fs.lstat(folder), file = path.join(folder, name), stat = await fs.lstat(file);
    if (directory.isSymbolicLink() || !directory.isDirectory() || stat.isSymbolicLink() || !stat.isFile()) throw Error('Shared media cannot follow links.');
    const data = await fs.readFile(file);
    if (data.length !== entry.bytes || data.subarray(0, 4).toString() !== 'RIFF' || data.subarray(8, 12).toString() !== 'WEBP' || createHash('sha256').update(data).digest('hex') !== entry.sha256) throw Error('Shared source image integrity mismatch.');
    files++; bytes += data.length; if (entry.storage === 'repository') repositoryFiles++;
  }
  return { state: 'ready', files, bytes, repositoryFiles, manifestSha256: createHash('sha256').update(raw).digest('hex') };
}
