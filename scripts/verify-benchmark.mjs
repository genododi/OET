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
 if(entry.skill==='listening'){
  assert.equal(Object.keys(entry.answers).length,42);
  for(let n=1;n<=42;n++){assert(entry.answers[n]?.trim());if(n>24)assert(/^[ABC]$/.test(entry.answers[n]));}
  assert.equal(hash(entry.keyPath),entry.keySha256);
  if(entry.audio){assert(entry.audio.bytes>1000000);assert(entry.audio.duration>1200);assert(/^[a-f0-9]{64}$/.test(entry.audio.sha256));assert(entry.audio.url.endsWith(`test-${String(entry.number).padStart(2,'0')}.mp3`));}
 }
}
assert.deepEqual(catalog.entries.filter(e=>e.skill==='listening'&&!e.audio).map(e=>e.number),[10,17]);
console.log('Benchmark: 20 reading tests, 20 listening papers/keys, 18 original recordings, 10 Medicine writing tasks; source hashes and 840 keys verified.');
