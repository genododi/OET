"""Import user-supplied Benchmark papers; keep exact page text and source hashes."""
import argparse,hashlib,json,re,shutil,subprocess
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--sources',default='/Volumes/GENODODI/OET/oet-study-sources');parser.add_argument('--audio',default='/Volumes/GENODODI/OET/Benchmark tests/Audio');parser.add_argument('--drive-manifest',default='/tmp/benchmark-drive-files.json');args=parser.parse_args()
repo=Path(__file__).resolve().parents[1];src=Path(args.sources);out=repo/'public/benchmark';(out/'files').mkdir(parents=True,exist_ok=True);(out/'text').mkdir(exist_ok=True)
def extract(p):
 text=subprocess.run(['pdftotext','-layout',str(p),'-'],capture_output=True,text=True,check=True).stdout
 pages=text.split('\f');return pages[:-1] if not pages[-1].strip() else pages
def asset(p,name):
 dest=out/'files'/name;shutil.copyfile(p,dest);return 'benchmark/files/'+name,hashlib.sha256(dest.read_bytes()).hexdigest()
def save_text(id,pages):
 path=out/'text'/f'{id}.json';path.write_text(json.dumps({'pages':pages},ensure_ascii=False));return 'benchmark/text/'+path.name
base=src/'raw/google-drive/10cvKcazYuaNe01cSahOSHbflbOlAEN0t'
book=base/'04. Benchmark/LISTENING Audio/Benchmark Listeninig Tests.pdf'
bookasset,bookhash=asset(book,'listening.pdf');pages=extract(book)
starts={}
for i,t in enumerate(pages):
 m=re.search(r'Practice Test\s*(\d+)\s*:',t)
 if m:starts.setdefault(int(m[1]),i)
assert sorted(starts)==list(range(1,21))
audiofiles=json.load(open(args.drive_manifest));by_number={int(re.search(r'TEST[ -]+(\d+)',f['title']).group(1)):f for f in audiofiles}
entries=[]
for n,start in starts.items():
 end=starts.get(n+1,len(pages));id=f'listening-{n}'
 keyfile=base/f'04. Benchmark/Answers/Test {n}.pdf';keyasset,keyhash=asset(keyfile,f'listening-key-{n}.pdf')
 keytext='\n'.join(extract(keyfile));answers={m[0]:m[1].strip() for m in re.findall(r'\bQ(\d+)\s*\n([^\n]+)',keytext)}
 assert sorted(map(int,answers))==list(range(1,43)),n
 audio=None
 if n in by_number:
  f=by_number[n];p=Path(args.audio)/f['title'];assert p.stat().st_size==int(f['size'])
  probe=json.loads(subprocess.run(['ffprobe','-v','error','-show_format','-of','json',str(p)],capture_output=True,text=True,check=True).stdout)
  audio={'url':f'https://github.com/genododi/OET/releases/download/benchmark-audio-2026-10-12/test-{n:02d}.mp3','sourceUrl':f['url'],'fileId':f['id'],'filename':f['title'],'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'duration':float(probe['format']['duration'])}
 entries.append({'id':id,'skill':'listening','number':n,'title':f'Listening Test {n}','assetPath':bookasset,'sourceSha256':bookhash,'startPage':start+1,'endPage':end,'textPath':save_text(id,[{'number':i+1,'text':pages[i]} for i in range(start,end)]),'keyPath':keyasset,'keySha256':keyhash,'answers':answers,'audio':audio})
catalog=json.load(open(repo/'src/data/desktopMaterials.generated.json'))
f=next(f for f in catalog['files'] if f['filename']=='BenchMark Reading Tests.pdf');rpages=json.load(open(repo/'public'/f['textPath']))['pages']
rstarts={}
for i,p in enumerate(rpages):
 m=re.match(r'\s*TEST\s*[-–]?\s*(\d+)\b',p['text'],re.I)
 if m:rstarts[int(m[1])]=i
assert sorted(rstarts)==list(range(1,21))
for n,start in rstarts.items():
 end=rstarts.get(n+1,len(rpages));id=f'reading-{n}';selected=rpages[start:end]
 # Some key pages are images: provide their original page, never guess OCR-lost answers.
 keypages=[p['number'] for p in selected if 'Answer Keys' in p['text'] or 'Correct Answer' in p['text']]
 title=re.sub(r'^\s*TEST\s*[-–]?\s*\d+\s*','',selected[0]['text'],flags=re.I).split('\n')[0].strip()
 entries.append({'id':id,'skill':'reading','number':n,'title':f'Reading Test {n} · {title}','assetPath':f['assetPath'],'sourceSha256':f['sha256'],'startPage':start+1,'endPage':end,'textPath':save_text(id,[p for p in selected if p['number'] not in keypages]),'keyPages':keypages})
writing=base/'06. Letter corrections/Dr. AA Benchmark/BenchmarkCASENOTES_100522 (1).pdf';wasset,whash=asset(writing,'writing-case-notes.pdf');wpages=extract(writing)
# The first section is Medicine; the subsequent section is Nursing.
wstarts={}
for i,p in enumerate(wpages[:33]):
 m=re.search(r'Case Notes Study\s*(\d+)',p)
 if m:wstarts[int(m[1])]=i
assert sorted(wstarts)==list(range(1,11))
for n,start in wstarts.items():
 end=wstarts.get(n+1,33);id=f'writing-{n}'
 entries.append({'id':id,'skill':'writing','number':n,'title':f'Medicine Writing Task {n}','assetPath':wasset,'sourceSha256':whash,'startPage':start+1,'endPage':end,'textPath':save_text(id,[{'number':i+1,'text':wpages[i]} for i in range(start,end)])})
result={'source':'User-supplied local Benchmark PDFs and original Drive audio','driveFolder':'https://drive.google.com/drive/folders/1lr1YAQgVMM08T3tKFzrzk43mdmsPYGqt','audioMissing':[10,17],'entries':entries}
(repo/'src/data/benchmarkCollection.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('Imported',len(entries),'tests/tasks,',len(by_number),'recordings.')
