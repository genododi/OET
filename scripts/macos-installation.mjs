import fs from 'node:fs/promises';
import {existsSync,readFileSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {copyBuildAssets} from './copy-build-assets.mjs';

export function installedMacApp({environment=process.env,home=os.homedir(),exists=existsSync,read=readFileSync}={}) {
  if(environment.OET_MAC_APP)return path.resolve(environment.OET_MAC_APP);
  try{const saved=JSON.parse(read(path.join(home,'Library/Application Support/OET Study/installation.json'),'utf8'));if(typeof saved.appPath==='string'&&path.isAbsolute(saved.appPath)&&saved.appPath.endsWith('.app'))return saved.appPath;}catch{/* Older installations have no location receipt. */}
  const external='/Volumes/GENODODI/OET Study.app';
  return exists(external)?external:path.join(home,'Applications/OET Study.app');
}

/** Stage and verify on the destination volume before preserving the previous app. */
export async function installMacApp(source,installed,{verify=app=>execFileSync('codesign',['--verify','--deep','--strict',app],{stdio:'pipe',timeout:600000}),copy=copyBuildAssets,forceCopy=false,receipt=path.join(os.homedir(),'Library/Application Support/OET Study/installation.json')}={}) {
  const parent=path.dirname(installed);
  if(installed.startsWith('/Volumes/'))await fs.access(path.join('/Volumes',installed.split('/')[2]));
  await fs.mkdir(parent,{recursive:true});
  const crossVolume=forceCopy || (await fs.stat(source)).dev!==(await fs.stat(parent)).dev;
  const staged=crossVolume?path.join(parent,`.OET Study.installing-${process.pid}-${Date.now()}.app`):source;
  let backup=null;
  if(crossVolume){await copy(source,staged,{recursive:true});await verify(staged);}
  try{
    await fs.access(installed);
    let prior='unrecorded';
    try{const value=JSON.parse(await fs.readFile(path.join(installed,'Contents/Resources/build-info.json'),'utf8'));if(/^[a-f0-9]{40}$/.test(value.gitCommit ?? ''))prior=value.gitCommit;}catch{/* Preserve unstamped apps too. */}
    backup=path.join(parent,'OET Study app backups',`${prior}-${Date.now()}`,'OET Study.app');
    await fs.mkdir(path.dirname(backup),{recursive:true});await fs.rename(installed,backup);
  }catch(error){if(error.code!=='ENOENT')throw error;}
  try{await fs.rename(staged,installed);}catch(error){if(backup)await fs.rename(backup,installed);throw error;}
  await fs.mkdir(path.dirname(receipt),{recursive:true});
  const temporary=receipt+'.'+process.pid+'.tmp';
  await fs.writeFile(temporary,JSON.stringify({appPath:installed,updatedAt:new Date().toISOString()},null,2)+'\n');await fs.rename(temporary,receipt);
  return {installed,backup};
}
