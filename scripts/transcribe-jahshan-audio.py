"""Transcribe original Jahshan recordings locally; resumable, one JSON per exact track ID."""
import json, hashlib, time, argparse
from pathlib import Path
import runpy
mark_uncertain_repetitions=runpy.run_path(str(Path(__file__).with_name("jahshan-transcript-quality.py")))["mark_uncertain_repetitions"]
medical=runpy.run_path(str(Path(__file__).with_name('medical_transcription.py')))
parser=argparse.ArgumentParser()
parser.add_argument('--root',default='/Volumes/GENODODI/oet-study-sources/Google drive Folder')
parser.add_argument('--audio-dir',help='Use the bundled local audio files named <track-id>.m4a')
parser.add_argument('--output',default='/Volumes/GENODODI/oet-study-sources/work/jahshan-workspace/transcripts')
parser.add_argument('--limit',type=int)
parser.add_argument('--only',nargs='+',help='Only these exact track IDs')
parser.add_argument('--refresh',action='store_true',help='Upgrade selected completed transcripts')
parser.add_argument('--model',default='mlx-community/whisper-large-v3-turbo',help='MLX Whisper model; the multilingual large model recognises regional English accents more reliably')
parser.add_argument('--dialect-hint',choices=['auto','uk','australia','us'],default='auto',help='Optional English dialect context for transcription')
parser.add_argument('--publish',action='store_true',help='Copy complete, matching transcripts into the website')
args=parser.parse_args()
assert args.audio_dir or Path(args.root).is_dir(),'Connect the source drive or set --audio-dir'
manifest=json.loads((Path(__file__).resolve().parents[1]/'src/data/jahshanCollection.json').read_text())
model=args.model
files=[f for f in manifest['files'] if f['mimeType'].startswith('audio/')]
if args.only: files=[f for f in files if f['id'] in args.only]
files.sort(key=lambda f:(0 if '/3- Sample Test 1/' in f['relativePath'] else 1,f['relativePath']))
out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
for i,file in enumerate(files[:args.limit]):
 target=out/(file['id']+'.json')
 if target.exists():
  old=json.loads(target.read_text())
  if not args.refresh and old.get('sourceSha256')==file['sha256'] and old.get('model')==model and old.get('segments'):
   cleaned,uncertain=mark_uncertain_repetitions(old['segments'])
   if uncertain:
    old['segments']=cleaned;old['uncertainIntervals']=old.get('uncertainIntervals',[])+uncertain
    temp=target.with_suffix('.tmp');temp.write_text(json.dumps(old,ensure_ascii=False));temp.replace(target)
   continue
 audio=Path(args.audio_dir)/(file['id']+'.m4a') if args.audio_dir else Path(args.root)/file['sourceRelativePath']
 assert hashlib.sha256(audio.read_bytes()).hexdigest()==file['sha256'],file['name']
 started=time.time(); print('START',i+1,len(files),file['relativePath'],flush=True)
 result=medical['transcribe_medical'](audio,model=model,dialect=args.dialect_hint,context=medical['recording_context'](file['sha256'],Path(__file__).resolve().parents[1]))
 segments=result['segments']
 segments,uncertain=mark_uncertain_repetitions(segments)
 payload=dict(uncertainIntervals=uncertain,trackId=file['id'],sourceSha256=file['sha256'],kind='automatic-transcription',model=model,language='en',dialectHint=args.dialect_hint,segments=segments,recognitionProfile=result['recognitionProfile'])
 temp=target.with_suffix('.tmp');temp.write_text(json.dumps(payload,ensure_ascii=False));temp.replace(target)
 print('DONE',file['name'],len(segments),'segments',round(time.time()-started,1),'seconds',flush=True)

if args.publish:
 destination=Path(__file__).resolve().parents[1]/'public/jahshan-transcripts';destination.mkdir(exist_ok=True)
 for file in files:
  path=out/(file['id']+'.json');data=json.loads(path.read_text())
  assert data['trackId']==file['id'] and data['sourceSha256']==file['sha256'] and data['segments']
  (destination/path.name).write_bytes(path.read_bytes())
 print('Published',len(files),'transcripts to website assets',flush=True)
