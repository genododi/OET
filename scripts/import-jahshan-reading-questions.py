"""Extract question forms from the supplied Reading PDF and reviewed OCR pages."""
import json,re,unicodedata,subprocess,hashlib,argparse
from PIL import Image
from pathlib import Path
parser=argparse.ArgumentParser()
parser.add_argument('--work-dir',default='/Volumes/GENODODI/oet-study-sources/work/jahshan-workspace')
parser.add_argument('--source-root',default='/Volumes/GENODODI/oet-study-sources/Google drive Folder')
args=parser.parse_args()
assert Path(args.source_root).is_dir(),'Connect the source drive before importing'
ROOT=Path(args.work_dir);ROOT.mkdir(parents=True,exist_ok=True)
manifest=json.load(open('src/data/jahshanCollection.json'))
book=next(f for f in manifest['files'] if f['name'].startswith('Reading Jahshan'))
pdf=Path(args.source_root)/book['sourceRelativePath']
assert hashlib.sha256(pdf.read_bytes()).hexdigest()==book['sha256'],'Reading PDF differs from the indexed source'
if not (ROOT/'reading-full.txt').exists():subprocess.run(['pdftotext','-layout',str(pdf),str(ROOT/'reading-full.txt')],check=True)
ocr_pages=list(range(128,149))+list(range(150,171))+list(range(172,192))+[206,207,227,228,250]+list(range(337,346))+list(range(354,365))+list(range(374,383))+list(range(392,403))+list(range(412,422))+list(range(430,440))
for page in ocr_pages:
 image_path=ROOT/f'reading-{page}.png';ocr_path=ROOT/f'reading-layout-{page}'
 if not image_path.exists():subprocess.run(['pdftoppm','-f',str(page),'-l',str(page),'-scale-to','2200','-singlefile','-png',str(pdf),str(image_path.with_suffix(''))],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 if not ocr_path.with_suffix('.txt').exists():subprocess.run(['tesseract',str(image_path),str(ocr_path),'--psm','6'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
raw_pages=(ROOT/'reading-full.txt').read_text().split('\f')
pages=raw_pages.copy()
for n in range(1,576):
 f=ROOT/f'reading-layout-{n}.txt'
 if f.exists():pages[n-1]=f.read_text()
manifest=json.load(open('src/data/jahshanCollection.json'))
def rr(a,b):return list(range(a,b+1))
# question pages A, B, C, source-text pages A, key pages A / BC.
profiles={
2:([58,63,64],rr(65,70),rr(73,75)+rr(78,80),rr(59,62),81,82),
3:([86,87],rr(88,93),[96,97,100,101],[84,85],102,103),
4:([108,109],rr(111,116),[119,120,123,124],[105,106],125,126),
5:(rr(130,132),rr(133,138),[141,142,145,146],[128,129],147,148),
6:([153,154],rr(155,160),[163,164,167,168],[150,151,152],169,170),
7:([174,175],rr(176,181),[184,185,188,189],[172,173],190,191),
8:(rr(195,197),rr(198,201),[204,205],[193,194],206,207),
9:([211,212],rr(213,218),[221,222,225,226],[209,210],227,228),
10:([233,234],rr(235,240),[243,244,247,248],[230,231,232],249,250),
11:([256,257],rr(258,260),[262,263,265,266],rr(252,255),267,268),
12:([273,274],rr(275,277),[279,280,282,283],rr(270,272),284,285),
13:(rr(290,292),rr(293,298),[301,302,305,306],rr(287,289),307,308),
14:(rr(312,314),rr(315,320),[323,324,327,328],[310,311],329,330),
15:([335,336],rr(337,339),rr(340,345),rr(332,334),346,347),
16:([352,353],rr(354,356),rr(357,364),rr(349,351),365,366),
17:([372,373],rr(374,376),rr(377,382),rr(368,371),383,384),
18:([390,391],rr(392,394),rr(395,402),rr(386,389),403,404),
19:([410,411],rr(412,414),rr(415,421),rr(406,409),422,423),
20:([428,429],rr(430,432),rr(433,439),rr(425,427),440,441),
21:([447,448],rr(449,454),[457,458,461,462],rr(443,446),463,464),
22:([469,470],rr(471,476),[479,480,483,484],rr(466,468),485,486),
23:([491,492],rr(493,498),[501,502,505,506],rr(488,490),507,508),
24:([514,515],rr(516,521),[523,524,527,528],rr(510,513),529,530),
25:([536,537],rr(538,543),[546,547,549,550],rr(532,535),551,552),
26:([556,557],rr(558,563),[566,567,570,571],[554,555],572,573)}

def cleanline(s):
 s=s.replace('\u200b','').replace('© IRS Group','').strip()
 s=re.sub(r'^C\.[12]\s*', '', s)
 s=re.sub(r'^1 (?=If a burns|What procedure|VAC/)', '11 ', s)
 if not s or re.fullmatch(r'[SAMPLE\s]+',s) or re.search(r'(?i)\[CANDIDATE|Page \d+|Scanned by|READING QUESTION PAPER|END OF (PART|READING)|THIS .*(COLLECTED|BOOKLET)|Study guide for OET|www\.occupational|PRACTICE TEST \d+$',s):return ''
 return s
# Sequential matching prevents incidental numbers in passages from becoming question IDs.
def extract(page_nums,expected,keys=False):
 out=[];current=None;idx=0;active=True
 for page in page_nums:
  active=False
  for raw in pages[page-1].splitlines():
   line=cleanline(raw)
   if not line:continue
   if re.match(r'(?i)^Paragraph \d',line):active=False;continue
   if re.search(r'(?i)(yet answered|arked out|lag question|select one:|enled ou)',line):continue
   if re.match(r'(?i)^(Questions?\s+\d+\s*[-–]|For (each|questions)|Answer (each|questions)|Complete (each|the)|In which text|PART [ABC]|Text \d+: Questions)',line):active=False;continue
   pattern=r'^(?:Question\s+)?(\d{1,2})(?:\s*[.,)\-:]\s*|\s+)(.*)$'
   hit=re.match(pattern,line,re.I)
   if not keys and re.match(r'^\d+\.\d+',line):hit=None
   if not hit and re.fullmatch(r'Question\s+\d+',line,re.I):hit=re.match(r'^Question\s+(\d+)(.*)$',line,re.I)
   if not hit and re.match(r'^\d+[A-Za-z]',line):hit=re.match(r'^(\d+)(.*)$',line)
   if page in list(range(128,149))+list(range(150,171))+list(range(172,192)) and idx<len(expected):
    hits=list(re.finditer(r'(?<!\d)('+str(expected[idx])+r')(?:[.,)\s]\s*|$)(.*)$',line))
    for candidate in hits:
     if candidate.start()<=8 and int(candidate[1])==expected[idx]:hit=candidate;break
   if not hit and re.fullmatch(r'\d{1,2}[.)]?',line):hit=re.match(r'^(\d{1,2})[.)]?(.*)$',line)
   if hit and idx<len(expected) and int(hit[1])==expected[idx]:
    current=dict(number=expected[idx],sourcePage=page,lines=[hit[2]]);out.append(current);idx+=1;active=True
   elif current and active:
    current['lines'].append(line)
 for q in out:
  text='\n'.join(q.pop('lines')).strip()
  text=re.sub(r'[ \t]{6,}',' ____ ' if not keys else ' ',text)
  text=re.sub(r'(?m)^[-_]{3,}\s*$', '', text).strip()
  q['text']=text
 return out


# Sentence gaps are embedded inside paragraphs rather than numbered at the left margin.
inline={
8:(196,6,["Children presenting with head injuries are assessed as high risk if they have had memory loss lasting ____ or more.","Children presenting with head injuries are assessed as high risk if they have fallen ____ or more.","Children presenting with head injuries are assessed as high risk if they have been hit by a weighty object or one moving at ____.","Children presenting with head injuries are assessed as high risk if they have unusual levels of ____.","Children presenting with head injuries are assessed as high risk if they have a ____ which gets worse over time.","Escalation: Children assessed as intermediate or high risk should undergo a ____.","All patients presenting with ____ head injuries must be referred straight to the MO.","Patients with GCS below 8 may need ____.","The MO should be informed without delay if there is a drop in BP or change in a patient's level of ____.","Staff should be especially careful when administering ____ to head injury patients.","Head injury patients may also have an injury to their ____."]),
10:(234,15,["In comparison to breast milk and infant formula, cows’ milk is ____.","Special procedures should be used because ____ may be poisonous for children.","Men over 40 and women over 50 with a recurring iron deficiency should have an ____.","Iron sucrose can be given to a patient no more than ____.","Although serum ferritin level is a good indication of deficiency, interpreting the results is sometimes difficult ____.","IV iron infusions are a safe alternative when patients are unable to ____."]),
11:(257,15,["The use of Buprenorphine-naxolone requires a ____ before treatment.","The use of symptomatic medications for the treatment of opioid dependence has been found to have ____ than tramadol.","Different definitions of opioid dependence share the same ____.","Once it is decided that opioid taper is a suitable treatment the doctor and patient should create a ____.","Recent research indicates that ____ can work as well as combination analgesics including codeine and oxycodone.","The ICD-10 defines a patient as dependent if they have ____ key symptoms simultaneously."]),
12:(274,15,["Sleep, exercise and nutrition comprise the ____ of further ADHD treatment.","When diagnosing ADHD, it is important to ask if the issues arose recently or are ____.","It is possible to move to ____ after one month of immediate-release methylphenidate.","Signs of ADHD can be disguised by ____ which GPs are more likely to recognise.","GPs should regularly check the ____ of patients prescribed stimulant medication.","Establishing the ideal dose of ADHD medication needs ____ by an expert psychiatrist."]),
13:(292,15,["Dementia differs in important ways from ____, which, for example, has a sudden onset.","The DSM-5 defines dementia as substantial cognitive decline that compromises the individual’s ____.","There are ____ medications for MCI that are recommended based on available research.","Many symptoms described as problems with memory are probably better described as ____ complaints.","Social cognition includes the ability to follow accepted social rules and the ____.","To assess perceptual motor functioning doctors can ask if patients have had difficulty using ____ objects like knives and forks."])}
# Choice letters read directly from rendered source keys (including scanned keys).
reviewed_bc={5:'ACBAAC CACDBBBC BCBDACDA',6:'BAABCB CABBCDAD ADABDCAB',7:'ABBCBA DDAACADB AADABCBD',8:'CBCBBA BDCACBAD',9:'CBBBAA BBABDCDA DACDABBD',10:'CCBCAA DCBDBABA CACBADCA'}
# Correct page 207 Part B is C B B C B A.
reviewed_bc[8]='CBBCBA BDCACBAD'
# Page 573 contains visible glyphs omitted by its PDF text layer; checked against rendered page.
reviewed_bc[26]='ABCBCB CDCABDCA ADABADCD'

def unnumbered(page_nums,expected,last_option):
 out=[]
 for page in page_nums:
  lines=[cleanline(s) for s in raw_pages[page-1].splitlines()]
  lines=[s for s in lines if s and not re.match(r'^(?:[-_]+|[BC]\d(?:\.\d)?$|Text:|Select one:)',s)]
  block=[];ending=False
  for line in lines:
   # In these source worksheets every final option is one line; the next line starts the next stem.
   if ending:
    out.append(dict(number=expected[len(out)],sourcePage=page,text='\n'.join(block)));block=[];ending=False
   block.append(line)
   if re.match(r'^'+last_option+r'\.',line):ending=True
  if block and any(re.match(r'^A\.',s) for s in block):
   out.append(dict(number=expected[len(out)],sourcePage=page,text='\n'.join(block)))
 return out

all_tests=[]
for n,profile in profiles.items():
 a,b,c,text,ka,kbc=profile
 cnums=(list(range(1,9))*2 if n in [11,12,15,16,17,18,19,20] else list(range(1,9)) if n==8 else list(range(7,23)))
 aq=extract(a,list(range(1,21)))
 if n in inline:
  pg,start,items=inline[n]
  aq=aq[:start-1]+[dict(number=start+i,sourcePage=pg,text=t) for i,t in enumerate(items)]
  if n==8:aq+=extract([197],list(range(17,21)))
 bq=unnumbered(b,list(range(1,7)),'C') if n in [15,16,17] else [extract([pg],[i+1])[0] for i,pg in enumerate(b)] if len(b)==6 else extract(b,list(range(1,7)))
 cq=unnumbered(c,cnums,'D') if n in [15,16,17] else extract(c,cnums)
 if n==17:
  def manual(number,page,text):return dict(number=number,sourcePage=page,text=text.replace(' | ','\n'))
  bq += [manual(5,376,"The guidelines inform us that GPs leaving general practice for more than three months | A. have a choice to make about whether or not to continue being recognised. | B. don’t need to fulfil QI&CPD requirements if Medicare still recognises them. | C. can decide whether or not to be recognised by Medicare if they are a fellow."),manual(6,376,"The hospital policy explains that | A. it is generally preferable to only use items once. | B. the way in which items are reused is condition specific. | C. staff are responsible for organising items into the correct group.")]
  cq=cq[:5]+[manual(6,378,"What do Robyn Burton and Nick Sheron say about alcohol? | A. More research is required before any action is taken. | B. There are other issues that are more worrying. | C. Curbing consumption decreases overall risk. | D. Even drinking a small amount is dangerous."),manual(7,379,"In the fifth paragraph, Burton and Sheron suggest that | A. there are currently not as many answers as there need to be. | B. financial considerations are being placed ahead of people's health. | C. most people will find it difficult to stop drinking even if it is bad for them. | D. it would be very expensive for governments to reduce alcohol consumption."),manual(8,379,"In the final paragraph, Max Griswold expresses the belief that | A. alcohol has its place in the world. | B. too many companies lie about alcohol. | C. online advertising of alcohol should be prohibited. | D. action needs to be taken to rid communities of alcohol."),manual(1,380,"What does the word ‘this’ in the first paragraph refer to? | A. the patient's expectations of health professionals. | B. the amount of work a health professional has to do. | C. the lack of training modern health professionals receive. | D. the lack of compassion shown by some health professionals."),manual(2,380,"The writer includes the quote from To Kill a Mockingbird to show that | A. it's important to put yourself in someone else's position. | B. it is difficult to know what another person is thinking. | C. it's impossible to learn anything unless you listen. | D. it's easier to understand people as you get older.")]+[dict(cq[5],number=3)]+[manual(4,381,"What point does the writer make in the third paragraph? | A. the situation is worse int he UK than in Australia. | B. the need for increased patient safety monitoring is clear. | C. the clinical skills of healthcare professionals has decreased. | D. the situation will improve for everyone if the patient is the focus.")]+[dict(cq[6],number=5),dict(cq[7],number=6)]+[manual(7,382,"The writer explains that when students are learning in health professional courses | A. there is a large written component. | B. achieving high results is the main goal. | C. the emphasis is on being a good clinician. | D. working with mannequins can be confusing.")]+[dict(cq[8],number=8)]
 if n==20:
  cq.append(dict(number=8,sourcePage=439,text="The benefits of statins are described as having been ‘compromised’ because\nA. their benefits are too few in number.\nB. a lot more research needs to be done.\nC. there is still a lot of debate around their use.\nD. too many lies have been told about their effects."))
 aks=extract([ka],list(range(1,21)),True)
 bcks=extract([kbc],list(range(1,7))+cnums,True)
 if n in reviewed_bc:
  letters=reviewed_bc[n].replace(' ','')
  assert len(letters)==6+len(cnums),(n,letters)
  bcks=[dict(number=num,sourcePage=kbc,text=letter) for num,letter in zip(list(range(1,7))+cnums,letters)]
 qs=[aq,bq,cq]
 print(n,'Q',list(map(len,qs)),'KEY',len(aks),len(bcks))
 assert list(map(len,qs))==[20,6,len(cnums)],n
 assert len(aks)==(0 if n==8 else 20) and len(bcks)==6+len(cnums),n
 all_tests.append(dict(number=n,questions=qs,answers=[aks,bcks],textPages=text))
(ROOT/'parsed-reading-all.json').write_text(json.dumps(all_tests,ensure_ascii=False,indent=2))

# Kaplan has separate strategy exercises and a practice set, with numbering restarting.
strategy_q=[extract([7,12,13],list(range(1,22))),[extract([pg],[i+1])[0] for i,pg in enumerate(rr(21,30))],extract([40,41,42],list(range(1,9)))]
practice_q=[extract([19,20],list(range(1,21))),[extract([pg],[i+1])[0] for i,pg in enumerate(rr(31,36))],extract([46,47,51,52],list(range(1,17)))]
strategy_a=extract([53],list(range(1,22)),True)
practice_a=extract([54],list(range(1,21)),True)
kbc=extract([55],list(range(1,11))+list(range(1,7)),True)
kc=extract([56],list(range(1,9))+list(range(1,17)),True)
assert list(map(len,strategy_q))==[21,10,8]
assert list(map(len,practice_q))==[20,6,16]
assert [len(strategy_a),len(practice_a),len(kbc),len(kc)]==[21,20,16,24]
all_tests.insert(0,dict(number=1,questions=practice_q,answers=[practice_a,kbc[10:]+kc[8:]],textPages=rr(15,18)))

def norm(text):return re.sub(r'[^a-z0-9 ]','',unicodedata.normalize('NFKD',text.lower()).replace('\n',' '))
def compact(text):return re.sub(r'\s+',' ',norm(text)).strip()
def text_blocks(page_nums):
 blocks={};active=None
 for page in page_nums:
  for line in pages[page-1].splitlines():
   if page in [150,152,173]:
    found=re.search(r'(?:Text|rext)\s*([ABCD])',line)
    if found and len(line)<25:line='Text '+found[1]
   if page==368 and 'Text C' in line:line=line.replace('Text C','')
   heading=re.match(r'^\s*(?:TEXT|Text)\s*[:T]?\s*([ABCD])(?:\b|:)',line)
   if heading:active=heading[1];blocks.setdefault(active,dict(page=page,text=''))
   if active:blocks[active]['text']+=line+'\n'
 return blocks

fix_a={5:{6:'C',20:'(expressed) breast milk'},6:{3:'C',6:'A',20:'crying'},7:{3:'C',5:'C',6:'B',16:'seafood',17:'limbs',18:'polymicrobial',19:'7%',20:'physical therapy'}}
reviewed_bc[10]='CCBCAA DCCBBABA CACBADCA'
output=[]
for t in all_tests:
 n=t['number'];blocks=text_blocks(t['textPages']);sections=[]
 for part_index,part in enumerate('ABC'):
  keys=t['answers'][0] if part=='A' else t['answers'][1][:6] if part=='B' else t['answers'][1][6:]
  batches=[('practice','Practice set' if n==1 else 'Questions',t['questions'][part_index],keys)]
  if n==1:batches.insert(0,('strategies','Strategy exercises',strategy_q[part_index],strategy_a if part=='A' else kbc[:10] if part=='B' else kc[:8]))
  for section_id,label,questions,answers in batches:
   rows=[]
   for i,q in enumerate(questions):
    answer=answers[i]['text'] if answers else None
    if part=='A' and n in fix_a:answer=fix_a[n].get(q['number'],answer)
    if part!='A' and n==10:answer=reviewed_bc[10].replace(' ','')[i+(6 if part=='C' else 0)]
    if answer:
     answer=re.sub(r'(?m)^[-_]+.*$', '', answer).strip().lstrip(':').strip()
     if part!='A':answer=(re.match(r'([A-Da-d])\b',answer) or [None,answer])[1].upper()
    prompt=q['text']
    if part!='A':prompt=prompt.replace(' ____ ',' ')
    # Drop standalone scan decoration and instruction fragments, keeping the source wording.
    prompt='\n'.join(l for l in prompt.splitlines() if not re.match(r'(?i)^(?:Take \d|Time yourself|Exercise$|PRACTICE TEST|Q \d+ PR|[CcOo|;]+$)',l)).strip()
    linked=None
    if part=='A' and section_id=='practice':
     if n==3:linked=list('CDBACBABC D CDBB A BD BDC'.replace(' ',''))[i]
     elif answer and re.fullmatch('[ABCD]',answer):linked=answer
     elif answer and re.search(r'Text ([ABCD])',answer):linked=re.search(r'Text ([ABCD])',answer)[1]
     elif answer:
      variants=re.split(r' / | OR ',answer)
      variants+=[re.sub(r'\([^)]*\)','',v).strip() for v in variants]
      matches=set()
      for v in variants:
       v=compact(v)
       if len(v)>=4:
        matches.update(letter for letter,block in blocks.items() if v in compact(block['text']))
      if len(matches)==1:linked=next(iter(matches))
    # These questions use matching A–D; the first Kaplan exercise requests four summaries.
    kind='choice' if part!='A' or (answer and re.fullmatch('[ABCD]',answer)) else 'text'
    group=('Text 1' if i<8 else 'Text 2') if part=='C' and len(questions)>8 else ''
    keypage=(answers[i]['sourcePage'] if answers else profiles[n][4])
    assert prompt,(n,part,i)
    rows.append(dict(id=f'{section_id}-{part}-{i+1}',number=q['number'],group=group,prompt=prompt,kind=kind,answer=answer,keyPage=keypage,sourcePage=q['sourcePage'],sourceText=linked,sourceTextPage=blocks.get(linked,{}).get('page'),imagePage=q['sourcePage'] if part!='A' and n in [5,6,7,18,19,20] else None))
   sections.append(dict(id=f'{section_id}-{part}',part=part,label=label,questions=rows))
 output.append(dict(number=n,sections=sections))
book=next(f for f in manifest['files'] if f['name'].startswith('Reading Jahshan'))
payload=dict(sourceSha256=book['sha256'],pageNumbering='PDF pages, as in the supplied index',tests=output)
Path('src/data/jahshanReadingQuestions.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
print('WROTE',sum(len(s['questions']) for t in output for s in t['sections']),'question forms')
print('Part A text links',sum(bool(q['sourceText']) for t in output for s in t['sections'] if s['part']=='A' for q in s['questions']))

destination=Path('public/jahshan-reading-pages');destination.mkdir(exist_ok=True)
for page in {q['imagePage'] for t in output for s in t['sections'] for q in s['questions'] if q['imagePage']}:
 Image.open(ROOT/f'reading-{page}.png').convert('RGB').save(destination/f'{page}.webp',quality=87)
