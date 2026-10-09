"""Create web-playable AAC copies of the original human recordings.

No speech generation, trimming, speed changes or silence removal. Original files
are verified against the catalog and kept unchanged. Requires ffmpeg/ffprobe.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--source-root', type=Path, default=Path('/Volumes/GENODODI/oet-study-sources/Google drive Folder'))
parser.add_argument('--cache-root', type=Path, default=Path.home() / 'Library/Caches/oet-jahshan-audio')
args = parser.parse_args()
catalog = json.loads((ROOT / 'src/data/jahshanCollection.json').read_text())
tracks = [f for f in catalog['files'] if f['mimeType'].startswith('audio/')]
destination = ROOT / 'public/jahshan-audio'
destination.mkdir(exist_ok=True)
manifest_path = ROOT / 'src/data/jahshanListeningAudio.json'
existing = json.loads(manifest_path.read_text())['tracks'] if manifest_path.exists() else []
existing = {item['id']: item for item in existing}

def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def probe(path):
    return json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,channels,sample_rate', '-of', 'json', str(path)], timeout=60))

def encode(track):
    relative = f"jahshan-audio/{track['id']}.m4a"
    target = ROOT / 'public' / relative
    old = existing.get(track['id'])
    if old and old['sourceSha256'] == track['sha256'] and target.exists() and digest(target) == old['sha256']:
        return old
    cached = args.cache_root / track['sourceRelativePath']
    if not cached.exists():
        source = args.source_root / track['sourceRelativePath']
        assert source.is_file(), f"Missing source: {track['name']}"
        cached.parent.mkdir(parents=True, exist_ok=True)
        temporary = cached.with_suffix('.copying')
        shutil.copyfile(source, temporary)
        assert digest(temporary) == track['sha256'], f"Source checksum mismatch: {track['name']}"
        temporary.replace(cached)
    assert cached.stat().st_size == track['bytes'] and digest(cached) == track['sha256'], f"Source checksum mismatch: {track['name']}"
    original_duration = float(probe(cached)['format']['duration'])
    temporary = target.with_suffix('.encoding.m4a')
    subprocess.run(['ffmpeg', '-nostdin', '-y', '-v', 'error', '-i', str(cached), '-map', '0:a:0', '-vn', '-map_metadata', '-1', '-c:a', 'aac', '-b:a', '48k', '-ac', '1', '-ar', '32000', '-movflags', '+faststart', str(temporary)], check=True, timeout=600)
    info = probe(temporary)
    duration = float(info['format']['duration'])
    assert abs(duration - original_duration) < 0.2, f"Duration changed: {track['name']}"
    assert len(info['streams']) == 1 and info['streams'][0]['codec_name'] == 'aac'
    temporary.replace(target)
    result = dict(id=track['id'], sourceSha256=track['sha256'], path=relative, sha256=digest(target), bytes=target.stat().st_size, duration=duration, sourceDuration=original_duration, mimeType='audio/mp4', codec='aac', bitrate=48000, channels=1)
    print(f"Ready: {track['relativePath']} ({duration:.0f}s)", flush=True)
    return result

with ThreadPoolExecutor(max_workers=4) as pool:
    encoded = list(pool.map(encode, tracks))
assert len(encoded) == 90
public_size = sum(p.stat().st_size for p in (ROOT / 'public').rglob('*') if p.is_file())
assert public_size < 950_000_000, f'Published assets too large for the site budget: {public_size}'
manifest_path.write_text(json.dumps(dict(kind='compressed-original-recordings', encoding='AAC 48 kbps mono, 32 kHz; no generated speech, cuts or speed changes', tracks=encoded), indent=2) + '\n')
print(f"Published {len(encoded)} recordings, {sum(t['bytes'] for t in encoded):,} audio bytes; total site assets {public_size:,} bytes", flush=True)
