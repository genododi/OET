"""Reuse exact collection maps and carry paper matches back to original audio files."""
import collections
import copy
import json
import re


def printed_questions(part, answers):
    """Join each printed marker to its own wording and key by stable source ID."""
    nodes=part['content']; keys={q['id']:q for q in answers['questions']}; result=[]
    for index,node in enumerate(nodes):
        if not node.get('questionId') or node['questionId'] not in keys:continue
        key=keys[node['questionId']]; marker=re.search(r'\d+',node['text'])
        if not marker:continue
        before='';after=''
        for previous in reversed(nodes[:index]):
            if previous.get('questionId'):break
            before=previous['text']+before
        for following in nodes[index+1:]:
            if following.get('questionId'):break
            after+=following['text']
        number=int(marker[0])
        if part.get('inline'):
            # Preserve the printed notes around this gap, including wrapped units.
            prefix='\n'.join(before.splitlines()[-2:]);suffix=after.split('\n',1)[0]
            prompt=f'{prefix}{node["text"]}{suffix}'
            if not re.search(r'_{2,}|\.{3,}|…',prompt):prompt=prompt.replace(node['text'],f'({number}) ______')
            choices=[]
        else:
            prompt=after.strip();choices=['A','B','C']
        if not prompt.strip():continue
        question=dict(number=number,prompt=prompt.strip(),sourcePage=node['sourcePage'],choices=choices,kind='blank' if part.get('inline') else 'question')
        if key.get('answer'):question['keyText']=key['answer'];question['keyPage']=key['keyPage']
        result.append((key.get('extract',1),question))
    return result


def jahshan_matches(root,files,doc):
    questions=json.loads((root/'src/data/jahshanListeningQuestions.json').read_text())
    answers=json.loads((root/'src/data/jahshanListeningAnswers.json').read_text())
    tracks=json.loads((root/'src/data/jahshanListeningAudio.json').read_text())['tracks']
    assert questions['sourcePdfSha256']==answers['sourcePdfSha256']
    book=questions['sourcePdfSha256']
    if book not in files:return {}
    tracks={track['id']:track for track in tracks};keys={sheet['trackId']:sheet for sheet in answers['worksheets']};matched=collections.defaultdict(list)
    for sheet in questions['worksheets']:
        track=tracks.get(sheet['trackId']);key=keys.get(sheet['trackId'])
        if not track or not key:continue
        exact=[sha for sha in {track['sourceSha256'],track['sha256']} if sha in files]
        for part in sheet['parts']:
            key_part=next((p for p in key['parts'] if p['part']==part['part']),None)
            if not key_part:continue
            rows=printed_questions(part,key_part)
            repeated=len({q['number'] for _,q in rows})!=len(rows)
            groups=collections.defaultdict(list)
            for extract,question in rows:
                if 'keyText' in question:question['answer']={'text':question.pop('keyText'),'page':question.pop('keyPage'),'source':doc(book)}
                groups[extract if repeated else 0].append(question)
            for extract,items in groups.items():
                unit=dict(id=f'jahshan-{sheet["trackId"]}-{part["part"]}-{extract}',label=f'Jahshan set {sheet["setNumber"]} · Part {part["part"]}'+(f' · Extract {extract}' if extract else ''),part=part['part'],sourceSha256=book,pages=sorted({q['sourcePage'] for q in items}),questions=items,skills=['listening'],recordings=exact,answerSources=[],matchEvidence='Exact original recording SHA-256 in the verified Jahshan collection')
                for sha in exact:matched[sha].append(unit)
    return matched


def publish_audio_matches(root,files,payloads,doc,audio_formats):
    """A recording opens only questions explicitly assigned to that exact recording."""
    matched=collections.defaultdict(dict)
    for sha,payload in payloads.items():
        for unit in payload['units']:
            if unit['sourceSha256']!=sha or 'listening' not in unit['skills'] or not unit['questions']:continue
            for audio in unit['recordings']:
                if audio in files and files[audio]['format'] in audio_formats:matched[audio][unit['id']]=unit
    for audio,units in jahshan_matches(root,files,doc).items():
        for unit in units:matched[audio][unit['id']]=unit
    links_path=root/'src/data/recordingQuestionMatches.json'
    if links_path.exists():
        links=json.loads(links_path.read_text())
        for link in links.get('links',[]) if links.get('version')==1 else []:
            audio=link.get('recordingSha256');reference=link.get('referenceSha256');proof=link.get('verification',{})
            acoustic=proof.get('method')=='three-separated-acoustic-envelope-windows' and proof.get('minimumCorrelation',0)>=.96
            reviewed=proof.get('method')=='reviewed-spoken-script-and-printed-question' and proof.get('sourcePaperSha256') in files and proof.get('reviewedTopics') and proof.get('transcriptCoverage',0)>=.8
            if audio not in files or files[audio]['format'] not in audio_formats or not (acoustic or reviewed):continue
            for source in list(matched.get(reference,{}).values()):
                if reviewed and source['sourceSha256']!=proof['sourcePaperSha256']:continue
                numbers=link.get('questions',{}).get(source.get('part'),[])
                if not numbers:continue
                unit=copy.deepcopy(source);unit['questions']=[q for q in unit['questions'] if q['number'] in numbers]
                if not unit['questions']:continue
                unit['id']+=f'-recording-{audio[:12]}';unit['pages']=sorted({q['sourcePage'] for q in unit['questions']})
                unit['matchEvidence']=('Matching sound verified in three separated windows' if acoustic else 'Spoken script, printed question topics and announced question numbers reviewed against the source paper')+'; excerpt questions restricted to the spoken question range'
                unit['referenceRecordingSha256']=reference
                matched[audio][unit['id']]=unit
    report=[]
    for sha,file in files.items():
        if file['format'] not in audio_formats:continue
        units=copy.deepcopy(list(matched[sha].values()))
        related={sha}
        for unit in units:
            # Selecting an original recording must not silently choose another track.
            unit['recordings']=[sha]
            related.add(unit['sourceSha256'])
            related.update(p['sourceSha256'] for p in unit.get('passages',[]))
            related.update(key['sha256'] for key in unit['answerSources'] if key.get('sha256') in files)
        payloads[sha]={'version':1,'sourceSha256':sha,'documents':[doc(s) for s in sorted(related)],'units':units}
        report.append(dict(sha256=sha,filename=file['filename'],format=file['format'],matchedQuestions=sum(len(u['questions']) for u in units),matchedUnits=len(units),sourcePapers=sorted({u['sourceSha256'] for u in units}),status='matched' if units else 'no-verified-question-paper'))
    return {'version':1,'files':report}


def publish_container_matches(root,files,payloads,doc):
    for sha,file in files.items():
        text_path=root/'public'/file['textPath']
        if file['format'] not in {'rar','zip','7z','ppt','pptx'} or not text_path.exists():continue
        metadata=json.loads(text_path.read_text());children=metadata.get('relatedFiles',[])
        if not children:continue
        selected={};related={sha}
        # Audio members already carry their curated source papers and printed keys.
        audio_children=[child for child in children if child['format'] in {'mp3','m4a','wav','ogg','flac','aac','webm'}]
        for child in audio_children:
            for unit in payloads.get(child['sha256'],{}).get('units',[]):selected[unit['id']]=unit
        covered={unit['sourceSha256'] for unit in selected.values()}
        for child in children:
            child_sha=child['sha256']
            if child_sha not in files:continue
            related.add(child_sha)
            if child_sha not in covered and child not in audio_children:
                for unit in payloads.get(child_sha,{}).get('units',[]):
                    if unit['sourceSha256']==child_sha:selected[unit['id']]=unit
        units=copy.deepcopy(list(selected.values()))
        for unit in units:
            related.add(unit['sourceSha256']);related.update(unit['recordings'])
            related.update(p['sourceSha256'] for p in unit.get('passages',[]))
            related.update(key['sha256'] for key in unit['answerSources'] if key.get('sha256') in files)
        # One embedded recording belongs to this presentation; multiple tracks
        # remain selectable until their slide-level relationship is established.
        if file['format'] in {'ppt','pptx'}:
            own=copy.deepcopy([unit for unit in payloads[sha]['units'] if unit['sourceSha256']==sha])
            if len(audio_children)==1:
                for unit in own:unit['recordings']=[audio_children[0]['sha256']]
            units=list({unit['id']:unit for unit in own+units}.values())
        payloads[sha]={'version':1,'sourceSha256':sha,'documents':[doc(s) for s in sorted(related)],'units':units,'relatedFiles':children}
