#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { lstat, mkdir, mkdtemp, readdir, rename } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const archiveRoot = process.env.OET_SOURCE_ARCHIVE_ROOT ?? '/Volumes/GENODODI/oet-study-sources';
const archive = path.join(archiveRoot, 'raw/mega/LISTENING Audio.rar');
const normalizedRoot = path.join(archiveRoot, 'normalized');
const destination = path.join(normalizedRoot, 'mega-listening-audio');
if (!existsSync(archive)) throw new Error(`MEGA archive is missing: ${archive}`);
if (existsSync(destination)) {
  console.log(`Already extracted: ${destination}`);
  process.exit(0);
}

const listing = spawnSync('lsar', ['-j', '-no-recursion', archive], {
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});
if (listing.status !== 0) throw new Error(`Unable to list archive: ${listing.stderr}`);
const listed = JSON.parse(listing.stdout);
const entries = Array.isArray(listed.lsarContents) ? listed.lsarContents : [];
const forbiddenExtensions = new Set(['.app', '.bat', '.cmd', '.com', '.dmg', '.exe', '.js', '.msi', '.pkg', '.scr', '.sh']);
const unsafe = entries.filter((entry) => {
  const item = String(entry.XADFileName ?? '').replaceAll('\\', '/');
  const segments = item.split('/');
  return !item || item.startsWith('/') || /^[a-z]:\//i.test(item) || segments.includes('..') || entry.XADIsEncrypted === true;
});
const executable = entries.filter((entry) => forbiddenExtensions.has(path.extname(String(entry.XADFileName ?? '')).toLowerCase()));
if (unsafe.length > 0) throw new Error(`Unsafe or encrypted archive paths detected: ${unsafe.slice(0, 5).map((entry) => entry.XADFileName).join(', ')}`);
if (executable.length > 0) throw new Error(`Executable content detected: ${executable.slice(0, 5).map((entry) => entry.XADFileName).join(', ')}`);

const integrity = spawnSync('lsar', ['-test', '-no-recursion', archive], { encoding: 'utf8' });
if (integrity.status !== 0) throw new Error(`Archive integrity test failed: ${integrity.stderr || integrity.stdout}`);

await mkdir(normalizedRoot, { recursive: true });
const staging = await mkdtemp(path.join(normalizedRoot, '.mega-extract-'));
const extraction = spawnSync(
  'unar',
  ['-quiet', '-force-rename', '-no-recursion', '-forks', 'skip', '-output-directory', staging, archive],
  { encoding: 'utf8' },
);
if (extraction.status !== 0) throw new Error(`Archive extraction failed: ${extraction.stderr}`);

async function rejectLinks(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    const info = await lstat(filename);
    if (info.isSymbolicLink()) throw new Error(`Symbolic link rejected after extraction: ${filename}`);
    if (info.isDirectory()) await rejectLinks(filename);
  }
}

await rejectLinks(staging);
await rename(staging, destination);
console.log(`Safely extracted ${entries.length} entries to ${destination}`);
