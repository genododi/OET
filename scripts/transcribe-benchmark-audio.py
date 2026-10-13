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
import mlx_whisper

parser = argparse.ArgumentParser()
parser.add_argument('--audio', default='/Volumes/GENODODI/OET/Benchmark tests/Audio')
parser.add_argument('--output', default=None)
args = parser.parse_args()
repo = Path(__file__).resolve().parents[1]
out = Path(args.output) if args.output else repo / 'public/benchmark/transcripts'
out.mkdir(parents=True, exist_ok=True)
entries = json.loads((repo / 'src/data/benchmarkCollection.json').read_text())['entries']
repairs = json.loads((repo / 'scripts/fixtures/benchmark-transcript-repairs.json').read_text())
clean = runpy.run_path(str(Path(__file__).with_name('jahshan-transcript-quality.py')))['mark_uncertain_repetitions']
model = 'mlx-community/whisper-base.en-mlx'
for entry in entries:
    audio = entry.get('audio')
    if not audio:
        continue
    target = out / (entry['id'] + '.json')
    if target.exists():
        old = json.loads(target.read_text())
        if old.get('sourceSha256') == audio['sha256'] and old.get('complete') and old.get('segments'):
            print('SKIP', entry['id'], flush=True)
            continue
    source = Path(args.audio) / audio['filename']
    assert hashlib.sha256(source.read_bytes()).hexdigest() == audio['sha256'], source
    duration = float(json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_format', '-of', 'json', str(source)], capture_output=True, text=True, check=True).stdout)['format']['duration'])
    started = time.time()
    print('START', entry['id'], round(duration), 'seconds of original audio', flush=True)
    result = mlx_whisper.transcribe(str(source), path_or_hf_repo=model, language='en', condition_on_previous_text=False, temperature=0, verbose=None)
    segments = [dict(start=round(s['start'], 2), end=round(min(s['end'], duration), 2), text=s['text'].strip()) for s in result['segments'] if s['text'].strip() and s['start'] < duration]
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
    data = dict(trackId=entry['id'], sourceSha256=audio['sha256'], kind='automatic-transcription', model=model, language='en', complete=True, duration=duration, segments=segments, uncertainIntervals=uncertain, repairs=applied)
    temporary = target.with_suffix('.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False))
    temporary.replace(target)
    print('DONE', entry['id'], len(segments), 'segments;', round(time.time() - started, 1), 'seconds processing', flush=True)
