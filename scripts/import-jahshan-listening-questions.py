"""Import printed listening questions, preserving notes and source numbering.

Usage: python3 scripts/import-jahshan-listening-questions.py SOURCE.pdf
Reviewed OCR text for scanned pages is versioned beside this script. No audio
transcript or answer key is used to invent question wording.
"""
import hashlib, json, re, subprocess, sys, unicodedata
from pathlib import Path
manifest = json.loads(Path('src/data/jahshanCollection.json').read_text())
keys = json.loads(Path('src/data/jahshanListeningAnswers.json').read_text())
pdf = Path(sys.argv[1])
assert hashlib.sha256(pdf.read_bytes()).hexdigest() == keys['sourcePdfSha256']
raw = subprocess.check_output(['pdftotext', '-layout', str(pdf), '-']).decode().split('\f')
# Exact inclusive boundaries; covers exclude generic listening-test instructions.
profiles = {
 2: [(29,30),(31,32),(33,36)], 3:[(41,42),(43,44),(45,48)],
 4:[(53,54),(55,56),(57,60)], 5:[(65,67),(68,69),(70,72)],
 6:[(78,80),(81,82),(83,86)], 7:[(92,93),(94,95),(96,99)],
 9:[(107,108),(109,110),(111,114)], 10:[(118,119),(120,121),(122,125)],
 11:[(129,130),(131,132),(133,136)], 12:[(140,141),(142,143),(144,147)],
 13:[(151,154),(155,156),(157,158)], 14:[(162,165),(166,167),(168,169)],
 15:[(173,174),(175,176),(177,178)], 16:[(182,183),(184,185),(186,187)],
 17:[(191,192),(193,194),(195,196)], 18:[(200,201),(202,203),(204,205)],
 19:[(209,210),(211,212),(213,214)], 20:[(218,219),(220,221),(222,223)],
 21:[(228,229),(230,231),(232,235)], 22:[(240,241),(242,243),(244,247)],
 23:[(252,253),(254,255),(256,259)], 24:[(264,265),(266,267),(268,271)],
 25:[(276,277),(278,279),(280,283)], 26:[(288,289),(290,291),(292,295)],
}
kaplan_pages={1:[4],2:[4],3:[5],4:[5],5:[6],6:[7],7:[8],8:[9],9:[10],10:[11],11:[12],12:[12],13:[12],14:[13,14],15:[15],16:[16],17:[17],18:[18],19:[19,20],20:[21,22]}
def clean(page, part):
 file=Path(f'scripts/fixtures/jahshan-listening/{page}.txt')
 source=file.read_text() if file.exists() else raw[page-1]
 out=[]
 for line in source.splitlines():
  line=unicodedata.normalize('NFKC',line).replace('\uf0b7','•').replace('\u200b','')
  s=line.strip()
  if re.search(r'(?i)\[CANDIDATE|LISTENING QUESTION PAPER|Page \d+|Scanned by|Study guide for OET|PRACTICE TEST \d|www\.occupational|END OF (PART|LISTENING)|© IRS Group',s): continue
  if re.fullmatch(r'[SMPLE]',s) or (part=='A' and s=='A') or re.fullmatch(r'\s{20,}A\s*',line):continue
  s=s.replace('SAMPLE','').strip()
  if page==186:s=re.sub(r'^(5-\s*)B\s+',r'\1',s) # Printed stray selection; keep the question, hide the answer hint.
  if page==196:s=re.sub(r'^([abc])\.',lambda m:m[1].upper()+'.',s)
  s=re.sub(r'[ \t]+',' ',s)
  if s:out.append(s)
 return '\n'.join(out)

def selected_pages(sheet,part):
 n=sheet['setNumber']
 if n!=1:
  a,b=profiles[n]['ABC'.index(part)]
  return [(page,clean(page,part)) for page in range(a,b+1)]
 track=next(f for f in manifest['files'] if f['id']==sheet['trackId'])
 t=int(re.search(r'Track (\d+)',track['name'])[1]); result=[]
 for page in kaplan_pages[t]:
  text=clean(page,part)
  if t in (1,2):
   before,after=text.split('Take 10 seconds',1);text=before if t==1 else 'Take 10 seconds'+after
  if t in (3,4):
   before,after=text.split('Exercise',1);text=before if t==3 else after
  if t in (11,12,13):
   text=re.split(rf'Play Track {t}\b',text)[1]
   text=f'Play Track {t}'+re.split(r'Play Track \d+\b',text)[0]
  result.append((page,text))
 return result

worksheets=[]
errors=[]
for sheet in keys['worksheets']:
 sections=[]
 for section in sheet['parts']:
  part=section['part']; questions=section['questions']; pages=selected_pages(sheet,part)
  nodes=[]; index=0
  # Strategy Track 1 uses short-answer questions rather than inline gaps.
  short_answer=sheet['setNumber']==1 and questions[0]['number']==8 and part=='A'
  for page,text in pages:
   text = text + "\n\n" # Preserve page and extract boundaries in the text flow.
   if part=='A' and not short_answer:
    # Some publishers omit the closing parenthesis. Only sequential expected
    # numbers can become fields, preventing incidental medical numbers matching.
    pattern=r'\((\d{1,2})(?:\)|(?=\s|_))[ \t]*[_>]*'
   else:
    pattern=r'(?m)^(?:Question\s+)?(\d{1,2})(?:[.\-)]\s*|\s+|$)'
   cursor=0
   for match in re.finditer(pattern,text):
    if index>=len(questions) or int(match[1])!=questions[index]['number']:continue
    prefix=text[cursor:match.start()]
    if prefix.strip():nodes.append(dict(text=prefix,sourcePage=page))
    nodes.append(dict(questionId=questions[index]['id'],text=match[0].strip(),sourcePage=page))
    cursor=match.end();index+=1
   if text[cursor:].strip():nodes.append(dict(text=text[cursor:],sourcePage=page))
  if index!=len(questions):errors.append((sheet['setNumber'],part,index,len(questions),questions[index]['number'] if index<len(questions) else None))
  sections.append(dict(part=part,inline=part=='A' and not short_answer,ocr=sheet['setNumber'] in (5,6,7),content=nodes))
 worksheets.append(dict(trackId=sheet['trackId'],setNumber=sheet['setNumber'],parts=sections))
if errors:
 print('Unmatched questions:',errors);sys.exit(1)
key_pages=sorted({q['keyPage'] for w in keys['worksheets'] for p in w['parts'] for q in p['questions']})
if '--render-keys' in sys.argv:
 from PIL import Image
 import tempfile
 dest=Path('public/jahshan-listening-keys');dest.mkdir(exist_ok=True)
 with tempfile.TemporaryDirectory() as temp:
  for page in key_pages:
   stem=str(Path(temp)/str(page))
   subprocess.run(['pdftoppm','-f',str(page),'-l',str(page),'-scale-to','1800','-singlefile','-png',str(pdf),stem],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
   Image.open(stem+'.png').convert('RGB').save(dest/f'{page}.webp',quality=85)
assets=[]
for page in key_pages:
 data=Path(f'public/jahshan-listening-keys/{page}.webp').read_bytes()
 assets.append(dict(page=page,bytes=len(data),sha256=hashlib.sha256(data).hexdigest()))
out=dict(sourcePdfSha256=keys['sourcePdfSha256'],source='Printed listening questions and notes from the supplied collection; scanned pages use reviewed OCR.',worksheets=worksheets,keyPages=assets)
Path('src/data/jahshanListeningQuestions.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print('Imported',len(worksheets),'recordings and',sum(sum('questionId' in node for node in p['content']) for w in worksheets for p in w['parts']),'question fields')
