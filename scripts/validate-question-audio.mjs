import { access, readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const definitions = JSON.parse(
  await readFile(resolve(projectRoot, 'src/data/listeningTaskAudio.json'), 'utf8'),
);

function normalize(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function fail(message) {
  throw new Error(message);
}

const entries = Object.entries(definitions);
if (entries.length < 100) fail(`Expected at least 100 Listening task clips, found ${entries.length}`);

const questions = new Set();
const scripts = new Map();
const audioHashes = new Map();
const orderedIds = entries
  .map(([id]) => Number(id.replace(/^lis-/, '')))
  .sort((a, b) => a - b);

for (let i = 1; i <= orderedIds.at(-1); i += 1) {
  if (!orderedIds.includes(i)) fail(`Missing sequential listening audio definition lis-${i}`);
}

for (const [id, definition] of entries) {
  if (questions.has(definition.question)) fail(`${id} duplicates another question`);
  questions.add(definition.question);

  const script = normalize(definition.script);
  const existingScript = scripts.get(script);
  if (existingScript) fail(`${id} duplicates the script used by ${existingScript}`);
  scripts.set(script, id);

  for (const term of definition.evidenceTerms) {
    if (!script.includes(normalize(term))) {
      fail(`${id} script does not contain answer evidence “${term}”`);
    }
  }

  const assetPath = resolve(projectRoot, `public/audio/question-matched/${id}.mp3`);
  await access(assetPath);
  const assetStat = await stat(assetPath);
  if (assetStat.size < 10_000) fail(`${id} audio asset is unexpectedly small`);

  const bytes = await readFile(assetPath);
  const hasId3 = bytes.subarray(0, 3).toString() === 'ID3';
  const hasMpegFrame = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
  if (!hasId3 && !hasMpegFrame) fail(`${id} is not a valid MP3 asset`);

  const audioHash = createHash('sha256').update(bytes).digest('hex');
  const existingAudio = audioHashes.get(audioHash);
  if (existingAudio) fail(`${id} duplicates the MP3 audio asset used by ${existingAudio}`);
  audioHashes.set(audioHash, id);
}

console.log(`Validated ${entries.length} unique question-matched Listening clips.`);
