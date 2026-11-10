import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {FirstAidLibrary,prepareFirstAid,searchFirstAid} from './first-aid.mjs';

const sha='a'.repeat(64);
test('retrieves real textbook excerpts and prioritizes a concept heading over an index or incidental mention',()=>{
 const pages=[
  ...Array.from({length:24},(_,i)=>({page:20+i,text:'General chapter material discusses independent concepts and their supporting educational context. Additional subject examples appear here without either target concept.'})),
  {page:800,text:'INDEX\nAlport syndrome, 615. Other renal terminology and long reference listings are grouped on this index page.'},
  {page:70,text:'Other conditions\nA secondary list mentions Alport syndrome alongside unrelated inheritance patterns and other associated examples.'},
  {page:637,text:'Renal pathology\nAlport syndrome          The supplied teaching example discusses inherited renal disease and its source context.\nAdditional source wording remains unchanged on the original textbook page.'},
 ];
 const prepared=prepareFirstAid({version:1,sourceName:'First Aid Step 1 2026.pdf',sourceSha256:sha,edition:2026,pages});
 const result=searchFirstAid(prepared,{answer:'Alport syndrome'});
 assert.equal(result.matches[0].page,637);
 assert(result.matches.every(match=>match.page!==800));
 assert(pages.find(page=>page.page===result.matches[0].page).text.includes(result.matches[0].text));
 assert.equal(searchFirstAid(prepared,{prompt:'A patient presents with a condition. What is the diagnosis?'}).state,'no-match');
 assert.equal(searchFirstAid(prepared,{query:'Alport'}).state,'matched');
});
test('coalesces extraction, saves a private index and reuses it offline',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'oet-fa-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 await fs.mkdir(path.join(root,'originals'));
 await fs.writeFile(path.join(root,'originals',`${sha}.pdf`),'fixture');
 await fs.writeFile(path.join(root,'index.json'),JSON.stringify({resources:[{kind:'pdf',name:'First Aid for the USMLE Step 1 2026.pdf',sha256:sha,asset:`originals/${sha}.pdf`,productionYear:2026}]}));
 let calls=0;
 const text=Array.from({length:25},(_,i)=>`Teaching page ${i}\n`+'Specific renal concepts and metabolic pathways provide distinct teaching examples and context. '.repeat(20)).join('\f');
 const service=new FirstAidLibrary(root,{extract:async()=>{calls++;await new Promise(resolve=>setTimeout(resolve,5));return text;}});
 const [a,b]=await Promise.all([service.load(),service.load()]);assert.equal(calls,1);assert.equal(a,b);
 const cached=new FirstAidLibrary(root,{extract:async()=>{throw Error('Must work offline');}});
 assert.equal((await cached.load()).index.edition,2026);
 assert.equal((await fs.stat(path.join(root,'first-aid-index',`${sha}.json`))).mode&0o777,0o600);
 const denied=await service.response(new Request('oet://study/OET/desktop/first-aid/search',{method:'POST',headers:{origin:'https://unrelated.example'},body:'{}'}));assert.equal(denied.status,403);
 const oversized=await service.response(new Request('oet://study/OET/desktop/first-aid/search',{method:'POST',body:'x'.repeat(40001)}));assert.equal(oversized.status,413);
});
test('missing books and unsupported source paths are reported without using a different textbook',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'oet-fa-missing-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const service=new FirstAidLibrary(root);
 const missing=await service.response(new Request('oet://study/OET/desktop/first-aid/search',{method:'POST',body:'{}'}));assert.equal((await missing.json()).state,'missing');
 await fs.writeFile(path.join(root,'index.json'),JSON.stringify({resources:[{kind:'pdf',name:'First Aid Step 1.pdf',sha256:sha,asset:'../outside.pdf'}]}));
 const unsafe=await service.response(new Request('oet://study/OET/desktop/first-aid/search',{method:'POST',body:'{}'}));assert.equal(unsafe.status,503);
});
