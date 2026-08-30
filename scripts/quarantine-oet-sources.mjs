#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const archiveRoot = path.resolve(
  process.env.OET_SOURCE_ARCHIVE_ROOT ?? '/Volumes/GENODODI/oet-study-sources',
);
const rawRoot = path.join(archiveRoot, 'raw');
const quarantineRoot = path.join(archiveRoot, 'quarantine', 'source-files');
const manifestPath = path.join(archiveRoot, 'manifests', 'quarantined-source-assets.json');
const apply = process.argv.includes('--apply');

if (!archiveRoot.startsWith('/Volumes/GENODODI/')) {
  throw new Error('Archive root must remain under /Volumes/GENODODI');
}

const encryptedExtensions = new Set(['.enc', '.gpg', '.pgp', '.aes']);
const executableExtensions = new Set([
  '.app', '.bat', '.cmd', '.com', '.dmg', '.exe', '.msi', '.pkg', '.ps1', '.scr',
]);
const executableMimeTypes = new Set([
  'application/vnd.microsoft.portable-executable',
  'application/x-dosexec',
  'application/x-executable',
  'application/x-mach-binary',
  'application/x-msdownload',
  'application/x-sharedlib',
]);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(filename));
    else if (entry.isFile() && !entry.name.startsWith('._') && !entry.name.endsWith('.part')) {
      files.push(filename);
    }
  }
  return files;
}

async function sha256(filename) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return hash.digest('hex');
}

function quarantineReason(filename) {
  const extension = path.extname(filename).toLowerCase();
  if (encryptedExtensions.has(extension)) return 'encrypted-file';
  if (executableExtensions.has(extension)) return 'executable-file';
  const result = spawnSync('file', ['-b', '--mime-type', filename], { encoding: 'utf8' });
  const mimeType = result.status === 0 ? result.stdout.trim() : 'application/octet-stream';
  if (executableMimeTypes.has(mimeType)) return 'executable-content';
  return null;
}

const previous = JSON.parse(await readFile(manifestPath, 'utf8').catch(() => '{"records":[]}'));
const previousByOriginalPath = new Map(
  (previous.records ?? []).map((record) => [record.originalPath, record]),
);
const records = [...previousByOriginalPath.values()];
const candidates = [];

for (const filename of await walk(rawRoot)) {
  const reason = quarantineReason(filename);
  if (!reason) continue;
  const originalPath = path.relative(rawRoot, filename);
  const metadata = await stat(filename);
  const digest = await sha256(filename);
  let quarantinedPath = path.join(quarantineRoot, originalPath);
  if (previousByOriginalPath.has(originalPath)) {
    quarantinedPath = previousByOriginalPath.get(originalPath).quarantinedPath;
  }
  const record = {
    schemaVersion: 1,
    originalPath,
    quarantinedPath,
    reason,
    bytes: metadata.size,
    sha256: digest,
    quarantinedAt: new Date().toISOString(),
  };
  candidates.push(record);
  if (apply) {
    await mkdir(path.dirname(quarantinedPath), { recursive: true });
    const targetMetadata = await stat(quarantinedPath).catch(() => null);
    if (targetMetadata?.isFile()) {
      const targetDigest = await sha256(quarantinedPath);
      if (targetDigest !== digest) {
        quarantinedPath = `${quarantinedPath}.reimport-${digest.slice(0, 12)}`;
        record.quarantinedPath = quarantinedPath;
        await rename(filename, quarantinedPath);
      } else {
        await unlink(filename);
      }
    } else {
      await rename(filename, quarantinedPath);
    }
    const existingIndex = records.findIndex((item) => item.originalPath === originalPath);
    if (existingIndex >= 0) records[existingIndex] = record;
    else records.push(record);
  }
}

if (apply) {
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(
    manifestPath,
    `${JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), records }, null, 2)}\n`,
  );
}

console.log(`${apply ? 'Quarantined' : 'Would quarantine'} ${candidates.length} unsafe source file(s).`);
for (const candidate of candidates) {
  console.log(`- ${candidate.reason}: ${candidate.originalPath}`);
}
