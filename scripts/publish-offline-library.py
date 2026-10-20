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
import time
import os
import ipaddress
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--library',required=True);parser.add_argument('--apply',action='store_true');parser.add_argument('--workers',type=int,default=1);parser.add_argument('--finalize',action='store_true');args=parser.parse_args()
library=Path(args.library).resolve();catalog=json.loads((library/'catalog.json').read_text())
files=sorted(catalog['files'],key=lambda row: (0 if row['format'] in {'pdf','docx'} else 1 if row['format'] in {'jpg','jpeg','png'} else 3 if row['format']=='mp4' else 2,row['bytes'],row['id']))
batches=[files[i:i+500] for i in range(0,len(files),500)]
if not args.apply:raise SystemExit(f'{len(files)} originals in {len(batches)} release batches. Use --apply to publish.')
# macOS's native resolver remains reliable when Go's DNS lookup is interrupted.
os.environ.setdefault('GODEBUG','netdns=cgo')
def gh_output(arguments, absent_ok=False):
    for attempt in range(6):
        try:
            result=subprocess.run(['gh',*arguments],cwd=ROOT,capture_output=True,timeout=120)
            if result.returncode==0:return result.stdout
            problem=result.stderr.decode(errors='replace')[-300:]
            if absent_ok and ('release not found' in problem.lower() or 'HTTP 404' in problem):return b''
        except subprocess.TimeoutExpired:problem='GitHub metadata request timed out.'
        if attempt==5:raise RuntimeError(problem)
        print(f'Retrying GitHub metadata: {problem}',flush=True);time.sleep(10+attempt*5)
token=gh_output(['auth','token']).decode().strip()
upload_ip=None
try:
    dns=subprocess.run(['curl','-fsS','--max-time','15','-H','accept: application/dns-json','https://cloudflare-dns.com/dns-query?name=uploads.github.com&type=A'],capture_output=True,text=True,check=True)
    upload_ip=next(answer['data'] for answer in json.loads(dns.stdout).get('Answer',[]) if answer.get('type')==1 and ipaddress.ip_address(answer['data']).is_global)
except (subprocess.SubprocessError,ValueError,StopIteration):pass
remote={};published=[]
for i,batch in enumerate(batches):
    tag='genododi-library-2026-10-19'+(f'-{i+1}' if i else '')
    exists=gh_output(['release','view',tag,'--json','isDraft'],absent_ok=True)
    if not exists:
        notes=library/f'release-notes-{i+1}.md'
        notes.write_text('Original OET study resources supplied by the repository owner, imported from GENODODI. Files retain their original authorship. This release stores checksummed originals outside Git history for browser downloads and the offline Mac application.\n')
        gh_output(['release','create',tag,'--draft','--title',f'GENODODI OET library · batch {i+1}','--notes-file',str(notes)])
    release_id=gh_output(['release','view',tag,'--json','databaseId','--jq','.databaseId']).decode().strip()
    release=json.loads(gh_output(['api',f'repos/genododi/OET/releases/{release_id}']))
    uploaded=release['assets']
    existing={r['name']:r['size'] for r in uploaded}
    todo=[r for r in batch if existing.get(Path(r['assetPath']).name)!=r['bytes']]
    print(f'Batch {i+1}: {len(todo)} originals to upload; {len(existing)} already present.',flush=True)
    chunks=[todo[j:j+8] for j in range(0,len(todo),8)]
    def upload(chunk):
        # Stage on the Mac so a slow/removable drive cannot starve an HTTP upload.
        with tempfile.TemporaryDirectory(prefix='oet-release-',dir=ROOT/'tmp') as cache:
            for row in chunk:
                source=library/'files'/Path(row['assetPath']).name;target=Path(cache)/source.name
                checksum=hashlib.sha256()
                with source.open('rb') as src,target.open('wb') as dst:
                    while True:
                        data=src.read(8*1024*1024)
                        if not data:break
                        checksum.update(data);dst.write(data)
                if checksum.hexdigest()!=row['sha256']:raise RuntimeError(f'Original checksum changed: {row["filename"]}')
                previous=next((asset for asset in uploaded if asset['name']==target.name),None)
                if previous:gh_output(['api','-X','DELETE',f'repos/genododi/OET/releases/assets/{previous["id"]}'])
                for attempt in range(8):
                    command=['curl','-fsS','--connect-timeout','20','--max-time','900','--speed-limit','1024','--speed-time','60','-X','POST','-H','@-','-H','Content-Type: application/octet-stream','--data-binary',f'@{target}',f'https://uploads.github.com/repos/genododi/OET/releases/{release["id"]}/assets?name={target.name}']
                    if upload_ip:command.extend(['--resolve',f'uploads.github.com:443:{upload_ip}'])
                    # Keep the credential in stdin, outside command arguments and logs.
                    result=subprocess.run(command,input=f'Authorization: Bearer {token}\n',capture_output=True,text=True)
                    asset=json.loads(result.stdout) if result.returncode==0 else None
                    if asset and asset.get('size')==row['bytes'] and asset.get('digest') in (None,f'sha256:{row["sha256"]}'):
                        print(f'Uploaded and verified {row["bytes"]} bytes: {target.name}',flush=True);break
                    print(f'Rechecking transfer: {target.name}: {result.stderr[-200:]}',flush=True)
                    pages=json.loads(gh_output(['api','--paginate','--slurp',f'repos/genododi/OET/releases/{release["id"]}/assets?per_page=100']))
                    current=[asset for page in pages for asset in page]
                    found=next((asset for asset in current if asset['name']==target.name),None)
                    if found and found.get('size')==row['bytes'] and found.get('digest') in (None,f'sha256:{row["sha256"]}'):break
                    if found:gh_output(['api','-X','DELETE',f'repos/genododi/OET/releases/assets/{found["id"]}'])
                    if attempt==7:raise RuntimeError(f'Upload failed: {target.name}: {result.stderr[-300:]}')
                    print(f'Retrying {target.name}: {result.stderr[-200:]}',flush=True);time.sleep(10+attempt*5)
                target.unlink()
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1,min(3,args.workers))) as pool:list(pool.map(upload,chunks))
    gh_output(['release','edit',tag,'--draft=false'])
    for row in batch:
        entry={k:v for k,v in row.items() if k not in {'sourcePaths'}}
        original=row['assetPath'];entry['assetPath']=f'https://github.com/genododi/OET/releases/download/{tag}/{Path(original).name}'
        remote[entry['assetPath']]=original.removeprefix('offline-library/')
        entry['textPath']='imported-resources/text/'+Path(row['textPath']).name
        target=ROOT/'public'/entry['textPath'];target.parent.mkdir(parents=True,exist_ok=True)
        shutil.copyfile(library/'text'/Path(row['textPath']).name,target)
        published.append(entry)
    # Save after each completed release so an interrupted upload never exposes broken links.
    index=ROOT/'public/imported-resources/catalog.json'
    temporary=index.with_suffix('.tmp')
    temporary.write_text(json.dumps({'version':1,'files':published},ensure_ascii=False)+'\n');temporary.replace(index)
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
