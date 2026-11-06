"""Resumable local transcription, identified by the exact original recording SHA.

Reuses an existing transcript only for identical bytes. New recordings use the
cached multilingual MLX Whisper model, without a hosted service or API key.
"""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import runpy
import shutil
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[1]
MEDICAL = runpy.run_path(str(ROOT/'scripts/medical_transcription.py'))

def normalise_segments(raw_segments, duration):
    segments, uncertain = [], []
    if not math.isfinite(duration) or duration <= 0:
        raise ValueError('Recording duration is invalid')
    for segment in raw_segments:
        text = segment['text'].strip()
        start, end = float(segment['start']), float(segment['end'])
        if not text or not math.isfinite(start) or not math.isfinite(end) or start >= duration:
            continue
        clipped_start = round(max(0, start), 2)
        clipped_end = max(clipped_start, round(min(duration, max(0, end)), 2))
        row = {'start': clipped_start, 'end': clipped_end, 'text': text}
        if segment.get('reviewTerms'):
            row['reviewTerms'] = segment['reviewTerms']
        if end < start or start < 0:
            row['timingUncertain'] = True
            uncertain.append({'start': max(0, clipped_start - .25), 'end': min(duration, clipped_end + .25), 'reason': 'Automatic recognition returned an invalid timestamp; replay this interval.'})
        segments.append(row)
    return segments, uncertain

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--library', default='/Volumes/GENODODI/OET/Mac App/offline-library')
    parser.add_argument('--model', default='mlx-community/whisper-large-v3-turbo')
    parser.add_argument('--limit', type=int)
    parser.add_argument('--refresh-sha', action='append', default=[], help='Re-recognise only these exact recordings, preserving other completed transcripts')
    parser.add_argument('--upgrade-existing', action='store_true', help='Upgrade old automatic transcripts in bounded batches; preserve manually repaired recordings')
    args = parser.parse_args()
    library = Path(args.library)
    catalog = json.loads((ROOT/'src/data/desktopMaterials.generated.json').read_text())['files']
    if (library/'catalog.json').exists(): catalog += json.loads((library/'catalog.json').read_text())['files']
    recordings = {f['sha256']: f for f in catalog if f['format'] in {'mp3','m4a','wav','ogg','flac','aac','webm'}}
    destination = ROOT/'public/material-practice/transcripts'
    destination.mkdir(parents=True, exist_ok=True)
    known, aliases = {}, {}
    for folder in [ROOT/'public/jahshan-transcripts', ROOT/'public/benchmark/transcripts', destination]:
        for path in folder.glob('*.json'):
            data = json.loads(path.read_text())
            if data.get('segments') and data.get('kind') == 'automatic-transcription':
                known[data['sourceSha256']] = (path, data)
                aliases.setdefault(data['sourceSha256'], []).append((path, data))
    pending = []
    for sha, file in recordings.items():
        if args.refresh_sha and sha not in args.refresh_sha:
            continue
        target = destination/f'{sha}.json'
        upgrade = args.upgrade_existing and sha in known and 'listening' in file['skills'] and 'KHALED' not in file['relativePath'] and known[sha][1].get('recognitionProfile', {}).get('id') != MEDICAL['PROFILE'] and not any(data.get('repairs') for _, data in aliases[sha])
        if sha in known and sha not in args.refresh_sha and not upgrade:
            original, data = known[sha]
            if original != target:
                data = {**data, 'trackId': 'material-'+sha, 'reusedFrom': str(original.relative_to(ROOT/'public'))}
                target.write_text(json.dumps(data, ensure_ascii=False)+'\n')
        else: pending.append(file)
    # Give original exam recordings priority over supplementary radio programmes.
    pending.sort(key=lambda f: (f['sha256'] in known, 'Health Report' in f['filename'], f['bytes'], f['sha256']))
    print(json.dumps({'recordings': len(recordings), 'existingTranscripts': len(recordings)-len(pending), 'queued': len(pending)}), flush=True)
    if not pending: return
    import mlx_whisper
    import mlx.core as mx
    import gc
    mx.set_cache_limit(64*1024*1024)
    clean = runpy.run_path(str(ROOT/'scripts/jahshan-transcript-quality.py'))['mark_uncertain_repetitions']
    failures = []
    for index, file in enumerate(pending[:args.limit]):
        sha = file['sha256']
        source = library/'files'/Path(file['assetPath']).name if file['assetPath'].startswith('offline-library/') else ROOT/'public'/file['assetPath']
        started = time.time()
        print('START', index+1, '/', len(pending), file['filename'], flush=True)
        try:
            with tempfile.TemporaryDirectory(prefix='oet-transcription-', dir=ROOT/'tmp') as temporary:
                staged = Path(temporary)/('original.'+file['format'])
                shutil.copyfile(source, staged)
                with staged.open('rb') as stream:
                    if hashlib.file_digest(stream, 'sha256').hexdigest() != sha: raise ValueError('Original checksum mismatch')
                probe = json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-of','json',str(staged)], timeout=30))
                duration = float(probe['format']['duration'])
                english = 'listening' in file['skills'] and 'KHALED' not in file['relativePath']
                result = MEDICAL['transcribe_medical'](staged, model=args.model,
                    context=MEDICAL['recording_context'](sha, ROOT)) if english else mlx_whisper.transcribe(
                    str(staged), path_or_hf_repo=MEDICAL['local_model'](args.model), language=None,
                    condition_on_previous_text=False, temperature=0, verbose=None)
            segments, timing_uncertain = normalise_segments(result['segments'], duration)
            segments, uncertain = clean(segments)
            uncertain.extend(timing_uncertain)
            if not segments: raise ValueError('No intelligible speech recognised')
            data = dict(trackId='material-'+sha, sourceSha256=sha, kind='automatic-transcription', model=args.model,
                language=result.get('language','en'), dialectHint='auto', duration=duration, complete=True,
                uncertainIntervals=uncertain, segments=segments)
            if result.get('recognitionProfile'):
                data['recognitionProfile'] = result['recognitionProfile']
            target = destination/f'{sha}.json'; temporary = target.with_suffix('.tmp')
            temporary.write_text(json.dumps(data,ensure_ascii=False)+'\n'); temporary.replace(target)
            # Keep the same exact recording's collection views in sync. Preserve
            # collection IDs and hand-checked repairs; never match by filename.
            if not any(old.get('repairs') for _, old in aliases.get(sha, [])):
                for alias, old in aliases.get(sha, []):
                    if alias == target: continue
                    refreshed = {**old, **data, 'trackId': old['trackId']}
                    temporary = alias.with_suffix('.tmp')
                    temporary.write_text(json.dumps(refreshed,ensure_ascii=False)+'\n'); temporary.replace(alias)
            print('DONE', file['filename'], len(segments), 'segments', round(time.time()-started,1), 'seconds', flush=True)
            del result
            gc.collect(); mx.clear_cache()
        except Exception as error:
            failures.append({'sha256':sha, 'filename':file['filename'], 'error':str(error)})
            print('RETRY LATER', file['filename'], str(error), flush=True)
    (ROOT/'tmp/material-transcription-failures.json').write_text(json.dumps(failures,indent=2))
    if failures: raise SystemExit(f'{len(failures)} recordings could not be transcribed; originals and completed transcripts were preserved.')

if __name__ == '__main__': main()
