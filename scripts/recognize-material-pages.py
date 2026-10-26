"""Recognise scanned source pages locally with macOS Vision, preserving originals.

Page caches are keyed by original SHA and page. Interruptions are resumable;
OCR is explicitly labelled and never substituted for a printed answer key.
"""
import argparse
import concurrent.futures
import json
from pathlib import Path
import re
import subprocess
import tempfile
import os
import shutil
import threading
import collections
import hashlib
from ocr_layout import IMAGE_FORMATS, LAYOUT_VERSION, from_tsv, from_vision, remove_table_rules

ROOT=Path(__file__).resolve().parents[1]
def persist(path,payload):
    target=path.with_suffix('.tmp');target.write_text(json.dumps(payload,ensure_ascii=False)+'\n');target.replace(path)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--library',default='/Volumes/GENODODI/OET/Mac App/offline-library');parser.add_argument('--limit',type=int);parser.add_argument('--cached-only',action='store_true');parser.add_argument('--images-only',action='store_true');args=parser.parse_args()
    library=Path(args.library);cache=library/'ocr-cache';cache.mkdir(exist_ok=True)
    catalogs=[ROOT/'src/data/desktopMaterials.generated.json',ROOT/'public/imported-resources/catalog.json',library/'catalog.json']
    inventories=[json.loads(path.read_text()) for path in catalogs]
    files={f['sha256']:f for c in inventories for f in c['files'] if f['format'] in ({'pdf'} | IMAGE_FORMATS) and (not args.images_only or f['format'] in IMAGE_FORMATS)}
    binary=ROOT/'tmp/oet-recognize-source'
    source=ROOT/'scripts/recognize-source-text.swift'
    tesseract=shutil.which('tesseract')
    if not tesseract and (not binary.exists() or binary.stat().st_mtime<source.stat().st_mtime):subprocess.run(['swiftc',str(source),'-o',str(binary)],check=True)
    documents={}; jobs=[]
    for sha,file in files.items():
        public_path=ROOT/'public'/file['textPath']
        text_path=library/'text'/f'{sha}.json' if file['assetPath'].startswith('offline-library/') else public_path
        data=json.loads(text_path.read_text());pages=data.get('pages') or [{'number':1,'text':data.get('text',''),'extraction':'none'}]
        documents[sha]=(file,pages,text_path)
        for page in pages:
            if (file['format'] in IMAGE_FORMATS and page.get('ocrLayoutVersion') != LAYOUT_VERSION) or (len(re.sub('[^A-Za-z]','',page['text']))<30 and page.get('extraction')!='ocr'):jobs.append((sha,page['number']))
    jobs.sort(key=lambda job:(files[job[0]]['format'] not in IMAGE_FORMATS,'reading' not in files[job[0]]['skills'],'listening' not in files[job[0]]['skills'],len(documents[job[0]][1]),job))
    print(json.dumps({'scannedPages':len(jobs),'documents':len(files)}),flush=True)
    changed=set(); failures=[]
    if args.cached_only:jobs=[job for job in jobs if (cache/f'{job[0]}-{job[1]}-layout-v{LAYOUT_VERSION}.json').exists()]
    jobs=jobs[:args.limit]
    staging=tempfile.TemporaryDirectory(prefix='oet-ocr-sources-',dir=ROOT/'tmp')
    staged={};guard=threading.Lock();vision_guard=threading.Lock();remaining=collections.Counter(sha for sha,number in jobs)
    def local_source(sha,original):
        # Repeated PDF page reads from the external disk are particularly slow.
        with guard:
            if sha not in staged:
                destination=Path(staging.name)/original.name
                shutil.copyfile(original,destination)
                with destination.open('rb') as stream:
                    if hashlib.file_digest(stream,'sha256').hexdigest()!=sha:raise ValueError('Original checksum mismatch')
                staged[sha]=destination
            return staged[sha]
    def vision_text(image,needs_review=False):
        with vision_guard:
            if not binary.exists() or binary.stat().st_mtime<source.stat().st_mtime:
                subprocess.run(['swiftc',str(source),'-o',str(binary)],check=True,timeout=120)
            subprocess.run([str(binary),str(image)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=90)
            observations=json.loads(image.with_suffix('.vision.json').read_text())
            dimensions=subprocess.check_output(['sips','-g','pixelWidth','-g','pixelHeight',str(image)],text=True)
            width=int(re.search(r'pixelWidth: (\d+)',dimensions)[1]);height=int(re.search(r'pixelHeight: (\d+)',dimensions)[1])
            return from_vision(observations,width,height,needs_review=needs_review)
    def recognise(job):
        sha,number=job;file,pages,text_path=documents[sha];target=cache/f'{sha}-{number}-layout-v{LAYOUT_VERSION}.json'
        if target.exists():
            try:
                cached=json.loads(target.read_text())
                if cached.get('sourceSha256')==sha and cached.get('number')==number and cached.get('ocrLayoutVersion')==LAYOUT_VERSION and cached.get('imagePreparation')=='table-rules-v1':return job,cached
            except ValueError:pass
        original=library/'files'/Path(file['assetPath']).name if file['assetPath'].startswith('offline-library/') else ROOT/'public'/file['assetPath']
        original=local_source(sha,original)
        with tempfile.TemporaryDirectory(prefix='oet-page-',dir=ROOT/'tmp') as folder:
            image=Path(folder)/'page.png'
            if file['format']=='pdf':subprocess.run(['pdftoppm','-f',str(number),'-l',str(number),'-scale-to','2800','-singlefile','-png',str(original),str(image.with_suffix(''))],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=90)
            else:subprocess.run(['sips','-s','format','png','--resampleHeightWidthMax','2800',str(original),'--out',str(image)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=60)
            preview = {}
            if file['format'] in IMAGE_FORMATS and file['format'] not in {'jpg','jpeg','png','webp','gif','avif'}:
                destination=library/'previews'/f'{sha}.png';destination.parent.mkdir(exist_ok=True)
                shutil.copyfile(image,destination)
                preview={'previewPath':f'imported-resources/previews/{sha}.png'}
            table_rules_removed=remove_table_rules(image)
            if tesseract:
                tsv=subprocess.check_output([tesseract,str(image),'stdout','-l','eng','--psm','1','tsv'],stderr=subprocess.DEVNULL,timeout=90,env={**os.environ,'OMP_THREAD_LIMIT':'1'}).decode(errors='replace')
                recognised=from_tsv(tsv)
                if not recognised['text'].strip() and shutil.which('swiftc'):
                    try:recognised=vision_text(image,needs_review=True)
                    except (subprocess.SubprocessError,OSError,ValueError):pass
            else:
                recognised=vision_text(image)
            payload={**recognised,**preview,'imagePreparation':'table-rules-v1','tableRulesRemoved':table_rules_removed,'extraction':'ocr','ocrLayoutVersion':LAYOUT_VERSION,'sourceSha256':sha,'number':number}
            persist(target,payload);return job,payload
    def safe(job):
        try:return recognise(job)
        except Exception as error:return job,{'error':str(error)}
        finally:
            with guard:
                remaining[job[0]]-=1
                if remaining[job[0]]==0 and job[0] in staged:staged.pop(job[0]).unlink(missing_ok=True)
    def save(sha):
        file,pages,text_path=documents[sha];payload={'sourceSha256':sha,'text':'\n\f\n'.join(p['text'] for p in pages),'pages':pages}
        persist(text_path,payload)
        published=ROOT/'public/imported-resources/text'/f'{sha}.json'
        if published.exists() and published!=text_path:persist(published,payload)
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        for index,(job,result) in enumerate(pool.map(safe,jobs)):
            sha,number=job
            if result.get('error'):failures.append({'sha256':sha,'page':number,**result});continue
            page=documents[sha][1][number-1]
            if result['text'].strip() or not page['text'].strip():
                page.update({k:v for k,v in result.items() if k not in {'sourceSha256','number'}})
            else:page['ocrLayoutVersion']=LAYOUT_VERSION
            changed.add(sha)
            if index%25==0:
                for key in changed:save(key)
                changed.clear();print('RECOGNISED',index+1,'/',len(jobs),flush=True)
    for sha in changed:save(sha)
    staging.cleanup()
    for path in catalogs:
        catalog=json.loads(path.read_text())
        for file in catalog['files']:
            if file['sha256'] not in documents:continue
            pages=documents[file['sha256']][1];text='\n'.join(p['text'] for p in pages)
            file.update(hasText=bool(text.strip()),excerpt=re.sub(r'\s+',' ',text)[:320],pageCount=len(pages),ocrPageCount=sum(p.get('extraction')=='ocr' for p in pages))
        target=path.with_suffix('.tmp');target.write_text(json.dumps(catalog,ensure_ascii=False,indent=2 if 'src/data' in str(path) or path==library/'catalog.json' else None)+'\n');target.replace(path)
    (ROOT/'tmp/material-ocr-failures.json').write_text(json.dumps(failures,indent=2))
    print(json.dumps({'recognisedPages':min(args.limit or len(jobs),len(jobs)), 'failedPages':len(failures)}),flush=True)

if __name__=='__main__':main()
