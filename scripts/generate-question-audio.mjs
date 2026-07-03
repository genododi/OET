import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const definitionsPath = resolve(projectRoot, 'src/data/listeningTaskAudio.json');
const outputDirectory = resolve(projectRoot, 'public/audio/question-matched');
const definitions = JSON.parse(await readFile(definitionsPath, 'utf8'));
const requestedIds = new Set(process.argv.slice(2));

function hashString(input) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

await mkdir(outputDirectory, { recursive: true });

for (const [id, definition] of Object.entries(definitions)) {
  if (requestedIds.size > 0 && !requestedIds.has(id)) continue;
  const workingDirectory = await mkdtemp(resolve(tmpdir(), 'oet-question-audio-'));
  const sourcePath = resolve(workingDirectory, `${id}.aiff`);
  const outputPath = resolve(outputDirectory, `${id}.mp3`);
  const revision = hashString(JSON.stringify(definition)).toString(36);

  try {
    await run('say', [
      '-v', definition.voice,
      '-r', '160',
      '-o', sourcePath,
      definition.speechScript ?? definition.script,
    ]);
    await run('ffmpeg', [
      '-v', 'error',
      '-y',
      '-i', sourcePath,
      '-codec:a', 'libmp3lame',
      '-b:a', '96k',
      '-ac', '1',
      '-ar', '44100',
      '-metadata', `title=${id}`,
      '-metadata', `comment=Question-matched OET task revision ${revision}`,
      outputPath,
    ]);
    console.log(`Generated ${id}.mp3 (${revision})`);
  } finally {
    await rm(workingDirectory, { recursive: true, force: true });
  }
}
