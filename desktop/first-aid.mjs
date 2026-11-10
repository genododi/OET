// The learner's own textbook stays in Application Support, outside published assets.
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { confined } from './assets.mjs';

const exec = promisify(execFile);
const STOP = new Set('a an and are as at be been being by can could did do does during for from had has have how if in into is it its may most of on or patient patients question following likely diagnosis mechanism cause condition treatment presents presenting year years old man woman boy girl his her he she their they this that the these those to was were what when which who why with without would you your clinical history examination reveals shows finding findings associated result results answer explanation option'.split(' '));
export const firstAidWords = text => (String(text).toLowerCase().replace(/([a-z])-\s*\n\s*(?=[a-z])/g,'$1').replace(/-/g,' ').match(/[a-z][a-z0-9]{2,}/g) ?? []).filter(word => !STOP.has(word));

export function indexFirstAid(text, resource) {
  const pages = text.split('\f').map((text, i) => ({ page: i+1, text: text.trim() })).filter(page => page.text);
  if (pages.length < 20 || pages.reduce((sum, page) => sum+firstAidWords(page.text).length, 0) < 2000) throw Error('This PDF needs text recognition before First Aid matching can work.');
  return { version: 1, sourceSha256: resource.sha256, sourceName: resource.name, edition: resource.productionYear ?? null, pageCount: pages.length, pages };
}

export function prepareFirstAid(index) {
  const sections = [];
  for (const page of index.pages) {
    if (page.page<20 || /^\s*INDEX\b/i.test(page.text) || /^\s*\d+\s+INDEX\b/i.test(page.text)) continue;
    const lines = page.text.split('\n');
    for (let line=0; line<lines.length; line+=7) {
      const text = lines.slice(line, line+12).join('\n').trim();
      if (text.length < 100) continue;
      const counts = new Map();
      for (const word of firstAidWords(text)) counts.set(word, (counts.get(word) ?? 0)+1);
      sections.push({ page: page.page, text, counts, rapid: /RAPID\s+REv?IEw/i.test(page.text.slice(0,180)), length: [...counts.values()].reduce((a,b) => a+b, 0) });
    }
  }
  const frequencies = new Map();
  for (const section of sections) for (const word of section.counts.keys()) frequencies.set(word, (frequencies.get(word) ?? 0)+1);
  return { index, sections, frequencies, average: sections.reduce((sum, section) => sum+section.length, 0)/Math.max(1,sections.length) };
}

/** Retrieve actual text; never generate textbook wording or an invented page. */
export function searchFirstAid(prepared, { prompt='', answer='', explanation='', query='' }) {
  const { index, sections, frequencies, average } = prepared;
  const weights = new Map();
  for (const [text, weight] of (query.trim() ? [[query, 5]] : [[answer, 5], [explanation, 2], [prompt, 1]])) {
    for (const word of new Set(firstAidWords(text))) weights.set(word, Math.max(weight, weights.get(word) ?? 0));
  }
  const terms = [...weights.keys()].filter(word => frequencies.has(word)).sort((a,b) => (weights.get(b)*Math.log(1+sections.length/frequencies.get(b)))-(weights.get(a)*Math.log(1+sections.length/frequencies.get(a)))).slice(0,36);
  const phrase = answer.trim().toLowerCase();
  const concept=firstAidWords(answer || query);
  const ranked = sections.flatMap(section => {
    const matched = terms.filter(term => section.counts.has(term));
    const distinct = matched.filter(term => frequencies.get(term)/Math.max(1,sections.length) < .12);
    if ((matched.length < 2 && !(query.trim() && terms.length===1 && distinct.length)) || !distinct.length) return [];
    let score = 0;
    for (const word of matched) {
      const frequency = frequencies.get(word), count = section.counts.get(word);
      const idf = Math.log(1+(sections.length-frequency+.5)/(frequency+.5));
      score += weights.get(word)*idf*(count*2.2)/(count+1.2*(.25+.75*section.length/Math.max(1,average)));
    }
    if (phrase.length > 5 && section.text.toLowerCase().replace(/\s+/g,' ').includes(phrase.replace(/\s+/g,' '))) score += 12;
    const labels=section.text.split('\n').map(line=>line.trim().split(/\s{2,}/)[0]).filter(label=>/^[a-z][a-z0-9 -]{0,55}$/i.test(label)).join(' ').toLowerCase();
    if(concept.length && firstAidWords(labels).join(' ').includes(concept.join(' ')))score+=40;
    else if(concept.length && concept.every(word=>firstAidWords(labels).includes(word)))score+=8;
    if(section.rapid)score*=.65;
    return score >= 9 ? [{ page: section.page, text: section.text, matched, score }] : [];
  }).sort((a,b) => b.score-a.score);
  const seen = new Set();
  const matches = ranked.filter(item => { if (seen.has(item.page)) return false; seen.add(item.page); return true; }).slice(0,3).map(({page,text,matched}) => ({page,text,matched}));
  return { state: matches.length ? 'matched' : 'no-match', sourceName: index.sourceName, sourceSha256: index.sourceSha256, edition: index.edition, matches };
}

export class FirstAidLibrary {
  constructor(root, { extract } = {}) { this.root=root; this.extract=extract; this.pending=null; }
  async load() {
    const stamp=(await fs.stat(path.join(this.root,'index.json')).catch(()=>null))?.mtimeMs;
    if(this.stamp!==stamp){this.pending=null;this.stamp=stamp;}
    if (this.pending) return this.pending;
    this.pending=this.prepare().catch(error => { this.pending=null; throw error; });
    return this.pending;
  }
  async prepare() {
    let catalog;
    try{catalog=JSON.parse(await fs.readFile(path.join(this.root,'index.json'),'utf8'));}catch(error){if(error.code==='ENOENT')return null;throw error;}
    const resources=(catalog.resources ?? []).filter(item => item.kind==='pdf' && /first[\s_-]*aid/i.test(item.name) && /step[\s_-]*1\b/i.test(item.name) && /^[a-f0-9]{64}$/.test(item.sha256) && typeof item.asset==='string');
    const resource=resources.sort((a,b) => (b.productionYear ?? 0)-(a.productionYear ?? 0) || String(b.addedAt).localeCompare(String(a.addedAt)))[0];
    if (!resource) return null;
    const original=await confined(this.root,resource.asset);
    await fs.access(original);
    const folder=path.join(this.root,'first-aid-index');
    const cache=path.join(folder,`${resource.sha256}.json`);
    let index;
    try { const saved=JSON.parse(await fs.readFile(cache,'utf8')); if (saved.version===1 && saved.sourceSha256===resource.sha256 && Array.isArray(saved.pages) && saved.pages.length) index=saved; } catch { /* Build once from the actual local PDF. */ }
    if (!index) {
      const text=this.extract ? await this.extract(original) : (await exec('/opt/homebrew/bin/pdftotext',['-layout','-enc','UTF-8',original,'-'],{timeout:180000,maxBuffer:32*1024*1024})).stdout;
      index=indexFirstAid(text,resource);
      await fs.mkdir(folder,{recursive:true,mode:0o700});
      const temporary=cache+'.'+process.pid+'.tmp';
      await fs.writeFile(temporary,JSON.stringify(index),{mode:0o600}); await fs.rename(temporary,cache);
    }
    return prepareFirstAid(index);
  }
  async response(request) {
    if (request.method!=='POST' || (request.headers.get('origin') && request.headers.get('origin')!=='oet://study')) return new Response(null,{status:403});
    try {
      const raw=await request.text();
      if (raw.length>40000) return Response.json({message:'The question is too long to match.'},{status:413});
      const body=JSON.parse(raw);
      if (!body || ['prompt','answer','explanation','query'].some(key => body[key]!==undefined && typeof body[key]!=='string')) return new Response(null,{status:400});
      const prepared=await this.load();
      return Response.json(prepared ? searchFirstAid(prepared,body) : {state:'missing',matches:[],message:'Import your First Aid for Step 1 PDF in the USMLE study folder to connect the textbook.'},{headers:{'Cache-Control':'no-store'}});
    } catch { return Response.json({state:'unavailable',matches:[],message:'First Aid could not be indexed. Your questions and saved answers remain available. Retry after checking the local PDF.'},{status:503}); }
  }
}
