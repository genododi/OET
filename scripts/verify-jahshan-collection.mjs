import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, sep } from 'node:path';
const manifest = JSON.parse(await readFile(new URL('../src/data/jahshanCollection.json', import.meta.url), 'utf8'));
assert.equal(manifest.files.filter(f => f.mimeType.startsWith('audio/')).length, 90);
assert.equal(manifest.files.filter(f => f.mimeType === 'application/pdf').length, 2);
assert.equal(new Set(manifest.files.map(f => f.id)).size, 93);
assert.equal(manifest.groups.length, 26);
for (const group of manifest.groups) {
  const audio = manifest.files.filter(f => f.mimeType.startsWith('audio/') && f.relativePath.startsWith(`Audio/${group.title}/`));
  assert.equal(audio.length, group.number === 8 ? 0 : group.number === 1 ? 20 : group.number === 2 ? 1 : 3);
  assert.ok(group.questionPage < group.answerPage);
}
const root = '/Volumes/GENODODI/oet-study-sources/Google drive Folder';
const checkLocal = process.argv.includes('--local');
for (const file of manifest.files) {
  assert.match(file.sha256, /^[a-f0-9]{64}$/);
  assert.ok(file.bytes > 0);
  assert.ok(file.url.startsWith('https://drive.google.com/file/d/'));
  const local = resolve(root, file.sourceRelativePath);
  assert.ok(local.startsWith(root + sep));
  if (checkLocal) {
    assert.equal((await stat(local)).size, file.bytes, file.name);
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(local)) hash.update(chunk);
    assert.equal(hash.digest('hex'), file.sha256, file.name);
  }
}
console.log(`Verified Jahshan catalog: 90 tracks, 2 books, 1 missing-audio notice${checkLocal ? ' and all external-drive checksums' : ''}.`);
