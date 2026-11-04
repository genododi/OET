"""Refresh versioned presentation/text extraction without changing original files or dates."""
import json
from pathlib import Path
import runpy

ROOT=Path(__file__).resolve().parents[1]
extract=runpy.run_path(str(ROOT/'scripts/import-offline-library.py'))['source_text']

def main():
    path=ROOT/'src/data/desktopMaterials.generated.json';catalog=json.loads(path.read_text());changed=0
    for row in catalog['files']:
        if row['format'] not in {'ppt','pptx','txt'}:continue
        source=ROOT/'public'/row['assetPath'];target=ROOT/'public'/row['textPath']
        payload=json.loads(target.read_text()) if target.exists() else {}
        if payload.get('formatExtractionVersion')!=2:
            payload=extract(source,row['sha256']);target.write_text(json.dumps(payload,ensure_ascii=False)+'\n');changed+=1
        row.update(hasText=bool(payload['text'].strip()),excerpt=' '.join(payload['text'].split())[:320],pageCount=len(payload.get('pages',[])),ocrPageCount=sum(page.get('extraction')=='ocr' for page in payload.get('pages',[])))
    path.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'refreshedSuppliedFormats':changed}))

if __name__=='__main__':main()
