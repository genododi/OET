#!/usr/bin/env python3
"""Import all supported GENODODI originals into a portable, deduplicated library.

Never follows symlinks or imports repository/build copies, quarantine, executables,
archives or HTML downloads disguised as papers. Existing imports are resumable.
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
EXTENSIONS = {'.pdf', '.docx', '.mp3', '.m4a', '.wav', '.mp4', '.jpg', '.jpeg', '.png'}
SKIP = {'.git', 'node_modules', 'dist', 'public', 'assets', 'output', 'tmp', 'quarantine', 'work', 'Mac App', 'Benchmark Offline', 'repo-duplicate-backup'}

def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def classify(relative, text, extension):
    value = relative.casefold()
    found = [skill for skill in ('listening', 'reading', 'writing', 'speaking') if skill in value]
    if found: return found
    if any(word in value for word in ('letter', 'case note', 'task', 'amr oet')) or extension == '.docx': return ['writing']
    if any(word in value for word in ('role', 'card', 'patient conversation')): return ['speaking']
    if extension in {'.mp3', '.m4a', '.wav'}: return ['listening']
    sample = text[:5000].casefold()
    if any(word in sample for word in ('writing task', 'dear dr', 'case notes')): return ['writing']
    if any(word in sample for word in ('role-play', 'roleplay', 'candidate card')): return ['speaking']
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
    return {'sourceSha256': sha, 'text': ''}

def valid_magic(source):
    with source.open('rb') as stream: head = stream.read(512)
    ext = source.suffix.lower()
    if ext == '.pdf': return head.lstrip().startswith(b'%PDF-')
    if ext == '.docx': return head.startswith(b'PK')
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
    cache = {r['path']: r for r in json.loads(Path(args.hash_inventory).read_text())} if args.hash_inventory else {}
    existing = json.loads((ROOT/'src/data/desktopMaterials.generated.json').read_text())
    published = {r['sha256']:r for r in existing['files']}
    candidates=[]
    for directory, dirs, names in os.walk(source):
        dirs[:] = sorted(d for d in dirs if d not in SKIP and not d.startswith('.') and not (Path(directory)/d).is_symlink())
        for name in sorted(names):
            path=Path(directory)/name
            if name.startswith('.') or path.is_symlink() or path.suffix.lower() not in EXTENSIONS: continue
            candidates.append(path)
    unique={}; rejected=[]
    for i,p in enumerate(candidates):
        if not valid_magic(p): rejected.append({'path':str(p.relative_to(source)),'reason':'File content does not match its format'}); continue
        cached=cache.get(str(p)); sha=cached['sha256'] if cached and cached['bytes']==p.stat().st_size else digest(p)
        if sha in published: continue
        relative=p.relative_to(source).as_posix()
        if sha in unique: unique[sha]['sourcePaths'].append(relative); continue
        ext=p.suffix.lower(); target=out/'files'/f'{sha}{ext}'; text_path=out/'text'/f'{sha}.json'
        try:
            text=json.loads(text_path.read_text()) if text_path.exists() else source_text(p,sha)
        except Exception as error: rejected.append({'path':relative,'reason':str(error)}); continue
        if not target.exists(): shutil.copyfile(p,target)
        if not text_path.exists(): text_path.write_text(json.dumps(text,ensure_ascii=False))
        content=text['text']
        unique[sha]={'id':'offline-'+sha[:20], 'filename':p.name, 'relativePath':'GENODODI OET/'+relative, 'sourcePaths':[relative], 'collection':'OET', 'format':ext[1:], 'bytes':p.stat().st_size, 'sha256':sha, 'assetPath':f'offline-library/files/{sha}{ext}', 'textPath':f'offline-library/text/{sha}.json', 'skills':classify(relative,content,ext), 'hasText':bool(content.strip()), 'excerpt':re.sub(r'\s+',' ',content)[:320], 'duplicateOf':None, 'pageCount':len(text.get('pages',[])), 'ocrPageCount':0}
        if len(unique)%50==0: print(f'Imported {len(unique)} additional originals ({i+1}/{len(candidates)} paths)',flush=True)
    catalog={'version':1,'source':'GENODODI OET','fileCount':len(unique),'totalBytes':sum(r['bytes'] for r in unique.values()),'files':list(unique.values()),'rejected':rejected}
    (out/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
    # Map existing hosted recordings to verified originals for the full offline app.
    all_by_sha={r['sha256']:(out/r['assetPath'].removeprefix('offline-library/')) for r in unique.values()}
    remote={}
    benchmark=json.loads((ROOT/'src/data/benchmarkCollection.json').read_text())
    for entry in benchmark['entries']:
        audio=entry.get('audio')
        if not audio: continue
        original=all_by_sha.get(audio['sha256'])
        if original:
            remote[audio['url']]=original.relative_to(out).as_posix()
    (out/'remote-assets.json').write_text(json.dumps(remote,indent=2)+'\n')
    print(json.dumps({'additionalOriginals':len(unique),'bytes':catalog['totalBytes'],'excludedUnreadableFiles':len(rejected),'benchmarkRecordingsAvailable':len(remote)}),flush=True)

if __name__=='__main__':main()
