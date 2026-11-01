import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const EXTENSIONS = new Set('pdf docx doc pptx ppt xlsx xls csv tsv txt md rtf html htm json apkg zip rar 7z mp3 m4a wav ogg flac aac mp4 webm mov jpg jpeg png webp heic heif tif tiff bmp gif avif'.split(' '));
const SKIP = new Set(['.git', 'node_modules', 'dist', 'public', 'assets', 'output', 'tmp', 'quarantine', 'work', 'Mac App', 'Benchmark Offline', 'repo-duplicate-backup', 'manifests', 'reports', 'channel-pages', 'linked-pages', 'youtube-metadata']);
const ROOT_CODE = new Set(['src', 'scripts', 'sources', 'docs', 'desktop']);
const SHA = /^[a-f0-9]{40}$/;
const PROCESSING = new Set(['checking', 'source-checked', 'recognising-source-pages', 'transcribing-recordings', 'publishing-originals', 'building-mac-app', 'releasing-startup-check', 'preparing-recognition-runtime']);
const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const CHECKING_MESSAGE = 'Checking for updates in the background. You can start studying.';
const execute = promisify(execFile);

export async function checkSyncLock(stateRoot) {
  // Probe the same OS lock as the Python updater. A saved stage or an old PID
  // cannot prove that its worker is still running. Never create/remove a lock.
  const probe = 'open(my $lock, "<", $ARGV[0]) or do { print $!{ENOENT} ? "idle" : "unavailable"; exit }; my $state = flock($lock, LOCK_EX | LOCK_NB) ? "idle" : ($!{EWOULDBLOCK} || $!{EAGAIN}) ? "active" : "unavailable"; print $state;';
  try {
    const { stdout } = await execute('/usr/bin/perl', ['-MFcntl=:flock', '-e', probe, path.join(stateRoot, 'sync.lock')], { timeout: 2000, maxBuffer: 1024 });
    return ['active', 'idle'].includes(stdout) ? stdout : 'unavailable';
  } catch { return 'unavailable'; }
}

export async function readSyncStatus(stateRoot, probe = checkSyncLock) {
  const sync = await readJson(path.join(stateRoot, 'status.json'));
  if (!PROCESSING.has(sync?.status)) return sync;
  return { ...sync, worker: await probe(stateRoot) };
}

async function withinDeadline(task, timeoutMs, fallback, onTimeout = () => {}) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(task),
      new Promise(resolve => { timer = setTimeout(() => { onTimeout(); resolve(fallback); }, timeoutMs); }),
    ]);
  } finally { clearTimeout(timer); }
}

// Preserve nanosecond integers from Python's cache; JSON numbers would round them.
export const parseSourceCache = text => JSON.parse(text.replace(/"(mtimeNs|ctimeNs)"\s*:\s*(\d+)/g, '"$1":"$2"'));
export function eligibleSource(relative) {
  const parts = relative.split(path.sep), name = parts.at(-1);
  if (parts.some(part => SKIP.has(part) || part.startsWith('.')) || name.startsWith('~$')) return false;
  if (ROOT_CODE.has(parts[0]) || ['archive-import.json', '.oet-archive-import.json'].includes(name)) return false;
  if (parts.length === 1 && (['README.md', 'index.html', 'package.json', 'package-lock.json'].includes(name) || name.startsWith('tsconfig'))) return false;
  return EXTENSIONS.has(path.extname(name).slice(1).toLowerCase());
}

export async function scanSourceFiles({ sourceRoot, libraryRoot, webRoot, signal }) {
  const check = () => signal?.throwIfAborted();
  try {
    check();
    const source = await fs.lstat(sourceRoot);
    if (!source.isDirectory() || source.isSymbolicLink()) return { state: 'unavailable' };
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENODEV') return { state: 'disconnected' };
    return { state: 'unavailable' };
  }
  try {
    const [cacheText, library, shipped, bundled] = await Promise.all([
      fs.readFile(path.join(libraryRoot, 'source-cache.json'), { encoding: 'utf8', signal }),
      readJson(path.join(libraryRoot, 'catalog.json')),
      readJson(path.join(webRoot, 'imported-resources/catalog.json')),
      readJson(path.join(webRoot, 'bundled-assets.json')),
    ]);
    const cache = parseSourceCache(cacheText);
    if (!Array.isArray(library.files) || !Array.isArray(shipped.files) || !bundled || typeof cache !== 'object' || !cache) throw Error('Invalid library metadata');
    let checkedFiles = 0, changedFiles = 0;
    async function walk(directory, relative = '') {
      check();
      const entries = await fs.readdir(directory, { withFileTypes: true });
      for (const entry of entries) {
        check();
        if (entry.isSymbolicLink() || entry.name.startsWith('.') || SKIP.has(entry.name)) continue;
        const next = path.join(relative, entry.name), absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) { if (!relative && ROOT_CODE.has(entry.name)) continue; await walk(absolute, next); }
        else if (entry.isFile() && eligibleSource(next)) {
          const stat = await fs.lstat(absolute, { bigint: true });
          if (!stat.isFile() || stat.isSymbolicLink()) continue;
          const previous = cache[absolute]; checkedFiles++;
          if (!previous || String(previous.bytes) !== String(stat.size) || String(previous.mtimeNs) !== String(stat.mtimeNs) || String(previous.ctimeNs) !== String(stat.ctimeNs)) changedFiles++;
        }
      }
    }
    await walk(sourceRoot); check();
    const installed = new Set([...shipped.files.map(file => file.sha256), ...Object.keys(bundled)]);
    const pendingPracticeFiles = library.files.filter(file => !installed.has(file.sha256)).length;
    return { state: 'checked', checkedFiles, changedFiles, pendingPracticeFiles };
  } catch { return { state: signal?.aborted ? 'timeout' : 'unavailable' }; }
}

export async function checkPublishedApp(build, fetcher = fetch, signal, timeoutMs = 7000) {
  const controller = new AbortController();
  try {
    signal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
    // Some fetch implementations and response bodies do not settle on abort.
    return await withinDeadline(async () => {
      const response = await fetcher('https://api.github.com/repos/genododi/OET/commits/main', {
        headers: { Accept: 'application/vnd.github.sha', 'User-Agent': 'OET-Study-startup-check' }, credentials: 'omit', signal,
      });
      if (!response.ok) return { state: 'unavailable' };
      const remoteCommit = (await response.text()).trim();
      if (!SHA.test(remoteCommit) || !SHA.test(build?.gitCommit || '')) return { state: 'unavailable' };
      return { state: build.gitCommit === remoteCommit ? 'current' : 'newer', remoteCommit };
    }, timeoutMs, { state: 'unavailable' }, () => controller.abort());
  } catch { return { state: 'unavailable' }; }
}

export function describeStartupCheck({ files, published, sync, runningCommit, installedCommit }) {
  if (SHA.test(installedCommit || '') && SHA.test(runningCommit || '') && installedCommit !== runningCommit) return { state: 'reopen', message: 'An app update is installed. Finish your work, save any recording, then reopen OET Study.' };
  if (PROCESSING.has(sync?.status)) {
    if (sync.worker === 'idle') return { state: 'attention', message: 'The previous library update stopped before finishing. Your existing study materials are ready; the next scheduled update will retry.' };
    if (sync.worker !== 'active') return { state: 'unverified', message: 'The library update status could not be verified. Your existing study materials are ready to use.' };
    const message = sync.status === 'transcribing-recordings'
      ? 'Preparing new recording transcripts in the background. Your current study materials are ready to use.'
      : 'Updating study materials in the background. You can keep studying; new files will appear after the update is verified.';
    return { state: 'processing', message };
  }
  if (sync?.status === 'needs-attention') return { state: 'attention', message: 'The last library update did not finish. You can study offline; the next scheduled update will retry.' };
  if (files.changedFiles > 0 || files.pendingPracticeFiles > 0) return { state: 'updates', message: 'New or changed study files are waiting for the scheduled library update. They are not all installed yet.' };
  if (published.state === 'newer') return { state: 'updates', message: 'A newer app version is published. The scheduled update will install and verify it; keep studying in this version.' };
  if (files.state === 'disconnected') return { state: 'drive-missing', message: published.state === 'current' ? 'Published app version checked. Connect your OET resource drive to check new files.' : 'OET resource drive is disconnected and the online version could not be checked. Offline study is available.' };
  if (files.state === 'timeout') return { state: 'unverified', message: 'The resource drive is taking too long to respond. You can study offline and choose Check again later.' };
  if (files.state !== 'checked') return { state: 'unverified', message: 'Resource files could not be fully checked. Offline study is available; reconnect the drive and choose Check again.' };
  if (published.state !== 'current') return { state: 'offline', message: 'Local resource files checked. The online app version could not be checked; keep studying offline.' };
  return { state: 'current', message: 'Startup check complete. No new source files detected; published app version is current.' };
}

export class StartupChecks {
  constructor({ sourceRoot, libraryRoot, webRoot, stateRoot, resourcesPath, build, onChange = () => {}, fetcher = fetch, scan = scanSourceFiles, syncReader = readSyncStatus, timeoutMs = 20000 }) {
    Object.assign(this, { sourceRoot, libraryRoot, webRoot, stateRoot, resourcesPath, build, onChange, fetcher, scan, syncReader, timeoutMs });
    this.status = { state: 'checking', checking: true, message: CHECKING_MESSAGE };
  }
  run() {
    if (this.pending) return this.pending;
    this.lastStartedAt = Date.now();
    this.status = { ...this.status, state: 'checking', checking: true, message: CHECKING_MESSAGE };
    this.onChange(this.status);
    this.pending = this.check().catch(error => {
      console.warn('OET startup check could not finish:', error.message);
      this.status = { state: 'unverified', checking: false, message: 'The update check could not finish. You can keep studying offline.' };
      this.onChange(this.status); return this.status;
    }).finally(() => { this.pending = null; });
    return this.pending;
  }
  async check() {
    const controller = new AbortController();
    const filesPromise = withinDeadline(() => this.scan({ sourceRoot: this.sourceRoot, libraryRoot: this.libraryRoot, webRoot: this.webRoot, signal: controller.signal }), this.timeoutMs, { state: 'timeout' }, () => controller.abort()).catch(() => ({ state: 'unavailable' }));
    const metadata = file => withinDeadline(() => readJson(file), this.timeoutMs, null).catch(() => null);
    const [files, published, sync, diskBuild] = await Promise.all([
      filesPromise, checkPublishedApp(this.build, this.fetcher, undefined, Math.min(7000, this.timeoutMs)),
      withinDeadline(() => this.syncReader(this.stateRoot), this.timeoutMs, null).catch(() => null),
      metadata(path.join(this.resourcesPath, 'build-info.json')),
    ]);
    this.status = { ...describeStartupCheck({ files, published, sync, runningCommit: this.build?.gitCommit, installedCommit: diskBuild?.gitCommit }), checking: false, checkedAt: new Date().toISOString(), files, published };
    this.onChange(this.status);
    // A small receipt helps the daily updater reconcile startup findings. It
    // contains no profile answers, credentials, filenames or chat histories.
    try {
      const receipt = JSON.stringify(this.status) + '\n';
      await withinDeadline(async () => {
        await fs.mkdir(this.stateRoot, { recursive: true });
        const target = path.join(this.stateRoot, 'startup-check.json'), temporary = target + '.' + process.pid + '.tmp';
        await fs.writeFile(temporary, receipt, { mode: 0o600 }); await fs.rename(temporary, target);
      }, this.timeoutMs, null);
    } catch { /* A storage error must not prevent opening the study app. */ }
    return this.status;
  }
}
