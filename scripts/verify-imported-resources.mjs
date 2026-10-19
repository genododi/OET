import fs from 'node:fs';
import assert from 'node:assert/strict';
const catalog = JSON.parse(fs.readFileSync('public/imported-resources/catalog.json', 'utf8'));
assert.equal(catalog.version, 1);
assert.equal(new Set(catalog.files.map(file => file.id)).size, catalog.files.length);
assert.equal(new Set(catalog.files.map(file => file.sha256)).size, catalog.files.length);
for (const file of catalog.files) {
  assert.match(file.sha256, /^[a-f0-9]{64}$/);
  assert.equal(file.id, `offline-${file.sha256.slice(0, 20)}`);
  assert.ok(Number.isSafeInteger(file.bytes) && file.bytes > 0);
  assert.ok(['pdf', 'docx', 'mp3', 'm4a', 'mp4', 'jpg', 'jpeg', 'png', 'wav'].includes(file.format));
  assert.match(file.assetPath, /^https:\/\/github\.com\/genododi\/OET\/releases\/download\/genododi-library-2026-10-19(?:-\d+)?\//);
  assert.ok(file.assetPath.endsWith(`/${file.sha256}.${file.format}`));
  assert.equal(file.textPath, `imported-resources/text/${file.sha256}.json`);
  const text = JSON.parse(fs.readFileSync(`public/${file.textPath}`, 'utf8'));
  assert.equal(text.sourceSha256, file.sha256);
  assert.equal(typeof text.text, 'string');
  if (text.pages) for (const [index, page] of text.pages.entries()) { assert.equal(page.number, index + 1); assert.equal(typeof page.text, 'string'); }
  assert.ok(file.skills.length && file.skills.every(skill => ['reading', 'listening', 'writing', 'speaking'].includes(skill)));
}
console.log(`Verified ${catalog.files.length} imported originals, source hashes, searchable text and release download links.`);
