"""Publish complete source pages, keeping every passage, table and diagram intact.

Usage: python3 scripts/import-jahshan-reading-pages.py --pdf /path/to/book.pdf
Requires Poppler and Pillow. Existing question-page images are reused.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('--pdf', required=True, type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
catalog = json.loads((root / 'src/data/jahshanCollection.json').read_text())
forms = json.loads((root / 'src/data/jahshanReadingQuestions.json').read_text())
assert hashlib.sha256(args.pdf.read_bytes()).hexdigest() == forms['sourceSha256'], 'Wrong source PDF'
destination = root / 'public/jahshan-reading-pages'
destination.mkdir(exist_ok=True)
tests = []
for entry in catalog['readingTests']:
    questions = next(t for t in forms['tests'] if t['number'] == entry['number'])
    last_a = max(q['sourcePage'] for s in questions['sections'] if s['part'] == 'A' for q in s['questions'])
    last_b = max(q['sourcePage'] for s in questions['sections'] if s['part'] == 'B' for q in s['questions'])
    boundaries = [entry['questionPage'], last_a + 1, last_b + 1, entry['answerPage']]
    text_pages = [q['sourceTextPage'] for s in questions['sections'] if s['part'] == 'A' for q in s['questions'] if q['sourceTextPage']]
    tests.append(dict(number=entry['number'], firstTextPage=min(text_pages) if text_pages else entry['questionPage'], parts={part: list(range(boundaries[i], boundaries[i+1])) for i, part in enumerate('ABC')}))
pages = sorted({2} | {p for entry in catalog['readingTests'] for p in range(entry['questionPage'], entry['lastPage']+1)})

def render(page):
    target = destination / f'{page}.webp'
    if target.exists():
        with Image.open(target) as image:
            image.verify()
        return
    with tempfile.TemporaryDirectory(prefix='oet-reading-') as temporary:
        prefix = Path(temporary) / 'page'
        subprocess.run(['pdftoppm', '-f', str(page), '-l', str(page), '-scale-to', '2200', '-singlefile', '-png', str(args.pdf), str(prefix)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        with Image.open(prefix.with_suffix('.png')) as image:
            image.convert('RGB').save(target, quality=87)

with ThreadPoolExecutor(max_workers=4) as pool:
    for i, _ in enumerate(pool.map(render, pages), 1):
        if i % 25 == 0:
            print(f'Rendered {i}/{len(pages)} source pages', flush=True)
dimensions = {}
for page in pages:
    with Image.open(destination / f'{page}.webp') as image:
        dimensions[page] = dict(width=image.width, height=image.height)
(root / 'src/data/jahshanReadingPages.json').write_text(json.dumps(dict(sourceSha256=forms['sourceSha256'], dimensions=dimensions, tests=tests), indent=2) + '\n')
print(f'Published {len(pages)} complete original pages for {len(tests)} entries', flush=True)
