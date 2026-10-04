import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('src/data/officialExamAssets.json', root), 'utf8'));
assert.equal(manifest.assets.length, 10);
for (const asset of manifest.assets) {
  assert.match(asset.path, /^sample-[12]-(reading-a|reading-bc|writing|speaking-candidate|speaking-partner)\.pdf$/);
  assert.ok(asset.sourceUrl.startsWith('https://cdn-aus.aglty.io/oet/pdf-files/sample-tests/'));
  assert.match(asset.sourceSha256, /^[a-f0-9]{64}$/);
  assert.ok(asset.sourcePages.length > 0);
  const bytes = await readFile(new URL(`public/official-exam-papers/${asset.path}`, root));
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256);
}
console.log('Verified 10 original OET paper sections/cards, page provenance and asset checksums.');
