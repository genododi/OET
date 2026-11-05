#!/usr/bin/env python3
"""Keep released OET originals on the Mac, outside replaceable app bundles.

Only the committed public release catalog is eligible. Profiles, model files,
private USMLE content and external originals are never modified or uploaded.
Copies are resumable by verified file; GitHub Releases supply missing originals.
"""
import argparse
import contextlib
import datetime
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DESTINATION = Path.home() / 'Library/Application Support/OET Study/offline-library'


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(4 * 1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def read_json(path, default):
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError):
        return default


def save_json(path, data):
    temporary = path.with_suffix('.next.json')
    temporary.write_text(json.dumps(data, ensure_ascii=False) + '\n')
    temporary.chmod(0o600)
    temporary.replace(path)


def validate_row(row):
    sha, format = row.get('sha256', ''), row.get('format', '')
    if not re.fullmatch(r'[a-f0-9]{64}', sha) or not re.fullmatch(r'[a-z0-9]{1,12}', format):
        raise ValueError('Invalid released original identity')
    name = f'{sha}.{format}'
    url = row.get('assetPath', '')
    if not re.fullmatch(r'https://github\.com/genododi/OET/releases/download/[A-Za-z0-9._-]+/' + re.escape(name), url):
        raise ValueError('Original is not a declared public OET release asset')
    if type(row.get('bytes')) is not int or row['bytes'] <= 0:
        raise ValueError('Invalid original size')
    if row.get('textPath') != f'imported-resources/text/{sha}.json':
        raise ValueError('Invalid released text path')
    return name


def checked_file(path, row, previous):
    try:
        stat = path.lstat()
        if path.is_symlink() or not path.is_file() or stat.st_size != row['bytes']:
            return False
        if previous.get('bytes') == stat.st_size and previous.get('mtimeNs') == str(stat.st_mtime_ns) and previous.get('sha256') == row['sha256']:
            return True
        return digest(path) == row['sha256']
    except OSError:
        return False


def copy_original(row, name, source, destination, downloader):
    staged = destination / f'.{name}.{os.getpid()}.part'
    original = source / 'files' / name
    try:
        try:
            available = original.is_file() and not original.is_symlink() and original.stat().st_size == row['bytes']
        except OSError:
            available = False
        h = hashlib.sha256(); written = 0
        if available:
            stream = original.open('rb')
        else:
            stream = downloader(row['assetPath'])
        with stream, staged.open('wb') as output:
            started = time.monotonic()
            for chunk in iter(lambda: stream.read(4 * 1024 * 1024), b''):
                written += len(chunk)
                if written > row['bytes'] or time.monotonic() - started > 7200:
                    raise ValueError('Original transfer exceeded its declared size or deadline')
                h.update(chunk); output.write(chunk)
        if written != row['bytes'] or h.hexdigest() != row['sha256']:
            raise ValueError(f'Original checksum mismatch: {row["filename"]}')
        target = destination / name
        if target.exists() or target.is_symlink():
            # Preserve an altered local copy for review; never touch external originals.
            quarantine = destination.parent / 'quarantine'
            quarantine.mkdir(exist_ok=True)
            target.rename(quarantine / f'{name}.{time.time_ns()}')
        staged.chmod(0o600); staged.replace(target)
        return 'drive' if available else 'github'
    finally:
        staged.unlink(missing_ok=True)


def mirror_library(public, source, destination, downloader=None, reserve_bytes=3 * 1024 ** 3, progress=print):
    public, source, destination = Path(public), Path(source), Path(destination)
    if destination == source or destination.is_symlink():
        raise ValueError('The permanent Mac copy must be distinct from the external source')
    destination.mkdir(parents=True, exist_ok=True, mode=0o700)
    with (destination / '.mirror.lock').open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise RuntimeError('The permanent library is already being updated')
        raw = (public / 'imported-resources/catalog.json').read_bytes()
        catalog = json.loads(raw); rows = catalog['files']
        names = [validate_row(row) for row in rows]
        if len(set(names)) != len(names):
            raise ValueError('Duplicate original in the released catalog')
        # Validate every text identity before changing the local catalog.
        for row in rows:
            text = json.loads((public / row['textPath']).read_text())
            if text.get('sourceSha256') != row['sha256']:
                raise ValueError('Released text does not match its original')
        receipt_path = destination / 'mirror-status.json'
        old = read_json(receipt_path, {}).get('files', {})
        files = destination / 'files'; files.mkdir(exist_ok=True)
        if files.is_symlink() or (destination / 'text').is_symlink():
            raise ValueError('Permanent library folders cannot link to another volume')
        valid = {name: checked_file(files / name, row, old.get(name, {})) for name, row in zip(names, rows)}
        needed = sum(row['bytes'] for name, row in zip(names, rows) if not valid[name])
        if shutil.disk_usage(destination).free < needed + reserve_bytes:
            raise RuntimeError(f'Not enough internal storage for the permanent library: {needed} bytes plus reserve required')
        receipt = {'version': 1, 'complete': False, 'catalogSha256': hashlib.sha256(raw).hexdigest(), 'fileCount': len(rows), 'totalBytes': sum(row['bytes'] for row in rows), 'files': {}, 'copiedFromDrive': 0, 'downloadedFromGitHub': 0}
        save_json(receipt_path, receipt)
        if downloader is None:
            downloader = lambda url: urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'OET-offline-library'}), timeout=45)
        for i, (name, row) in enumerate(zip(names, rows), 1):
            if not valid[name]:
                method = copy_original(row, name, source, files, downloader)
                receipt['copiedFromDrive' if method == 'drive' else 'downloadedFromGitHub'] += 1
            stat = (files / name).stat()
            receipt['files'][name] = {'sha256': row['sha256'], 'bytes': stat.st_size, 'mtimeNs': str(stat.st_mtime_ns)}
            if i % 25 == 0 or i == len(rows):
                save_json(receipt_path, receipt)
                progress(json.dumps({'originalsReady': i, 'total': len(rows), 'copied': receipt['copiedFromDrive'], 'downloaded': receipt['downloadedFromGitHub']}), flush=True)
        text_root = destination / 'text'; text_root.mkdir(exist_ok=True)
        local_rows = []
        for name, row in zip(names, rows):
            text = public / row['textPath']; target = text_root / text.name
            data = text.read_bytes()
            if not target.exists() or target.read_bytes() != data:
                temporary = target.with_suffix('.next.json'); temporary.write_bytes(data); temporary.chmod(0o600); temporary.replace(target)
            local_rows.append({**row, 'assetPath': 'offline-library/files/' + name, 'textPath': 'offline-library/text/' + text.name})
        aliases = {**read_json(destination / 'remote-assets.json', {}), **read_json(source / 'remote-assets.json', {})}
        allowed = {'files/' + name for name in names}
        aliases = {url: relative for url, relative in aliases.items() if relative in allowed and url.startswith('https://github.com/genododi/OET/releases/download/')}
        aliases.update({row['assetPath']: 'files/' + name for row, name in zip(rows, names)})
        save_json(destination / 'catalog.json', {'version': 1, 'source': 'Permanent Mac copy of published OET originals', 'fileCount': len(rows), 'totalBytes': receipt['totalBytes'], 'files': local_rows})
        save_json(destination / 'remote-assets.json', aliases)
        receipt.update(complete=True, verifiedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(), textFiles=len(rows))
        save_json(receipt_path, receipt)
        return receipt


@contextlib.contextmanager
def release_lock(state, managed):
    state.mkdir(parents=True, exist_ok=True)
    with (state / 'sync.lock').open('a') as lock:
        if managed:
            pid = int(os.environ.get('OET_LIBRARY_SYNC_LOCK_PID', '0'))
            if pid <= 0:
                raise RuntimeError('Managed copy requires its active maintenance owner')
            os.kill(pid, 0)
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                pass
            else:
                raise RuntimeError('The maintenance owner no longer holds the exclusive lock')
        else:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                raise RuntimeError('Another OET update is active; do not overlap library copies')
        yield


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, default=Path('/Volumes/GENODODI/OET/Mac App/offline-library'))
    parser.add_argument('--destination', type=Path, default=DEFAULT_DESTINATION)
    parser.add_argument('--public', type=Path, default=ROOT / 'public')
    parser.add_argument('--managed', action='store_true')
    args = parser.parse_args()
    with release_lock(Path.home() / 'Library/Application Support/OET Study/library-sync', args.managed):
        receipt = mirror_library(args.public, args.source, args.destination)
        print(json.dumps({key: value for key, value in receipt.items() if key != 'files'}), flush=True)


if __name__ == '__main__':
    main()
