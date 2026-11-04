"""Refresh versioned presentation/text extraction without changing original files or dates."""
import json
from pathlib import Path
import runpy
from html_text import html_text, VERSION as HTML_VERSION
from study_text import study_text, VERSION as TEXT_VERSION

ROOT=Path(__file__).resolve().parents[1]
extract=runpy.run_path(str(ROOT/'scripts/import-offline-library.py'))['source_text']

def main():
    path=ROOT/'src/data/desktopMaterials.generated.json';catalog=json.loads(path.read_text());changed=0
    for row in catalog['files']:
        if row['format'] not in {'ppt','pptx','txt','json','html','htm'}:continue
        source=ROOT/'public'/row['assetPath'];target=ROOT/'public'/row['textPath']
        payload=json.loads(target.read_text()) if target.exists() else {}
        html=row['format'] in {'html','htm'}
        note=row['format'] in {'txt','json'}
        if payload.get('htmlExtractionVersion' if html else 'documentTextVersion' if note else 'formatExtractionVersion')!=(HTML_VERSION if html else TEXT_VERSION if note else 2):
            payload=html_text(source,row['sha256']) if html else study_text(source,row['sha256'],row['format']) if note else extract(source,row['sha256']);target.write_text(json.dumps(payload,ensure_ascii=False)+'\n');changed+=1
        row.update(hasText=bool(payload['text'].strip()),excerpt=' '.join(payload['text'].split())[:320],pageCount=len(payload.get('pages',[])),ocrPageCount=sum(page.get('extraction')=='ocr' for page in payload.get('pages',[])))
    path.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'refreshedSuppliedFormats':changed}))

if __name__=='__main__':main()
