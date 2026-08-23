import { mkdir, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const helperPath = resolve(projectRoot, 'scripts/transcribe-question-audio.py');
const temporaryDirectory = resolve(projectRoot, 'node_modules/.tmp');
await mkdir(temporaryDirectory, { recursive: true });
const definitions = JSON.parse(
  await readFile(resolve(projectRoot, 'src/data/listeningTaskAudio.json'), 'utf8'),
);
const entries = Object.entries(definitions);
const assetPaths = entries.map(([id]) =>
  resolve(projectRoot, `public/audio/question-matched/${id}.mp3`));

function normalize(value) {
  return value
    .toLowerCase()
    .replace(/metform in/g, 'metformin')
    .replace(/poly pharmacy/g, 'polypharmacy')
    .replace(/nineteen sixty[- ]eight/g, '1968')
    .replace(/five hundred/g, '500')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function transcribe() {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('python3', [helperPath, ...assetPaths], {
      env: {
        ...process.env,
        TMPDIR: temporaryDirectory,
        OMP_NUM_THREADS: '1',
      },
    });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Spoken-audio audit failed. ${stderr.trim()}`));
        return;
      }
      try {
        resolvePromise(JSON.parse(stdout.trim().split('\n').at(-1)));
      } catch (error) {
        reject(new Error(`Could not parse speech audit output: ${error.message}`));
      }
    });
  });
}

const transcriptions = await transcribe();
const auditFailures = [];

for (const [id, definition] of entries) {
  const assetPath = resolve(projectRoot, `public/audio/question-matched/${id}.mp3`);
  const spoken = normalize(transcriptions[assetPath] ?? '');
  const expected = normalize(definition.script);
  const expectedWords = new Set(expected.split(' '));
  const spokenWords = new Set(spoken.split(' '));
  const matchedWords = [...expectedWords].filter((word) => spokenWords.has(word));
  const coverage = matchedWords.length / expectedWords.size;

  // Some legacy clips deliberately use a concise speechScript rather than the
  // longer teaching transcript. Full-script overlap is therefore diagnostic,
  // not a pass criterion; audible answer evidence below is authoritative.
  if (spokenWords.size < 4) {
    auditFailures.push(`${id} recording contains too little audible speech`);
    continue;
  }
  const audibleEvidence = definition.evidenceTerms.filter((term) =>
    spoken.includes(normalize(term)));
  // Medical terms are the least reliable part of small-model transcription
  // (for example, "cholecystitis" may be rendered phonetically). Accept either
  // an exact evidence term or substantial agreement with the stored script.
  if (audibleEvidence.length === 0 && coverage < 0.4) {
    auditFailures.push(
      `${id} recording has neither audible evidence nor sufficient script overlap (${Math.round(coverage * 100)}%)`,
    );
  }
  console.log(
    `${id}: ${Math.round(coverage * 100)}% spoken coverage; ${audibleEvidence.length}/${definition.evidenceTerms.length} evidence terms heard.`,
  );
}

if (auditFailures.length > 0) {
  throw new Error(`Spoken-audio evidence audit failed:\n${auditFailures.join('\n')}`);
}
