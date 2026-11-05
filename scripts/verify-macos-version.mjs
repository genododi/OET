import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { githubRevision, sourceRevision, verifyBuildRevision } from './macos-build-info.mjs';
import { checkInternalLibrary } from '../desktop/offline-library.mjs';

try {
  const root = process.cwd();
  const installed = process.env.OET_MAC_APP || path.join(os.homedir(), 'Applications/OET Study.app');
  const build = JSON.parse(await fs.readFile(path.join(installed, 'Contents/Resources/build-info.json'), 'utf8'));
  const source = sourceRevision(root);
  verifyBuildRevision(build, source, githubRevision(root));
  execFileSync('codesign', ['--verify', '--deep', '--strict', installed], { stdio: 'pipe', timeout: 60000 });
  let offlineLibrary;
  if (build.offlineLibrary) {
    const resources = path.join(installed, 'Contents/Resources');
    const locations = JSON.parse(await fs.readFile(path.join(resources, 'offline-locations.json'), 'utf8'));
    offlineLibrary = await checkInternalLibrary(locations.library, path.join(resources, 'dist/imported-resources/catalog.json'));
    if (offlineLibrary.state !== 'ready' || offlineLibrary.catalogSha256 !== build.offlineLibrary.catalogSha256) throw Error('The permanent Mac library is incomplete or differs from the released catalog.');
  }
  console.log(JSON.stringify({ installed, gitCommit: build.gitCommit, builtAt: build.builtAt, matchesGitHubMain: true, signatureVerified: true, ...(offlineLibrary ? { offlineLibrary } : {}) }));
} catch (error) {
  console.error(`Mac app version check failed: ${error.message}`);
  process.exitCode = 1;
}
