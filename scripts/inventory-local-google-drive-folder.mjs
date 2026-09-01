import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = process.env.OET_LOCAL_SOURCE_FOLDER
  ?? '/Volumes/GENODODI/oet-study-sources/Google drive Folder';
const archiveManifestPath = process.env.OET_SOURCE_MANIFEST
  ?? '/Volumes/GENODODI/oet-study-sources/manifests/source-manifest.json';
const detailedPath = path.join(projectRoot, 'sources/google-drive-folder.manifest.generated.json');
const libraryPath = path.join(projectRoot, 'src/data/googleDriveFolderLibrary.generated.json');
const summaryPath = path.join(projectRoot, 'src/data/googleDriveFolderCatalog.generated.json');

if (!existsSync(sourceRoot)) throw new Error(`Local OET source folder is not mounted: ${sourceRoot}`);

const mimeByExtension = new Map(Object.entries({
  '.pdf': 'application/pdf', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg',
  '.mpeg': 'audio/mpeg', '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.zip': 'application/zip', '.html': 'text/html', '.txt': 'text/plain', '.db': 'application/octet-stream',
  '.enc': 'application/octet-stream', '.part': 'application/octet-stream',
}));

const unsafeExtensions = new Set(['.db', '.enc', '.part']);
const audioExtensions = new Set(['.mp3', '.m4a', '.ogg', '.mpeg']);
const imageExtensions = new Set(['.jpg', '.jpeg', '.png']);
const documentExtensions = new Set(['.doc', '.docx', '.pptx', '.txt', '.html']);

async function walk(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

function isMissingFile(error) {
  return error?.code === 'ENOENT';
}

async function sha256(filename) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return hash.digest('hex');
}

function subtestFor(relativePath) {
  const normalized = relativePath.toLowerCase();
  return ['listening', 'reading', 'writing', 'speaking'].find((value) => normalized.includes(value)) ?? 'general';
}

function formatFor(extension) {
  if (extension === '.pdf') return 'pdf';
  if (audioExtensions.has(extension)) return 'audio';
  if (extension === '.mp4') return 'video';
  if (imageExtensions.has(extension)) return 'image';
  if (documentExtensions.has(extension)) return 'document';
  if (extension === '.zip') return 'archive';
  return 'other';
}

const previous = existsSync(detailedPath)
  ? JSON.parse(await readFile(detailedPath, 'utf8'))
  : { entries: [] };
const previousByPath = new Map((previous.entries ?? []).map((entry) => [entry.relativePath, entry]));
const archiveManifest = existsSync(archiveManifestPath)
  ? JSON.parse(await readFile(archiveManifestPath, 'utf8'))
  : { assets: [] };
const archivedHashes = new Set((archiveManifest.assets ?? []).map((asset) => asset.sha256).filter(Boolean));

const filenames = (await walk(sourceRoot)).sort((a, b) => a.localeCompare(b));
const entries = [];
let hashed = 0;
for (const filename of filenames) {
  const relativePath = path.relative(sourceRoot, filename);
  let metadata;
  let digest;
  const previousEntry = previousByPath.get(relativePath);
  try {
    metadata = await stat(filename);
    const unchanged = previousEntry
      && previousEntry.bytes === metadata.size
      && previousEntry.modifiedAt === metadata.mtime.toISOString();
    digest = unchanged ? previousEntry.sha256 : await sha256(filename);
    if (!unchanged) hashed += 1;
  } catch (error) {
    // External drives and sync clients can remove temporary files between
    // directory enumeration and metadata/hash reads. The next watch refresh
    // will pick up any file that still exists.
    if (isMissingFile(error)) continue;
    throw error;
  }
  const extension = path.extname(filename).toLowerCase();
  const isMetadata = path.basename(filename).startsWith('._') || path.basename(filename) === '.DS_Store';
  entries.push({
    id: `google-drive-folder-${createHash('sha256').update(relativePath).digest('hex').slice(0, 16)}`,
    relativePath,
    filename: path.basename(filename),
    kind: isMetadata ? 'macos-metadata' : 'source',
    mimeType: isMetadata ? 'application/x-appledouble' : (mimeByExtension.get(extension) ?? 'application/octet-stream'),
    bytes: metadata.size,
    modifiedAt: metadata.mtime.toISOString(),
    sha256: digest,
    subtest: isMetadata ? 'general' : subtestFor(relativePath),
    format: isMetadata ? 'metadata' : formatFor(extension),
    archiveMatched: archivedHashes.has(digest),
    ingestionStatus: isMetadata
      ? 'metadata-recorded'
      : unsafeExtensions.has(extension)
        ? 'unsafe-recorded-not-published'
        : 'private-indexed',
    redistributionStatus: isMetadata ? 'not-applicable' : 'rights-unclear',
    publicationEligible: false,
  });
}

const sourceEntries = entries.filter((entry) => entry.kind === 'source');
const countBy = (key, values) => Object.fromEntries(
  values.map((value) => [value, sourceEntries.filter((entry) => entry[key] === value).length]),
);
const summaryBase = {
  schemaVersion: 1,
  sourceFolder: 'GENODODI/oet-study-sources/Google drive Folder',
  totalFilesystemEntries: entries.length,
  sourceFiles: sourceEntries.length,
  macosMetadataFiles: entries.length - sourceEntries.length,
  totalSourceBytes: sourceEntries.reduce((total, entry) => total + entry.bytes, 0),
  archiveMatchedFiles: sourceEntries.filter((entry) => entry.archiveMatched).length,
  unsafeRecordedFiles: sourceEntries.filter((entry) => entry.ingestionStatus === 'unsafe-recorded-not-published').length,
  bySubtest: countBy('subtest', ['listening', 'reading', 'writing', 'speaking', 'general']),
  byFormat: countBy('format', ['pdf', 'audio', 'video', 'image', 'document', 'archive', 'other']),
};
const library = sourceEntries.map(({ id, filename, relativePath, mimeType, bytes, sha256, subtest, format, archiveMatched, ingestionStatus }) => ({
  id, filename, relativePath, mimeType, bytes, sha256, subtest, format, archiveMatched, ingestionStatus,
}));

const previousComparable = JSON.stringify((previous.entries ?? []));
const currentComparable = JSON.stringify(entries);
if (previousComparable === currentComparable && existsSync(libraryPath) && existsSync(summaryPath)) {
  console.log(`Local Google Drive folder unchanged: ${sourceEntries.length.toLocaleString()} source files; reused every cached checksum.`);
  process.exit(0);
}

const generatedAt = new Date().toISOString();
const detailed = { schemaVersion: 1, generatedAt, sourceRoot, ...summaryBase, entries };
const summary = { ...summaryBase, generatedAt };
await mkdir(path.dirname(detailedPath), { recursive: true });
await mkdir(path.dirname(libraryPath), { recursive: true });
await writeFile(detailedPath, `${JSON.stringify(detailed, null, 2)}\n`);
await writeFile(libraryPath, `${JSON.stringify(library, null, 2)}\n`);
await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(`Indexed every ${entries.length.toLocaleString()} filesystem entry: ${sourceEntries.length.toLocaleString()} source files and ${(entries.length - sourceEntries.length).toLocaleString()} macOS metadata files (${hashed.toLocaleString()} checksums calculated).`);
