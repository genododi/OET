import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { checkPublishedApp, describeStartupCheck, eligibleSource, parseSourceCache, scanSourceFiles, StartupChecks } from './startup-check.mjs';

const commit = 'a'.repeat(40);
async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'oet-startup-'));
  const options = { sourceRoot: path.join(root, 'OET'), libraryRoot: path.join(root, 'library'), webRoot: path.join(root, 'web'), stateRoot: path.join(root, 'state'), resourcesPath: path.join(root, 'resources'), build: { gitCommit: commit } };
  for (const dir of [options.sourceRoot, options.libraryRoot, options.webRoot, options.stateRoot, options.resourcesPath, path.join(options.webRoot, 'imported-resources')]) await fs.mkdir(dir, { recursive: true });
  const json = (file, data) => fs.writeFile(file, JSON.stringify(data));
  await json(path.join(options.libraryRoot, 'catalog.json'), { files: [{ sha256: 'shipped' }, { sha256: 'pending' }] });
  await json(path.join(options.webRoot, 'imported-resources/catalog.json'), { files: [{ sha256: 'shipped' }] });
  await json(path.join(options.webRoot, 'bundled-assets.json'), {});
  await json(path.join(options.libraryRoot, 'source-cache.json'), {});
  await json(path.join(options.resourcesPath, 'build-info.json'), options.build);
  return { root, options, json, close: () => fs.rm(root, { recursive: true, force: true }) };
}

test('startup detects new and changed originals without reading or modifying their contents', async () => {
  const f = await fixture();
  try {
    const source = path.join(f.options.sourceRoot, 'Reading.pdf'); await fs.writeFile(source, '%PDF-original');
    const stat = await fs.stat(source, { bigint: true });
    const raw = `{${JSON.stringify(source)}:{"bytes":${stat.size},"mtimeNs":${stat.mtimeNs},"ctimeNs":${stat.ctimeNs},"sha256":"existing"}}`;
    await fs.writeFile(path.join(f.options.libraryRoot, 'source-cache.json'), raw);
    assert.equal(parseSourceCache(raw)[source].mtimeNs, String(stat.mtimeNs));
    let result = await scanSourceFiles(f.options); assert.equal(result.changedFiles, 0); assert.equal(result.pendingPracticeFiles, 1);
    await fs.writeFile(source, '%PDF-revised!'); await fs.writeFile(path.join(f.options.sourceRoot, 'Audio.mp3'), 'original recording');
    await fs.mkdir(path.join(f.options.sourceRoot, 'Mac App')); await fs.writeFile(path.join(f.options.sourceRoot, 'Mac App', 'ignore.pdf'), 'not a source');
    await fs.symlink(f.root, path.join(f.options.sourceRoot, 'outside'));
    result = await scanSourceFiles(f.options); assert.equal(result.changedFiles, 2); assert.equal(result.checkedFiles, 2);
    assert.equal(await fs.readFile(source, 'utf8'), '%PDF-revised!'); assert.equal(await fs.readFile(path.join(f.options.libraryRoot, 'source-cache.json'), 'utf8'), raw);
    assert.equal(eligibleSource(path.join('src', 'data.json')), false); assert.equal(eligibleSource('README.md'), false);
  } finally { await f.close(); }
});

test('the public version check has no API key and does not call an offline app current', async () => {
  const result = await checkPublishedApp({ gitCommit: commit }, async (url, options) => {
    assert.equal(url, 'https://api.github.com/repos/genododi/OET/commits/main');
    assert(!Object.keys(options.headers).some(name => /authorization/i.test(name)));
    return new Response('b'.repeat(40));
  });
  assert.equal(result.state, 'newer');
  assert.equal((await checkPublishedApp({ gitCommit: commit }, async () => { throw Error('Offline'); })).state, 'unavailable');
  assert.equal((await checkPublishedApp({ gitCommit: commit }, async () => new Response('<html>Sign in</html>'))).state, 'unavailable');
  assert.equal(describeStartupCheck({ files: { state: 'checked', changedFiles: 0, pendingPracticeFiles: 0 }, published: { state: 'unavailable' } }).state, 'offline');
});

test('an unfinished import and an installed replacement are never reported as fully current', () => {
  const current = { files: { state: 'checked', changedFiles: 0, pendingPracticeFiles: 0 }, published: { state: 'current' } };
  assert.equal(describeStartupCheck({ ...current, sync: { status: 'transcribing-recordings' } }).state, 'processing');
  assert.equal(describeStartupCheck({ ...current, files: { state: 'checked', pendingPracticeFiles: 3 } }).state, 'updates');
  assert.equal(describeStartupCheck({ ...current, runningCommit: commit, installedCommit: 'b'.repeat(40) }).state, 'reopen');
  assert.equal(describeStartupCheck({ ...current, files: { state: 'disconnected' } }).state, 'drive-missing');
});

test('slow drive checks have a deadline and repeated launch checks share one scan', async () => {
  const f = await fixture();
  try {
    let scans = 0; const updates = [];
    const checks = new StartupChecks({ ...f.options, timeoutMs: 25, fetcher: async () => new Response(commit), scan: () => { scans++; return new Promise(() => {}); }, onChange: value => updates.push(value) });
    const first = checks.run(); assert.equal(checks.run(), first);
    const result = await first; assert.equal(scans, 1); assert.equal(result.checking, false); assert.equal(result.state, 'unverified');
    assert.equal(updates[0].checking, true); assert.equal(updates.at(-1).checking, false);
    const receipt = JSON.parse(await fs.readFile(path.join(f.options.stateRoot, 'startup-check.json'), 'utf8'));
    assert.equal(receipt.files.state, 'timeout'); assert(!JSON.stringify(receipt).includes('profile'));
    assert.equal(await fs.readFile(path.join(f.options.webRoot, 'bundled-assets.json'), 'utf8'), '{}');
  } finally { await f.close(); }
});
