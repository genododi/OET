"""Source-reviewed British Academy task papers, including drawn (non-text) gaps."""
import copy
import json
import re

def book_matches(root,files,payloads,doc):
    manifest=root/'src/data/listeningBookRecordings.json'
    if not manifest.exists():return {}
    maps=json.loads(manifest.read_text());book=maps['sourcePaperSha256']
    if book not in files:return {}
    source=json.loads((root/'public'/files[book]['textPath']).read_text())
    starts=[]
    for page in source['pages']:
        marker=re.search(r'OET 2\.0 LISTENING TASK\s*(\d+)',page['text'][:220])
        if marker:starts.append((int(marker[1]),page['number']))
    units=[];matched={}
    for index,(task,start) in enumerate(starts):
        stop=starts[index+1][1] if index+1<len(starts) else len(source['pages'])+1
        pages=source['pages'][start-1:stop-1]
        key=next((p for p in pages if re.search(r'^\s*ANSWERS\s*$',p['text'],re.M)),None)
        paper=[p for p in pages if key is None or p['number']<key['number']]
        text='';page_at=[]
        for p in paper:
            value=re.sub(r'^\s*(?:LISTENING SUB-TEST|BRITISH ACADEMY)\s*$', '',p['text'],flags=re.M)
            page_at.append((len(text),p['number']));text+=value+'\n\n'
        markers=list(re.finditer(r'\((\d{1,2})\)|^(\d{2})\)\s',text,re.M));questions=[]
        answers={}
        if key:
            for match in re.finditer(r'^\s*(\d{1,2})\.\s*(?:Correct Answer Is:\s*)?(.+)$',key['text'],re.I|re.M):
                number=int(match[1]);answer=match[2].strip()
                if number in answers:answers[number]=None
                else:answers[number]=answer
        for i,marker in enumerate(markers):
            number=int(marker[1] or marker[2]);part='A' if number<=24 else 'B' if number<=30 else 'C'
            if not 1<=number<=42:continue
            page=max(p for offset,p in page_at if offset<=marker.start())
            end=markers[i+1].start() if i+1<len(markers) else len(text)
            if part=='A':
                line=text.rfind('\n',0,marker.start())+1
                previous=text.rfind('\n',0,max(0,line-1))+1
                begin=previous if len(text[line:marker.start()].strip())<8 and not re.search(r'\(\d+\)',text[previous:line]) else line
                if i:begin=max(begin,markers[i-1].end())
                paragraph=text.find('\n\n',marker.end());end=min(end,paragraph if paragraph>=0 else end)
                prompt=text[begin:end].strip().replace(marker[0],marker[0]+' ______',1)
                choices=[]
            else:
                prompt=text[marker.end():end].strip()
                # The next extract heading is navigation, not an option.
                prompt=re.split(r'\n\s*(?:Extract\s+\d+|Now look at question|That is the end)',prompt,flags=re.I)[0].strip()
                prompt=re.sub(r'^\s*ANSWER:\s*$', '',prompt,flags=re.M).strip()
                choices=['A','B','C']  # The printed instructions specify these labels.
            q=dict(number=number,prompt=prompt,sourcePage=page,choices=choices,kind='blank' if part=='A' else 'question')
            if answers.get(number):q['answer']={'text':answers[number],'page':key['number'],'source':doc(book)}
            questions.append(q)
        # A source layout/edition change must not silently remap existing audio.
        expected=[n for n in range(1,43) if not (task==15 and n==27)]
        if sorted(q['number'] for q in questions)!=expected:
            raise ValueError(f'British Academy Task {task}: printed question numbering needs review')
        recordings=[row['recordingSha256'] for row in maps['links'] if row['task']==task and row['recordingSha256'] in files]
        for part in ['A','B','C']:
            selected=[q for q in questions if ('A' if q['number']<=24 else 'B' if q['number']<=30 else 'C')==part]
            unit=dict(id=f'british-academy-task-{task}-{part}',label=f'British Academy · Task {task} · Part {part}',part=part,sourceSha256=book,pages=sorted({q['sourcePage'] for q in selected}),questions=selected,skills=['listening'],recordings=recordings,answerSources=[dict(doc(book),pages=[key['number']])] if key else [],matchEvidence='Reviewed patient cases and question topics in the exact-recording transcript against the printed task paper; task filename alone is not used')
            notices=[]
            if task==12:notices.append('The recording calls the patient Delilah; the printed case says Garcia/Gracia. The case details and subsequent extracts match. Original wording is retained.')
            if task==15 and part=='B':notices.append('The supplied paper and key omit Question 27. It has not been invented.')
            irregular=[q['number'] for q in selected if part!='A' and sorted(re.findall(r'^\s*([ABC])[.)]\s',q['prompt'],re.M))!=['A','B','C']]
            if irregular:notices.append('The source has missing or repeated option labels in Question(s) '+', '.join(map(str,irregular))+'. Check the original; its wording is retained.')
            if notices:unit['notice']=' '.join(notices)
            units.append(unit)
            for recording in recordings:matched.setdefault(recording,[]).append(unit)
    payloads[book]={'version':1,'sourceSha256':book,'documents':[doc(book),*[doc(s) for s in sorted(matched)]],'units':copy.deepcopy(units)}
    return matched
