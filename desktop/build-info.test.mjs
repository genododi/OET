import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { sourceRevision, githubRevision, verifyBuildRevision } from '../scripts/macos-build-info.mjs';

test('freshness rejects an old app, a different tree and an unavailable GitHub check', () => {
  const source = { gitCommit: 'a'.repeat(40), gitTree: 'b'.repeat(40) };
  const build = { format: 'oet-macos-build', ...source, builtAt: '2026-10-20T10:00:00Z' };
  assert.equal(verifyBuildRevision(build, source, source.gitCommit), true);
  assert.throws(() => verifyBuildRevision(null, source, source.gitCommit), /no valid source stamp/);
  assert.throws(() => verifyBuildRevision({ ...build, gitCommit: 'c'.repeat(40) }, source, source.gitCommit), /installed Mac app differs/);
  assert.throws(() => verifyBuildRevision({ ...build, gitTree: 'c'.repeat(40) }, source, source.gitCommit), /installed Mac app differs/);
  assert.throws(() => verifyBuildRevision(build, source, 'c'.repeat(40)), /Local source differs/);
  assert.throws(() => verifyBuildRevision(build, source, null), /unverified/);
});

test('build preparation refuses changed or untracked source and checks the live remote', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'oet-build-source-'));
  const git = args => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
  try {
    git(['init', '-b', 'main']);
    git(['config', 'user.name', 'Build test']); git(['config', 'user.email', 'test@example.invalid']);
    fs.writeFileSync(path.join(root, 'source.txt'), 'original');
    git(['add', '.']); git(['commit', '-m', 'Fixture']); git(['remote', 'add', 'origin', root]);
    const source = sourceRevision(root);
    assert.equal(githubRevision(root), source.gitCommit);
    fs.writeFileSync(path.join(root, 'source.txt'), 'changed');
    assert.throws(() => sourceRevision(root), /outstanding source changes/);
    fs.writeFileSync(path.join(root, 'source.txt'), 'original');
    fs.writeFileSync(path.join(root, 'new.txt'), 'untracked');
    assert.throws(() => sourceRevision(root), /outstanding source changes/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
