import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

async function checksum(file) {
  const hash = createHash('sha256');
  for await (const data of createReadStream(file)) hash.update(data);
  return hash.digest('hex');
}

// Verify the permanent Mac copy against the signed app's released catalog.
// Unchanged files use the installer's checksum receipt; altered files are rehashed.
// This never reads the external source, fetches the network, or changes profiles.
export async function checkInternalLibrary(libraryRoot, catalogFile) {
  if (!libraryRoot) return { state: 'unavailable' };
  try {
    for (const folder of [libraryRoot, path.join(libraryRoot, 'files'), path.join(libraryRoot, 'text')]) {
      const stat = await fs.lstat(folder);
      if (!stat.isDirectory() || stat.isSymbolicLink()) return { state: 'incomplete' };
    }
    const raw = await fs.readFile(catalogFile);
    const expected = createHash('sha256').update(raw).digest('hex');
    const catalog = JSON.parse(raw);
    const receipt = JSON.parse(await fs.readFile(path.join(libraryRoot, 'mirror-status.json'), 'utf8'));
    const local = JSON.parse(await fs.readFile(path.join(libraryRoot, 'catalog.json'), 'utf8'));
    if (!receipt.complete || receipt.catalogSha256 !== expected || receipt.fileCount !== catalog.files.length || local.files?.length !== catalog.files.length) return { state: 'incomplete' };
    const identities = new Set(local.files.map(file => `${file.sha256}.${file.format}`));
    let missing = 0, bytes = 0;
    for (const row of catalog.files) {
      if (!/^[a-f0-9]{64}$/.test(row.sha256) || !/^[a-z0-9]{1,12}$/.test(row.format)) return { state: 'incomplete' };
      const name = `${row.sha256}.${row.format}`, previous = receipt.files?.[name];
      try {
        const file = path.join(libraryRoot, 'files', name), stat = await fs.lstat(file, { bigint: true });
        if (!identities.has(name) || !stat.isFile() || stat.isSymbolicLink() || String(stat.size) !== String(row.bytes) || previous?.sha256 !== row.sha256) { missing++; continue; }
        if (previous.mtimeNs !== String(stat.mtimeNs) && await checksum(file) !== row.sha256) { missing++; continue; }
        const expectedText = path.join(path.dirname(catalogFile), 'text', `${row.sha256}.json`);
        const localText = path.join(libraryRoot, 'text', `${row.sha256}.json`);
        const [shippedText, savedText] = await Promise.all([fs.readFile(expectedText), fs.readFile(localText)]);
        if (!shippedText.equals(savedText)) { missing++; continue; }
        bytes += row.bytes;
      } catch { missing++; }
    }
    return missing ? { state: 'incomplete', missingFiles: missing } : { state: 'ready', files: catalog.files.length, bytes, catalogSha256: expected };
  } catch { return { state: 'unavailable' }; }
}
