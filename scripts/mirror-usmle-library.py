#!/usr/bin/env python3
"""Restore the explicitly shared USMLE PDFs without requiring a source drive."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import urllib.request


def sha256(path):
    h = hashlib.sha256()
    with path.open('rb') as source:
        for chunk in iter(lambda: source.read(4 * 1024 * 1024), b''): h.update(chunk)
    return h.hexdigest()


def mirror(public, library, check_only=False):
    if library.is_symlink() or (library / 'originals').is_symlink(): raise ValueError('The shared library cannot link outside its local folder')
    raw = (public / 'index.json').read_bytes(); index = json.loads(raw)
    resources = [row for row in index['resources'] if row.get('kind') == 'pdf']; targets = []
    for row in resources:
        sha = row['sha256']; url = row['asset']
        if row.get('publicSharing') is not True or not re.fullmatch(r'[a-f0-9]{64}', sha): raise ValueError('Not an explicitly shared PDF')
        if not re.fullmatch(r'https://github\.com/genododi/OET/releases/download/usmle-[A-Za-z0-9._-]+/' + sha + r'\.pdf', url): raise ValueError('Unapproved public source URL')
        if type(row['size']) is not int or row['size'] <= 0: raise ValueError('Invalid original size')
        targets.append((row, library / 'originals' / (sha + '.pdf')))
    receipt_path = library / 'public-mirror.json'
    previous = json.loads(receipt_path.read_text()).get('files', {}) if receipt_path.exists() else {}
    files = {}
    for row, target in targets:
        if not target.exists():
            if check_only: raise ValueError('A shared original is missing from this Mac')
            target.parent.mkdir(parents=True, exist_ok=True)
            if shutil.disk_usage(target.parent).free < row['size'] + 2 * 1024 ** 3: raise RuntimeError('Not enough internal space to restore the shared PDF')
            pending = target.with_suffix('.download.part')
            try:
                with urllib.request.urlopen(row['asset'], timeout=60) as response, pending.open('wb') as output:
                    count = 0
                    for data in iter(lambda: response.read(4 * 1024 * 1024), b''):
                        count += len(data)
                        if count > row['size']: raise ValueError('Download exceeded declared size')
                        output.write(data)
                if count != row['size'] or sha256(pending) != row['sha256']: raise ValueError('Downloaded PDF integrity mismatch')
                pending.chmod(0o600); pending.replace(target)
            finally: pending.unlink(missing_ok=True)
        stat = target.lstat()
        if target.is_symlink() or not target.is_file() or stat.st_size != row['size']: raise ValueError('Local original identity mismatch')
        old = previous.get(row['sha256'], {})
        if old.get('mtimeNs') != str(stat.st_mtime_ns) or old.get('bytes') != stat.st_size:
            if sha256(target) != row['sha256']: raise ValueError('The existing original changed; preserve it for review')
        files[row['sha256']] = {'bytes': stat.st_size, 'mtimeNs': str(stat.st_mtime_ns)}
    result = {'state': 'ready', 'files': len(files), 'questions': len(index['questions']), 'bytes': sum(row['size'] for row in resources), 'catalogSha256': hashlib.sha256(raw).hexdigest()}
    if not check_only:
        temporary = receipt_path.with_suffix('.next.json'); temporary.write_text(json.dumps({**result, 'files': files}) + '\n'); temporary.chmod(0o600); temporary.replace(receipt_path)
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('--public', type=Path, required=True); parser.add_argument('--library', type=Path, required=True); parser.add_argument('--check-only', action='store_true'); args = parser.parse_args()
    print(json.dumps(mirror(args.public, args.library, args.check_only)))
