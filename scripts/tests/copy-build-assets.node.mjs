import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { copyBuildAssets } from '../copy-build-assets.mjs';

test('build copies merge directory contents without nesting and remain independent of source edits', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'oet-build-copy-'));
  try {
    const source = path.join(root, 'source with spaces'), destination = path.join(root, 'staged bundle');
    await fs.mkdir(path.join(source, 'pages'), { recursive: true });
    await fs.mkdir(destination);
    await fs.writeFile(path.join(source, 'pages/image.webp'), 'Synthetic image bytes');
    await fs.writeFile(path.join(destination, 'keep.txt'), 'Existing staged asset');
    await copyBuildAssets(source, destination, { recursive: true });
    assert.equal(await fs.readFile(path.join(destination, 'pages/image.webp'), 'utf8'), 'Synthetic image bytes');
    assert.equal(await fs.readFile(path.join(destination, 'keep.txt'), 'utf8'), 'Existing staged asset');
    await fs.writeFile(path.join(source, 'pages/image.webp'), 'Changed workspace bytes');
    assert.equal(await fs.readFile(path.join(destination, 'pages/image.webp'), 'utf8'), 'Synthetic image bytes');
    const file = path.join(root, 'single copy.webp');
    await copyBuildAssets(path.join(source, 'pages/image.webp'), file);
    assert.equal(await fs.readFile(file, 'utf8'), 'Changed workspace bytes');
    await assert.rejects(fs.access(path.join(destination, 'source with spaces')));
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
