import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { packager } from '@electron/packager';
import { createHash } from 'node:crypto';
import { githubRevision, sourceRevision, verifyBuildRevision } from './macos-build-info.mjs';
import { checkInternalLibrary } from '../desktop/offline-library.mjs';
import { checkSharedMedia } from './usmle-shared-media.mjs';
import { copyBuildAssets } from './copy-build-assets.mjs';

const root = process.cwd();
const source = sourceRevision(root);
if (source.gitCommit !== githubRevision(root)) throw Error('Push or synchronize committed source with GitHub main before building the Mac app.');
const resourceRoot = process.env.OET_MAC_RESOURCES || '/Volumes/GENODODI/OET/Mac App';
const output = process.env.OET_MAC_OUTPUT || path.join(root, 'tmp/macos-build');
const aiRoot = process.env.OET_MAC_AI || path.join(process.env.HOME, 'Library/Application Support/OET Study/local-ai');
const internalLibrary = process.env.OET_MAC_LIBRARY || path.join(process.env.HOME, 'Library/Application Support/OET Study/offline-library');
const sourceLibrary = path.join(resourceRoot, 'offline-library');
const bundled = JSON.parse(await fs.readFile(path.join(root, 'src/data/desktopMaterials.generated.json'), 'utf8'));
for (const resource of ['model.json', 'runtime/llama-server', 'Qwen3.5-4B-Q4_K_M.gguf']) await fs.access(path.join(aiRoot, resource));
// Store originals once outside the signed bundle, so updates/backups do not
// duplicate the whole collection. Missing source files come from public releases.
execFileSync('python3', ['scripts/mirror-offline-library.py', '--source', sourceLibrary, '--destination', internalLibrary, ...(process.env.OET_LIBRARY_SYNC_LOCK_PID ? ['--managed'] : [])], { cwd: root, stdio: 'inherit' });
const offlineLibrary = await checkInternalLibrary(internalLibrary, path.join(root, 'public/imported-resources/catalog.json'));
if (offlineLibrary.state !== 'ready') throw Error('The permanent Mac library is not complete; existing app was preserved.');
const usmleRoot = path.join(process.env.HOME, 'Library/Application Support/OET Study/usmle-library');
let sharedUsmleLibrary;
try {
  await fs.access(path.join(root, 'public/usmle-library/index.json'));
  sharedUsmleLibrary = JSON.parse(execFileSync('python3', ['scripts/mirror-usmle-library.py', '--public', path.join(root, 'public/usmle-library'), '--library', usmleRoot], { cwd: root, encoding: 'utf8' }));
  sharedUsmleLibrary.media = await checkSharedMedia(path.join(root, 'public/usmle-library'), { repository: root });
} catch (error) { if (error.code !== 'ENOENT') throw error; }
// Never package an earlier dist directory as if it belonged to the current commit.
execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
const build = { format: 'oet-macos-build', ...source, builtAt: new Date().toISOString(), offlineLibrary, ...(sharedUsmleLibrary ? { sharedUsmleLibrary } : {}) };
verifyBuildRevision(build, sourceRevision(root), githubRevision(root));
const iconset = path.join(root, 'tmp/oet-app.iconset');
await fs.mkdir(iconset, { recursive: true });
for (const size of [16, 32, 128, 256, 512]) {
  for (const scale of [1, 2]) execFileSync('sips', ['-z', String(size * scale), String(size * scale), path.join(root, 'public/apple-touch-icon.png'), '--out', path.join(iconset, `icon_${size}x${size}${scale === 2 ? '@2x' : ''}.png`)], { stdio: 'ignore' });
}
const icon = path.join(root, 'tmp/oet-app.icns');
execFileSync('iconutil', ['-c', 'icns', iconset, '-o', icon]);
const results = await packager({
  dir: path.join(root, 'desktop'), out: output, name: 'OET Study', platform: 'darwin', arch: 'arm64',
  electronVersion: '44.9.0', appBundleId: 'com.genododi.oetstudy', appVersion: '1.0.0',
  icon, overwrite: true, prune: false, asar: true,
  ignore: [/\.test\.mjs$/],
  extraResource: [],
  extendInfo: { NSMicrophoneUsageDescription: 'Record your OET speaking practice on this Mac.', NSCameraUsageDescription: 'OET Study does not require a camera.', NSHighResolutionCapable: true },
});
for (const directory of results) {
  const app = path.join(directory, 'OET Study.app');
  const resources = path.join(app, 'Contents/Resources');
  await fs.writeFile(path.join(resources, 'build-info.json'), JSON.stringify(build, null, 2) + '\n');
  // APFS clones keep the existing 1.3 GB study assets from consuming a second copy.
  await copyBuildAssets(path.join(root, 'dist'), path.join(resources, 'dist'), { recursive: true });
  if (sharedUsmleLibrary?.media.repositoryFiles) await copyBuildAssets(path.join(root, 'shared-usmle-media'), path.join(resources, 'dist/usmle-library/pages'), { recursive: true });
  await fs.writeFile(path.join(resources, 'dist/bundled-assets.json'), JSON.stringify(Object.fromEntries(bundled.files.map(file => [file.sha256, file.assetPath]))));
  const media = {};
  const benchmark = JSON.parse(await fs.readFile(path.join(root, 'src/data/benchmarkCollection.json'), 'utf8'));
  await fs.mkdir(path.join(resources, 'dist/benchmark-audio'), { recursive: true });
  for (const entry of benchmark.entries.filter(entry => entry.audio)) {
    const name = `test-${String(entry.number).padStart(2, '0')}.mp3`;
    const cached = path.join(root, 'tmp/benchmark-offline/Benchmark Offline/audio', name);
    let source;
    try { await fs.access(cached); source = cached; } catch { source = path.join(internalLibrary, 'files', `${entry.audio.sha256}.mp3`); }
    const hash = createHash('sha256').update(await fs.readFile(source)).digest('hex');
    if (hash !== entry.audio.sha256) throw Error(`The recording does not match ${entry.id}`);
    await copyBuildAssets(source, path.join(resources, 'dist/benchmark-audio', name));
    media[entry.audio.url] = `benchmark-audio/${name}`;
  }
  await fs.writeFile(path.join(resources, 'dist/offline-media.json'), JSON.stringify(media));
  await fs.writeFile(path.join(resources, 'offline-locations.json'), JSON.stringify({ library: internalLibrary, sourceLibrary, source: process.env.OET_MAC_SOURCE || '/Volumes/GENODODI/OET', ai: aiRoot }, null, 2));
  // Remove web font network references from the desktop copy. CSS has local system fallbacks.
  const html = path.join(app, 'Contents/Resources/dist/index.html');
  await fs.writeFile(html, (await fs.readFile(html, 'utf8')).replace(/\s*<link[^>]+href="https:\/\/fonts\.[^>]+>/g, ''));
  verifyBuildRevision(build, sourceRevision(root), githubRevision(root));
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
  execFileSync('codesign', ['--verify', '--deep', '--strict', app], { stdio: 'inherit' });
  const applications = path.join(process.env.HOME, 'Applications');
  await fs.mkdir(applications, { recursive: true });
  const installed = path.join(applications, 'OET Study.app');
  // Keep every prior installed bundle intact. A running older version may still
  // have resources open, and an existing previous.app must never be removed.
  try {
    await fs.access(installed);
    let prior = 'unrecorded';
    try { const stamp = JSON.parse(await fs.readFile(path.join(installed, 'Contents/Resources/build-info.json'), 'utf8')).gitCommit; prior = /^[a-f0-9]{40}$/.test(stamp ?? '') ? stamp : 'unrecorded'; } catch { /* Preserve an unstamped install too. */ }
    const backup = path.join(process.env.HOME, 'Library/Application Support/OET Study/app-backups', `${String(prior).slice(0, 40)}-${Date.now()}`);
    await fs.mkdir(backup, { recursive: true });
    await fs.rename(installed, path.join(backup, 'OET Study.app'));
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await fs.rename(app, installed);
  const shortcut = path.join(process.env.HOME, 'Desktop/OET Study.app');
  try { await fs.lstat(shortcut); } catch (error) { if (error.code === 'ENOENT') await fs.symlink(installed, shortcut); else throw error; }
  try {
    await fs.writeFile(path.join(resourceRoot, 'START HERE.txt'), 'OET STUDY — OFFLINE MAC INSTALLATION\n\nOpen ~/Applications/OET Study.app, then create or choose your study profile.\nReleased recordings and originals are saved in ~/Library/Application Support/OET Study/offline-library on this Mac. GENODODI is only needed to import newly added source files.\nThe AI model is installed on this Mac. No browser, Node.js, API key, external drive or internet connection is required for saved study material.\nThe local mentor loads on first use.\nYour profile data is saved under ~/Library/Application Support/OET Study on this Mac.\nBack up answers, drafts and study history through Profiles & backups.\n');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    console.log('The external library is disconnected. The app is installed; its existing external instructions will be retained.');
  }
  console.log(`Mac application ready: ${installed}`);
}
execFileSync(process.execPath, ['scripts/verify-macos-version.mjs'], { cwd: root, stdio: 'inherit' });
