import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { githubRevision, sourceRevision, verifyBuildRevision } from './macos-build-info.mjs';
import { checkInternalLibrary } from '../desktop/offline-library.mjs';
import { checkSharedMedia } from './usmle-shared-media.mjs';

try {
  const root = process.cwd();
  const installed = process.env.OET_MAC_APP || path.join(os.homedir(), 'Applications/OET Study.app');
  const build = JSON.parse(await fs.readFile(path.join(installed, 'Contents/Resources/build-info.json'), 'utf8'));
  const source = sourceRevision(root);
  verifyBuildRevision(build, source, githubRevision(root));
  execFileSync('codesign', ['--verify', '--deep', '--strict', installed], { stdio: 'pipe', timeout: 60000 });
  let offlineLibrary;
  let sharedUsmleLibrary;
  if (build.offlineLibrary) {
    const resources = path.join(installed, 'Contents/Resources');
    const locations = JSON.parse(await fs.readFile(path.join(resources, 'offline-locations.json'), 'utf8'));
    offlineLibrary = await checkInternalLibrary(locations.library, path.join(resources, 'dist/imported-resources/catalog.json'));
    if (offlineLibrary.state !== 'ready' || offlineLibrary.catalogSha256 !== build.offlineLibrary.catalogSha256) throw Error('The permanent Mac library is incomplete or differs from the released catalog.');
  }
  if (build.sharedUsmleLibrary) {
    sharedUsmleLibrary = JSON.parse(execFileSync('python3', ['scripts/mirror-usmle-library.py', '--public', path.join(installed, 'Contents/Resources/dist/usmle-library'), '--library', path.join(os.homedir(), 'Library/Application Support/OET Study/usmle-library'), '--check-only'], { cwd: root, encoding: 'utf8' }));
    if (sharedUsmleLibrary.catalogSha256 !== build.sharedUsmleLibrary.catalogSha256) throw Error('The shared USMLE originals differ from the signed release.');
    sharedUsmleLibrary.media = await checkSharedMedia(path.join(installed, 'Contents/Resources/dist/usmle-library'), { installed: true });
    if (sharedUsmleLibrary.media.manifestSha256 !== build.sharedUsmleLibrary.media?.manifestSha256) throw Error('The shared USMLE images differ from the signed release.');
  }
  console.log(JSON.stringify({ installed, gitCommit: build.gitCommit, builtAt: build.builtAt, matchesGitHubMain: true, signatureVerified: true, ...(offlineLibrary ? { offlineLibrary } : {}), ...(sharedUsmleLibrary ? { sharedUsmleLibrary } : {}) }));
} catch (error) {
  console.error(`Mac app version check failed: ${error.message}`);
  process.exitCode = 1;
}
