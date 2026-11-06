// Build a bounded Pages artifact; never remove source or Mac/offline assets.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { isRepositoryStudyAsset } from '../src/lib/repositoryAssets.ts';
const root = path.resolve('dist');
try { await fs.access(path.join(root, 'repository-assets.json')); throw Error('Rebuild dist before preparing another Pages artifact'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const tracked = new Set(execFileSync('git', ['ls-tree', '-r', '--name-only', revision, '--', 'public'], { encoding: 'utf8', maxBuffer: 10*1024*1024 }).trim().split('\n'));
const published = [];
let bytes = 0;
async function visit(folder) {
  for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name);
    if (entry.isSymbolicLink()) throw Error('Pages must not contain symbolic links');
    if (entry.isDirectory()) { await visit(file); continue; }
    const relative = path.relative(root, file).split(path.sep).join('/');
    if (!isRepositoryStudyAsset(relative)) { bytes += (await fs.stat(file)).size; continue; }
    const buffer = await fs.readFile(file);
    const original = await fs.readFile(path.join('public', relative));
    const sha256 = createHash('sha256').update(buffer).digest('hex');
    if (sha256 !== createHash('sha256').update(original).digest('hex')) throw Error(`Modified original: ${relative}`);
    // This original must already exist in the same public source revision.
    if (!tracked.has(`public/${relative}`)) throw Error(`Original is not in public source: ${relative}`);
    published.push({ path: relative, bytes: buffer.length, sha256,
      url: `https://raw.githubusercontent.com/genododi/OET/${revision}/public/${relative}` });
    await fs.unlink(file);
  }
}
await visit(root);
const report = JSON.stringify({ gitCommit: revision, pagesBytes: bytes, files: published });
if (bytes + Buffer.byteLength(report) >= 950_000_000) throw Error('Pages artifact exceeds its 950 MB safety budget');
await fs.writeFile(path.join(root, 'repository-assets.json'), report);
console.log(JSON.stringify({ pagesBytes: bytes, repositoryFiles: published.length, repositoryBytes: published.reduce((n, f) => n+f.bytes, 0) }));
