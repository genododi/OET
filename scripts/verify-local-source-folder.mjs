#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(projectRoot, 'sources/google-drive-folder.manifest.generated.json');
const libraryPath = path.join(projectRoot, 'src/data/googleDriveFolderLibrary.generated.json');
const summaryPath = path.join(projectRoot, 'src/data/googleDriveFolderCatalog.generated.json');
const practiceMapPath = path.join(projectRoot, 'src/data/sourcePracticeMap.generated.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const library = JSON.parse(await readFile(libraryPath, 'utf8'));
const summary = JSON.parse(await readFile(summaryPath, 'utf8'));
const practiceMap = JSON.parse(await readFile(practiceMapPath, 'utf8'));

assert.equal(manifest.schemaVersion, 1);
assert.ok(Array.isArray(manifest.entries) && manifest.entries.length > 0, 'Local folder manifest is empty');
assert.equal(new Set(manifest.entries.map((entry) => entry.id)).size, manifest.entries.length, 'Local source IDs must be unique');
assert.equal(new Set(manifest.entries.map((entry) => entry.relativePath)).size, manifest.entries.length, 'Local source paths must be unique');

const sourceEntries = manifest.entries.filter((entry) => entry.kind === 'source');
const metadataEntries = manifest.entries.filter((entry) => entry.kind === 'macos-metadata');
assert.equal(manifest.totalFilesystemEntries, manifest.entries.length);
assert.equal(manifest.sourceFiles, sourceEntries.length);
assert.equal(manifest.macosMetadataFiles, metadataEntries.length);
assert.equal(summary.totalFilesystemEntries, manifest.totalFilesystemEntries);
assert.equal(summary.sourceFiles, sourceEntries.length);
assert.equal(library.length, sourceEntries.length);

const allowedLearningRoutes = new Set(['listening', 'reading', 'writing', 'speaking']);
const allowedIntegrationStatuses = new Set([
  'practice-blueprint',
  'verified-real-test',
  'restricted-private',
  'blocked-unsafe',
]);

for (const entry of manifest.entries) {
  assert.ok(entry.relativePath && !path.isAbsolute(entry.relativePath) && !entry.relativePath.split(path.sep).includes('..'));
  assert.match(entry.sha256, /^[a-f0-9]{64}$/i, `${entry.id} has an invalid SHA-256`);
  assert.ok(Number.isSafeInteger(entry.bytes) && entry.bytes >= 0, `${entry.id} has an invalid byte count`);
  assert.equal(entry.publicationEligible, false, `${entry.id} cannot publish raw private bytes`);
  if (entry.kind === 'source') {
    assert.ok(entry.learningRole, `${entry.id} needs a learning role`);
    assert.ok(allowedLearningRoutes.has(entry.learningRoute), `${entry.id} needs a valid learning route`);
    assert.ok(allowedIntegrationStatuses.has(entry.integrationStatus), `${entry.id} needs an integration decision`);
    assert.equal(entry.githubBlobStatus, entry.bytes > 100 * 1024 * 1024 ? 'requires-lfs' : 'regular-git-size');
  }
}
assert.ok(library.every((entry) => !entry.filename.startsWith('._')), 'AppleDouble metadata leaked into the study library');
assert.equal(new Set(library.map((entry) => entry.id)).size, library.length, 'Private library IDs must be unique');
for (const subtest of ['listening', 'reading', 'writing', 'speaking']) {
  assert.ok(summary.bySubtest[subtest] > 0, `No ${subtest} files were classified`);
  assert.ok(summary.byLearningRoute[subtest] > 0, `No ${subtest} learning routes were assigned`);
  assert.ok(summary.byLearningRoute[subtest] <= 1_000, `${subtest} exceeds the practice rotation capacity`);
}
assert.equal(summary.practiceBlueprintFiles, sourceEntries.filter((entry) => ['practice-blueprint', 'verified-real-test'].includes(entry.integrationStatus)).length);
assert.equal(summary.restrictedPrivateFiles, sourceEntries.filter((entry) => entry.integrationStatus === 'restricted-private').length);
assert.equal(summary.verifiedRealTestFiles, sourceEntries.filter((entry) => entry.integrationStatus === 'verified-real-test').length);
assert.equal(summary.overGithubBlobLimitFiles, sourceEntries.filter((entry) => entry.githubBlobStatus === 'requires-lfs').length);
assert.ok(summary.verifiedRealTestFiles >= 6, 'Verified real listening source parts are missing');
const expectedPracticeIds = sourceEntries
  .filter((entry) => ['practice-blueprint', 'verified-real-test'].includes(entry.integrationStatus))
  .map((entry) => entry.id)
  .sort();
const mappedPracticeIds = Object.values(practiceMap).flat().map((entry) => entry.id).sort();
assert.deepEqual(mappedPracticeIds, expectedPracticeIds, 'Compact practice map must include every usable source exactly once');

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

if (existsSync(manifest.sourceRoot)) {
  const liveFiles = await walk(manifest.sourceRoot);
  const livePaths = new Set(liveFiles.map((filename) => path.relative(manifest.sourceRoot, filename)));
  assert.equal(livePaths.size, manifest.entries.length, 'Mounted local source folder has unindexed files');
  for (const entry of manifest.entries) {
    assert.ok(livePaths.has(entry.relativePath), `Missing live source path: ${entry.relativePath}`);
    const metadata = await stat(path.join(manifest.sourceRoot, entry.relativePath));
    assert.equal(metadata.size, entry.bytes, `Source size changed: ${entry.relativePath}`);
    if (entry.kind === 'source') {
      assert.equal(metadata.mtime.toISOString(), entry.modifiedAt, `Source modification time changed: ${entry.relativePath}`);
    }
  }
}

console.log(`Verified complete local folder coverage: ${sourceEntries.length} source files and ${metadataEntries.length} macOS metadata files.`);
