#!/usr/bin/env python3
"""Publish deduplicated library originals as resumable GitHub release assets.

Keeps large recordings out of Git history. The browser receives searchable text
and an original-file link for each uploaded resource. --apply is explicit write mode.
"""
import argparse
import concurrent.futures
import json
import shutil
import subprocess
import tempfile
import hashlib
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--library',required=True);parser.add_argument('--apply',action='store_true');parser.add_argument('--workers',type=int,default=1);parser.add_argument('--finalize',action='store_true');args=parser.parse_args()
library=Path(args.library).resolve();catalog=json.loads((library/'catalog.json').read_text())
files=sorted(catalog['files'],key=lambda row: (0 if row['format'] in {'pdf','docx'} else 1 if row['format'] in {'jpg','jpeg','png'} else 3 if row['format']=='mp4' else 2,row['bytes'],row['id']))
batches=[files[i:i+500] for i in range(0,len(files),500)]
if not args.apply:raise SystemExit(f'{len(files)} originals in {len(batches)} release batches. Use --apply to publish.')
remote={};published=[]
for i,batch in enumerate(batches):
    tag='genododi-library-2026-10-19'+(f'-{i+1}' if i else '')
    exists=subprocess.run(['gh','release','view',tag,'--json','isDraft'],cwd=ROOT,capture_output=True)
    if exists.returncode:
        notes=library/f'release-notes-{i+1}.md'
        notes.write_text('Original OET study resources supplied by the repository owner, imported from GENODODI. Files retain their original authorship. This release stores checksummed originals outside Git history for browser downloads and the offline Mac application.\n')
        subprocess.run(['gh','release','create',tag,'--draft','--title',f'GENODODI OET library · batch {i+1}','--notes-file',str(notes)],cwd=ROOT,check=True)
    uploaded=json.loads(subprocess.check_output(['gh','release','view',tag,'--json','assets'],cwd=ROOT))['assets']
    existing={r['name']:r['size'] for r in uploaded}
    todo=[r for r in batch if existing.get(Path(r['assetPath']).name)!=r['bytes']]
    print(f'Batch {i+1}: {len(todo)} originals to upload; {len(existing)} already present.',flush=True)
    chunks=[todo[j:j+8] for j in range(0,len(todo),8)]
    def upload(chunk):
        # Stage on the Mac so a slow/removable drive cannot starve an HTTP upload.
        with tempfile.TemporaryDirectory(prefix='oet-release-',dir=ROOT/'tmp') as cache:
            paths=[]
            for row in chunk:
                source=library/'files'/Path(row['assetPath']).name;target=Path(cache)/source.name
                checksum=hashlib.sha256()
                with source.open('rb') as src,target.open('wb') as dst:
                    while True:
                        data=src.read(8*1024*1024)
                        if not data:break
                        checksum.update(data);dst.write(data)
                if checksum.hexdigest()!=row['sha256']:raise RuntimeError(f'Original checksum changed: {row["filename"]}')
                paths.append(str(target))
            for attempt in range(4):
                result=subprocess.run(['gh','release','upload',tag,*paths,'--clobber'],cwd=ROOT,capture_output=True,text=True)
                if result.returncode==0:print(f'Uploaded {len(chunk)} originals to batch {i+1}',flush=True);return
                print(f'Retrying upload batch {i+1}: {result.stderr[-300:]}',flush=True)
            raise RuntimeError(result.stderr[-1500:])
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1,min(3,args.workers))) as pool:list(pool.map(upload,chunks))
    subprocess.run(['gh','release','edit',tag,'--draft=false'],cwd=ROOT,check=True)
    for row in batch:
        entry={k:v for k,v in row.items() if k not in {'sourcePaths'}}
        original=row['assetPath'];entry['assetPath']=f'https://github.com/genododi/OET/releases/download/{tag}/{Path(original).name}'
        remote[entry['assetPath']]=original.removeprefix('offline-library/')
        entry['textPath']='imported-resources/text/'+Path(row['textPath']).name
        target=ROOT/'public'/entry['textPath'];target.parent.mkdir(parents=True,exist_ok=True)
        shutil.copyfile(library/'text'/Path(row['textPath']).name,target)
        published.append(entry)
    # Save after each completed release so an interrupted upload never exposes broken links.
    (ROOT/'public/imported-resources/catalog.json').write_text(json.dumps({'version':1,'files':published},ensure_ascii=False)+'\n')
    current=json.loads((library/'remote-assets.json').read_text());current.update(remote);(library/'remote-assets.json').write_text(json.dumps(current,indent=2)+'\n')
print(f'Published {len(published)} new searchable resources.',flush=True)
if args.finalize:
    # Only generated import files are committed; unrelated work is never staged.
    subprocess.run(['node','scripts/verify-imported-resources.mjs'],cwd=ROOT,check=True)
    if subprocess.run(['git','diff','--cached','--quiet'],cwd=ROOT).returncode:raise SystemExit('The Git index contains other work. Imported files were saved without staging or pushing it.')
    subprocess.run(['git','add','--','public/imported-resources'],cwd=ROOT,check=True)
    if subprocess.run(['git','diff','--cached','--quiet'],cwd=ROOT).returncode:
        subprocess.run(['git','commit','-m','Publish complete GENODODI OET resource library'],cwd=ROOT,check=True)
        subprocess.run(['git','push','origin','main'],cwd=ROOT,check=True)
