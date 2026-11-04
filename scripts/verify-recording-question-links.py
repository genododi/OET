"""Find recording copies/excerpts locally and verify sound before reusing question maps.

Transcripts propose candidates; three separated acoustic-envelope matches verify
that the actual recordings agree. Spoken ranges limit an excerpt's questions.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import numpy as np

ROOT=Path(__file__).resolve().parents[1]

def transcript(sha):
    path=ROOT/'public/material-practice/transcripts'/f'{sha}.json'
    if not path.exists():return None
    data=json.loads(path.read_text());tokens=[];times=[];raw=[]
    for segment in data['segments']:
        words=re.findall(r'[a-z]+',segment['text'].lower());raw.append(segment['text'])
        for index,word in enumerate(words):
            tokens.append(word);times.append(segment['start']+(segment['end']-segment['start'])*(index+.5)/max(1,len(words)))
    grams={}
    for index in range(len(tokens)-7):grams.setdefault(tuple(tokens[index:index+8]),[]).append(index)
    return dict(tokens=tokens,times=times,grams=grams,text=' '.join(raw))

def spoken_questions(text,part,full=False):
    if full:return None
    found=re.findall(r'\bquestions?\s+(\d{1,2})(?:\s*(?:to|[-–])\s*(\d{1,2}))?',text,re.I)
    singles={int(a) for a,b in found if not b}
    if part=='B' and len(singles)>=2:return sorted(singles)
    ranges=[(int(a),int(b)) for a,b in found if b and 1<=int(a)<=int(b)<=42 and int(b)-int(a)<24]
    if ranges:
        length=min(b-a for a,b in ranges)
        return sorted({n for a,b in ranges if b-a==length for n in range(a,b+1)})
    return None

def envelope(sha,files,library,cache):
    target=cache/f'{sha}.npy'
    if target.exists():return np.load(target,allow_pickle=False)
    file=files[sha];path=library/'files'/Path(file['assetPath']).name
    if not path.exists():path=ROOT/'public'/file['assetPath']
    with path.open('rb') as stream:
        if hashlib.file_digest(stream,'sha256').hexdigest()!=sha:raise ValueError('Recording original hash changed')
    raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-vn','-ac','1','-ar','8000','-f','f32le','-'],timeout=180)
    samples=np.frombuffer(raw,dtype='<f4');size=len(samples)//160*160
    result=np.sqrt(np.mean(np.square(samples[:size].reshape(-1,160)),axis=1))
    np.save(target,result);return result

def correlation(query,reference,query_time,reference_time):
    start=max(0,int(query_time*50)-150);needle=query[start:start+300]
    if len(needle)<250 or np.std(needle)<.0001:return None
    expected=int(reference_time*50)-(int(query_time*50)-start)
    low=max(0,expected-600);high=min(len(reference),expected+600+len(needle));hay=reference[low:high]
    if len(hay)<len(needle):return None
    needle=needle.astype(float);hay=hay.astype(float);needle-=needle.mean();width=len(needle)
    sums=np.r_[0,np.cumsum(hay)];squares=np.r_[0,np.cumsum(hay*hay)]
    variance=squares[width:]-squares[:-width]-(sums[width:]-sums[:-width])**2/width
    scores=np.correlate(hay,needle,'valid')/np.sqrt(np.maximum(variance,1e-15)*np.sum(needle*needle))
    return float(np.max(scores))

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--library',default='/Volumes/GENODODI/OET/Mac App/offline-library');parser.add_argument('--apply',action='store_true');args=parser.parse_args()
    library=Path(args.library);catalog=json.loads((library/'catalog.json').read_text())['files'];files={row['sha256']:row for row in catalog}
    files.update({row['sha256']:row for row in json.loads((ROOT/'src/data/desktopMaterials.generated.json').read_text())['files']})
    report=json.loads((ROOT/'public/material-practice/audio-matches.json').read_text())['files'];texts={row['sha256']:transcript(row['sha256']) for row in report}
    manifest=ROOT/'src/data/recordingQuestionMatches.json';previous=json.loads(manifest.read_text())['links'] if manifest.exists() else []
    links={row['recordingSha256']:row for row in previous};cache=ROOT/'tmp/audio-envelopes';cache.mkdir(parents=True,exist_ok=True);added=0
    for row in report:
        sha=row['sha256'];query=texts[sha]
        if row['matchedQuestions'] or sha in links or not query or len(query['grams'])<80:continue
        candidates=[]
        for other in report:
            ref=texts[other['sha256']]
            if not other['matchedQuestions'] or not ref or other['sha256'] in links:continue
            common=len(query['grams'].keys()&ref['grams'].keys());coverage=common/max(1,len(query['grams']));back=common/max(1,len(ref['grams']))
            if coverage>=.72 and common>=80:candidates.append((coverage,back,other))
        for coverage,back,other in sorted(candidates,key=lambda candidate:candidate[0],reverse=True)[:2]:
            ref=texts[other['sha256']];anchors=[]
            for ratio in [.2,.5,.8]:
                matches=[(abs(index-ratio*len(query['tokens'])),index,ref['grams'][gram][0]) for gram,positions in query['grams'].items() for index in positions if gram in ref['grams'] and len(ref['grams'][gram])==1]
                if matches:
                    _,a,b=min(matches);anchors.append((a,b))
            if len(anchors)!=3 or anchors[-1][0]-anchors[0][0]<len(query['tokens'])*.4:continue
            try:
                sound=envelope(sha,files,library,cache);reference=envelope(other['sha256'],files,library,cache)
                scores=[correlation(sound,reference,query['times'][a],ref['times'][b]) for a,b in anchors]
            except (OSError,ValueError,subprocess.SubprocessError) as error:
                print(json.dumps({'recording':row['filename'],'skipped':str(error)[:180]}),flush=True);continue
            if any(score is None or score<.96 for score in scores):continue
            sheet=json.loads((ROOT/f'public/material-practice/sheets/{other["sha256"]}.json').read_text());numbers={};full=coverage>=.72 and back>=.72
            for unit in sheet['units']:
                part=unit.get('part')
                if not part or not unit['questions']:continue
                selected=spoken_questions(query['text'],part,full)
                if not full and selected is None:continue
                actual={q['number'] for q in unit['questions']}
                numbers.setdefault(part,set()).update(actual if full else actual&set(selected))
            numbers={part:sorted(values) for part,values in numbers.items() if values}
            if not numbers:continue
            links[sha]={'recordingSha256':sha,'referenceSha256':other['sha256'],'questions':numbers,'verification':{'method':'three-separated-acoustic-envelope-windows','minimumCorrelation':round(min(scores),6),'transcriptCoverage':round(coverage,6),'referenceTranscriptCoverage':round(back,6)}};added+=1
            print(json.dumps({'recording':row['filename'],'reference':other['filename'],'questions':numbers,'minimumCorrelation':round(min(scores),4)}),flush=True);break
    if args.apply:manifest.write_text(json.dumps({'version':1,'links':list(links.values())},indent=2)+'\n')
    print(json.dumps({'verifiedRecordingLinks':len(links),'newLinks':added,'applied':args.apply}),flush=True)

if __name__=='__main__':main()
