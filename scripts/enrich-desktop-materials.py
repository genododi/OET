"""Add full, page-numbered text to supplied PDFs and scans without changing originals.

Requires macOS Vision (Swift), Poppler and Pillow. OCR stays explicitly labelled.
Usage: python3 scripts/enrich-desktop-materials.py --work-dir /tmp/oet-material-ocr
Cached recognition can be reused only for the same original SHA-256 and page.
"""
import argparse, hashlib, json, re, subprocess, tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image
parser=argparse.ArgumentParser()
parser.add_argument('--work-dir', default=str(Path(tempfile.gettempdir())/'oet-material-ocr'))
args=parser.parse_args()
repo=Path(__file__).resolve().parents[1]
root=Path(args.work_dir).resolve();root.mkdir(parents=True,exist_ok=True)
catalog_path=repo/'src/data/desktopMaterials.generated.json'
catalog=json.loads(catalog_path.read_text())
documents={};jobs=[]
for sha,file in {f['sha256']:f for f in catalog['files']}.items():
 asset=repo/'public'/file['assetPath']
 assert hashlib.sha256(asset.read_bytes()).hexdigest()==sha
 if file['format']=='pdf':
  raw=subprocess.check_output(['pdftotext','-layout',str(asset),'-'],stderr=subprocess.DEVNULL).decode().split('\f')[:-1]
  documents[sha]=[dict(number=i+1,text=t.strip(),extraction='text') for i,t in enumerate(raw)]
  for page in documents[sha]:
   if len(re.sub(r'[^A-Za-z]','',page['text']))<50:jobs.append((sha,page['number'],file))
 elif file['format'] in ('jpg','jpeg','png'):
  documents[sha]=[dict(number=1,text='',extraction='none')];jobs.append((sha,1,file))
print('Reading',len(documents),'unique documents;',len(jobs),'pages need recognition',flush=True)
def render(job):
 sha,number,file=job;stem=root/f'{sha}-{number}';asset=repo/'public'/file['assetPath']
 if stem.with_suffix('.png').exists():return
 if file['format']=='pdf':
  subprocess.run(['pdftoppm','-f',str(number),'-l',str(number),'-scale-to','2200','-singlefile','-png',str(asset),str(stem)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 else:
  image=Image.open(asset);image.thumbnail((2200,2200));image.convert('RGB').save(stem.with_suffix('.png'))
with ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(render,jobs))
for start in range(0,len(jobs),40):
 paths=[str(root/f'{sha}-{number}.png') for sha,number,file in jobs[start:start+40] if not (root/f'{sha}-{number}.vision.json').exists()]
 if paths:subprocess.run(['swift',str(repo/'scripts/recognize-source-text.swift'),*paths],check=True,stdout=subprocess.DEVNULL)
 print('Recognised',min(len(jobs),start+40),'/',len(jobs),flush=True)
for sha,number,file in jobs:
 observations=json.loads((root/f'{sha}-{number}.vision.json').read_text())
 rows=[]
 for item in sorted(observations,key=lambda item:-item['y']):
  row=next((row for row in rows if abs(row[0]['y']-item['y'])<min(row[0]['height'],item['height'])*0.45),None)
  if row is None:rows.append([item])
  else:row.append(item)
 text='\n'.join('    '.join(item['text'] for item in sorted(row,key=lambda item:item['x'])) for row in rows)
 page=documents[sha][number-1]
 if len(re.sub(r'\s','',text))>len(re.sub(r'\s','',page['text'])):page.update(text=text,extraction='ocr')
 if not page['text'].strip():page['extraction']='none'
# Corrections checked against the scanned original (Writing August 2015, page 1).
reviewed = documents.get('e3b9573b89b1784a2c02fd79fe1689cca5db96aea82668e7d1a61251cf523078')
if reviewed:
 reviewed[0]['text'] = reviewed[0]['text'].replace('wheeze in Ra\nmid-zone', 'wheeze in R\nmid-zone').replace('R middie lobe', 'R middle lobe')
for sha,pages in documents.items():
 data=dict(sourceSha256=sha,text='\n\f\n'.join(page['text'] for page in pages),pages=pages)
 (repo/f'public/supplied-materials/text/{sha}.json').write_text(json.dumps(data,ensure_ascii=False)+'\n')
for file in catalog['files']:
 if file['sha256'] not in documents:continue
 pages=documents[file['sha256']];text='\n'.join(page['text'] for page in pages)
 file['hasText']=bool(re.search(r'[A-Za-z]{3}',text))
 file['excerpt']=re.sub(r'\s+',' ',text).strip()[:320]
 file['pageCount']=len(pages)
 file['ocrPageCount']=sum(page['extraction']=='ocr' for page in pages)
catalog_path.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
print('Saved',sum(len(pages) for pages in documents.values()),'pages;',sum(page['extraction']=='ocr' for pages in documents.values() for page in pages),'OCR pages')
