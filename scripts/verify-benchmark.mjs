import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const catalog=JSON.parse(fs.readFileSync('src/data/benchmarkCollection.json','utf8'));
const hash=path=>crypto.createHash('sha256').update(fs.readFileSync(`public/${path}`)).digest('hex');
assert.equal(catalog.entries.length,50);
for(const [skill,count] of [['listening',20],['reading',20],['writing',10]]) {
 const entries=catalog.entries.filter(e=>e.skill===skill);
 assert.equal(entries.length,count);
 assert.deepEqual(entries.map(e=>e.number),Array.from({length:count},(_,i)=>i+1));
}
const checked=new Set();
for(const entry of catalog.entries){
 if(!checked.has(entry.assetPath)){assert.equal(hash(entry.assetPath),entry.sourceSha256);checked.add(entry.assetPath);}
 const {pages}=JSON.parse(fs.readFileSync(`public/${entry.textPath}`,'utf8'));
 assert(pages.length>0);
 let previous=entry.startPage-1;
 for(const p of pages){assert(p.number>previous&&p.number<=entry.endPage);assert.equal(typeof p.text,'string');previous=p.number;}
 if(['listening','reading'].includes(entry.skill)){
  const sheet=JSON.parse(fs.readFileSync(`public/benchmark/questions/${entry.id}.json`,'utf8'));
  assert.equal(sheet.testId,entry.id);assert.equal(sheet.sourceSha256,entry.sourceSha256);
  assert.equal(sheet.questions.length,42);
  if(entry.skill==='listening') assert.deepEqual(sheet.notes.flatMap(block=>block.content.filter(node=>node.number).map(node=>node.number)),Array.from({length:24},(_,i)=>i+1));
  else for(const part of ['A','B','C']) { assert(sheet.readingParts[part].length>0);for(const page of sheet.readingParts[part]){assert(page.text.trim());assert(pages.some(p=>p.number===page.number));} }
  if(entry.skill==='reading') for(const [part,page] of Object.entries(entry.keyParts??{})){assert(['A','B','C'].includes(part));assert(entry.keyPages.includes(page));}
  for(const part of ['A','B','C']){
   const expected=entry.skill==='listening' ? (part==='A'?[1,24]:part==='B'?[25,30]:[31,42]) : (part==='A'?[1,20]:part==='B'?[1,6]:[7,22]);
   const rows=sheet.questions.filter(q=>q.part===part);
   assert.deepEqual(rows.map(q=>q.number),Array.from({length:expected[1]-expected[0]+1},(_,i)=>i+expected[0]));
   for(const q of rows){assert(q.prompt.trim().length>5);assert(q.group);assert(pages.some(p=>p.number===q.sourcePage));if(entry.skill==='listening'&&part==='A')assert(q.prompt.includes('____'));}
  }
 }
 if(entry.skill==='listening'){
  assert.equal(Object.keys(entry.answers).length,42);
  for(let n=1;n<=42;n++){assert(entry.answers[n]?.trim());if(n>24)assert(/^[ABC]$/.test(entry.answers[n]));}
  assert.equal(hash(entry.keyPath),entry.keySha256);
  if(entry.audio){
   assert(entry.audio.bytes>1000000);assert(entry.audio.duration>1200);assert(/^[a-f0-9]{64}$/.test(entry.audio.sha256));assert(entry.audio.url.endsWith(`test-${String(entry.number).padStart(2,'0')}.mp3`));
   const transcript=JSON.parse(fs.readFileSync(`public/benchmark/transcripts/${entry.id}.json`,'utf8'));
   assert.equal(transcript.trackId,entry.id);assert.equal(transcript.sourceSha256,entry.audio.sha256);
   assert.equal(transcript.kind,'automatic-transcription');assert.equal(transcript.complete,true);
   assert(Math.abs(transcript.duration-entry.audio.duration)<1);assert(transcript.segments.length>100);
   let start=-1;
   for(const s of transcript.segments){assert(Number.isFinite(s.start)&&Number.isFinite(s.end));assert(s.start>=start&&s.start>=0&&s.end>=s.start&&s.end<=transcript.duration+.1);assert(s.text.trim());start=s.start;}
   assert(transcript.segments[0].start<30);assert(transcript.segments.at(-1).end>transcript.duration*.9);
  }
 }
}
assert.deepEqual(catalog.entries.filter(e=>e.skill==='listening'&&!e.audio).map(e=>e.number),[10,17]);
console.log('Benchmark: 20 reading tests, 20 listening papers/keys, 18 original recordings and complete matching transcripts, 10 Medicine writing tasks; source hashes, timestamps, 840 keys and 1,680 question rows verified.');
