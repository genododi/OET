#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = process.env.OET_LOCAL_SOURCE_FOLDER
  ?? '/Volumes/GENODODI/oet-study-sources/Google drive Folder';
const outputRoot = path.join(projectRoot, 'public/audio/real-listening');
const manifestPath = path.join(projectRoot, 'src/data/realListeningAudio.generated.json');

if (!existsSync(sourceRoot)) throw new Error(`Local OET source folder is not mounted: ${sourceRoot}`);

const sourceRootEntries = await readdir(sourceRoot, { withFileTypes: true });
const jahshanDirectory = sourceRootEntries.find((entry) =>
  entry.isDirectory() && entry.name.replace(/[\p{Cf}]/gu, '').toLowerCase().includes('jahshan'),
);
if (!jahshanDirectory) throw new Error('Could not locate the Jahshan OET collection in the source folder.');

const listeningRoot = path.join(sourceRoot, jahshanDirectory.name, 'OET Listening');
const definitions = [
  {
    id: 'source-sample-test-1',
    title: 'Real Listening Sample Test 1',
    sourceDirectory: '3- Sample Test 1',
    sourcePrefix: '3-Part',
    script: '3- Sample Test 1.pdf',
    answerKey: 'Listening-Sample-Test-1-Answer-Key.pdf',
    questionPdf: '/pdfs/books/oet-listening-sample-test-1.pdf',
    output: 'source-sample-test-1.mp3',
  },
  {
    id: 'source-sample-test-2',
    title: 'Real Listening Sample Test 2',
    sourceDirectory: '4- Sample Test 2',
    sourcePrefix: '4-Part',
    script: '4- Sample Test 2.pdf',
    answerKey: 'Listening-Sample-Test-2-Answer-Key.pdf',
    questionPdf: '/pdfs/books/oet-listening-sample-test-2.pdf',
    output: 'source-sample-test-2.mp3',
  },
];

async function sha256(filename) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return hash.digest('hex');
}

async function probe(filename) {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration,size', '-of', 'json', filename,
  ]);
  const parsed = JSON.parse(stdout).format;
  return { durationSeconds: Math.round(Number(parsed.duration) * 1000) / 1000, bytes: Number(parsed.size) };
}

async function concatenate(parts, destination) {
  const temporary = `${destination}.tmp.mp3`;
  const args = ['-y'];
  for (const part of parts) args.push('-i', part);
  args.push(
    '-filter_complex', '[0:a][1:a][2:a]concat=n=3:v=0:a=1[out]',
    '-map', '[out]', '-codec:a', 'libmp3lame', '-b:a', '64k', '-ac', '1', '-ar', '44100',
    temporary,
  );
  await new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let errorOutput = '';
    child.stderr.on('data', (chunk) => { errorOutput += chunk; });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(errorOutput)));
  });
  await rename(temporary, destination);
}

const previous = existsSync(manifestPath)
  ? JSON.parse(await readFile(manifestPath, 'utf8'))
  : { tests: [] };
const previousById = new Map((previous.tests ?? []).map((test) => [test.id, test]));
const tests = [];
let imported = 0;

await mkdir(outputRoot, { recursive: true });
for (const definition of definitions) {
  const parts = [];
  const partFiles = [];
  for (const part of ['A', 'B', 'C']) {
    const filename = path.join(
      listeningRoot,
      'Audio',
      definition.sourceDirectory,
      `${definition.sourcePrefix} ${part}.mp3`,
    );
    if (!existsSync(filename)) throw new Error(`Missing matched listening track: ${filename}`);
    const metadata = await stat(filename);
    const digest = await sha256(filename);
    const media = await probe(filename);
    parts.push({
      part,
      sourceRelativePath: path.relative(sourceRoot, filename),
      bytes: metadata.size,
      durationSeconds: media.durationSeconds,
      sha256: digest,
    });
    partFiles.push(filename);
  }

  const scriptPath = path.join(listeningRoot, 'Script', definition.script);
  const answerKeyPath = path.join(sourceRoot, definition.answerKey);
  if (!existsSync(scriptPath) || !existsSync(answerKeyPath)) {
    throw new Error(`Missing matched script or answer key for ${definition.title}`);
  }

  const outputPath = path.join(outputRoot, definition.output);
  const inputRevision = createHash('sha256')
    .update(parts.map((part) => part.sha256).join(':'))
    .digest('hex');
  const old = previousById.get(definition.id);
  if (!existsSync(outputPath) || old?.inputRevision !== inputRevision) {
    await concatenate(partFiles, outputPath);
    imported += 1;
  }
  const outputMedia = await probe(outputPath);

  tests.push({
    id: definition.id,
    title: definition.title,
    audioPath: `/audio/real-listening/${definition.output}`,
    questionPdf: definition.questionPdf,
    sourceRootLabel: 'GENODODI/oet-study-sources/Google drive Folder',
    sourceScriptRelativePath: path.relative(sourceRoot, scriptPath),
    sourceScriptSha256: await sha256(scriptPath),
    answerKeyRelativePath: path.relative(sourceRoot, answerKeyPath),
    answerKeySha256: await sha256(answerKeyPath),
    sourceUrl: 'https://oet.com/ready/sample-tests',
    redistributionStatus: 'official-public',
    inputRevision,
    outputSha256: await sha256(outputPath),
    outputBytes: outputMedia.bytes,
    outputDurationSeconds: outputMedia.durationSeconds,
    parts,
  });
}

const comparable = JSON.stringify(tests);
if (JSON.stringify(previous.tests ?? []) === comparable) {
  console.log(`Real listening audio unchanged: ${tests.length} matched 42-question tests.`);
  process.exit(0);
}

await writeFile(manifestPath, `${JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), tests }, null, 2)}\n`);
console.log(`Imported ${imported} real listening recording(s); verified ${tests.length} matched test packs.`);
