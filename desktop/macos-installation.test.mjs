import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {installedMacApp,installMacApp} from '../scripts/macos-installation.mjs';

test('follows an explicit or remembered external app even when its drive is disconnected',()=>{
 const external='/Volumes/GENODODI/OET Study.app';
 assert.equal(installedMacApp({environment:{},exists:()=>true,read:()=>{throw Error();}}),external);
 assert.equal(installedMacApp({environment:{},exists:()=>false,read:()=>JSON.stringify({appPath:external})}),external);
 assert.equal(installedMacApp({environment:{OET_MAC_APP:'/tmp/Chosen.app'},read:()=>{throw Error();}}),'/tmp/Chosen.app');
});
test('verifies a destination copy before preserving the previous bundle and recording the location',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'oet-install-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const source=path.join(root,'build/New.app'),installed=path.join(root,'external/OET Study.app'),receipt=path.join(root,'state/installation.json');
 for(const [app,version] of [[source,'new'],[installed,'old']]){await fs.mkdir(app,{recursive:true});await fs.writeFile(path.join(app,'version'),version);}
 const verify=async staged=>{assert.equal(await fs.readFile(path.join(staged,'version'),'utf8'),'new');assert.equal(await fs.readFile(path.join(installed,'version'),'utf8'),'old');};
 const result=await installMacApp(source,installed,{forceCopy:true,receipt,verify,copy:(from,to)=>fs.cp(from,to,{recursive:true})});
 assert.equal(await fs.readFile(path.join(installed,'version'),'utf8'),'new');assert.equal(await fs.readFile(path.join(result.backup,'version'),'utf8'),'old');assert.equal(JSON.parse(await fs.readFile(receipt,'utf8')).appPath,installed);
});
test('a failed copied-bundle verification leaves the installed app untouched',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'oet-install-fail-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const source=path.join(root,'new.app'),installed=path.join(root,'existing.app');await fs.mkdir(source);await fs.mkdir(installed);await fs.writeFile(path.join(installed,'version'),'saved app');
 await assert.rejects(installMacApp(source,installed,{forceCopy:true,receipt:path.join(root,'receipt.json'),copy:(from,to)=>fs.cp(from,to,{recursive:true}),verify:()=>{throw Error('Signature mismatch');}}),/Signature mismatch/);
 assert.equal(await fs.readFile(path.join(installed,'version'),'utf8'),'saved app');
});
