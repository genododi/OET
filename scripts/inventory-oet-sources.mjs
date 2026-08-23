#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const archiveRoot = process.env.OET_SOURCE_ARCHIVE_ROOT ?? '/Volumes/GENODODI/oet-study-sources';
const rawRoot = path.join(archiveRoot, 'raw');
const generatedAt = new Date().toISOString();

const sourceUrls = new Map([
  ['1vJmNmLSAdB19npX2P8q5bspV5hKm_FMM', 'https://drive.google.com/drive/folders/1vJmNmLSAdB19npX2P8q5bspV5hKm_FMM'],
  ['1Ucb79sZUycOJqmM-bZTku1QCzlAPhBot', 'https://drive.google.com/drive/folders/1Ucb79sZUycOJqmM-bZTku1QCzlAPhBot'],
  ['1EZvkn35NuRVaSizepiqJp6NCGZKv_V9k', 'https://drive.google.com/drive/folders/1EZvkn35NuRVaSizepiqJp6NCGZKv_V9k'],
  ['10cvKcazYuaNe01cSahOSHbflbOlAEN0t', 'https://drive.google.com/drive/folders/10cvKcazYuaNe01cSahOSHbflbOlAEN0t'],
  ['1NVdBFWSqnswl58pr96BVwTkH1ceT6P-j', 'https://drive.google.com/drive/folders/1NVdBFWSqnswl58pr96BVwTkH1ceT6P-j'],
  ['1v2Bza1LzG_Bp5NrMYpZ54CLDp6C-xhu8', 'https://drive.google.com/drive/folders/1v2Bza1LzG_Bp5NrMYpZ54CLDp6C-xhu8'],
]);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else if (entry.isFile() && !entry.name.endsWith('.part') && !entry.name.startsWith('._')) files.push(fullPath);
  }
  return files;
}

async function sha256(filename) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return hash.digest('hex');
}

function classify(relativePath) {
  const normalized = relativePath.toLowerCase();
  const sourceContainer = normalized.startsWith('google-drive/')
    ? 'google-drive'
    : normalized.startsWith('facebook/')
      ? 'facebook'
      : normalized.startsWith('telegram/')
        ? 'telegram'
        : normalized.startsWith('mega/')
          ? 'mega'
          : normalized.startsWith('references/')
            ? (normalized.includes('youtube') || normalized.includes('masterclass') ? 'youtube' : 'google-doc')
            : 'original';
  const subtest = ['listening', 'reading', 'writing', 'speaking'].find((name) => normalized.includes(name)) ?? 'unknown';
  const profession = /medicine|doctor|physician|gp\b/.test(normalized) ? 'Medicine' : 'Unknown';
  const topParts = relativePath.split(path.sep);
  const driveId = sourceContainer === 'google-drive' ? topParts[1] : undefined;
  const sourceUrl = driveId
      ? sourceUrls.get(driveId) ?? ''
      : sourceContainer === 'facebook'
        ? 'https://www.facebook.com/groups/oet4all/files/files'
        : sourceContainer === 'telegram'
          ? 'https://t.me/OETimportantmaterials'
          : sourceContainer === 'mega'
            ? 'https://mega.nz/file/4A5SxbwK#LNv6BQWNRzwbPEhiGfihAMj3bq2ebWeo2EuIbczlJUU'
            : sourceContainer === 'youtube'
              ? 'https://www.youtube.com/watch?v=Wo1lSFRrg-I'
              : 'https://docs.google.com/document/d/1tQAYd5LdFSMK_OVoNQkbk3Mr2KvnFbyeWRq0euHKi7I/edit';
  return { sourceContainer, subtest, profession, sourceUrl };
}

function normalizedFilename(value) {
  return value.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
}

const files = await walk(rawRoot);
const hashes = new Map();
const assets = [];
for (const filename of files.sort()) {
  const relativePath = path.relative(rawRoot, filename);
  const metadata = await stat(filename);
  const digest = await sha256(filename);
  const typeResult = spawnSync('file', ['-b', '--mime-type', filename], { encoding: 'utf8' });
  const classification = classify(relativePath);
  const firstId = hashes.get(digest);
  const id = `asset-${assets.length + 1}`;
  if (!firstId) hashes.set(digest, id);
  const isReference = classification.sourceContainer === 'youtube' || classification.sourceContainer === 'google-doc';
  assets.push({
    id,
    sourceUrl: classification.sourceUrl,
    sourceContainer: classification.sourceContainer,
    originalPath: relativePath,
    filename: path.basename(filename),
    mimeType: typeResult.status === 0 ? typeResult.stdout.trim() : 'application/octet-stream',
    bytes: metadata.size,
    sha256: digest,
    acquiredAt: metadata.birthtime.toISOString(),
    extractionStatus: /LISTENING Audio\.rar$/i.test(filename) && existsSync(path.join(archiveRoot, 'normalized/mega-listening-audio'))
      ? 'extracted'
      : /\.(rar|zip|7z)$/i.test(filename)
        ? 'pending'
        : 'not-required',
    ...(firstId ? { duplicateOf: firstId } : {}),
    profession: classification.profession,
    subtest: classification.subtest,
    redistributionStatus: isReference ? 'link-only' : 'rights-unclear',
    publicationEligible: false,
  });
}

const facebookIndexPath = path.join(archiveRoot, 'manifests', 'facebook-file-index.json');
if (existsSync(facebookIndexPath)) {
  const facebookIndex = JSON.parse(await readFile(facebookIndexPath, 'utf8'));
  const facebookAssetsByName = new Map(
    assets
      .filter((asset) => asset.sourceContainer === 'facebook')
      .map((asset) => [normalizedFilename(asset.filename), asset]),
  );
  const missingFacebook = [];
  for (const record of facebookIndex.records ?? []) {
    const base = facebookAssetsByName.get(normalizedFilename(record.filename));
    if (!base) {
      missingFacebook.push(record.filename);
      continue;
    }
    assets.push({
      ...base,
      id: `asset-${assets.length + 1}`,
      sourceUrl: record.sourceUrl,
      originalPath: record.originalPath,
      duplicateOf: base.duplicateOf ?? base.id,
      sourcePathRecord: true,
    });
  }
  if (missingFacebook.length > 0) {
    throw new Error(`Facebook archive is missing ${new Set(missingFacebook).size} unique indexed file(s): ${[...new Set(missingFacebook)].join(', ')}`);
  }
}

const manifest = { schemaVersion: 1, generatedAt, archiveRoot, assets };
await writeFile(path.join(archiveRoot, 'manifests', 'source-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
const uniqueAssets = assets.filter((asset) => !asset.duplicateOf);
const totalBytes = uniqueAssets.reduce((sum, asset) => sum + asset.bytes, 0);
const counts = Object.fromEntries([...new Set(assets.map((asset) => asset.sourceContainer))].map((container) => [container, assets.filter((asset) => asset.sourceContainer === container).length]));
const report = [
  '# OET source archive inventory',
  '',
  `Generated: ${generatedAt}`,
  `Files recorded: ${assets.length}`,
  `Unique files: ${uniqueAssets.length}`,
  `Duplicate path records: ${assets.length - uniqueAssets.length}`,
  `Unique bytes: ${totalBytes.toLocaleString()}`,
  '',
  '## Files by source',
  '',
  ...Object.entries(counts).map(([container, count]) => `- ${container}: ${count}`),
  '',
  'All downloaded third-party binaries default to rights-unclear and are not eligible for public application publication.',
  '',
].join('\n');
await writeFile(path.join(archiveRoot, 'reports', 'inventory-summary.md'), report);
console.log(report);
