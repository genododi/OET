import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { githubRevision, sourceRevision, verifyBuildRevision } from './macos-build-info.mjs';

try {
  const root = process.cwd();
  const installed = process.env.OET_MAC_APP || path.join(os.homedir(), 'Applications/OET Study.app');
  const build = JSON.parse(await fs.readFile(path.join(installed, 'Contents/Resources/build-info.json'), 'utf8'));
  const source = sourceRevision(root);
  verifyBuildRevision(build, source, githubRevision(root));
  execFileSync('codesign', ['--verify', '--deep', '--strict', installed], { stdio: 'pipe', timeout: 60000 });
  console.log(JSON.stringify({ installed, gitCommit: build.gitCommit, builtAt: build.builtAt, matchesGitHubMain: true, signatureVerified: true }));
} catch (error) {
  console.error(`Mac app version check failed: ${error.message}`);
  process.exitCode = 1;
}
