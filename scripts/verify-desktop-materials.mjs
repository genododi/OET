import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(await readFile(path.join(root, 'src/data/desktopMaterials.generated.json'), 'utf8'));
assert.equal(catalog.version, 1);
assert.equal(catalog.files.length, catalog.fileCount);
assert.equal(new Set(catalog.files.map(file => file.id)).size, catalog.fileCount);
assert.equal(catalog.files.filter(file => file.collection === 'AMR').length, catalog.amrCount);
assert.equal(new Set(catalog.files.map(file => file.sha256)).size, catalog.uniqueFileCount);
assert.equal(catalog.files.reduce((sum, file) => sum + file.bytes, 0), catalog.totalBytes);
assert.ok(catalog.publicationBasis.includes('explicitly requested'));
const verified = new Set();
for (const file of catalog.files) {
  assert.match(file.assetPath, /^supplied-materials\/files\/[a-f0-9]{64}\.(pdf|docx|pptx|jpg|jpeg|png|apkg|html\.txt|mp3|m4a|wav|mp4)$/);
  assert.equal(file.textPath, `supplied-materials/text/${file.sha256}.json`);
  assert.ok(file.skills.every(skill => ['listening', 'reading', 'writing', 'speaking'].includes(skill)));
  if (file.duplicateOf) assert.ok(catalog.files.some(other => other.id === file.duplicateOf && other.sha256 === file.sha256 && !other.duplicateOf));
  const sourcePath = path.join(root, file.relativePath);
  try {
    const original = await readFile(sourcePath);
    assert.equal(createHash('sha256').update(original).digest('hex'), file.sha256, `Original mismatch: ${file.relativePath}`);
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (verified.has(file.sha256)) continue;
  const asset = path.join(root, 'public', file.assetPath);
  assert.ok((await stat(asset)).size < 100 * 1024 * 1024);
  const bytes = await readFile(asset);
  assert.equal(bytes.length, file.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.filename);
  const text = JSON.parse(await readFile(path.join(root, 'public', file.textPath), 'utf8'));
  assert.equal(typeof text.text, 'string');
  if (file.pageCount) {
    assert.equal(text.sourceSha256, file.sha256);
    assert.equal(text.pages.length, file.pageCount);
    assert.equal(text.pages.filter(page => page.extraction === 'ocr').length, file.ocrPageCount);
    for (const [index, page] of text.pages.entries()) {
      assert.equal(page.number, index + 1);
      assert.equal(typeof page.text, 'string');
      assert.ok(['text', 'ocr', 'none'].includes(page.extraction));
    }
    assert.equal(text.text, text.pages.map(page => page.text).join('\n\f\n'));
  } else assert.ok(!['pdf', 'jpg', 'jpeg', 'png'].includes(file.format), 'Every PDF and source image needs page-numbered text or an explicit empty page');
  verified.add(file.sha256);
}
assert.equal((await readdir(path.join(root, 'public/supplied-materials/files'))).length, catalog.uniqueFileCount, 'Uncatalogued original in public folder');
for (const skill of ['listening', 'reading', 'writing', 'speaking']) assert.ok(catalog.files.some(file => file.skills.includes(skill)), `Missing ${skill} sources`);
console.log(`Verified ${catalog.fileCount} supplied files, ${catalog.amrCount} AMR paths, ${catalog.uniqueFileCount} checksummed originals and all four skill routes.`);
