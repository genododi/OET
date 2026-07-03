import { access, readFile, stat } from 'node:fs/promises';
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
if (entries.length !== 25) fail(`Expected 25 Listening task clips, found ${entries.length}`);

const questions = new Set();
for (const [id, definition] of entries) {
  if (questions.has(definition.question)) fail(`${id} duplicates another question`);
  questions.add(definition.question);

  const script = normalize(definition.script);
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
}

console.log(`Validated ${entries.length} unique question-matched Listening clips.`);
