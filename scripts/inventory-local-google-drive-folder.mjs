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
const practiceMapPath = path.join(projectRoot, 'src/data/sourcePracticeMap.generated.json');
const realListeningManifestPath = path.join(projectRoot, 'src/data/realListeningAudio.generated.json');

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
const learningRoutes = ['listening', 'reading', 'writing', 'speaking'];
const githubBlobLimitBytes = 100 * 1024 * 1024;

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

function learningRoleFor(relativePath, extension, format) {
  const normalized = relativePath.toLowerCase();
  const filename = path.basename(normalized);
  if (unsafeExtensions.has(extension)) return 'unsafe-file';
  if (audioExtensions.has(extension)) return 'audio-track';
  if (format === 'video') return 'video-lesson';
  if (/answer|key|model|corrected|solution/.test(filename)) return 'answer-or-model';
  if (/script|transcript/.test(filename)) return 'script-or-transcript';
  if (/question|paper|test|mock|practice/.test(filename)) return 'test-material';
  if (/speaking|role[ -]?play|cue|card/.test(normalized)) return 'speaking-role-play';
  if (/writing|case[ -]?note|referral|discharge|transfer|letter/.test(normalized)) return 'writing-material';
  if (/reading|text[ -]?booklet|article|abstract/.test(normalized)) return 'reading-material';
  if (/guide|tips?|criteria|strategy|overview|grammar|vocab/.test(normalized)) return 'study-guide';
  if (format === 'image') return 'visual-reference';
  if (format === 'archive') return 'source-archive';
  return 'general-reference';
}

function learningRouteFor(relativePath, detectedSubtest) {
  if (detectedSubtest !== 'general') return detectedSubtest;
  const firstByte = createHash('sha256').update(relativePath).digest()[0];
  return learningRoutes[firstByte % learningRoutes.length];
}

function isRestrictedExamMaterial(relativePath) {
  return /watermark|actual(?:[ -]?test)?|candidate[ -]?paper|question[ -]?paper|answer[ -]?keys?/i.test(relativePath);
}

const previous = existsSync(detailedPath)
  ? JSON.parse(await readFile(detailedPath, 'utf8'))
  : { entries: [] };
const previousByPath = new Map((previous.entries ?? []).map((entry) => [entry.relativePath, entry]));
const archiveManifest = existsSync(archiveManifestPath)
  ? JSON.parse(await readFile(archiveManifestPath, 'utf8'))
  : { assets: [] };
const archivedHashes = new Set((archiveManifest.assets ?? []).map((asset) => asset.sha256).filter(Boolean));
const realListeningManifest = existsSync(realListeningManifestPath)
  ? JSON.parse(await readFile(realListeningManifestPath, 'utf8'))
  : { tests: [] };
const verifiedRealTestHashes = new Set((realListeningManifest.tests ?? []).flatMap((test) => [
  test.sourceScriptSha256,
  test.answerKeySha256,
  ...(test.parts ?? []).map((part) => part.sha256),
]).filter(Boolean));

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
  const subtest = isMetadata ? 'general' : subtestFor(relativePath);
  const format = isMetadata ? 'metadata' : formatFor(extension);
  const learningRole = isMetadata ? 'macos-metadata' : learningRoleFor(relativePath, extension, format);
  const learningRoute = isMetadata ? 'general' : learningRouteFor(relativePath, subtest);
  const integrationStatus = isMetadata
    ? 'metadata-recorded'
    : unsafeExtensions.has(extension)
      ? 'blocked-unsafe'
      : verifiedRealTestHashes.has(digest)
        ? 'verified-real-test'
        : isRestrictedExamMaterial(relativePath)
          ? 'restricted-private'
          : 'practice-blueprint';
  entries.push({
    id: `google-drive-folder-${createHash('sha256').update(relativePath).digest('hex').slice(0, 16)}`,
    relativePath,
    filename: path.basename(filename),
    kind: isMetadata ? 'macos-metadata' : 'source',
    mimeType: isMetadata ? 'application/x-appledouble' : (mimeByExtension.get(extension) ?? 'application/octet-stream'),
    bytes: metadata.size,
    modifiedAt: metadata.mtime.toISOString(),
    sha256: digest,
    subtest,
    format,
    learningRole,
    learningRoute,
    integrationStatus,
    githubBlobStatus: metadata.size > githubBlobLimitBytes ? 'requires-lfs' : 'regular-git-size',
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
const countDynamic = (key) => Object.fromEntries(
  [...new Set(sourceEntries.map((entry) => entry[key]))]
    .sort()
    .map((value) => [value, sourceEntries.filter((entry) => entry[key] === value).length]),
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
  practiceBlueprintFiles: sourceEntries.filter((entry) => ['practice-blueprint', 'verified-real-test'].includes(entry.integrationStatus)).length,
  restrictedPrivateFiles: sourceEntries.filter((entry) => entry.integrationStatus === 'restricted-private').length,
  verifiedRealTestFiles: sourceEntries.filter((entry) => entry.integrationStatus === 'verified-real-test').length,
  overGithubBlobLimitFiles: sourceEntries.filter((entry) => entry.githubBlobStatus === 'requires-lfs').length,
  bySubtest: countBy('subtest', ['listening', 'reading', 'writing', 'speaking', 'general']),
  byFormat: countBy('format', ['pdf', 'audio', 'video', 'image', 'document', 'archive', 'other']),
  byLearningRoute: countBy('learningRoute', learningRoutes),
  byLearningRole: countDynamic('learningRole'),
  byIntegrationStatus: countDynamic('integrationStatus'),
};
const library = sourceEntries.map(({ id, filename, relativePath, mimeType, bytes, sha256, subtest, format, learningRole, learningRoute, integrationStatus, githubBlobStatus, archiveMatched, ingestionStatus }) => ({
  id, filename, relativePath, mimeType, bytes, sha256, subtest, format, learningRole, learningRoute, integrationStatus, githubBlobStatus, archiveMatched, ingestionStatus,
}));
const practiceMap = Object.fromEntries(learningRoutes.map((route) => [
  route,
  sourceEntries
    .filter((entry) => entry.learningRoute === route && ['practice-blueprint', 'verified-real-test'].includes(entry.integrationStatus))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(({ id, format, learningRole, sha256 }) => ({ id, format, learningRole, sourceCode: sha256.slice(0, 10) })),
]));

const previousComparable = JSON.stringify((previous.entries ?? []));
const currentComparable = JSON.stringify(entries);
if (previousComparable === currentComparable && existsSync(libraryPath) && existsSync(summaryPath) && existsSync(practiceMapPath)) {
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
await writeFile(practiceMapPath, `${JSON.stringify(practiceMap, null, 2)}\n`);
console.log(`Indexed every ${entries.length.toLocaleString()} filesystem entry: ${sourceEntries.length.toLocaleString()} source files and ${(entries.length - sourceEntries.length).toLocaleString()} macOS metadata files (${hashed.toLocaleString()} checksums calculated).`);
