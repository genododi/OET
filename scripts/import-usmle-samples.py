#!/usr/bin/env python3
"""Import the user's locally saved official sample PDFs into the private Mac bank.

Only structurally verified, consecutively numbered sample papers are accepted.
Each question retains its original page image and the exact printed key. No AI
answers, inferred publication years, or public uploads of question content.
"""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile


def parse_sample(pages):
    text='\n\f\n'.join(pages)
    edition=re.search(r'This booklet was updated [A-Za-z]+ (20\d{2})\.',text)
    if not edition or not re.search(r'Federation of State Medical',text):
        raise ValueError('Not a recognised official sample booklet with an explicit edition date')
    step='step2' if re.search(r'Step 2 Clinical Knowledge|STEP 2 CK',text) else 'step1'
    count=120 if step=='step2' else 119
    key_start=next((i for i,p in enumerate(pages) if re.search(r'ANSWER KEY FOR USMLE STEP',p,re.I) and len(re.findall(r'\b\d{1,3}\.\s*[A-K]\b',p)) >= 30),None)
    if key_start is None:raise ValueError('Printed key page missing')
    pairs=re.findall(r'\b(\d{1,3})\.\s*([A-K])\b','\n'.join(pages[key_start:]))
    keys={int(n):letter for n,letter in pairs}
    if len(keys)!=count or set(keys)!=set(range(1,count+1)) or len(pairs)!=count:raise ValueError('Printed key coverage or numbering is ambiguous')
    start=next((i for i,p in enumerate(pages[:key_start]) if re.search(r'^\s*1\.\s+A\s',p,re.M) and re.search(r'BLOCK 1, ITEMS',p)),None)
    if start is None:raise ValueError('Question block boundary missing')
    end=next((i for i in range(start,key_start) if re.search(r'ANSWER FORM FOR USMLE',pages[i],re.I)),key_start)
    body='\n\f\n'.join(pages[start:end])
    matches=list(re.finditer(r'^[ \t]*(\d{1,3})\.[ \t]+(?=[A-Z])',body,re.M))
    if [int(m[1]) for m in matches]!=list(range(1,count+1)):raise ValueError('Question numbering is incomplete or duplicated')
    questions=[]
    for i,match in enumerate(matches):
        end_position=matches[i+1].start() if i+1<len(matches) else len(body)
        source_raw=body[match.end():end_position].rstrip()
        raw=source_raw
        raw=re.sub(r'^\s*(?:\d{1,3}|BLOCK \d+, ITEMS [\d–-]+)\s*$','',raw,flags=re.M)
        choices=list(re.finditer(r'^\s*\(([A-K])\)\s+',raw,re.M))
        number=int(match[1]);ids=[c[1] for c in choices]
        valid=len(ids)>=4 and ids==list('ABCDEFGHIJK'[:len(ids)]) and keys[number] in ids
        prompt=raw[:choices[0].start()].strip() if choices else raw.strip()
        options=[{'id':c[1],'label':raw[c.end():choices[j+1].start() if j+1<len(choices) else len(raw)].strip(),'correct':c[1]==keys[number]} for j,c in enumerate(choices)]
        first=start+body[:match.start()].count('\f')+1
        last=start+body[:match.end()+len(source_raw)].count('\f')+1
        # Page breaks before the next question are not source content of this one.
        last=min(end,max(first,last))
        questions.append({'number':number,'prompt':prompt,'options':options,'key':keys[number],'reviewOnly':not valid or bool(re.search(r'video|audio recording',prompt,re.I)),'sourcePages':list(range(first,last+1))})
    return {'step':step,'year':int(edition[1]),'keyPage':key_start+1,'questions':questions}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--source',type=Path,required=True);parser.add_argument('--library',type=Path,required=True);args=parser.parse_args()
    root=args.library;root.mkdir(parents=True,exist_ok=True)
    lock=root/'import.lock'
    fd=os.open(lock,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600);os.write(fd,json.dumps({'pid':os.getpid()}).encode());os.close(fd)
    try:
        index=json.loads((root/'index.json').read_text());questions={q['id']:q for q in index['questions']};resources={r['sha256']:r for r in index['resources']};report=[]
        for pdf in sorted(args.source.glob('*.pdf')):
            if pdf.name.startswith('.') or pdf.is_symlink():continue
            result=subprocess.run(['pdftotext','-layout',str(pdf),'-'],capture_output=True,check=True,timeout=120)
            pages=result.stdout.decode(errors='replace').split('\f');parsed=parse_sample(pages);sha=hashlib.sha256(pdf.read_bytes()).hexdigest();source=resources.get(sha)
            if not source:raise ValueError('Import the original PDF into the private library first')
            source.update(productionYear=parsed['year'],productionYears=[parsed['year']],yearEvidence=[f"Printed booklet update date: {parsed['year']} ({pdf.name})"])
            page_images={}
            with tempfile.TemporaryDirectory(prefix='usmle-source-pages-') as temp:
                for page in sorted({p for q in parsed['questions'] for p in q['sourcePages']}):
                    prefix=Path(temp)/f'page-{page}'
                    subprocess.run(['pdftoppm','-f',str(page),'-l',str(page),'-scale-to','1600','-singlefile','-png',str(pdf),str(prefix)],capture_output=True,check=True,timeout=90)
                    data=prefix.with_suffix('.png').read_bytes();digest=hashlib.sha256(data).hexdigest();relative=f'media/{digest}.png';target=root/relative;target.parent.mkdir(exist_ok=True)
                    if not target.exists():target.write_bytes(data);target.chmod(0o600)
                    page_images[page]=relative
            for q in parsed['questions']:
                identity=hashlib.sha256(f'official-sample:{sha}:{q["number"]}'.encode()).hexdigest();qid='private-usmle-'+identity[:24];old=questions.get(qid,{})
                questions[qid]={**q,'id':qid,'identity':identity,'explanation':'No worked explanation is printed in this sample booklet. The answer is from its original key.','step':parsed['step'],'subject':None,'classification':'Step stated by the original sample booklet','block':(q['number']-1)//(40 if parsed['step']=='step2' else 20)+1,'sourceNote':f"Original PDF page(s) {', '.join(map(str,q['sourcePages']))}; printed key page {parsed['keyPage']}. Consult the original page for tables and clinical exhibits.",'sourceId':sha,'sourceName':pdf.name,'productionYear':parsed['year'],'productionYears':[parsed['year']],'yearEvidence':source['yearEvidence'],'addedAt':old.get('addedAt',datetime.datetime.now(datetime.timezone.utc).isoformat()),'questionImages':[page_images[p] for p in q['sourcePages']],'answerImages':[]}
            report.append({'source':pdf.name,'year':parsed['year'],'questions':len(parsed['questions']),'reviewOnly':sum(q['reviewOnly'] for q in parsed['questions'])})
        index.update(questions=sorted(questions.values(),key=lambda q:-(q.get('productionYear') or 0)),resources=sorted(resources.values(),key=lambda r:-(r.get('productionYear') or 0)),importedAt=datetime.datetime.now(datetime.timezone.utc).isoformat())
        pending=root/'index.next.json';pending.write_text(json.dumps(index,ensure_ascii=False));pending.chmod(0o600);pending.replace(root/'index.json')
        print(json.dumps({'samples':report,'totalQuestions':len(questions)},indent=2))
    finally:lock.unlink()

if __name__=='__main__':main()
