#!/usr/bin/env node
import { createDecipheriv, createHash } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync } from 'node:fs';
import { mkdir, open, rename, stat, writeFile } from 'node:fs/promises';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const ARCHIVE_ROOT = process.env.OET_SOURCE_ARCHIVE_ROOT ?? '/Volumes/GENODODI/oet-study-sources';
const REQUIRED_PREFIX = '/Volumes/GENODODI/';

if (!path.resolve(ARCHIVE_ROOT).startsWith(REQUIRED_PREFIX)) {
  throw new Error(`Archive root must stay under ${REQUIRED_PREFIX}`);
}

const driveSources = [
  ['1vJmNmLSAdB19npX2P8q5bspV5hKm_FMM', 'OET Collection'],
  ['1Ucb79sZUycOJqmM-bZTku1QCzlAPhBot', 'Jahshan'],
  ['1EZvkn35NuRVaSizepiqJp6NCGZKv_V9k', 'My OET letters'],
  ['10cvKcazYuaNe01cSahOSHbflbOlAEN0t', 'OET Materials'],
  ['1NVdBFWSqnswl58pr96BVwTkH1ceT6P-j', 'OET Dr VisalW'],
  ['1v2Bza1LzG_Bp5NrMYpZ54CLDp6C-xhu8', 'Tasks by letter type'],
];

const googleDoc = {
  id: '1tQAYd5LdFSMK_OVoNQkbk3Mr2KvnFbyeWRq0euHKi7I',
  url: 'https://docs.google.com/document/d/1tQAYd5LdFSMK_OVoNQkbk3Mr2KvnFbyeWRq0euHKi7I/export?format=txt',
};

const youtubeUrl = 'https://www.youtube.com/watch?v=Wo1lSFRrg-I';
const megaLink = 'https://mega.nz/file/4A5SxbwK#LNv6BQWNRzwbPEhiGfihAMj3bq2ebWeo2EuIbczlJUU';

async function ensureLayout() {
  for (const relative of [
    'raw/google-drive',
    'raw/facebook',
    'raw/telegram',
    'raw/mega',
    'raw/references',
    'normalized',
    'quarantine',
    'manifests',
    'reports',
  ]) {
    await mkdir(path.join(ARCHIVE_ROOT, relative), { recursive: true });
  }
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`))));
  });
}

async function downloadDrive(id, label) {
  const output = `${path.join(ARCHIVE_ROOT, 'raw/google-drive', id)}/`;
  await mkdir(output, { recursive: true });
  console.log(`\n=== Google Drive: ${label} (${id}) ===`);
  await run('uv', [
    'run', '--with', 'gdown', 'gdown', '--folder', '--continue', '--no-cookies',
    '-O', output, `https://drive.google.com/drive/folders/${id}`,
  ]);
}

function decodeBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64');
}

function deriveMegaKey(rawKey) {
  const key = Buffer.alloc(16);
  for (let index = 0; index < 16; index += 1) key[index] = rawKey[index] ^ rawKey[index + 16];
  return key;
}

function addCounterBlocks(counter, blocks) {
  const output = Buffer.from(counter);
  let carry = BigInt(blocks);
  for (let index = 15; index >= 0 && carry > 0n; index -= 1) {
    const value = BigInt(output[index]) + (carry & 0xffn);
    output[index] = Number(value & 0xffn);
    carry = (carry >> 8n) + (value >> 8n);
  }
  return output;
}

async function sha256File(filename) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return hash.digest('hex');
}

async function downloadMega() {
  const parsed = new URL(megaLink);
  const handle = parsed.pathname.split('/').filter(Boolean).at(-1);
  const encodedKey = parsed.hash.slice(1);
  if (!handle || !encodedKey) throw new Error('Invalid MEGA link');

  const apiResponse = await fetch(`https://g.api.mega.co.nz/cs?id=${Date.now()}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify([{ a: 'g', g: 1, p: handle }]),
  });
  const [metadata] = await apiResponse.json();
  if (!metadata?.g || !metadata?.at || !metadata?.s) throw new Error(`MEGA API error: ${JSON.stringify(metadata)}`);

  const rawKey = decodeBase64Url(encodedKey);
  const fileKey = deriveMegaKey(rawKey);
  const attributeCipher = createDecipheriv('aes-128-cbc', fileKey, Buffer.alloc(16));
  attributeCipher.setAutoPadding(false);
  const attributesText = Buffer.concat([
    attributeCipher.update(decodeBase64Url(metadata.at)),
    attributeCipher.final(),
  ]).toString().replace(/\0+$/g, '');
  const attributes = JSON.parse(attributesText.slice(4));
  const destination = path.join(ARCHIVE_ROOT, 'raw/mega', attributes.n);
  const partial = `${destination}.part`;
  const currentBytes = existsSync(partial) ? (await stat(partial)).size : 0;
  const alignedBytes = Math.floor(currentBytes / 16) * 16;
  if (currentBytes !== alignedBytes) {
    const handleOut = await open(partial, 'r+');
    await handleOut.truncate(alignedBytes);
    await handleOut.close();
  }

  if (existsSync(destination) && (await stat(destination)).size === metadata.s) {
    console.log(`MEGA file already complete: ${destination}`);
    return;
  }

  const counter = Buffer.concat([rawKey.subarray(16, 24), Buffer.alloc(8)]);
  const startCounter = addCounterBlocks(counter, BigInt(alignedBytes / 16));
  const decipher = createDecipheriv('aes-128-ctr', fileKey, startCounter);
  const response = await fetch(metadata.g, {
    headers: alignedBytes > 0 ? { Range: `bytes=${alignedBytes}-` } : {},
  });
  if (!response.ok || !response.body) throw new Error(`MEGA download failed: ${response.status}`);
  console.log(`Downloading ${attributes.n} from byte ${alignedBytes.toLocaleString()} of ${metadata.s.toLocaleString()}`);
  await pipeline(
    Readable.fromWeb(response.body),
    new Transform({ transform(chunk, _encoding, callback) { callback(null, decipher.update(chunk)); } }),
    createWriteStream(partial, { flags: alignedBytes > 0 ? 'a' : 'w' }),
  );
  const finalSize = (await stat(partial)).size;
  if (finalSize !== metadata.s) throw new Error(`MEGA size mismatch: expected ${metadata.s}, got ${finalSize}`);
  await rename(partial, destination);
  const completedFile = await open(destination, 'r');
  const header = Buffer.alloc(8);
  await completedFile.read(header, 0, header.length, 0);
  await completedFile.close();
  if (!header.subarray(0, 4).equals(Buffer.from('Rar!'))) throw new Error('Downloaded MEGA file is not a RAR archive');
  await writeFile(
    path.join(ARCHIVE_ROOT, 'manifests', 'mega-listening-audio.json'),
    `${JSON.stringify({ sourceUrl: megaLink, filename: attributes.n, bytes: finalSize, sha256: await sha256File(destination), acquiredAt: new Date().toISOString() }, null, 2)}\n`,
  );
}

async function saveReferences() {
  const referenceDir = path.join(ARCHIVE_ROOT, 'raw/references');
  const docResponse = await fetch(googleDoc.url);
  if (!docResponse.ok) throw new Error(`Google Doc export failed: ${docResponse.status}`);
  await writeFile(path.join(referenceDir, 'oet-resources-google-doc.txt'), Buffer.from(await docResponse.arrayBuffer()));

  const metadataPath = path.join(referenceDir, 'official-oet-speaking-masterclass.json');
  const output = [];
  await new Promise((resolve, reject) => {
    const child = spawn('yt-dlp', ['--skip-download', '--dump-single-json', '--no-warnings', youtubeUrl]);
    child.stdout.on('data', (chunk) => output.push(chunk));
    child.stderr.pipe(process.stderr);
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`yt-dlp exited ${code}`))));
  });
  const video = JSON.parse(Buffer.concat(output).toString());
  await writeFile(metadataPath, `${JSON.stringify({ id: video.id, title: video.title, channel: video.channel, duration: video.duration, description: video.description, webpage_url: video.webpage_url, acquiredAt: new Date().toISOString() }, null, 2)}\n`);
}

await ensureLayout();
const requested = process.argv.slice(2);
const runAll = requested.length === 0 || requested.includes('--all');

if (runAll || requested.includes('--references')) await saveReferences();
if (runAll || requested.includes('--mega')) await downloadMega();
if (runAll || requested.includes('--drive')) {
  const results = [];
  for (const [id, label] of driveSources) {
    try {
      await downloadDrive(id, label);
      results.push({ id, label, sourceUrl: `https://drive.google.com/drive/folders/${id}`, status: 'downloaded' });
    } catch (error) {
      results.push({
        id,
        label,
        sourceUrl: `https://drive.google.com/drive/folders/${id}`,
        status: 'partial-or-failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  await writeFile(
    path.join(ARCHIVE_ROOT, 'reports', 'google-drive-acquisition.json'),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`,
  );
}

console.log('\nSource acquisition pass complete. Run npm run sources:inventory next.');
