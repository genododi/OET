import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ProfileStore } from './profiles.mjs';
import { assetResponse, confined } from './assets.mjs';

test('profiles retain independent stable identities across app restarts', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'oet-profiles-'));
  try {
    const profiles = new ProfileStore(root);
    const first = profiles.create('Mahmoud'), second = profiles.create('Guest');
    assert.notEqual(first.id, second.id);
    profiles.rename(first.id, 'Mahmoud Sami');
    assert.equal(new ProfileStore(root).get(first.id).name, 'Mahmoud Sami');
    assert.equal(new ProfileStore(root).get(second.id).name, 'Guest');
    assert.throws(() => profiles.create('   '));
    fs.writeFileSync(path.join(root, 'profiles.json'), '{broken');
    assert.throws(() => new ProfileStore(root), /not been overwritten/);
    assert.equal(fs.readFileSync(path.join(root, 'profiles.json'), 'utf8'), '{broken');
  } finally { fs.rmSync(root, { recursive: true }); }
});

test('offline audio supports seeking, partial reads, HEAD, suffix ranges and invalid ranges', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'oet-assets-'));
  try {
    const file = path.join(root, 'track.mp3'); fs.writeFileSync(file, '0123456789');
    const request = (method = 'GET', range) => new Request('oet://study/OET/track.mp3', { method, ...(range ? { headers: { Range: range } } : {}) });
    const partial = await assetResponse(file, request('GET', 'bytes=3-5'));
    assert.equal(partial.status, 206); assert.equal(partial.headers.get('content-range'), 'bytes 3-5/10'); assert.equal(await partial.text(), '345');
    assert.equal(await (await assetResponse(file, request('GET', 'bytes=-2'))).text(), '89');
    const head = await assetResponse(file, request('HEAD'));  assert.equal(head.headers.get('content-length'), '10'); assert.equal(await head.text(), '');
    assert.equal((await assetResponse(file, request('GET', 'bytes=20-'))).status, 416);
    assert.equal((await assetResponse(file, request('GET', 'bytes=0-2,4-6'))).status, 416);
    assert.equal((await assetResponse(file, request('POST'))).status, 405);
    assert.equal((await assetResponse(file + '.missing', request())).status, 404);
    await assert.rejects(() => confined(root, '../outside'));
    fs.symlinkSync('/etc/passwd', path.join(root, 'escape')); await assert.rejects(() => confined(root, 'escape'));
  } finally { fs.rmSync(root, { recursive: true }); }
});
