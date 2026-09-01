#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registerPath = path.join(root, 'sources', 'source-register.json');
const register = JSON.parse(await readFile(registerPath, 'utf8'));
const allowedContainers = new Set(['google-drive', 'google-doc', 'facebook', 'telegram', 'mega', 'youtube']);
const allowedRights = new Set(['official-public', 'permission-confirmed', 'link-only', 'rights-unclear', 'quarantined']);
const unsafeExtensions = new Set(['.aes', '.app', '.bat', '.cmd', '.com', '.dmg', '.enc', '.exe', '.gpg', '.msi', '.pgp', '.pkg', '.ps1', '.scr']);
const unsafeMimeTypes = new Set([
  'application/vnd.microsoft.portable-executable',
  'application/x-dosexec',
  'application/x-executable',
  'application/x-mach-binary',
  'application/x-msdownload',
  'application/x-sharedlib',
]);
const isSafeRelative = (value) => value && !path.isAbsolute(value) && !value.split(/[\\/]/).includes('..');

assert.equal(register.schemaVersion, 1, 'Source register schema must be version 1');
assert.ok(register.archiveRoot.startsWith('/Volumes/GENODODI/'), 'Archive root must remain on GENODODI');
assert.ok(Array.isArray(register.localFolders) && register.localFolders.length > 0, 'Local source folder is not registered');
const googleDriveFolder = register.localFolders.find((folder) => folder.id === 'genododi-google-drive-folder');
assert.equal(googleDriveFolder?.path, '/Volumes/GENODODI/oet-study-sources/Google drive Folder', 'Exact Google Drive folder is not registered');
assert.ok(isSafeRelative(googleDriveFolder?.manifest), 'Local folder manifest path is unsafe');
assert.ok(isSafeRelative(googleDriveFolder?.library), 'Local folder library path is unsafe');
assert.equal(googleDriveFolder?.redistributionStatus, 'rights-unclear', 'Local folder needs a redistribution decision');
assert.equal(googleDriveFolder?.publicationEligible, false, 'Local third-party bytes must remain private');
assert.ok(Array.isArray(register.sources) && register.sources.length >= 11, 'Source register is incomplete');
assert.equal(new Set(register.sources.map((source) => source.id)).size, register.sources.length, 'Source IDs must be unique');
assert.equal(new Set(register.sources.map((source) => source.url)).size, register.sources.length, 'Duplicate source URLs must be removed');

for (const source of register.sources) {
  assert.ok(allowedContainers.has(source.container), `Unknown source container: ${source.container}`);
  assert.ok(source.url.startsWith('https://'), `${source.id} needs a secure URL`);
  assert.ok(isSafeRelative(source.rawDirectory), `${source.id} has an unsafe archive path`);
  assert.ok(allowedRights.has(source.redistributionStatus), `${source.id} needs a redistribution decision`);
  assert.equal(source.publicationEligible, false, `${source.id} must not publish raw third-party content`);
}

assert.equal(register.sources.filter((source) => source.container === 'google-drive').length, 6, 'Expected six unique supplied Drive folders');
for (const required of ['facebook', 'telegram', 'mega', 'google-doc', 'youtube']) {
  assert.ok(register.sources.some((source) => source.container === required), `Missing ${required} source`);
}

const externalManifestPath = process.env.OET_SOURCE_MANIFEST
  ?? path.join(register.archiveRoot, 'manifests', 'source-manifest.json');
const requireExternal = process.argv.includes('--require-external');

if (!existsSync(externalManifestPath)) {
  assert.ok(!requireExternal, `External manifest is required but missing: ${externalManifestPath}`);
  console.log(`Verified ${register.sources.length} registered source containers; external archive is not mounted in this environment.`);
  process.exit(0);
}

const manifest = JSON.parse(await readFile(externalManifestPath, 'utf8'));
assert.equal(manifest.schemaVersion, 1, 'External manifest schema must be version 1');
assert.ok(manifest.archiveRoot.startsWith('/Volumes/GENODODI/'), 'External manifest must point to GENODODI');
assert.ok(!Number.isNaN(Date.parse(manifest.generatedAt)), 'External manifest needs a valid generation date');
assert.ok(Array.isArray(manifest.assets) && manifest.assets.length > 0, 'External manifest has no assets');
assert.equal(new Set(manifest.assets.map((asset) => asset.id)).size, manifest.assets.length, 'External asset IDs must be unique');

const assetIds = new Set(manifest.assets.map((asset) => asset.id));
for (const asset of manifest.assets) {
  assert.ok(asset.sourceUrl?.startsWith('https://'), `${asset.id} needs a source URL`);
  assert.ok(isSafeRelative(asset.originalPath), `${asset.id} has an unsafe original path`);
  assert.ok(typeof asset.filename === 'string' && asset.filename.length > 0, `${asset.id} needs a filename`);
  assert.ok(typeof asset.mimeType === 'string' && asset.mimeType.includes('/'), `${asset.id} needs a MIME type`);
  assert.ok(Number.isSafeInteger(asset.bytes) && asset.bytes >= 0, `${asset.id} has an invalid size`);
  assert.match(asset.sha256, /^[a-f0-9]{64}$/i, `${asset.id} has an invalid SHA-256`);
  assert.ok(!Number.isNaN(Date.parse(asset.acquiredAt)), `${asset.id} needs an acquisition date`);
  assert.ok(allowedRights.has(asset.redistributionStatus), `${asset.id} needs a redistribution decision`);
  if (asset.duplicateOf) assert.ok(assetIds.has(asset.duplicateOf), `${asset.id} points to an unknown duplicate`);
  if (['rights-unclear', 'quarantined'].includes(asset.redistributionStatus)) {
    assert.equal(asset.publicationEligible, false, `${asset.id} cannot publish rights-unclear/quarantined bytes`);
  }
  if (unsafeExtensions.has(path.extname(asset.filename).toLowerCase()) || unsafeMimeTypes.has(asset.mimeType)) {
    assert.equal(asset.redistributionStatus, 'quarantined', `${asset.id} unsafe bytes must be quarantined`);
  }
  if (asset.redistributionStatus === 'quarantined') {
    assert.ok(asset.normalizedPath?.startsWith('quarantine/source-files/'), `${asset.id} needs a quarantine path`);
  }
}

for (const required of ['google-drive', 'facebook', 'telegram', 'mega', 'google-doc', 'youtube']) {
  assert.ok(manifest.assets.some((asset) => asset.sourceContainer === required), `External manifest has no ${required} assets`);
}
assert.ok(manifest.assets.filter((asset) => asset.sourceContainer === 'facebook' && asset.sourcePathRecord).length >= 67, 'Facebook source-path inventory is incomplete');
assert.ok(manifest.assets.some((asset) => asset.sourceContainer === 'mega' && asset.extractionStatus === 'extracted'), 'MEGA archive is not recorded as safely extracted');

const driveManifestRoot = path.join(register.archiveRoot, 'manifests', 'google-drive');
for (const filename of await readdir(driveManifestRoot).catch(() => [])) {
  if (!filename.endsWith('.json') || filename.startsWith('._')) continue;
  const driveManifest = JSON.parse(await readFile(path.join(driveManifestRoot, filename), 'utf8'));
  const records = driveManifest.records ?? [];
  const fileIds = records.map((record) => record.fileId).filter(Boolean);
  assert.equal(new Set(fileIds).size, fileIds.length, `${filename} contains duplicate file IDs after re-import`);
}

console.log(`Verified ${register.sources.length} registered sources and ${manifest.assets.length} external manifest records.`);
