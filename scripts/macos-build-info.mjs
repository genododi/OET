import { execFileSync } from 'node:child_process';

export function sourceRevision(root) {
  const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', timeout: 30000 }).trim();
  if (git(['status', '--porcelain'])) throw Error('Commit or preserve outstanding source changes before building or verifying the Mac app.');
  return { gitCommit: git(['rev-parse', 'HEAD']), gitTree: git(['rev-parse', 'HEAD^{tree}']) };
}

export function githubRevision(root) {
  // Query the server, not a potentially stale origin/main tracking reference.
  const output = execFileSync('git', ['ls-remote', '--exit-code', 'origin', 'refs/heads/main'], { cwd: root, encoding: 'utf8', timeout: 45000 }).trim();
  const revision = output.split(/\s+/)[0];
  if (!/^[a-f0-9]{40}$/.test(revision)) throw Error('GitHub did not return a valid main commit. Freshness is unverified.');
  return revision;
}

export function verifyBuildRevision(build, source, github) {
  if (!build || build.format !== 'oet-macos-build' || !/^[a-f0-9]{40}$/.test(build.gitCommit || '') || !/^[a-f0-9]{40}$/.test(build.gitTree || '') || !Number.isFinite(Date.parse(build.builtAt))) throw Error('The installed Mac app has no valid source stamp. Rebuild it.');
  if (!github) throw Error('GitHub could not be checked. Freshness is unverified.');
  if (source.gitCommit !== github) throw Error('Local source differs from GitHub main. Synchronize the source before rebuilding.');
  if (build.gitCommit !== github || build.gitTree !== source.gitTree) throw Error('The installed Mac app differs from the latest GitHub source. Run npm run desktop:build.');
  return true;
}
