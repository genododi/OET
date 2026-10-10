"""Rebuild reviewed Listening keys from the exact supplied PDF. Requires pdftotext."""
import re,json,sys,subprocess,hashlib
from pathlib import Path
m=json.load(open('src/data/jahshanCollection.json'))
pdf=Path(sys.argv[1])
expected=next(f['sha256'] for f in m['files'] if f['name'].startswith('Listening Jahshan'))
assert hashlib.sha256(pdf.read_bytes()).hexdigest()==expected, 'Unexpected source PDF; review its keys before importing.'
pages=subprocess.check_output(['pdftotext','-layout',str(pdf),'-']).decode().split('\f')
def rows(page):
 text=pages[page-1]; out=[]
 for line in text.splitlines():
  match=re.match(r'^\s*(\d{1,2})(?:\s*[.)-]:?\s*|\s+)(\S.*)$',line)
  if match:out.append([int(match[1]),match[2].strip()])
 return out
scanned={
5: '(computer) programmer|asthma (attacks)|penicillin|vegetarian|fertility|breech|forceps / forcipes|breastfeeding|epilepsy|Down syndrome / DS / DNS / Down’s (syndrome)|CVS / chronic vill(o)us sampling|sibling(s) / brothers and/or sisters|medial meniscus OR medial|(very tender/tender/painful) bumps|squat (properly) / bend (his) knee|(used) ice pack(s)|tendonitis|(hospital) physio(therapist) / physio(therapist) (in the hospital)|hamstring(s)|(constant) anxiety|fibromyalgia|(a pain/pain) diary|(his) shoulders and elbows / (his) elbows and shoulders|rheumatologist',
6: 'asthma|hair (growth)|hump|sweating / perspiration / diaphoresis|(so) infrequent (now)|(easily) bruise|stretch marks / striae|dark / darkened|acne (vulgaris)|mood swings|irritable|saliva|lisinopril|(some) water|aspirin|clopidogrel|(a bit) breathless|stents|(going up/going down/up and down) stairs|varicose veins|(having) palpitations|heartburn / (acid) reflux|pain|central incisors',
7: 'dry|(very) gradual|swollen / bulging (out)|soft|farm labourer|(night) security guard|beta blockers|crackling (accept: cracking) / crep / crepitation|(bad) eczema|echocardiogram / cardiac echo / echo|arterial blood gas / ABG|corticosteroids|myopic / short(-)sighted / near(-)sighted|nystagmus / (a) flicker(ing)|pigment (in eye)|driving|focus|distance|(hotel) receptionist|cataract (developed)|opacity / clouding|detached retina / retina(l) detachment|(eye) floaters|glare / bright lights'
}
scannedbc={5:'ABABCAACBCBBAACACB',6:'BBABCACCAABAACBBBC',7:'ACCBBCBABCABBACABA'}
def question(i,number,answer,part,page,note='',extract=None):
 return dict(id=f'{part}-{i+1}',number=number,extract=extract,answer=answer,keyPage=page,note=note)
worksheets=[]
for g in m['groups']:
 n=g['number'];ap=g['answerPage']; tracks=[f for f in m['files'] if f['mimeType'].startswith('audio/') and f['relativePath'].startswith('Audio/'+g['title']+'/')]
 if n in (1,8):continue
 notes={}
 if n in scanned:
  ap+=1;a=list(enumerate(scanned[n].split('|'),1));bc=list(zip(range(25,43),scannedbc[n]))
 else:a=rows(ap);bc=rows(ap+1)
 if n==4:a.insert(9,[10,'dairy (products)'])
 if n==9:a[19][1]+=' blood / urine blood / urine and blood tests / urine blood tests'
 if n==10:a[7][1]+=' cups / four to five cups'
 if n==11:
  # The printed key merges 6 and 7; the question sheet (p130) separates the two blanks.
  a[17][1]='bloated';a.insert(18,[7,'irritable bowel syndrome / IBS / irritable bowel'])
  notes[17]=notes[18]='The printed key joins answers 6 and 7 on one line. Separated to match the two blanks on page 130.'
 if n==16:
  # Paper p182 has 12 blanks, but p188 skips the grandfather diagnosis, shifting the final two key labels.
  a.insert(9,[10,None]);a[10][0]=11;a[11][0]=12
  notes[9]='The printed key omits this blank about the grandfather. No answer has been guessed.'
  notes[10]='Printed key item 10, matched to the hockey-tournament blank 11 on page 182.'
  notes[11]='Printed key item 11, matched to the advice blank 12 on page 182.'
 if n==15:bc=[[i%6+1,None] for i in range(18)]
 assert len(a)==24,(n,a)
 assert len(bc)==18,(n,bc)
 parts={}
 parts['A']=[question(i,r[0],r[1],'A',ap,notes.get(i,''),1 if i<12 else 2) for i,r in enumerate(a)]
 for part,entries in [('B',bc[:6]),('C',bc[6:])]:
  parts[part]=[question(i,r[0],r[1][0].upper() if r[1] else None,part,ap+1,'The supplied collection marks this answer key as missing.' if r[1] is None else '',None if part=='B' else 1 if i<6 else 2) for i,r in enumerate(entries)]
  assert all(q['answer'] in ('A','B','C',None) for q in parts[part]),(n,part)
 if n==12:
  parts['C'].append(question(12,7,None,'C',ap+1,'The paper includes a seventh question in Extract 2 (page 147), but its printed key is blank.',2))
 for track in tracks:
  partmatch=re.search(r'Part ([ABC])',track['name'])
  selected=list(parts) if n==2 else [partmatch[1]]
  worksheets.append(dict(trackId=track['id'],setNumber=n,parts=[dict(part=part,questions=parts[part]) for part in selected]))
# Kaplan strategy questions use their own numbering, not a 42-question paper.
kaplan={
1:('A',23,8,'2 months|going straight to bed|gaining weight, trouble focusing and paying attention|thyroxine was low'),
2:('A',23,12,'pregnant|dizzy|donated blood|(a couple of) ribs'),
3:('A',23,16,'fluoxetine|shooting pain|anxious|compulsive OR OCD'),
4:('A',23,20,'aspirin|nitro-glycerine|heart rhythms|angioplasty'),
5:('A',24,1,'fuzzy|more light|(the) pharmacy|squinting|(a pretty persistent) headache|ibuprofen|short-sighted|sinusitis|(a) cold|myocardial infarction, or MI|contact lenses|(an) eye test'),
6:('A',24,13,'urine sample|craving|weight|aunt|stomach|heartburn|throbbing|tired|prenatal|(a little bit) stressed|oral|leaflet'),
7:('B',25,1,'C|B'),8:('B',25,3,'A|C'),9:('B',25,5,'C|C'),10:('B',25,7,'A|A'),11:('B',25,9,'B'),12:('B',25,10,'B'),13:('B',25,11,'A'),14:('B',25,1,'C|B|B|C|A|A'),
15:('C',26,1,'B'),16:('C',26,2,'A|C|B'),17:('C',26,5,'C|B'),18:('C',26,7,'A|A'),19:('C',26,1,'B|C|A|C|C|B'),20:('C',26,7,'A|B|C|A|C|B')}
for track in m['files']:
 if not track['relativePath'].startswith('Audio/'+m['groups'][0]['title']+'/'):continue
 num=int(re.search(r'Track (\d+)',track['name'])[1]);part,page,start,answers=kaplan[num]
 worksheets.append(dict(trackId=track['id'],setNumber=1,parts=[dict(part=part,questions=[question(i,start+i,a,part,page) for i,a in enumerate(answers.split('|'))])]))
assert len(worksheets)==90
out=dict(sourcePdfSha256=next(f['sha256'] for f in m['files'] if f['name'].startswith('Listening Jahshan')),source='Printed Listening collection answer keys; not audio transcripts',checkedAt='2026-10-07',worksheets=worksheets)
Path('src/data/jahshanListeningAnswers.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print('Written',len(worksheets),'track worksheets',sum(len(p['questions']) for w in worksheets for p in w['parts']),'answer slots')
