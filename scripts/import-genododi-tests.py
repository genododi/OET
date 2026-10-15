#!/usr/bin/env python3
"""Import the exam papers and recordings stored in GENODODI's OET resource folder."""
import hashlib
import json
import re
import subprocess
import sys
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET

REPO = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path('/Volumes/GENODODI/OET/oet-study-sources/Google drive Folder')
OUT = REPO / 'public' / 'supplied-materials'
EXTENSIONS = {'.pdf', '.docx', '.jpg', '.jpeg', '.png', '.mp3', '.m4a', '.wav'}


def normalized(value):
    return ''.join(char for char in value.casefold() if not (ord(char) >= 0x2066 and ord(char) <= 0x2069) and ord(char) not in {0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e})


def locate_path(root, parts):
    current = root
    for part in parts:
        expected = normalized(part)
        current = next((child for child in current.iterdir() if normalized(child.name) == expected), None)
        if current is None:
            return None
    return current


def extract(path):
    if path.suffix.lower() == '.pdf':
        result = subprocess.run(['pdftotext', '-layout', str(path), '-'], capture_output=True, text=True, timeout=120)
        return result.stdout.strip() if result.returncode == 0 else ''
    if path.suffix.lower() == '.docx':
        with zipfile.ZipFile(path) as archive:
            root = ET.fromstring(archive.read('word/document.xml'))
            return '\n'.join(''.join(node.itertext()) for node in root.iter() if node.tag.endswith('}t'))
    return ''


def main():
    if not SOURCE.is_dir():
        raise SystemExit(f'GENODODI resource folder not found: {SOURCE}')
    collection = next((child for child in SOURCE.iterdir() if child.is_dir() and 'oet collection' in normalized(child.name)), None)
    if collection is None:
        raise SystemExit('The OET Collection directory was not found in the supplied resource folder.')

    groups = [
        (locate_path(collection, ['Listening', 'Mock-Tests']), 'listening'),
        (locate_path(collection, ['Listening', 'New Listenings & Readings']), 'listening'),
        (locate_path(collection, ['Reading', 'Reading Mock Test']), 'reading'),
        (locate_path(collection, ['Reading', 'OET-2.0-READING.pdf']), 'reading'),
        (locate_path(collection, ['Reading', 'Authentic Reading Materials.pdf']), 'reading'),
        (locate_path(collection, ['Speaking', 'cards.pdf']), 'speaking'),
        (locate_path(collection, ['Writing', 'Writing-Booklet-Sample.pdf']), 'writing'),
    ]
    candidates = []
    for path, skill in groups:
        if path is None:
            continue
        items = [path] if path.is_file() else path.rglob('*')
        candidates.extend((item, skill) for item in items if item.is_file() and item.suffix.lower() in EXTENSIONS and not item.name.startswith('._'))

    review = next((child for child in SOURCE.iterdir() if child.is_dir() and '2.0 review materials' in normalized(child.name)), None)
    if review:
        review_groups = [
            (locate_path(review, ['Reading', 'Free sample (2)']), 'reading'),
            (locate_path(review, ['Reading', 'Free sample(3)']), 'reading'),
            (locate_path(review, ['Listening', 'Free sample (2)']), 'listening'),
            (locate_path(review, ['Speaking']), 'speaking'),
            (locate_path(review, ['writing']), 'writing'),
            (locate_path(review, ['other practice tests', "ADEL's OET Practice Book"]), 'listening'),
        ]
        for path, skill in review_groups:
            if path is None:
                continue
            items = [path] if path.is_file() else path.rglob('*')
            for item in items:
                if not item.is_file() or item.suffix.lower() not in EXTENSIONS or item.name.startswith('._'):
                    continue
                name = normalized(item.name)
                rel = normalized(item.relative_to(review).as_posix())
                if skill == 'speaking' and not any(term in name for term in ('sample', 'test', 'book', 'card', 'practice')):
                    continue
                if skill == 'writing' and not any(term in name for term in ('sample', 'test', 'task', 'letter')):
                    continue
                if skill == 'listening' and not (item.suffix.lower() in {'.mp3', '.m4a', '.wav'} or any(term in name for term in ('sample-test', 'answer-key', 'question-paper', 'model-answers'))):
                    continue
                candidates.append((item, skill))

    # Add the locally supplied writing task collections and 17-class test set.
    writing_dir = locate_path(collection, ['Writing'])
    writing_names = {normalized(name) for name in ['Class Test writing 1-17.pdf', 'Writing tasks.pdf']}
    if writing_dir:
        candidates.extend((item, 'writing') for item in writing_dir.rglob('*') if item.is_file() and normalized(item.name) in writing_names)
    if not candidates:
        raise SystemExit('No test papers, answer keys, role-play cards or recordings were found.')

    catalog_path = REPO / 'src/data/desktopMaterials.generated.json'
    catalog = json.loads(catalog_path.read_text())
    files = catalog['files']
    by_sha = {item['sha256']: item for item in files if not item.get('duplicateOf')}
    (OUT / 'files').mkdir(parents=True, exist_ok=True)
    (OUT / 'text').mkdir(parents=True, exist_ok=True)
    added = 0
    for path, skill in sorted(candidates, key=lambda item: item[0].as_posix().casefold()):
        data = path.read_bytes()
        if len(data) >= 100 * 1024 * 1024:
            print(f'Skipped over GitHub individual-file limit: {path.name}', file=sys.stderr)
            continue
        sha = hashlib.sha256(data).hexdigest()
        relative = f'GENODODI OET/{path.relative_to(SOURCE).as_posix()}'
        if any(row['relativePath'] == relative for row in files):
            continue
        ext = path.suffix.lower()
        asset = f'supplied-materials/files/{sha}{ext}'
        target = REPO / 'public' / asset
        if not target.exists():
            target.write_bytes(data)
        text_path = OUT / 'text' / f'{sha}.json'
        if text_path.exists():
            text = json.loads(text_path.read_text()).get('text', '')
        else:
            text = extract(path)
            text_path.write_text(json.dumps({'text': text}, ensure_ascii=False))
        relative_source = path.relative_to(SOURCE).as_posix()
        files.append({
            'id': 'genododi-test-' + hashlib.sha256(relative.encode()).hexdigest()[:16],
            'filename': path.name,
            'relativePath': relative,
            'collection': 'OET',
            'format': ext[1:],
            'bytes': len(data),
            'sha256': sha,
            'assetPath': asset,
            'textPath': f'supplied-materials/text/{sha}.json',
            'skills': [skill],
            'hasText': bool(re.search(r'[A-Za-z]{3}', text)),
            'excerpt': re.sub(r'\s+', ' ', text)[:320],
            'duplicateOf': by_sha.get(sha, {}).get('id'),
        })
        if sha not in by_sha:
            by_sha[sha] = files[-1]
        added += 1

    catalog['source'] = 'User-supplied Desktop/OET, AMR oet and GENODODI OET test resources'
    catalog['fileCount'] = len(files)
    catalog['uniqueFileCount'] = len(by_sha)
    catalog['amrCount'] = sum(row['collection'] == 'AMR' for row in files)
    catalog['totalBytes'] = sum(row['bytes'] for row in files)
    catalog['files'] = files
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
    print(f'Added {added} GENODODI test resources; catalog now has {len(files)} paths and {len(by_sha)} unique originals.')


if __name__ == '__main__':
    main()
