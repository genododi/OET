import assert from 'node:assert/strict';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { guideSections } from '../src/data/guide';
import { studyResources } from '../src/data/studyResources';
import { examExperiences } from '../src/data/experiences';
import { experiencePdfs } from '../src/data/experiencePdfs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(root, 'public');
const forbiddenExtensions = new Set(['.rar', '.7z', '.exe', '.dmg', '.pkg']);
const maxPublicBytes = 30 * 1024 * 1024;

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

const publicFiles = await walk(publicRoot);
for (const filename of publicFiles) {
  assert.ok(!forbiddenExtensions.has(path.extname(filename).toLowerCase()), `Forbidden archive/executable in public: ${filename}`);
  assert.ok((await stat(filename)).size <= maxPublicBytes, `Oversized public asset: ${filename}`);
  assert.ok(!filename.includes(`${path.sep}pdfs${path.sep}experiences${path.sep}`), `Unverified experience PDF remains public: ${filename}`);
}

assert.ok(!publicFiles.some((filename) => /unverified|quarantine/i.test(filename)), 'Quarantined content must not be public');
assert.equal(examExperiences.length, 0, 'Unverified candidate experiences must not be public');
assert.equal(experiencePdfs.length, 0, 'Unverified experience PDFs must not be public');
assert.ok(studyResources.length >= 8, 'Curated resource catalog must contain a useful Medicine baseline');
for (const resource of studyResources) {
  assert.equal(resource.profession, 'Medicine');
  assert.ok(resource.sourceUrl.startsWith('https://'), `${resource.id} needs a secure source URL`);
  assert.equal(resource.publicationEligible, true, `${resource.id} must be explicitly publication eligible`);
  assert.notEqual(resource.redistributionStatus, 'rights-unclear', `${resource.id} cannot publish rights-unclear content`);
  assert.notEqual(resource.redistributionStatus, 'quarantined', `${resource.id} cannot publish quarantined content`);
  if (resource.localPath) {
    assert.ok(resource.localPath.startsWith('/'), `${resource.id} local path must be served from the public root`);
    assert.ok(publicFiles.includes(path.join(publicRoot, resource.localPath.slice(1))), `${resource.id} local file is missing`);
  }
}

assert.ok(guideSections.length >= 8, 'Medicine guide must contain a useful source-governed baseline');
for (const section of guideSections) {
  assert.ok(section.sourceLabel, `${section.id} needs a source label`);
  assert.ok(section.sourceUrl?.startsWith('https://'), `${section.id} needs a secure source URL`);
  assert.ok(section.classification, `${section.id} needs an official/original classification`);
}

console.log(`Verified ${studyResources.length} curated resources, ${guideSections.length} guide sections, and ${publicFiles.length} public files against source-governance rules.`);
