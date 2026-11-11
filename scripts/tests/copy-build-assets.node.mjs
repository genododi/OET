import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
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

test('cross-volume copies retain framework links without source metadata', async t => {
  const volume = process.env.OET_TEST_COPY_VOLUME;
  if (process.platform !== 'darwin' || !volume) return t.skip('Requires a mounted external test volume');
  const source = await fs.mkdtemp(path.join(os.tmpdir(), 'oet-external-copy-source-'));
  let target;
  try {
    assert.notEqual((await fs.stat(source)).dev, (await fs.stat(volume)).dev);
    target = await fs.mkdtemp(path.join(volume, '.oet-external-copy-test-'));
    await fs.mkdir(path.join(source, 'Versions/A'), { recursive: true });
    await fs.writeFile(path.join(source, 'Versions/A/runtime'), 'Synthetic framework runtime');
    await fs.symlink('A', path.join(source, 'Versions/Current'));
    await fs.symlink('Versions/Current/runtime', path.join(source, 'runtime'));
    execFileSync('/usr/bin/xattr', ['-w', 'com.oet.copy-test', 'synthetic', path.join(source, 'Versions/A/runtime')]);
    await copyBuildAssets(source, target, { recursive: true });
    assert((await fs.lstat(path.join(target, 'runtime'))).isSymbolicLink());
    assert.equal(await fs.readFile(path.join(target, 'runtime'), 'utf8'), 'Synthetic framework runtime');
    assert(!execFileSync('/usr/bin/xattr', [path.join(target, 'Versions/A/runtime')], { encoding: 'utf8' }).split('\n').includes('com.oet.copy-test'));
    const single = path.join(target, 'single runtime');
    await copyBuildAssets(path.join(source, 'Versions/A/runtime'), single);
    assert.equal(await fs.readFile(single, 'utf8'), 'Synthetic framework runtime');
    assert(!execFileSync('/usr/bin/xattr', [single], { encoding: 'utf8' }).split('\n').includes('com.oet.copy-test'));
  } finally {
    await fs.rm(source, { recursive: true, force: true });
    if (target) await fs.rm(target, { recursive: true, force: true });
  }
});
