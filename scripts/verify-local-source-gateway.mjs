import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const fixtureRoot = await mkdtemp(resolve(tmpdir(), 'oet-source-gateway-test-'));
const fixtureText = 'authentic OET local source gateway fixture';
const fixtureName = 'Sample paper.pdf';
await writeFile(resolve(fixtureRoot, fixtureName), fixtureText);

const port = 44000 + Math.floor(Math.random() * 1000);
const child = spawn(process.execPath, [resolve(projectRoot, 'scripts/serve-local-source-files.mjs')], {
  env: {
    ...process.env,
    OET_LOCAL_SOURCE_PORT: String(port),
    OET_LOCAL_SOURCE_ROOT: fixtureRoot,
  },
  stdio: 'ignore',
});

const origin = `http://127.0.0.1:${port}`;
try {
  let healthResponse;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      healthResponse = await fetch(`${origin}/health`);
      if (healthResponse.ok) break;
    } catch {
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 50));
    }
  }
  assert.ok(healthResponse?.ok, 'Local source gateway did not become healthy');
  assert.equal((await healthResponse.json()).available, true);

  const fileUrl = `${origin}/file?path=${encodeURIComponent(fixtureName)}`;
  const fileResponse = await fetch(fileUrl);
  assert.equal(fileResponse.status, 200);
  assert.equal(await fileResponse.text(), fixtureText);

  const rangeResponse = await fetch(fileUrl, { headers: { Range: 'bytes=0-8' } });
  assert.equal(rangeResponse.status, 206);
  assert.equal(await rangeResponse.text(), fixtureText.slice(0, 9));

  const traversalResponse = await fetch(`${origin}/file?path=${encodeURIComponent('../outside.pdf')}`);
  assert.equal(traversalResponse.status, 404);
  console.log('Verified read-only local source streaming, byte ranges, and path confinement.');
} finally {
  child.kill('SIGTERM');
  await rm(fixtureRoot, { recursive: true, force: true });
}

