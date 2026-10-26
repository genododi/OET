#!/usr/bin/env python3
"""Import all supported GENODODI originals into a portable, deduplicated library.

Never follows symlinks or imports repository/build copies, quarantine, executables,
or HTML downloads disguised as papers. Existing imports are resumable.
The output belongs beside the Mac application, not in Git history.
"""
import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXTENSIONS = {'.pdf', '.docx', '.doc', '.pptx', '.ppt', '.xlsx', '.xls', '.csv', '.tsv', '.txt', '.md', '.rtf', '.html', '.htm', '.json', '.apkg', '.zip', '.rar', '.7z', '.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac', '.mp4', '.webm', '.mov', '.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.tif', '.tiff', '.bmp', '.gif', '.avif'}
SKIP = {'.git', 'node_modules', 'dist', 'public', 'assets', 'output', 'tmp', 'quarantine', 'work', 'Mac App', 'Benchmark Offline', 'repo-duplicate-backup', 'manifests', 'reports', 'channel-pages', 'linked-pages', 'youtube-metadata'}

def excluded_source(relative):
    parts=Path(relative).parts
    if parts and parts[-1] in {'archive-import.json','.oet-archive-import.json'}:return True
    if any(part in SKIP or part.startswith('.') for part in parts):return True
    # The resource drive also contains an old checkout. Its code and operational
    # metadata are not study resources; real HTML/JSON notes elsewhere are kept.
    if parts and parts[0] in {'src','scripts','sources','docs','desktop'}:return True
    if len(parts)==1 and (parts[0] in {'README.md','index.html','package.json','package-lock.json'} or parts[0].startswith('tsconfig')):return True
    return False

def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def classify(relative, text, extension):
    value = relative.casefold()
    found = [skill for skill in ('listening', 'reading', 'writing', 'speaking') if skill in value]
    if found: return found
    if any(word in value for word in ('letter', 'case note')): return ['writing']
    if any(word in value for word in ('role', 'card', 'patient conversation')): return ['speaking']
    if extension in {'.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac', '.webm'}: return ['listening']
    sample = text[:5000].casefold()
    if any(word in sample for word in ('writing task', 'dear dr', 'case notes')): return ['writing']
    if any(word in sample for word in ('role-play', 'roleplay', 'candidate card')): return ['speaking']
    if re.search(r'\(\d{1,2}\)\s*[_.…]{2,}',sample) or 'patient name' in sample and 'questions' in sample:return ['listening','reading']
    return ['listening', 'reading', 'writing', 'speaking']

def source_text(source, sha):
    if source.suffix.lower() == '.pdf':
        result = subprocess.run(['pdftotext', '-layout', str(source), '-'], capture_output=True, timeout=90)
        if result.returncode: raise ValueError('PDF could not be read')
        parts = result.stdout.decode(errors='replace').split('\f')
        if parts[-1] == '': parts.pop()
        pages = [{'number': i + 1, 'text': p.strip(), 'extraction': 'text' if p.strip() else 'none'} for i, p in enumerate(parts)]
        return {'sourceSha256': sha, 'text': '\n\f\n'.join(p['text'] for p in pages), 'pages': pages}
    if source.suffix.lower() == '.docx':
        with zipfile.ZipFile(source) as doc:
            tree = ET.fromstring(doc.read('word/document.xml'))
            paragraphs = [''.join(t.text or '' for t in p.iter() if t.tag.endswith('}t')) for p in tree.iter() if p.tag.endswith('}p')]
        return {'sourceSha256': sha, 'text': '\n'.join(paragraphs)}
    if source.suffix.lower() in {'.txt','.md','.csv','.tsv','.json','.html','.htm'}:
        content=source.read_text(errors='replace')
        if source.suffix.lower() in {'.html','.htm'}:
            content=re.sub(r'<(?:script|style)\b[^>]*>.*?</(?:script|style)>','',content,flags=re.I|re.S)
            content=re.sub(r'<[^>]+>',' ',content)
        return {'sourceSha256':sha,'text':content}
    if source.suffix.lower() in {'.doc','.rtf'}:
        result=subprocess.run(['textutil','-convert','txt','-stdout',str(source)],capture_output=True,timeout=90,check=True)
        return {'sourceSha256':sha,'text':result.stdout.decode(errors='replace')}
    if source.suffix.lower() in {'.pptx','.xlsx'}:
        with zipfile.ZipFile(source) as document:
            names=sorted(n for n in document.namelist() if re.match(r'ppt/slides/slide\d+\.xml$|xl/sharedStrings.xml$',n))
            pages=[]
            for index,name in enumerate(names):
                tree=ET.fromstring(document.read(name));text='\n'.join(t.text or '' for t in tree.iter() if t.tag.endswith('}t'))
                pages.append({'number':index+1,'text':text,'extraction':'text'})
        return {'sourceSha256':sha,'text':'\n\f\n'.join(p['text'] for p in pages),'pages':pages}
    return {'sourceSha256': sha, 'text': ''}

def valid_magic(source):
    with source.open('rb') as stream: head = stream.read(512)
    ext = source.suffix.lower()
    if ext == '.pdf': return head.lstrip().startswith(b'%PDF-')
    if ext in {'.docx','.pptx','.xlsx','.zip','.apkg'}: return head.startswith(b'PK')
    if ext == '.rar': return head.startswith(b'Rar!')
    if ext == '.7z': return head.startswith(b'7z\xbc\xaf\x27\x1c')
    if ext == '.mp3': return head.startswith(b'ID3') or any(head[i] == 255 and head[i+1] & 224 == 224 for i in range(min(16, len(head)-1)))
    if ext in {'.m4a', '.mp4'}: return b'ftyp' in head[:40]
    if ext == '.wav': return head.startswith(b'RIFF')
    return bool(head)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', default='/Volumes/GENODODI/OET')
    parser.add_argument('--output', required=True)
    parser.add_argument('--hash-inventory', help='Optional checksum inventory from this run')
    args = parser.parse_args()
    source, out = Path(args.source).resolve(), Path(args.output).resolve()
    if not source.is_dir(): raise SystemExit('Connect the GENODODI OET resource folder first.')
    out.mkdir(parents=True, exist_ok=True)
    (out/'files').mkdir(exist_ok=True); (out/'text').mkdir(exist_ok=True)
    cache_path=out/'source-cache.json'
    cache=json.loads(cache_path.read_text()) if cache_path.exists() else {}
    existing = json.loads((ROOT/'src/data/desktopMaterials.generated.json').read_text())
    published = {r['sha256']:r for r in existing['files']}
    candidates=[]
    for directory, dirs, names in os.walk(source):
        dirs[:] = sorted(d for d in dirs if d not in SKIP and not d.startswith('.') and not (Path(directory)/d).is_symlink())
        for name in sorted(names):
            path=Path(directory)/name
            if name.startswith(('.', '~$')) or path.is_symlink() or path.suffix.lower() not in EXTENSIONS or excluded_source(path.relative_to(source)): continue
            candidates.append(path)
    # This is an archive: a temporarily absent source must not remove published work.
    previous=json.loads((out/'catalog.json').read_text()) if (out/'catalog.json').exists() else {'files':[]}
    unique={row['sha256']:row for row in previous['files'] if any(not excluded_source(p) for p in row['sourcePaths'])}; rejected=[]; added=0
    for i,p in enumerate(candidates):
        stat=p.stat(); signature={'bytes':stat.st_size,'mtimeNs':stat.st_mtime_ns,'ctimeNs':stat.st_ctime_ns}
        cached=cache.get(str(p)); unchanged=cached and all(cached.get(k)==v for k,v in signature.items())
        if not unchanged and not valid_magic(p): rejected.append({'path':str(p.relative_to(source)),'reason':'File content does not match its format'}); continue
        sha=cached['sha256'] if unchanged else digest(p)
        after=p.stat()
        if (after.st_size,after.st_mtime_ns)!=(stat.st_size,stat.st_mtime_ns):
            rejected.append({'path':str(p.relative_to(source)),'reason':'File is still changing; retry next sync'});continue
        cache[str(p)]={**signature,'sha256':sha}
        if sha in published: continue
        relative=p.relative_to(source).as_posix()
        if sha in unique and (out/'files'/Path(unique[sha]['assetPath']).name).exists():
            if relative not in unique[sha]['sourcePaths']:unique[sha]['sourcePaths'].append(relative)
            continue
        ext=p.suffix.lower(); target=out/'files'/f'{sha}{ext}'; text_path=out/'text'/f'{sha}.json'
        try:
            text=json.loads(text_path.read_text()) if text_path.exists() else source_text(p,sha)
        except Exception as error: rejected.append({'path':relative,'reason':str(error)}); continue
        if not target.exists(): shutil.copyfile(p,target)
        if not text_path.exists(): text_path.write_text(json.dumps(text,ensure_ascii=False))
        content=text['text']
        unique[sha]={'id':'offline-'+sha[:20], 'filename':p.name, 'relativePath':'GENODODI OET/'+relative, 'sourcePaths':[relative], 'collection':'OET', 'format':ext[1:], 'bytes':p.stat().st_size, 'sha256':sha, 'assetPath':f'offline-library/files/{sha}{ext}', 'textPath':f'offline-library/text/{sha}.json', 'skills':classify(relative,content,ext), 'hasText':bool(content.strip()), 'excerpt':re.sub(r'\s+',' ',content)[:320], 'duplicateOf':None, 'pageCount':len(text.get('pages',[])), 'ocrPageCount':0}
        added+=1
        if len(unique)%50==0: print(f'Imported {len(unique)} additional originals ({i+1}/{len(candidates)} paths)',flush=True)
    catalog={'version':1,'source':'GENODODI OET','fileCount':len(unique),'totalBytes':sum(r['bytes'] for r in unique.values()),'files':list(unique.values()),'rejected':rejected}
    temporary=(out/'catalog.json').with_suffix('.tmp');temporary.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n');temporary.replace(out/'catalog.json')
    cache_path.write_text(json.dumps(cache,ensure_ascii=False)+'\n')
    # Map existing hosted recordings to verified originals for the full offline app.
    all_by_sha={r['sha256']:(out/r['assetPath'].removeprefix('offline-library/')) for r in unique.values()}
    remote=json.loads((out/'remote-assets.json').read_text()) if (out/'remote-assets.json').exists() else {}
    benchmark=json.loads((ROOT/'src/data/benchmarkCollection.json').read_text())
    for entry in benchmark['entries']:
        audio=entry.get('audio')
        if not audio: continue
        original=all_by_sha.get(audio['sha256'])
        if original:
            remote[audio['url']]=original.relative_to(out).as_posix()
    (out/'remote-assets.json').write_text(json.dumps(remote,indent=2)+'\n')
    print(json.dumps({'additionalOriginals':len(unique),'newOriginals':added,'bytes':catalog['totalBytes'],'excludedUnreadableFiles':len(rejected),'benchmarkRecordingsAvailable':len(remote)}),flush=True)

if __name__=='__main__':main()
