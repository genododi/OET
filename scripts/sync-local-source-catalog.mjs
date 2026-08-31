import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const archiveRoot = process.env.OET_SOURCE_ARCHIVE_ROOT ?? '/Volumes/GENODODI/oet-study-sources';
const inputPath = resolve(archiveRoot, 'manifests/source-manifest.json');
const ledgerPath = resolve(projectRoot, 'sources/source-manifest.generated.json');
const summaryPath = resolve(projectRoot, 'src/data/sourceCatalog.generated.json');
const subtests = ['listening', 'reading', 'writing', 'speaking', 'unknown'];

const manifest = JSON.parse(await readFile(inputPath, 'utf8'));
if (!Array.isArray(manifest.assets)) throw new Error('External source manifest has no assets array.');

const assets = manifest.assets.map((asset) => ({
  id: asset.id,
  sourceUrl: asset.sourceUrl ?? '',
  sourceContainer: asset.sourceContainer,
  originalPath: asset.originalPath,
  filename: asset.filename,
  mimeType: asset.mimeType,
  bytes: asset.bytes,
  sha256: asset.sha256,
  acquiredAt: asset.acquiredAt,
  extractionStatus: asset.extractionStatus,
  profession: asset.profession,
  subtest: asset.subtest,
  redistributionStatus: asset.redistributionStatus,
  publicationEligible: Boolean(asset.publicationEligible),
  ...(asset.duplicateOf ? { duplicateOf: asset.duplicateOf } : {}),
}));

const bySubtest = Object.fromEntries(
  subtests.map((subtest) => [subtest, assets.filter((asset) => asset.subtest === subtest).length]),
);
const byContainer = Object.fromEntries(
  [...new Set(assets.map((asset) => asset.sourceContainer))]
    .sort()
    .map((container) => [container, assets.filter((asset) => asset.sourceContainer === container).length]),
);
const uniqueHashes = new Set(assets.map((asset) => asset.sha256).filter(Boolean));
const uniqueBytes = [...uniqueHashes].reduce((total, hash) => {
  const match = assets.find((asset) => asset.sha256 === hash);
  return total + (match?.bytes ?? 0);
}, 0);

const ledger = {
  schemaVersion: 1,
  generatedAt: manifest.generatedAt,
  archiveLocation: 'external-private-archive',
  totalSourceRecords: assets.length,
  assets,
};
const summary = {
  schemaVersion: 1,
  generatedAt: manifest.generatedAt,
  totalSourceRecords: assets.length,
  uniqueFiles: uniqueHashes.size,
  uniqueBytes,
  publicationEligible: assets.filter((asset) => asset.publicationEligible).length,
  bySubtest,
  byContainer,
};

await mkdir(dirname(ledgerPath), { recursive: true });
await mkdir(dirname(summaryPath), { recursive: true });
await writeFile(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);

console.log(`Synced ${assets.length.toLocaleString()} source records (${uniqueHashes.size.toLocaleString()} unique files).`);
