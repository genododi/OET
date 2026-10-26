"""Extract regular study files only, without executing archive contents.

Paths, links, resource forks and oversized entries are checked before extraction.
Existing archives are resumable; the original is always retained.
"""
import argparse
import json
from pathlib import Path, PurePosixPath
import re
import subprocess
import tempfile
import shutil

ROOT=Path(__file__).resolve().parents[1]
FORMATS={'pdf','doc','docx','ppt','pptx','xls','xlsx','csv','txt','md','rtf','html','htm','mp3','m4a','ogg','wav','flac','aac','mp4','mov','jpg','jpeg','png','webp','heic','heif','tif','tiff','bmp','gif','avif'}

def safe_entry(entry):
    name=entry.get('XADFileName','').replace('\\','/');path=PurePosixPath(name)
    return bool(name) and not path.is_absolute() and '..' not in path.parts and not any(p.startswith('.') for p in path.parts) and not entry.get('XADIsLink') and not entry.get('XADLinkDestination') and not entry.get('XADIsDirectory') and not entry.get('XADIsEncrypted') and Path(name).suffix.lower().lstrip('.') in FORMATS and 0<int(entry.get('XADFileSize',0))<=2*1024**3

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--library',default='/Volumes/GENODODI/OET/Mac App/offline-library');parser.add_argument('--destination',default='/Volumes/GENODODI/OET/Imported Archives');args=parser.parse_args()
    library=Path(args.library);destination=Path(args.destination);destination.mkdir(parents=True,exist_ok=True)
    rows=json.loads((library/'catalog.json').read_text())['files'];reports=[]
    for file in rows:
        if file['format'] not in {'zip','rar','7z'}:continue
        folder=destination/(re.sub(r'[^\w .-]','',Path(file['filename']).stem)[:100]+'-'+file['sha256'][:12]);marker=folder/'.oet-archive-import.json'
        if marker.exists() or (folder/'archive-import.json').exists():continue
        archive=library/'files'/Path(file['assetPath']).name
        listing=json.loads(subprocess.check_output(['lsar','-json','-no-recursion',str(archive)],timeout=120))
        entries=[entry for entry in listing.get('lsarContents',[]) if safe_entry(entry)]
        if sum(int(e['XADFileSize']) for e in entries)>8*1024**3:raise ValueError('Archive expands beyond the study import limit: '+file['filename'])
        folder.mkdir(parents=True,exist_ok=True)
        for entry in entries:
            name=entry['XADFileName'].replace('\\','/');target=folder/Path(name)
            if target.exists() and target.stat().st_size==int(entry['XADFileSize']):continue
            target.parent.mkdir(parents=True,exist_ok=True)
            # stdout avoids letting an archive choose filesystem destinations.
            temporary=target.with_suffix(target.suffix+'.partial')
            with temporary.open('wb') as stream:
                subprocess.run(['unar','-q','-nr','-k','skip','-o','-','-i',str(archive),str(entry['XADIndex'])],stdout=stream,stderr=subprocess.PIPE,check=True,timeout=600)
            if temporary.stat().st_size!=int(entry['XADFileSize']):raise ValueError('Extracted entry has the wrong size: '+name)
            temporary.replace(target)
        marker.write_text(json.dumps({'sourceSha256':file['sha256'],'files':[e['XADFileName'] for e in entries]},ensure_ascii=False)+'\n')
        reports.append({'archive':file['filename'],'extracted':len(entries)});print(json.dumps(reports[-1]),flush=True)
    print(json.dumps({'expandedArchives':len(reports)}),flush=True)

if __name__=='__main__':main()
