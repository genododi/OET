#!/usr/bin/env python3
"""Publish explicitly supplied Desktop/OET files; preserve all paths, deduplicate bytes.
Requires Poppler (pdftotext). No credentials or external archive are read.
Run from any directory: python3 scripts/import-desktop-materials.py [source-folder]
"""
import hashlib
import json
import re
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET

REPO = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else REPO
EXTENSIONS = {'.pdf', '.docx', '.pptx', '.jpg', '.jpeg', '.png', '.html', '.apkg', '.mp3', '.m4a', '.wav', '.mp4'}
SKILLS = ['listening', 'reading', 'writing', 'speaking']
OUT = REPO / 'public' / 'supplied-materials'


def extract(path):
    if path.suffix.lower() == '.pdf':
        result = subprocess.run(['pdftotext', '-layout', str(path), '-'], capture_output=True, text=True, timeout=120)
        if result.returncode:
            raise RuntimeError(f'Cannot extract PDF: {path.name}')
        return result.stdout.strip()
    if path.suffix.lower() in {'.docx', '.pptx'}:
        with zipfile.ZipFile(path) as archive:
            names = ['word/document.xml'] if path.suffix.lower() == '.docx' else sorted(
                (name for name in archive.namelist() if re.fullmatch(r'ppt/slides/slide\d+\.xml', name)),
                key=lambda name: int(re.search(r'slide(\d+)\.xml', name).group(1)))
            return '\n\n'.join('\n'.join(''.join(node.itertext()) for node in ET.fromstring(archive.read(name)).iter()
                                        if node.tag.endswith('}t')) for name in names)
    if path.suffix.lower() == '.html':
        return path.read_text(errors='replace')  # Displayed only as escaped plain text; never executed.
    return ''


def classify(path, text):
    name = path.name.lower()
    if path.parent.name == 'AMR oet':
        return ['writing', 'speaking'] if name.startswith('studyplan') else ['writing']
    for skill in SKILLS:
        if skill in name:
            return [skill]
    if any(word in name for word in ['future_land', 'future land', 'doctor’s_guide', '.apkg']):
        return SKILLS
    if name.startswith('safari'):
        return ['reading']
    if any(word in name for word in ['letter', 'avoided', 'preposition', 'susan', 'sally', 'emma']) or path.suffix.lower() == '.docx':
        return ['writing']
    sample = text[:4000].lower()
    if 'writing sub-test' in sample or 'writing subtest' in sample or 'dear dr' in sample:
        return ['writing']
    # Unidentified scans remain searchable and selectable without claiming their subject.
    return []


def main():
    if not shutil.which('pdftotext'):
        raise SystemExit('Install Poppler to extract searchable PDF text.')
    candidates = [p for p in SOURCE.iterdir() if p.is_file() and p.suffix.lower() in EXTENSIONS and p.name != 'index.html']
    amr = SOURCE / 'AMR oet'
    if amr.is_dir():
        candidates += [p for p in amr.rglob('*') if p.is_file() and p.suffix.lower() in EXTENSIONS and not p.name.startswith('.')]
    if not candidates:
        raise SystemExit('No supplied materials found. Existing catalog was left unchanged.')
    (OUT / 'files').mkdir(parents=True, exist_ok=True)
    (OUT / 'text').mkdir(parents=True, exist_ok=True)
    rows, blobs, texts, enriched = [], {}, {}, {}
    for path in sorted(candidates, key=lambda p: (p.parent.name != 'AMR oet', p.name.lower())):
        data = path.read_bytes()
        sha = hashlib.sha256(data).hexdigest()
        if len(data) >= 100 * 1024 * 1024:
            raise SystemExit(f'File exceeds normal GitHub size limit: {path.name}')
        ext = path.suffix.lower()
        safe_ext = '.html.txt' if ext == '.html' else ext
        asset = f'supplied-materials/files/{sha}{safe_ext}'
        target = REPO / 'public' / asset
        if not target.exists():
            target.write_bytes(data)
        if sha not in texts:
            text_file = OUT / 'text' / f'{sha}.json'
            prior = json.loads(text_file.read_text()) if text_file.exists() else {}
            if prior.get('sourceSha256') == sha and prior.get('pages'):
                enriched[sha] = prior['pages']
                texts[sha] = prior['text']
            else:
                texts[sha] = extract(path)
                text_file.write_text(json.dumps({'text': texts[sha]}, ensure_ascii=False))
        text = texts[sha]
        relative = path.relative_to(SOURCE).as_posix()
        rows.append({
            'id': 'desktop-' + hashlib.sha256(relative.encode()).hexdigest()[:16],
            'filename': path.name, 'relativePath': relative, 'collection': 'AMR' if relative.startswith('AMR oet/') else 'OET',
            'format': ext[1:], 'bytes': len(data), 'sha256': sha,
            'assetPath': asset, 'textPath': f'supplied-materials/text/{sha}.json',
            'skills': classify(path, text), 'hasText': bool(re.search(r'[A-Za-z]{3}', text)),
            'excerpt': re.sub(r'\s+', ' ', text)[:320] if ext != '.html' else 'Supplied HTML file. Download or read as plain text.',
            'duplicateOf': blobs.get(sha),
        })
        if sha in enriched:
            rows[-1]['pageCount'] = len(enriched[sha])
            rows[-1]['ocrPageCount'] = sum(page['extraction'] == 'ocr' for page in enriched[sha])
        blobs.setdefault(sha, rows[-1]['id'])
    catalog = {'version': 1, 'source': 'User-supplied Desktop/OET and AMR oet folders',
               'publicationBasis': 'Repository owner explicitly requested upload and deployment of all supplied files on 2026-09-29. This does not assert third-party ownership or an open license.',
               'fileCount': len(rows), 'uniqueFileCount': len(blobs), 'amrCount': sum(r['collection'] == 'AMR' for r in rows),
               'totalBytes': sum(r['bytes'] for r in rows), 'files': rows}
    output = REPO / 'src/data/desktopMaterials.generated.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
    print(f'Imported {len(rows)} paths ({len(blobs)} unique files); {catalog["amrCount"]} AMR files.')


if __name__ == '__main__':
    main()
