// Builds a file://-safe player: embedded application/transcripts, relative original MP3s.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { build } from 'vite';
import react from '@vitejs/plugin-react';
const root=process.cwd(), work=path.join(root,'tmp/benchmark-offline');
const pack=path.join(work,'Benchmark Offline');
const audioRoot=process.env.BENCHMARK_AUDIO_ROOT || '/Volumes/GENODODI/OET/Benchmark tests/Audio';
const entries=JSON.parse(await fs.readFile('src/data/benchmarkCollection.json','utf8')).entries.filter(e=>e.audio);
await fs.mkdir(path.join(pack,'audio'),{recursive:true});
const data=[];
for(const entry of entries){
 const local=path.join(audioRoot,entry.audio.filename);
 const audioPath=`audio/test-${String(entry.number).padStart(2,'0')}.mp3`;
 // Reuse an already verified pack copy if the external drive was disconnected.
 const bytes=await fs.readFile(local).catch(()=>fs.readFile(path.join(pack,audioPath)));
 const sha=crypto.createHash('sha256').update(bytes).digest('hex');
 if(sha!==entry.audio.sha256)throw Error(`Wrong recording: ${entry.id}`);
 await fs.writeFile(path.join(pack,audioPath),bytes);
 const transcript=JSON.parse(await fs.readFile(`public/benchmark/transcripts/${entry.id}.json`,'utf8'));
 if(transcript.trackId!==entry.id||transcript.sourceSha256!==sha||!transcript.complete)throw Error(`Wrong transcript: ${entry.id}`);
 data.push({id:entry.id,title:entry.title,sha256:sha,audioPath,transcript});
}
await fs.writeFile(path.join(work,'data.json'),JSON.stringify(data));
await build({configFile:false,root,base:'./',publicDir:false,plugins:[react()],define:{'process.env.NODE_ENV':'"production"'},build:{outDir:path.join(work,'build'),emptyOutDir:true,lib:{entry:path.join(root,'scripts/offline/entry.tsx'),name:'BenchmarkOffline',formats:['iife'],fileName:()=> 'player.js'},cssCodeSplit:false}});
const js=await fs.readFile(path.join(work,'build/player.js'),'utf8');
const files=await fs.readdir(path.join(work,'build'));
let css='';for(const file of files.filter(f=>f.endsWith('.css')))css+=await fs.readFile(path.join(work,'build',file),'utf8');
const html=`<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Benchmark Listening · Offline</title><style>${css}</style></head><body><div id="root"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`;
await fs.writeFile(path.join(pack,'START.html'),html);
await fs.writeFile(path.join(pack,'READ ME.txt'),'BENCHMARK LISTENING — OFFLINE\n\n1. Extract the entire ZIP.\n2. Open START.html in your browser.\n3. Select a test and press Play recording.\n\nKeep START.html and the audio folder together. No internet or installation is needed. The 18 recordings are unchanged original human audio. Tests 10 and 17 were absent from the supplied source. Transcripts are automatic and may contain recognition errors. Click timestamps to seek. Follow the audio also follows seeking while paused.\n');
await fs.writeFile(path.join(pack,'recordings.json'),JSON.stringify(data.map(({id,sha256,audioPath})=>({id,sha256,audioPath})),null,2));
const zip=path.join(work,'Benchmark-Offline.zip');
execFileSync('python3',['-c',`import pathlib,zipfile\np=pathlib.Path(${JSON.stringify(pack)})\nwith zipfile.ZipFile(${JSON.stringify(zip)},'w',compression=zipfile.ZIP_STORED) as z:\n for f in sorted(p.rglob('*')):\n  if f.is_file(): z.write(f, str(f.relative_to(p.parent)))`]);
console.log(JSON.stringify({zip,recordings:data.length,bytes:(await fs.stat(zip)).size}));
