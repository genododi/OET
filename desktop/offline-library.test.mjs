import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { checkInternalLibrary } from './offline-library.mjs';
import { describeStartupCheck } from './startup-check.mjs';

test('a complete Mac copy is usable without a drive/network, while corruption or deletion fails verification', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'oet-internal-copy-'));
  try {
    const data = Buffer.from('Synthetic audio'), sha = createHash('sha256').update(data).digest('hex');
    const name = sha + '.ogg', file = path.join(root, 'files', name);
    await fs.mkdir(path.dirname(file)); await fs.writeFile(file, data);
    const raw = JSON.stringify({ files: [{ sha256: sha, format: 'ogg', bytes: data.length }] });
    const shipped = path.join(root, 'released'); await fs.mkdir(path.join(shipped, 'text'), { recursive: true });
    const catalogFile = path.join(shipped, 'catalog.json'); await fs.writeFile(catalogFile, raw);
    await fs.mkdir(path.join(root, 'text'));
    const text = JSON.stringify({ sourceSha256: sha, text: 'Synthetic transcript' });
    await fs.writeFile(path.join(root, 'text', sha + '.json'), text);
    await fs.writeFile(path.join(shipped, 'text', sha + '.json'), text);
    await fs.writeFile(path.join(root, 'catalog.json'), raw);
    const stat = await fs.stat(file, { bigint: true });
    await fs.writeFile(path.join(root, 'mirror-status.json'), JSON.stringify({ complete: true, fileCount: 1, catalogSha256: createHash('sha256').update(raw).digest('hex'), files: { [name]: { sha256: sha, bytes: data.length, mtimeNs: String(stat.mtimeNs) } } }));
    const ready = await checkInternalLibrary(root, catalogFile);
    assert.equal(ready.state, 'ready'); assert.equal(ready.files, 1);
    const offline = describeStartupCheck({ files: { state: 'disconnected' }, published: { state: 'unavailable' }, localLibrary: ready });
    assert.equal(offline.state, 'offline-ready'); assert.match(offline.message, /without GENODODI or an internet/);
    await fs.writeFile(path.join(root, 'text', sha + '.json'), 'incorrect transcript');
    const incomplete = await checkInternalLibrary(root, catalogFile);
    assert.equal(incomplete.state, 'incomplete');
    assert.equal(describeStartupCheck({ files: { state: 'checked', changedFiles: 0 }, published: { state: 'current' }, localLibrary: incomplete }).state, 'library-incomplete');
    await fs.writeFile(path.join(root, 'text', sha + '.json'), text);
    const previous = Number(stat.mtimeNs) / 1e9;
    await fs.writeFile(file, Buffer.alloc(data.length, 88)); await fs.utimes(file, previous + 5, previous + 5);
    assert.equal((await checkInternalLibrary(root, catalogFile)).state, 'incomplete');
    await fs.unlink(file); assert.equal((await checkInternalLibrary(root, catalogFile)).state, 'incomplete');
    await fs.writeFile(catalogFile, JSON.stringify({ files: [] }));
    assert.equal((await checkInternalLibrary(root, catalogFile)).state, 'incomplete');
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
