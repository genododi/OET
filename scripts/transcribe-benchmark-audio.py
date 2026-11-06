"""Create resumable, source-matched transcripts of the original Benchmark recordings.
Run: uv run --with mlx-whisper python scripts/transcribe-benchmark-audio.py
"""
import argparse
import hashlib
import json
import runpy
import subprocess
import time
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--audio', default='/Volumes/GENODODI/OET/Benchmark tests/Audio')
parser.add_argument('--output', default=None)
parser.add_argument('--only', nargs='*', type=int, help='Only process these test numbers')
parser.add_argument('--refresh', action='store_true', help='Upgrade selected completed transcripts using medical vocabulary and word alignment')
parser.add_argument('--model', default='mlx-community/whisper-large-v3-turbo', help='MLX Whisper model; the multilingual large model recognises regional English accents more reliably')
parser.add_argument('--dialect-hint', choices=['auto', 'uk', 'australia', 'us'], default='auto', help='Optional English dialect context for transcription')
args = parser.parse_args()
repo = Path(__file__).resolve().parents[1]
out = Path(args.output) if args.output else repo / 'public/benchmark/transcripts'
out.mkdir(parents=True, exist_ok=True)
entries = json.loads((repo / 'src/data/benchmarkCollection.json').read_text())['entries']
repairs = json.loads((repo / 'scripts/fixtures/benchmark-transcript-repairs.json').read_text())
clean = runpy.run_path(str(Path(__file__).with_name('jahshan-transcript-quality.py')))['mark_uncertain_repetitions']
medical = runpy.run_path(str(Path(__file__).with_name('medical_transcription.py')))
model = args.model
for entry in entries:
    if args.only and entry['number'] not in args.only:
        continue
    audio = entry.get('audio')
    if not audio:
        continue
    target = out / (entry['id'] + '.json')
    if target.exists():
        old = json.loads(target.read_text())
        if not args.refresh and old.get('sourceSha256') == audio['sha256'] and old.get('model') == model and old.get('complete') and old.get('segments'):
            print('SKIP', entry['id'], flush=True)
            continue
    source = Path(args.audio) / audio['filename']
    assert hashlib.sha256(source.read_bytes()).hexdigest() == audio['sha256'], source
    duration = float(json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_format', '-of', 'json', str(source)], capture_output=True, text=True, check=True).stdout)['format']['duration'])
    started = time.time()
    print('START', entry['id'], round(duration), 'seconds of original audio', flush=True)
    result = medical['transcribe_medical'](source, model=model, dialect=args.dialect_hint,
        context=medical['recording_context'](audio['sha256'], repo))
    segments = result['segments']
    segments, uncertain = clean(segments)
    applied = []
    for repair in repairs:
        if repair['trackId'] != entry['id']:
            continue
        assert repair['sourceSha256'] == audio['sha256'], 'Repair belongs to a different recording'
        segments = [s for s in segments if s['end'] <= repair['start']] + repair['segments'] + [s for s in segments if s['start'] >= repair['end']]
        uncertain = [s for s in uncertain if s['end'] <= repair['start'] or s['start'] >= repair['end']]
        uncertain += [dict(start=s['start'], end=s['end'], reason='Unreliable recognition during pause before the next extract') for s in repair['segments'] if s['text'].startswith('[Unclear')]
        applied.append({key: repair[key] for key in ('start', 'end', 'method')})
    assert segments and segments[-1]['end'] > duration * .9, 'Incomplete transcription: ' + entry['id']
    data = dict(trackId=entry['id'], sourceSha256=audio['sha256'], kind='automatic-transcription', model=model, language='en', dialectHint=args.dialect_hint, complete=True, duration=duration, segments=segments, uncertainIntervals=uncertain, repairs=applied, recognitionProfile=result['recognitionProfile'])
    temporary = target.with_suffix('.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False))
    temporary.replace(target)
    print('DONE', entry['id'], len(segments), 'segments;', round(time.time() - started, 1), 'seconds processing', flush=True)
