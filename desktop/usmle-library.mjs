// Private, on-device study imports. No source content is written to web assets.
import { sourceYear, mergeSourceYears } from './usmle-years.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { confined, assetResponse } from './assets.mjs';

const exec = promisify(execFile);
const digest = value => createHash('sha256').update(value).digest('hex');
const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', le: '≤', ge: '≥', times: '×', deg: '°', micro: 'µ', alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ' };
export const decodeText = value => String(value ?? '').replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (all, code) => {
  if (code[0] !== '#') return entities[code] ?? all;
  const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
  return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : '';
});
export const plainText = html => decodeText(String(html ?? '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<\/(?:td|th)>/gi, ' | ').replace(/<br\s*\/?\s*>|<\/(?:div|p|li|h[1-6]|tr)>/gi, '\n').replace(/<[^>]*>/g, '')).replace(/[ \t]+/g, ' ').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

// Read only selected ZIP members, with bounded decompression and CRC checks.
// Anki's traditional .anki2 format is supported; newer compressed .anki21b
// exports stay explicitly unsupported rather than silently losing questions.
export async function openDeck(file) {
  const handle = await fs.open(file, 'r');
  try {
    const size = (await handle.stat()).size;
    const tail = Buffer.alloc(Math.min(size, 65557));
    await handle.read(tail, 0, tail.length, size - tail.length);
    let end = tail.length - 22;
    for (; end >= 0; end--) if (tail.readUInt32LE(end) === 0x06054b50 && end + 22 + tail.readUInt16LE(end + 20) === tail.length) break;
    if (end < 0) throw Error('This is not a supported Anki ZIP archive.');
    const count = tail.readUInt16LE(end + 10), length = tail.readUInt32LE(end + 12), offset = tail.readUInt32LE(end + 16);
    if (count === 65535 || length > 32_000_000 || offset + length > size || tail.readUInt16LE(end + 4) || tail.readUInt16LE(end + 6)) throw Error('Unsupported or oversized Anki archive.');
    const directory = Buffer.alloc(length);
    await handle.read(directory, 0, length, offset);
    const entries = new Map();
    let cursor = 0;
    for (let i = 0; i < count; i++) {
      if (cursor + 46 > length || directory.readUInt32LE(cursor) !== 0x02014b50) throw Error('Invalid Anki directory.');
      const nameLength = directory.readUInt16LE(cursor + 28), extra = directory.readUInt16LE(cursor + 30), comment = directory.readUInt16LE(cursor + 32);
      const name = directory.toString('utf8', cursor + 46, cursor + 46 + nameLength);
      if (entries.has(name)) throw Error('Duplicate archive member.');
      entries.set(name, { flags: directory.readUInt16LE(cursor + 8), method: directory.readUInt16LE(cursor + 10), crc: directory.readUInt32LE(cursor + 16), compressed: directory.readUInt32LE(cursor + 20), length: directory.readUInt32LE(cursor + 24), offset: directory.readUInt32LE(cursor + 42) });
      cursor += 46 + nameLength + extra + comment;
      if (cursor > length) throw Error('Invalid archive member.');
    }
    return {
      close: () => handle.close(),
      async read(name) {
        if (!/^(?:collection\.anki2|media|\d+)$/.test(name)) throw Error('Invalid Anki member.');
        const entry = entries.get(name);
        if (!entry) throw Error(`Anki archive is missing ${name === 'collection.anki2' ? 'a supported collection.anki2 export' : 'a referenced media file'}.`);
        if (entry.flags & 1 || entry.length > 128_000_000 || entry.compressed > 128_000_000 || ![0, 8].includes(entry.method)) throw Error('Unsupported or oversized Anki member.');
        const header = Buffer.alloc(30);
        await handle.read(header, 0, 30, entry.offset);
        if (header.readUInt32LE(0) !== 0x04034b50) throw Error('Invalid archive header.');
        const start = entry.offset + 30 + header.readUInt16LE(26) + header.readUInt16LE(28);
        if (start + entry.compressed > size) throw Error('Truncated archive.');
        const data = Buffer.alloc(entry.compressed);
        await handle.read(data, 0, data.length, start);
        const bytes = entry.method === 8 ? inflateRawSync(data, { maxOutputLength: Math.max(1, entry.length) }) : data;
        let crc = 0xffffffff;
        for (const byte of bytes) { crc ^= byte; for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
        if (bytes.length !== entry.length || ((crc ^ 0xffffffff) >>> 0) !== entry.crc) throw Error('Anki member failed its integrity check.');
        return bytes;
      },
    };
  } catch (error) { await handle.close(); throw error; }
}

const SUBJECTS = { 'Anatomy and Embryology': 'anatomy', Genetics: 'biochemistry', 'Biochemistry and Nutrition': 'biochemistry', 'Behavioral Science': 'behavioral', 'Biostatistics and Epidemiology': 'biostatistics', 'Pathology and Pathophysiology': 'pathology', 'Allergy and Immunology': 'immunology', Immunology: 'immunology', Microbiology: 'microbiology', Pharmacology: 'pharmacology', Physiology: 'physiology', Cardiology: 'cardiology', Dermatology: 'dermatology', ENT: 'ent', 'Emergency Medicine and Toxicology': 'emergency', Trauma: 'emergency', Endocrinology: 'endocrinology', 'Ethics and Communication': 'behavioral', 'Gastroenterology and Hepatology': 'gastroenterology', Gynecology: 'obgyn', Obstetrics: 'obgyn', Hematology: 'hematology', 'Infectious Diseases': 'infectious_disease', 'Nephrology and Electrolytes': 'nephrology', Urology: 'nephrology', Neurology: 'neurology', Oncology: 'oncology', Ophthalmology: 'ophthalmology', Orthopedics: 'musculoskeletal', 'Pediatrics and Neonatology': 'pediatrics', 'Preventive Medicine': 'preventive', Psychiatry: 'psychiatry', 'Pulmonology and Critical Care': 'pulmonology', Rheumatology: 'rheumatology', Surgery: 'surgery' };
const attribute = (html, name) => decodeText(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i').exec(html)?.[1] ?? '');
const blockNumber = text => Number(/block\D*(\d+)/i.exec(text)?.[1]) || undefined;
const questionNumber = text => Number(/question\D*(\d+)/i.exec(text)?.[1]) || undefined;

export function parseNote(note, models, decks) {
  const fields = note.flds.split('\x1f');
  const names = models[note.mid]?.flds.map(field => field.name) ?? [];
  const get = name => fields[names.indexOf(name)] ?? '';
  const deck = decks[note.did]?.name ?? '';
  const subject = deck.split('::').at(-1);
  const step = deck.includes('::Step 2 CK::') ? 'step2' : deck.includes('::Step 1::') ? 'step1' : null;
  let prompt, options, key, explanation, questionHtml, answerHtml;
  const tags = note.tags ?? '';
  const title = plainText(get('Title'));
  if (names.includes('option_1 (A)')) {
    questionHtml = get('Question'); answerHtml = get('Explanation');
    prompt = plainText(questionHtml);
    options = 'ABCDEFGH'.split('').map((letter, i) => ({ id: letter, label: plainText(get(`option_${i + 1} (${letter})`)) })).filter(option => option.label);
    key = plainText(get('Ans')).trim().toUpperCase(); explanation = plainText(answerHtml);
  } else if (names.includes('SearchText') && names.includes('Source')) {
    questionHtml = get('Question'); answerHtml = get('Answer');
    prompt = plainText(/<div\b[^>]*class=["']stem["'][^>]*>([\s\S]*?)<\/div>/i.exec(questionHtml)?.[1] ?? get('SearchText'));
    options = [...questionHtml.matchAll(/<input\b[^>]*>/gi)].map(match => ({ id: attribute(match[0], 'value'), label: attribute(match[0], 'aria-label').replace(/^[A-H][.)]\s*/, '') })).filter(option => /^[A-H]$/.test(option.id) && option.label);
    key = attribute(answerHtml, 'data-key').toUpperCase(); explanation = plainText(answerHtml);
  } else return null;
  const block = blockNumber(tags) ?? blockNumber(title) ?? blockNumber(deck), number = questionNumber(tags) ?? questionNumber(title);
  const reviewOnly = !prompt || options.length < 2 || options.filter(option => option.id === key).length !== 1 || new Set(options.map(option => option.id)).size !== options.length;
  return { prompt, options: options.map(option => ({ ...option, correct: option.id === key })), key: reviewOnly ? null : key, explanation, questionHtml, answerHtml, step, subject: SUBJECTS[subject] ? subject : null, discipline: SUBJECTS[subject], classification: step ? (tags.includes('classification::inferred') ? 'Source deck classification (inferred)' : 'Source deck classification') : 'Step not assigned', block, number, sourceNote: plainText(get('Source')), reviewOnly };
}

function mediaExtension(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return '.png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return '.jpg';
  if (/^GIF8[79]a$/.test(bytes.toString('ascii', 0, 6))) return '.gif';
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return '.webp';
  return null;
}

export async function readPrivateLibrary(root) {
  try {
    const index = JSON.parse(await fs.readFile(path.join(root, 'index.json'), 'utf8'));
    if (index.version !== 1 || !Array.isArray(index.questions) || !Array.isArray(index.resources)) throw Error('The private USMLE index is invalid. Re-import its source folder.');
    return index;
  } catch (error) { if (error.code === 'ENOENT') return { version: 1, questions: [], resources: [], warnings: [], importedAt: null }; throw error; }
}

export async function privateUsmleResponse(root, relative, request) {
  if (!/^(?:media|originals)\/[a-f0-9]{64}\.(?:png|jpg|gif|webp|pdf)$/.test(relative)) return new Response(null, { status: 404 });
  const response = await assetResponse(await confined(root, relative), request);
  response.headers.set('Content-Security-Policy', "default-src 'none'; sandbox");
  return response;
}

export async function importUsmleFolder(source, root, onProgress = () => {}) {
  await fs.mkdir(root, { recursive: true, mode: 0o700 });
  const lockPath = path.join(root, 'import.lock');
  try {
    const old = JSON.parse(await fs.readFile(lockPath, 'utf8'));
    try { process.kill(old.pid, 0); throw Error('A private USMLE import is already running.'); }
    catch (error) { if (error.code === 'ESRCH') await fs.unlink(lockPath); else throw error; }
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const lock = await fs.open(lockPath, 'wx', 0o600);
  await lock.writeFile(JSON.stringify({ pid: process.pid }));
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'oet-usmle-'));
  try {
    const previous = await readPrivateLibrary(root);
    const questions = new Map(previous.questions.map(question => [question.identity, question]));
    const resources = new Map(previous.resources.map(resource => [resource.sha256, resource]));
    const warnings = [];
    const files = [];
    async function walk(folder, depth = 0) {
      if (depth > 8) return;
      for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
        if (entry.name.startsWith('.') || ['tmp', 'node_modules', 'Mac App'].includes(entry.name)) continue;
        const full = path.join(folder, entry.name);
        if (entry.isDirectory()) await walk(full, depth + 1);
        else if (entry.isFile() && /\.(?:apkg|pdf)$/i.test(entry.name)) files.push(full);
      }
    }
    await walk(source);
    // Prefer the user's final source-corrected deck over earlier editions.
    files.sort((a, b) => (a.includes('Step and Subject') ? -1 : b.includes('Step and Subject') ? 1 : a.localeCompare(b)));
    let extracted = null;
    try { extracted = JSON.parse(await fs.readFile(path.join(source, 'tmp/chapterisation/question_content.json'), 'utf8')); } catch { /* Optional readable text supplement. */ }
    const supplemental = new Map(Array.isArray(extracted) ? extracted.map(row => [`${row.block}:${row.question}`, row]) : []);
    const seenContent = new Map([...questions.values()].map(question => [digest(question.prompt.toLowerCase().replace(/\W/g, '') + question.options.map(option => option.label.toLowerCase().replace(/\W/g, '')).join('|')), question.identity]));
    const store = async (bytes, folder, extension) => {
      const sha = digest(bytes), relative = `${folder}/${sha}${extension}`;
      await fs.mkdir(path.join(root, folder), { recursive: true, mode: 0o700 });
      try { await fs.writeFile(path.join(root, relative), bytes, { flag: 'wx', mode: 0o600 }); } catch (error) { if (error.code !== 'EEXIST') throw error; }
      return relative;
    };
    for (let i = 0; i < files.length; i++) {
      const file = files[i], name = path.basename(file);
      if (/NAPLEX/i.test(name) || /Merged\.pdf$/i.test(name)) continue;
      onProgress({ state: 'importing', message: `Reading ${i + 1} of ${files.length}: ${name}` });
      if (/\.pdf$/i.test(file)) {
        const bytes = await fs.readFile(file);
        if (!bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) { warnings.push(`${name}: not a valid PDF.`); continue; }
        const sha256 = digest(bytes);
        if (!resources.has(sha256)) resources.set(sha256, { ...sourceYear(name), id: sha256, sha256, name, kind: 'pdf', asset: await store(bytes, 'originals', '.pdf'), addedAt: new Date().toISOString(), size: bytes.length });
        else resources.set(sha256, { ...resources.get(sha256), ...mergeSourceYears(resources.get(sha256), sourceYear(name)) });
        continue;
      }
      // Hash streams avoid loading a large deck archive into memory.
      const { createReadStream } = await import('node:fs');
      const hash = createHash('sha256'); for await (const chunk of createReadStream(file)) hash.update(chunk);
      const sha256 = hash.digest('hex');
      const archive = await openDeck(file);
      const beforeDeck = new Map(questions);
      try {
        const db = path.join(temp, 'collection.anki2');
        await fs.writeFile(db, await archive.read('collection.anki2'), { mode: 0o600 });
        const query = async sql => JSON.parse((await exec('/usr/bin/sqlite3', ['-safe', '-noinit', '-readonly', '-nofollow', '-json', await fs.realpath(db), `PRAGMA trusted_schema=OFF; ${sql}`], { maxBuffer: 128_000_000, timeout: 120000 })).stdout || '[]');
        const collection = (await query('SELECT models,decks FROM col LIMIT 1'))[0];
        const models = JSON.parse(collection.models), decks = JSON.parse(collection.decks);
        const notes = await query('SELECT n.guid,n.mid,n.flds,n.tags,coalesce((SELECT did FROM cards c WHERE c.nid=n.id LIMIT 1),0) AS did FROM notes n ORDER BY n.id');
        const media = JSON.parse((await archive.read('media')).toString('utf8'));
        const mediaNames = new Map(Object.entries(media).filter(([key, value]) => /^\d+$/.test(key) && typeof value === 'string').map(([key, value]) => [value, key]));
        const cachedMedia = new Map();
        const images = async html => {
          const result = [];
          for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
            const name = attribute(match[0], 'src'), member = mediaNames.get(name);
            if (!member) { warnings.push('A referenced deck image was missing; check its original source.'); continue; }
            if (!cachedMedia.has(name)) {
              const bytes = await archive.read(member), extension = mediaExtension(bytes);
              cachedMedia.set(name, extension ? await store(bytes, 'media', extension) : null);
              if (!extension) warnings.push('An unsupported image was excluded from the private viewer.');
            }
            if (cachedMedia.get(name)) result.push(cachedMedia.get(name));
          }
          return [...new Set(result)];
        };
        let supported = 0;
        for (const note of notes) {
          const parsed = parseNote(note, models, decks);
          if (!parsed) continue;
          supported++;
          const { questionHtml, answerHtml, ...question } = parsed;
          const coordinate = parsed.block && parsed.number ? `${parsed.block}:${parsed.number}` : null;
          // Coordinates identify this folder's successive exports of the same
          // source blocks; unrelated folders use a separate namespace.
          let identity = digest(`${path.resolve(source)}\0${coordinate ?? `${sha256}:${note.guid}`}`);
          const existing = questions.get(identity);
          if (existing) {
            const normalize = value => value.toLowerCase().replace(/\W/g, '');
            const before = normalize(existing.prompt), after = normalize(parsed.prompt);
            const sameQuestion = before === after || before.length > 100 && after.length > 100 && (before.startsWith(after) || after.startsWith(before));
            if (sameQuestion && existing.sourceName.includes('Step and Subject') && !name.includes('Step and Subject')) { questions.set(identity, { ...existing, ...mergeSourceYears(existing, sourceYear(name, note.tags ?? '')) }); continue; }
            // A repeated coordinate with a different stem is a different edition.
            if (!sameQuestion) identity = digest(`${identity}\0${after}`);
          }
          const contentKey = digest(parsed.prompt.toLowerCase().replace(/\W/g, '') + parsed.options.map(option => option.label.toLowerCase().replace(/\W/g, '')).join('|'));
          const duplicate = seenContent.get(contentKey);
          if (duplicate && duplicate !== identity) { const current = questions.get(duplicate); questions.set(duplicate, { ...current, ...mergeSourceYears(current, sourceYear(name, note.tags ?? '')) }); continue; }
          seenContent.set(contentKey, identity);
          const supplement = coordinate && supplemental.get(coordinate);
          if (supplement && parsed.step && supplement.key === parsed.key) question.explanation = [supplement.explanation, supplement.objective].filter(Boolean).join('\n\n');
          if (supplement && parsed.step && supplement.key !== parsed.key) question.sourceNote += '\nThe final deck key differs from the earlier text extraction. The final printed-key correction is retained; review the original answer pages.';
          const old = questions.get(identity);
          questions.set(identity, { ...question, ...mergeSourceYears(old, sourceYear(name, note.tags ?? '')), id: `private-usmle-${identity.slice(0, 24)}`, identity, sourceId: sha256, sourceName: name, addedAt: old?.addedAt ?? new Date().toISOString(), questionImages: await images(questionHtml), answerImages: await images(answerHtml) });
        }
        if (!supported) throw Error('No supported multiple-choice or source study cards were found.');
        resources.set(sha256, { ...mergeSourceYears(resources.get(sha256), sourceYear(name)), id: sha256, sha256, name, kind: 'deck', questions: supported, size: (await fs.stat(file)).size, addedAt: resources.get(sha256)?.addedAt ?? new Date().toISOString() });
      } catch (error) {
        questions.clear(); for (const [key, value] of beforeDeck) questions.set(key, value);
        seenContent.clear(); for (const question of questions.values()) seenContent.set(digest(question.prompt.toLowerCase().replace(/\W/g, '') + question.options.map(option => option.label.toLowerCase().replace(/\W/g, '')).join('|')), question.identity);
        warnings.push(`${name}: ${error.message}`);
      }
      finally { await archive.close(); }
    }
    const index = { version: 1, importedAt: new Date().toISOString(), questions: [...questions.values()].sort((a,b) => (b.productionYear ?? 0) - (a.productionYear ?? 0)), resources: [...resources.values()].sort((a,b) => (b.productionYear ?? 0) - (a.productionYear ?? 0)), warnings: [...new Set(warnings)] };
    const pending = path.join(root, 'index.next.json');
    await fs.writeFile(pending, JSON.stringify(index), { mode: 0o600 });
    await fs.rename(pending, path.join(root, 'index.json'));
    return index;
  } finally { await fs.rm(temp, { recursive: true, force: true }); await lock.close(); await fs.unlink(path.join(root, 'import.lock')); }
}
