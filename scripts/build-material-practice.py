"""Build source-grounded practice sheets; never infer an examination answer.

Matching is limited to an exact descriptive filename or a small named test folder.
Uncertain pairings stay selectable, and missing keys stay explicitly missing.
"""
import argparse
import collections
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILLS = ['reading','listening','writing','speaking']
AUDIO = {'mp3','m4a','wav','ogg','flac','aac','webm'}
STOP = set('the a an of with for to and part reading listening writing speaking answer answers key booklet text question questions test practice sample pdf docx mp3 m4a original'.split())

def words(value):
    return set(re.findall(r'[a-z]+|\d+', value.casefold())) - STOP

def stem(file):
    name = Path(file['filename']).stem.casefold()
    return re.sub(r'[^a-z0-9]+',' ', re.sub(r'\b(?:answers?|key|text|questions?|booklet|copy|doctor|patient|candidate|partner|card)\b','',name)).strip()

def part_of(value):
    match = re.search(r'\bpart\s*[-:]?\s*([abc])\b',value,re.I)
    if not match: match = re.match(r'^\s*([abc])(?:[-_.\s]|\d)',Path(value).stem,re.I)
    return match.group(1).upper() if match else None

def key_file(file, text=''):
    name = file['filename'].casefold()
    return ('answer booklet' not in name and bool(re.search(r'answers|answer[- _]?key|\bkey\b|model[- _]?(?:letter|answer)|\bcorrected letter\b', name))) or bool(re.match(r'^\s*(?:OET[^\n]*\n)?[^\n]{0,60}Answer Key\b', text, re.I))

def key_page(text):
    return bool(re.search(r'^(?:[^\n]{0,40})?(?:ANSWER\s*KEY|ANSWERS)(?:\s*[:–-][^\n]*)?\s*$',text[:500],re.I|re.M))

def parse_key(text, plain=False):
    result = {}; part = None; previous = None; ambiguous=set()
    def accept(number,value):
        key=(part,number)
        if key in result and result[key]!=value:ambiguous.add(key)
        result[key]=value
    lines = [line.strip() for line in text.replace('\u00a0',' ').splitlines() if line.strip()]
    for line in lines:
        marker = re.search(r'\bPart\s+([ABC])\b',line,re.I)
        if marker: part = marker.group(1).upper()
        pairs=re.findall(r'(?<!\d)(\d{1,2})[.):\s]+([A-Da-d])(?=\s|[,;]|$)',line)
        if len(pairs)>1:
            for n,value in pairs:accept(int(n),value.upper())
            continue
        found = re.match(r'^(\d{1,2})(?:[.):\-]\s*|\s+)(.+?)\s*$',line)
        if found and 1 <= int(found[1]) <= 42 and len(found[2]) < 240:
            if '?' not in found[2] and not re.match(r'^(?:which|what|why|how|when|where)\b',found[2],re.I):accept(int(found[1]),found[2])
            previous = None
        elif re.fullmatch(r'\d{1,2}',line): previous = int(line)
        elif previous and re.fullmatch(r'[A-Da-d]',line): accept(previous,line.upper()); previous = None
    plain_lines=[line for line in lines if not re.search(r'answer\s*key|^answers?$|^part\s+[ABC]$|^www\.|^Page\s+\d',line,re.I)]
    if not result and plain and 1 <= len(plain_lines) <= 42 and all(len(line)<100 for line in plain_lines):
        result = {(part,i+1):line for i,line in enumerate(plain_lines)}
    return {key:value for key,value in result.items() if key not in ambiguous}

def in_book_key(unit, units, pages):
    """Use the nearest following key before the next test with the same part.

    Several patients sharing one page cannot be mapped by question number alone.
    Keep their printed key available without assigning an unverified answer.
    """
    peers=[other for other in units if other is not unit and other['sourceSha256']==unit['sourceSha256'] and other['part']==unit['part'] and other['questions']]
    if any(set(unit['pages']) & set(other['pages']) for other in peers):return None
    following=[min(other['pages']) for other in peers if min(other['pages'])>max(unit['pages'])]
    stop=min(following,default=float('inf'))
    for page in pages:
        if not max(unit['pages'])<page['number']<stop or page.get('needsReview') or not key_page(page['text']):continue
        answers=parse_key(page['text'])
        if any(part==unit['part'] for part,number in answers):return page,answers
    return None

def questions_on_page(text, number, part=None, needs_review=False):
    """Extract printed numbered prompts and numbered blanks, preserving wording."""
    if needs_review:return []
    lines = text.replace('\u00a0',' ').splitlines(); questions=[]; active=None; in_range=False
    blank = re.compile(r'\((\d{1,2})\)\s*(?:[_.…·]{2,}|[.…]\s*[.…])')
    # A blank can wrap onto the following line in a PDF table.
    joined = re.sub(r'(\(\d{1,2}\))\s*\n\s*([_.…·])',r'\1 \2',text)
    for match in blank.finditer(joined):
        n=int(match[1])
        if not 1<=n<=42: continue
        start=joined.rfind('\n',0,match.start())+1; end=joined.find('\n',match.end())
        if end<0:end=len(joined)
        before=joined[max(0,joined.rfind('\n',0,max(0,start-1))+1):start].strip()
        prompt=joined[start:end].strip()
        if len(prompt)<55 and before and not re.search(r'\(\d+\)',before):prompt=before+' '+prompt
        questions.append(dict(number=n,prompt=prompt,sourcePage=number,choices=[],kind='blank',offset=match.start()))
    occupied={q['number'] for q in questions}
    has_blanks=bool(questions);offset=0
    for raw_line in lines:
        position=offset;offset+=len(raw_line)+1;line=raw_line.strip()
        if re.match(r'^Questions\s+\d',line,re.I): in_range=True; active=None; continue
        standalone=re.fullmatch(r'Question\s+(\d{1,2})',line,re.I)
        if standalone and (int(standalone[1]) not in occupied or not has_blanks):
            n=int(standalone[1]);active=dict(number=n,prompt='',sourcePage=number,choices=[],kind='question',offset=position);questions.append(active);occupied.add(n);continue
        if re.fullmatch(r'Question text|Question \d+ Audio|Select one:',line,re.I):continue
        if re.match(r'^(?:Text\s+[A-D]|Answer\s*Key|END OF|Page\s+\d|www\.)',line,re.I): active=None; continue
        found=re.match(r'^(?:Question\s+)?(\d{1,2})[.)]?\s+(.+)',line,re.I)
        if found:
            n=int(found[1]); prompt=found[2]
            meaningful = '?' in prompt or re.match(r'^(?:which|what|why|how|when|where|according|the writer|the speaker|in paragraph|in the)\b',prompt,re.I) or (in_range and len(prompt)>7)
            if 1<=n<=42 and (n not in occupied or not has_blanks) and meaningful and not re.match(r'^\d',prompt):
                active=dict(number=n,prompt=prompt,sourcePage=number,choices=[],kind='question',offset=position)
                questions.append(active);occupied.add(n);continue
            active=None
        if active and line:
            if re.match(r'^(?:For each|Answer each|Complete each|Questions?\s|Turn over|Occupational)',line,re.I):active=None;continue
            active['prompt']+='\n'+line
            option=re.match(r'^([A-Da-d])[.)]?\s+\S',line)
            if option and option[1].upper() not in active['choices']:active['choices'].append(option[1].upper())
    for question in questions:
        if not question['choices'] and part=='A' and re.search(r'which text|information (?:comes|about)|In which text',text,re.I) and question['number']<=7: question['choices']=['A','B','C','D']
    return sorted((q for q in questions if q['prompt'].strip()),key=lambda q:q['offset'])

def build(library):
    bundled=json.loads((ROOT/'src/data/desktopMaterials.generated.json').read_text())['files']
    published=json.loads((ROOT/'public/imported-resources/catalog.json').read_text())['files']
    offline=json.loads((library/'catalog.json').read_text())['files'] if (library/'catalog.json').exists() else []
    files={f['sha256']:f for f in bundled+published}; local={f['sha256']:f for f in offline}
    data={}; folders=collections.defaultdict(set)
    for sha,file in files.items():
        path=ROOT/'public'/file['textPath']
        payload=json.loads(path.read_text()) if path.exists() else {'text':''}
        if not payload.get('sourceSha256') and sha in {f['sha256'] for f in bundled}:
            with (ROOT/'public'/file['assetPath']).open('rb') as original:
                if hashlib.file_digest(original,'sha256').hexdigest()!=sha:raise ValueError('Original hash mismatch')
        elif payload.get('sourceSha256')!=sha: raise ValueError('Source text hash mismatch: '+file['filename'])
        pages=payload.get('pages') or [{'number':1,'text':payload.get('text','')}]
        data[sha]={'pages':pages, 'key':key_file(file,payload.get('text',''))}
        paths=[file['relativePath']]+local.get(sha,{}).get('sourcePaths',[])
        for path in paths:
            for folder in list(Path(path).parents)[:3]:folders[str(folder)].add(sha)
    memberships=collections.defaultdict(set)
    for folder,members in folders.items():
        # A broad downloads folder is not evidence that files belong together.
        tail='/'.join(Path(folder).parts[-3:])
        named_test=re.search(r'(?:test|mock|sample|set)\s*[-_ ]*(?:\d|one|two|three)|mock[- ]test|^\d+[. -]+[A-Za-z]',tail,re.I)
        if len(members)<=35 and named_test:
            for sha in members:memberships[sha].update(members)
    named=collections.defaultdict(set)
    for sha,file in files.items():
        signature=stem(file)
        if len(words(signature))>=2 or re.search(r'(?:practice|sample)\s*test\s*\d',signature):named[signature].add(sha)
    for members in named.values():
        for sha in members:memberships[sha].update(members)
    def doc(sha,role=None):
        file=files[sha]
        return {k:file[k] for k in ['id','filename','sha256','assetPath','textPath','format']}|{'role':role or ('answer-key' if data[sha]['key'] else 'recording' if file['format'] in AUDIO else 'partner-card' if re.search(r'(?:partner|patient)\s*card',file['filename'],re.I) else 'paper')}
    out=ROOT/'public/material-practice';(out/'sheets').mkdir(parents=True,exist_ok=True)
    index={};stats=collections.Counter()
    benchmark=json.loads((ROOT/'src/data/benchmarkCollection.json').read_text())['entries']
    named_recordings={s:words(Path(f['filename']).stem) for s,f in files.items() if f['format'] in AUDIO and len(words(Path(f['filename']).stem))>=2 and all(word.isalpha() for word in words(Path(f['filename']).stem))}
    for sha,file in files.items():
        related={sha}|memberships[sha]
        # A selected audio or key opens its matched source paper automatically.
        papers=[s for s in sorted(related,key=lambda s:(files[s]['filename'].casefold(),s)) if files[s]['format'] not in AUDIO and not data[s]['key'] and files[s]['format']!='mp4']
        if sha in papers:papers.remove(sha);papers.insert(0,sha)
        units=[]
        for source_sha in papers:
            source=files[source_sha];default_part=part_of(source['filename']); current=None;previous_numbers=set();in_key=False
            source_skills=source['skills'] or SKILLS
            productive=not any(s in source_skills for s in ['reading','listening'])
            for page in data[source_sha]['pages']:
                text=page['text']; marker=re.search(r'\b(?:READING|LISTENING)?\s*(?:SUB[- ]?TEST[^\n]*?)?\bPART\s*[-:]?\s*([ABC])\b',text[:900],re.I)
                part=marker.group(1).upper() if marker else (current or {}).get('part',default_part)
                if key_page(text):in_key=True;current=None;previous_numbers=set();continue
                qs=[] if productive else questions_on_page(text,page['number'],part,page.get('needsReview',False))
                if in_key and not marker and not qs:continue
                in_key=False
                blocks=[];seen=set()
                for question in qs:
                    if not blocks or question['number'] in seen:blocks.append([]);seen=set()
                    blocks[-1].append(question);seen.add(question['number'])
                if len(blocks)>1:
                    boundaries=[0]
                    for block in blocks[1:]:
                        before=text[:block[0]['offset']]
                        headers=list(re.finditer(r'^(?:Patient(?:\s+name)?\s*[:：]?\s*$|Extract\s*\d+|Consultation\s*\d+|Case\s*\d+)',before,re.I|re.M))
                        boundaries.append(headers[-1].start() if headers else max(0,before.rfind('\n\n')))
                    boundaries.append(len(text))
                    for block_index,block in enumerate(blocks):
                        start,end=boundaries[block_index:block_index+2]
                        heading=' '.join(line.strip() for line in text[start:end].splitlines()[:3] if line.strip())[:100]
                        current={'id':f'{source_sha[:16]}-p{page["number"]}-extract{block_index+1}', 'label':(f'Part {part} · ' if part else '')+(heading or f'Extract {block_index+1}'), 'part':part, 'sourceSha256':source_sha,'pages':[page['number']],'ranges':[{'page':page['number'],'start':start,'end':end}],'questions':block,'skills':source_skills,'recordings':[],'answerSources':[]}
                        units.append(current)
                    previous_numbers={q['number'] for q in blocks[-1]}
                    continue
                first_line=next((line.strip() for line in text.splitlines() if line.strip()),'')[:100]
                reset=bool(qs and previous_numbers & {q['number'] for q in qs})
                new_task=bool(re.search(r'Case Notes Study\s*\d|Candidate.*Card|ROLE[- ]?PLAY\s*\d|Writing Task\s*\d',text[:350],re.I))
                is_key_page=key_page(text)
                if is_key_page:continue
                if current is None or current.get('part')!=part or reset or new_task:
                    label=(f'Part {part} · ' if part else '')+(first_line if (reset or productive) and first_line else source['filename'])
                    current={'id':f'{source_sha[:16]}-p{page["number"]}', 'label':label, 'part':part, 'sourceSha256':source_sha, 'pages':[], 'questions':[], 'skills':source_skills, 'recordings':[], 'answerSources':[]}
                    units.append(current);previous_numbers=set()
                current['pages'].append(page['number']);current['questions'].extend(qs);previous_numbers.update(q['number'] for q in qs)
        # Exact Benchmark adapters reuse its already verified structured questions.
        adapted=[]
        for entry in benchmark:
            if entry['sourceSha256']!=sha:continue
            sheet_path=ROOT/f'public/benchmark/questions/{entry["id"]}.json'
            if not sheet_path.exists():continue
            sheet=json.loads(sheet_path.read_text())
            for part in ['A','B','C']:
                questions=[dict(q,choices=q.get('choices',[]),kind='blank' if part=='A' else 'question') for q in sheet['questions'] if q['part']==part]
                if not questions:continue
                pages=sorted({q['sourcePage'] for q in questions}|{p['number'] for p in sheet.get('readingParts',{}).get(part,[])})
                for q in questions:
                    answer=entry.get('answers',{}).get(str(q['number']))
                    if answer:q['answer']={'text':answer,'source':{'assetPath':entry.get('keyPath',entry['assetPath']),'format':'pdf','filename':'Printed Benchmark answer key'},'page':1}
                    elif entry.get('keyParts',{}).get(part):q['answer']={'source':doc(sha),'page':entry['keyParts'][part]}
                audio=entry.get('audio');recordings=[]
                if audio:
                    recordings=[audio['sha256']] if audio['sha256'] in files else []
                    related.update(recordings)
                adapted.append({'id':entry['id']+'-'+part,'label':entry['title']+' · Part '+part,'part':part,'sourceSha256':sha,'pages':pages,'questions':questions,'skills':[entry['skill']],'recordings':recordings,'answerSources':[]})
        if adapted:units=adapted
        for unit in units:
            passages=collections.defaultdict(set)
            for other in units:
                if other['sourceSha256']!=unit['sourceSha256'] and other['part']==unit['part'] and not other['questions'] and 'reading' in other['skills']:passages[other['sourceSha256']].update(other['pages'])
            unit['passages']=[{'sourceSha256':sha,'pages':sorted(pages)} for sha,pages in passages.items()]
        recordings=[s for s in sorted(related) if files[s]['format'] in AUDIO]
        keys=[s for s in sorted(related) if data[s]['key']]
        for unit in units:
            source=files[unit['sourceSha256']];ranges={r['page']:r for r in unit.get('ranges',[])}
            body=' '.join(p['text'][ranges[p['number']]['start']:ranges[p['number']]['end']] if p['number'] in ranges else p['text'] for p in data[unit['sourceSha256']]['pages'] if p['number'] in unit['pages'])
            relevant=[s for s in recordings if not part_of(files[s]['filename']) or not unit['part'] or part_of(files[s]['filename'])==unit['part']]
            scored=sorted([(len(words(Path(files[s]['filename']).stem) & words(unit['label']+' '+body[:1200])),s) for s in relevant],reverse=True)
            # A named patient/topic can identify one extract inside a multi-page Part A paper.
            if not unit['recordings']:
                if scored and scored[0][0]>0 and (len(scored)==1 or scored[0][0]>scored[1][0]):unit['recordings']=[scored[0][1]]
                elif len(relevant)==1:unit['recordings']=relevant
            if not unit['recordings'] and 'listening' in unit['skills']:
                # Identical papers also occur in other folders. Match a complete
                # printed patient name to a uniquely named original recording.
                names=re.findall(r'Patient(?:\s+name)?\s*[:：]?\s*\n?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)',body[:1200])
                matches=[s for s,tokens in named_recordings.items() if any(tokens==words(name) for name in names)]
                if len(matches)==1:unit['recordings']=matches;related.update(matches)
            candidates=[]
            for key in keys:
                key_part=part_of(files[key]['filename'])
                if key_part and unit['part'] and key_part!=unit['part']:continue
                unit['answerSources'].append(doc(key))
                key_text='\n'.join(p['text'] for p in data[key]['pages'] if not p.get('needsReview'))
                values=parse_key(key_text,plain=True)
                overlap=len(words(files[key]['filename'])&words(unit['label']+' '+body[:1200]))
                specific=stem(files[key])==stem(source) and len(words(stem(source)))>=2
                candidates.append((100 if specific else overlap,key,values))
            candidates.sort(reverse=True,key=lambda row:row[0])
            confident=candidates and (len(candidates)==1 or candidates[0][0]>candidates[1][0])
            if confident:
                _,key,answers=candidates[0]
                for q in unit['questions']:
                    answer=answers.get((unit['part'],q['number']),answers.get((None,q['number'])))
                    if answer and 'answer' not in q:q['answer']={'text':answer,'source':doc(key),'page':1}
            matched_key=in_book_key(unit,units,data[unit['sourceSha256']]['pages'])
            if matched_key:
                page,answers=matched_key
                for q in unit['questions']:
                    value=answers.get((unit['part'],q['number']))
                    if value and 'answer' not in q:q['answer']={'text':value,'source':doc(unit['sourceSha256']),'page':page['number']}
            # Keep printed pages accessible even when their row-level mapping is uncertain.
            next_test=min((min(other['pages']) for other in units if other['sourceSha256']==unit['sourceSha256'] and other['part']==unit['part'] and other['questions'] and min(other['pages'])>max(unit['pages'])),default=float('inf'))
            review_pages=[p['number'] for p in data[unit['sourceSha256']]['pages'] if max(unit['pages'])<p['number']<next_test and not p.get('needsReview') and key_page(p['text'])]
            if review_pages:unit['answerSources'].append(doc(unit['sourceSha256'])|{'pages':review_pages})
            stats['questions']+=len(unit['questions']);stats['answers']+=sum('answer' in q for q in unit['questions'])
        # Audio-only sources remain playable, with their actual transcript rather than invented questions.
        documents=[doc(s) for s in sorted(related)]
        recordings=[s for s in related if files[s]['format'] in AUDIO]
        payload={'version':1,'sourceSha256':sha,'documents':documents,'units':units}
        target=out/'sheets'/f'{sha}.json';target.write_text(json.dumps(payload,ensure_ascii=False)+'\n')
        index[sha]={'sheetPath':f'material-practice/sheets/{sha}.json','units':len(units),'questions':sum(len(u['questions']) for u in units),'recordings':len(recordings)}
    (out/'index.json').write_text(json.dumps({'version':1,'files':index},ensure_ascii=False)+'\n')
    print(json.dumps({'sourceFiles':len(index),**stats}),flush=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--library',default='/Volumes/GENODODI/OET/Mac App/offline-library');args=parser.parse_args();build(Path(args.library))
