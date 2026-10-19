#!/usr/bin/env python3
"""Install a pinned, key-free local mentor model for Apple Silicon Macs."""
import argparse
import concurrent.futures
import hashlib
import json
import shutil
import tarfile
import time
import urllib.request
from pathlib import Path

REVISION='e87f176479d0855a907a41277aca2f8ee7a09523'
MODEL='Qwen3.5-4B-Q4_K_M.gguf'
SHA='00fe7986ff5f6b463e62455821146049db6f9313603938a70800d1fb69ef11a4'
SIZE=2740937888
URL=f'https://huggingface.co/unsloth/Qwen3.5-4B-GGUF/resolve/{REVISION}/{MODEL}'
parser=argparse.ArgumentParser();parser.add_argument('--output',required=True);parser.add_argument('--download-cache');args=parser.parse_args()
root=Path(args.output).resolve();root.mkdir(parents=True,exist_ok=True)
target=root/MODEL
parts=Path(args.download_cache) if args.download_cache else root/'.download-parts';parts.mkdir(exist_ok=True)
block=64*1024*1024
def download(i):
    start=i*block;end=min(SIZE,start+block)-1;part=parts/f'{i:04}.part'
    if part.exists() and part.stat().st_size==end-start+1:return
    if target.exists() and target.stat().st_size>=end+1:
        with target.open('rb') as src,part.open('wb') as out:src.seek(start);out.write(src.read(end-start+1))
        return
    for attempt in range(6):
        try:
            request=urllib.request.Request(URL,headers={'Range':f'bytes={start}-{end}'})
            with urllib.request.urlopen(request,timeout=90) as response:
                if response.status!=206 or response.headers.get('Content-Range','').split('/')[0]!=f'bytes {start}-{end}':raise ValueError('The model host did not return the requested bytes')
                with part.open('wb') as stream:
                    while True:
                        data=response.read(1024*1024)
                        if not data:break
                        stream.write(data)
            if part.stat().st_size!=end-start+1:raise ValueError('Incomplete model block')
            print(f'Model block {i+1}/{(SIZE+block-1)//block} ready',flush=True);return
        except Exception:
            if attempt==5:raise
            time.sleep(2+attempt)

if not target.exists() or target.stat().st_size!=SIZE:
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:list(pool.map(download,range((SIZE+block-1)//block)))
    with target.open('wb') as out:
        # macOS adds ._ sidecars on ExFAT; only numbered data blocks belong here.
        for i in range((SIZE+block-1)//block):
            part=parts/f'{i:04}.part'
            with part.open('rb') as src:shutil.copyfileobj(src,out,length=8*1024*1024)
with target.open('rb') as stream:actual=hashlib.file_digest(stream,'sha256').hexdigest()
if actual!=SHA:raise SystemExit('The model checksum did not match. The model was not installed.')
shutil.rmtree(parts)
runtime=root/'runtime';runtime.mkdir(exist_ok=True)
if not (runtime/'llama-server').exists():
    archive=root/'llama-runtime.tar.gz'
    urllib.request.urlretrieve('https://github.com/ggml-org/llama.cpp/releases/download/b11734/llama-b11734-bin-macos-arm64.tar.gz',archive)
    with tarfile.open(archive) as tar:
        for member in tar.getmembers():
            if not (member.isfile() or member.issym()):continue
            member.name=Path(member.name).name
            if member.issym() and ('/' in member.linkname or '..' in member.linkname):raise SystemExit('Unsafe runtime link')
            tar.extract(member,runtime,filter='data')
    archive.unlink()
for name,url in [('MODEL-LICENSE.txt','https://huggingface.co/Qwen/Qwen3.5-4B/raw/851bf6e806efd8d0a36b00ddf55e13ccb7b8cd0a/LICENSE'),('MODEL-CARD.md',f'https://huggingface.co/unsloth/Qwen3.5-4B-GGUF/raw/{REVISION}/README.md')]:
    if not (root/name).exists():urllib.request.urlretrieve(url,root/name)
(root/'model.json').write_text(json.dumps({'label':'Qwen3.5 4B · Q4_K_M · Apple Silicon','model':MODEL,'sha256':SHA,'server':'runtime/llama-server','runtime':'llama.cpp b11734','source':'https://huggingface.co/unsloth/Qwen3.5-4B-GGUF','revision':REVISION,'license':'Apache-2.0'},indent=2)+'\n')
print('Local mentor model verified and installed.',flush=True)
