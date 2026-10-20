import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { packager } from '@electron/packager';
import { createHash } from 'node:crypto';
import { githubRevision, sourceRevision, verifyBuildRevision } from './macos-build-info.mjs';

const root = process.cwd();
const source = sourceRevision(root);
if (source.gitCommit !== githubRevision(root)) throw Error('Push or synchronize committed source with GitHub main before building the Mac app.');
const resourceRoot = process.env.OET_MAC_RESOURCES || '/Volumes/GENODODI/OET/Mac App';
const output = process.env.OET_MAC_OUTPUT || path.join(root, 'tmp/macos-build');
const aiRoot = process.env.OET_MAC_AI || path.join(process.env.HOME, 'Library/Application Support/OET Study/local-ai');
const bundled = JSON.parse(await fs.readFile(path.join(root, 'src/data/desktopMaterials.generated.json'), 'utf8'));
for (const resource of ['model.json', 'runtime/llama-server', 'Qwen3.5-4B-Q4_K_M.gguf']) await fs.access(path.join(aiRoot, resource));
// Never package an earlier dist directory as if it belonged to the current commit.
execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
const build = { format: 'oet-macos-build', ...source, builtAt: new Date().toISOString() };
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
  await fs.cp(path.join(root, 'dist'), path.join(resources, 'dist'), { recursive: true, mode: 2 });
  await fs.writeFile(path.join(resources, 'dist/bundled-assets.json'), JSON.stringify(Object.fromEntries(bundled.files.map(file => [file.sha256, file.assetPath]))));
  const media = {};
  const benchmark = JSON.parse(await fs.readFile(path.join(root, 'src/data/benchmarkCollection.json'), 'utf8'));
  await fs.mkdir(path.join(resources, 'dist/benchmark-audio'), { recursive: true });
  for (const entry of benchmark.entries.filter(entry => entry.audio)) {
    const name = `test-${String(entry.number).padStart(2, '0')}.mp3`;
    const cached = path.join(root, 'tmp/benchmark-offline/Benchmark Offline/audio', name);
    let source;
    try { await fs.access(cached); source = cached; } catch { source = path.join(resourceRoot, 'offline-library/files', `${entry.audio.sha256}.mp3`); }
    const hash = createHash('sha256').update(await fs.readFile(source)).digest('hex');
    if (hash !== entry.audio.sha256) throw Error(`The recording does not match ${entry.id}`);
    await fs.copyFile(source, path.join(resources, 'dist/benchmark-audio', name), 2);
    media[entry.audio.url] = `benchmark-audio/${name}`;
  }
  await fs.writeFile(path.join(resources, 'dist/offline-media.json'), JSON.stringify(media));
  await fs.writeFile(path.join(resources, 'offline-locations.json'), JSON.stringify({ library: path.join(resourceRoot, 'offline-library'), ai: aiRoot }, null, 2));
  // Remove web font network references from the desktop copy. CSS has local system fallbacks.
  const html = path.join(app, 'Contents/Resources/dist/index.html');
  await fs.writeFile(html, (await fs.readFile(html, 'utf8')).replace(/\s*<link[^>]+href="https:\/\/fonts\.[^>]+>/g, ''));
  verifyBuildRevision(build, sourceRevision(root), githubRevision(root));
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
  execFileSync('codesign', ['--verify', '--deep', '--strict', app], { stdio: 'inherit' });
  const applications = path.join(process.env.HOME, 'Applications');
  await fs.mkdir(applications, { recursive: true });
  const installed = path.join(applications, 'OET Study.app');
  const previous = path.join(applications, 'OET Study.previous.app');
  try { await fs.access(installed); await fs.rm(previous, { recursive: true, force: true }); await fs.rename(installed, previous); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await fs.rename(app, installed);
  const shortcut = path.join(process.env.HOME, 'Desktop/OET Study.app');
  try { await fs.lstat(shortcut); } catch (error) { if (error.code === 'ENOENT') await fs.symlink(installed, shortcut); else throw error; }
  await fs.writeFile(path.join(resourceRoot, 'START HERE.txt'), 'OET STUDY — OFFLINE MAC INSTALLATION\n\nOpen ~/Applications/OET Study.app, then create or choose your study profile.\nKeep GENODODI connected for the additional offline-library. The AI model is installed on this Mac.\nThe app includes its own runtime; no browser, Node.js, API key or internet is required.\nThe local mentor loads on first use.\nYour profile data is saved under ~/Library/Application Support/OET Study on this Mac.\nBack up answers, drafts and study history through Profiles & backups.\n');
  console.log(`Mac application ready: ${installed}`);
}
execFileSync(process.execPath, ['scripts/verify-macos-version.mjs'], { cwd: root, stdio: 'inherit' });
