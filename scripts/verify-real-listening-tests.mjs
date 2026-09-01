#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(path.join(projectRoot, 'src/data/realListeningAudio.generated.json'), 'utf8'));
const sourceRoot = process.env.OET_LOCAL_SOURCE_FOLDER
  ?? '/Volumes/GENODODI/oet-study-sources/Google drive Folder';

async function sha256(filename) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return hash.digest('hex');
}

assert.equal(manifest.schemaVersion, 1, 'Real listening manifest schema must be version 1');
assert.equal(manifest.tests.length, 2, 'Expected two complete real listening test packs');
assert.equal(new Set(manifest.tests.map((test) => test.id)).size, 2, 'Real listening IDs must be unique');

for (const test of manifest.tests) {
  assert.deepEqual(test.parts.map((part) => part.part), ['A', 'B', 'C'], `${test.id} must contain Parts A, B and C in order`);
  assert.equal(test.redistributionStatus, 'official-public', `${test.id} needs an official-public rights decision`);
  assert.ok(test.sourceUrl.startsWith('https://oet.com/'), `${test.id} needs an official OET source`);
  assert.match(test.outputSha256, /^[a-f0-9]{64}$/i, `${test.id} output checksum is invalid`);
  assert.ok(test.outputDurationSeconds >= 2_100 && test.outputDurationSeconds <= 2_500, `${test.id} is not a complete listening recording`);
  const outputPath = path.join(projectRoot, 'public', test.audioPath.replace(/^\//, ''));
  assert.ok(existsSync(outputPath), `Imported recording is missing: ${test.audioPath}`);
  const outputMetadata = await stat(outputPath);
  assert.equal(outputMetadata.size, test.outputBytes, `${test.id} output size changed`);
  assert.equal(await sha256(outputPath), test.outputSha256, `${test.id} output checksum changed`);
  assert.ok(existsSync(path.join(projectRoot, 'public', test.questionPdf.replace(/^\//, ''))), `${test.id} question paper is missing`);

  if (existsSync(sourceRoot)) {
    for (const part of test.parts) {
      const sourcePath = path.join(sourceRoot, part.sourceRelativePath);
      assert.ok(existsSync(sourcePath), `${test.id} source Part ${part.part} is missing`);
      const metadata = await stat(sourcePath);
      assert.equal(metadata.size, part.bytes, `${test.id} source Part ${part.part} size changed`);
      assert.equal(await sha256(sourcePath), part.sha256, `${test.id} source Part ${part.part} checksum changed`);
    }
  }
}

console.log(`Verified ${manifest.tests.length} real listening tests with six source-matched audio parts.`);
