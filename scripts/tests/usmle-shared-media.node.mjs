import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { checkSharedMedia } from '../usmle-shared-media.mjs';

test('repository images become verifiable offline assets without adding them to Pages', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'usmle-shared-media-'));
  try {
    const catalog = path.join(root, 'public/usmle-library'), installed = path.join(root, 'installed');
    for (const folder of ['shared-usmle-media', 'public/usmle-library/pages', 'installed/pages']) await fs.mkdir(path.join(root, folder), { recursive: true });
    const data = Buffer.from('RIFFxxxxWEBP synthetic fixture'), files = {};
    for (const [letter, storage] of [['a', 'pages'], ['b', 'repository']]) {
      const name = letter.repeat(64) + '.webp'; files[name] = { storage, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') };
      await fs.writeFile(path.join(storage === 'repository' ? path.join(root, 'shared-usmle-media') : path.join(catalog, 'pages'), name), data);
      await fs.writeFile(path.join(installed, 'pages', name), data);
    }
    const manifest = JSON.stringify({ version: 1, files });
    await fs.writeFile(path.join(catalog, 'page-manifest.json'), manifest); await fs.writeFile(path.join(installed, 'page-manifest.json'), manifest);
    const source = await checkSharedMedia(catalog, { repository: root });
    assert.equal(source.files, 2); assert.equal(source.repositoryFiles, 1);
    assert.deepEqual(await checkSharedMedia(installed, { installed: true }), source);
    await fs.writeFile(path.join(installed, 'pages', 'b'.repeat(64) + '.webp'), Buffer.alloc(data.length));
    await assert.rejects(checkSharedMedia(installed, { installed: true }), /integrity mismatch/);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
