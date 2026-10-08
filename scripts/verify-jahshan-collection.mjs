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
assert.equal(manifest.readingTests.length, 26);
assert.equal(new Set(manifest.readingTests.map(test => test.number)).size, 26);
assert.equal(manifest.readingIndex.sourcePdfSha256, manifest.files.find(file => file.name.startsWith('Reading Jahshan')).sha256);
const byPage = [...manifest.readingTests].sort((a, b) => a.questionPage - b.questionPage);
for (let index = 0; index < byPage.length; index++) {
  const test = byPage[index];
  assert.ok(test.questionPage < test.answerPage && test.answerPage <= test.lastPage);
  assert.equal(test.lastPage, (byPage[index + 1]?.questionPage ?? manifest.readingIndex.pageCount + 1) - 1);
  assert.equal(test.questionCount, test.number === 1 ? null : test.number === 8 ? 34 : 42);
}
console.log('Verified 26 Reading entries, page boundaries, source PDF checksum and shorter-paper labeling.');
const listeningKeys = JSON.parse(await readFile(new URL('../src/data/jahshanListeningAnswers.json', import.meta.url), 'utf8'));
assert.equal(listeningKeys.sourcePdfSha256, manifest.files.find(file => file.name.startsWith('Listening Jahshan')).sha256);
assert.equal(listeningKeys.worksheets.length, 90);
assert.equal(new Set(listeningKeys.worksheets.map(sheet => sheet.trackId)).size, 90);
let blanks = 0;
let missing = 0;
for (const sheet of listeningKeys.worksheets) {
  const track = manifest.files.find(file => file.id === sheet.trackId);
  assert.ok(track?.mimeType.startsWith('audio/'));
  const group = manifest.groups.find(group => group.number === sheet.setNumber);
  assert.ok(track.relativePath.startsWith(`Audio/${group.title}/`));
  assert.equal(sheet.parts.length, sheet.setNumber === 2 ? 3 : 1);
  const ids = new Set();
  for (const section of sheet.parts) {
    assert.ok(['A', 'B', 'C'].includes(section.part));
    if (sheet.setNumber !== 2) assert.ok(track.relativePath.includes(`Part ${section.part}`));
    if (sheet.setNumber !== 1) assert.equal(section.questions.length, { A: 24, B: 6, C: 12 }[section.part]);
    for (const question of section.questions) {
      blanks++;
      assert.ok(!ids.has(question.id)); ids.add(question.id);
      assert.ok(question.number > 0 && question.number <= 42);
      assert.ok(question.keyPage >= group.answerPage && question.keyPage <= group.answerPage + 3);
      if (question.answer === null) { missing++; assert.ok(question.note); }
      else if (section.part !== 'A') assert.match(question.answer, /^[ABC]$/);
      else assert.ok(question.answer.trim());
    }
  }
}
assert.equal(blanks, 1085);
assert.equal(missing, 19);
console.log(`Verified ${blanks} Listening answer slots across all 90 recordings; ${missing} source omissions explicitly labelled.`);
const readingForms = JSON.parse(await readFile(new URL('../src/data/jahshanReadingQuestions.json', import.meta.url), 'utf8'));
assert.equal(readingForms.sourceSha256, manifest.readingIndex.sourcePdfSha256);
assert.equal(readingForms.tests.length, 26);
let readingCount = 0;
let missingReading = 0;
for (const test of readingForms.tests) {
  const entry = manifest.readingTests.find(item => item.number === test.number);
  const ids = new Set();
  let count = 0;
  for (const section of test.sections) for (const q of section.questions) {
    count++; readingCount++;
    assert.ok(!ids.has(q.id)); ids.add(q.id);
    assert.ok(q.prompt.trim().length > 10);
    assert.ok(q.sourcePage >= entry.questionPage && q.sourcePage < entry.answerPage);
    assert.ok(q.keyPage >= entry.answerPage && q.keyPage <= entry.lastPage);
    if (q.answer === null) { missingReading++; assert.equal(test.number, 8); assert.equal(section.part, 'A'); }
    else if (section.part !== 'A') assert.match(q.answer, /^[A-D]$/);
    else assert.ok(q.answer.trim());
    if (q.sourceText) assert.match(q.sourceText, /^[ABCD]$/);
    if (q.imagePage) assert.ok((await stat(new URL(`../public/jahshan-reading-pages/${q.imagePage}.webp`, import.meta.url))).size > 1000);
  }
  assert.equal(count, test.number === 1 ? 81 : entry.questionCount);
}
assert.equal(readingCount, 1123);
assert.equal(missingReading, 20);
console.log(`Verified ${readingCount} Reading question forms; missing Part A key in Practice Test 4 is explicit.`);
let transcriptSegments = 0;
for (const track of manifest.files.filter(file => file.mimeType.startsWith('audio/'))) {
  const transcript = JSON.parse(await readFile(new URL(`../public/jahshan-transcripts/${track.id}.json`, import.meta.url), 'utf8'));
  assert.equal(transcript.trackId, track.id);
  assert.equal(transcript.sourceSha256, track.sha256);
  assert.equal(transcript.kind, 'automatic-transcription');
  assert.ok(transcript.segments.length > 0);
  let previousStart = -1; let repeatedText = ''; let repeatCount = 0;
  for (const segment of transcript.segments) {
    assert.ok(Number.isFinite(segment.start) && segment.start >= previousStart);
    assert.ok(Number.isFinite(segment.end) && segment.end >= segment.start);
    assert.ok(typeof segment.text === 'string' && segment.text.trim());
    repeatCount = segment.text === repeatedText ? repeatCount + 1 : 1; repeatedText = segment.text;
    assert.ok(repeatCount < 5 || segment.text.startsWith('[Unclear interval'), 'Unmarked repetitive transcription');
    previousStart = segment.start; transcriptSegments++;
  }
}
console.log(`Verified transcripts for all 90 original recordings (${transcriptSegments} timed segments).`);
