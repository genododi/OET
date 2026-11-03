import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { parseNote, plainText, privateUsmleResponse, readPrivateLibrary, openDeck, importUsmleFolder } from './usmle-library.mjs';

test('source cards retain final printed keys, inference labels, safe text and review-only gaps', () => {
  const models = { 1: { flds: ['Title', 'Question', 'Answer', 'Source', 'SearchText'].map(name => ({ name })) } };
  const fields = ['Block 07 Question 16', '<div class="stem">Synthetic &amp; safe<script>bad()</script></div><input value="A" aria-label="A. One"><input value="B" aria-label="B. Two">', '<div data-key="B">Printed key: B</div>', 'Original page 2', 'Synthetic'];
  const note = { mid: 1, did: 1, flds: fields.join('\x1f'), tags: 'block::07 question::16 classification::inferred' };
  const q = parseNote(note, models, { 1: { name: 'Blocks::Step 1::Anatomy and Embryology' } });
  assert.equal(q.key, 'B'); assert.equal(q.prompt, 'Synthetic & safe'); assert.equal(q.block, 7); assert.equal(q.number, 16); assert.equal(q.step, 'step1'); assert.match(q.classification, /inferred/); assert.equal(q.options[1].correct, true);
  assert.equal(parseNote({ ...note, flds: [fields[0], fields[1], '<div data-key="Z">Missing</div>', '', ''].join('\x1f') }, models, {}).reviewOnly, true);
  assert.equal(plainText('A<br>B &le; C&#10;&beta;'), 'A\nB ≤ C\nβ');
});

test('private asset routes reject traversal, scripts and symlinks escaping the library', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'usmle-assets-'));
  try {
    assert.deepEqual((await readPrivateLibrary(root)).questions, []);
    const request = new Request('https://study.test/private');
    for (const bad of ['../index.json', 'index.json', 'media/evil.svg', 'media/evil.html']) assert.equal((await privateUsmleResponse(root, bad, request)).status, 404);
    await fs.mkdir(path.join(root, 'media'));
    const asset = 'media/' + 'a'.repeat(64) + '.png';
    await fs.symlink('/etc/hosts', path.join(root, asset));
    await assert.rejects(privateUsmleResponse(root, asset, request), /Invalid asset link/);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('malformed Anki archives fail closed without writing any archive paths', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'usmle-zip-'));
  try { const file = path.join(root, 'bad.apkg'); await fs.writeFile(file, 'not an archive'); await assert.rejects(openDeck(file), /not a supported/); }
  finally { await fs.rm(root, { recursive: true, force: true }); }
});

function archive(entries) {
  const files = [], directory = []; let offset = 0;
  for (const [name, data] of entries) {
    let crc = 0xffffffff;
    for (const byte of data) { crc ^= byte; for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
    crc = (crc ^ 0xffffffff) >>> 0;
    const encoded = Buffer.from(name), local = Buffer.alloc(30), central = Buffer.alloc(46);
    local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt32LE(crc, 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(encoded.length, 26);
    central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20, 6); central.writeUInt32LE(crc, 16); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(encoded.length, 28); central.writeUInt32LE(offset, 42);
    files.push(local, encoded, data); directory.push(central, encoded); offset += local.length + encoded.length + data.length;
  }
  const contents = Buffer.concat(directory), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(contents.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...files, contents, end]);
}

test('real Anki ZIP import keeps source images, keys, dates and deduplicates repeated imports', { skip: process.platform !== 'darwin' }, async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'usmle-roundtrip-'));
  try {
    const source = path.join(folder, 'source'), output = path.join(folder, 'private'); await fs.mkdir(source);
    const db = path.join(folder, 'fixture.anki2');
    const quote = value => `'${value.replaceAll("'", "''")}'`;
    const names = ['Question', ...'ABCDEFGH'.split('').map((letter, i) => `option_${i + 1} (${letter})`), 'Ans', 'Explanation'];
    const fields = ['Synthetic question<img src="figure.png">', 'One', 'Two', '', '', '', '', '', '', 'B', 'Synthetic explanation<img src="figure.png">'].join('\x1f');
    const models = JSON.stringify({ 1: { flds: names.map(name => ({ name })) } });
    execFileSync('/usr/bin/sqlite3', ['-noinit', db, `CREATE TABLE col(models TEXT,decks TEXT); CREATE TABLE notes(id INTEGER,guid TEXT,mid INTEGER,flds TEXT,tags TEXT); CREATE TABLE cards(nid INTEGER,did INTEGER); INSERT INTO col VALUES(${quote(models)},'{}'); INSERT INTO notes VALUES(1,'synthetic',1,${quote(fields)},'block::1 question::1'); INSERT INTO cards VALUES(1,1);`]);
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==', 'base64');
    const bytes = archive([['collection.anki2', await fs.readFile(db)], ['media', Buffer.from('{"0":"figure.png"}')], ['0', png]]);
    await fs.writeFile(path.join(source, 'Synthetic.apkg'), bytes);
    await fs.writeFile(path.join(source, 'Synthetic.pdf'), '%PDF-1.4\n%%EOF');
    const first = await importUsmleFolder(source, output);
    assert.deepEqual(first.warnings, []);
    assert.equal(first.questions.length, 1); assert.equal(first.questions[0].key, 'B'); assert.equal(first.questions[0].step, null);
    assert.equal(first.questions[0].questionImages.length, 1); assert.deepEqual(first.questions[0].questionImages, first.questions[0].answerImages);
    assert.equal(first.resources.length, 2); assert.deepEqual(first.warnings, []);
    const second = await importUsmleFolder(source, output);
    assert.equal(second.questions.length, 1); assert.equal(second.questions[0].addedAt, first.questions[0].addedAt); assert.equal(second.resources[0].addedAt, first.resources[0].addedAt);
    // A damaged source must fail integrity validation rather than silently
    // producing a different printed key or extracting an unchecked member.
    bytes[30 + 'collection.anki2'.length + 20] ^= 1;
    const bad = path.join(folder, 'corrupt.apkg'); await fs.writeFile(bad, bytes);
    const zip = await openDeck(bad);
    try { await assert.rejects(zip.read('collection.anki2'), /integrity/); } finally { await zip.close(); }
  } finally { await fs.rm(folder, { recursive: true, force: true }); }
});
