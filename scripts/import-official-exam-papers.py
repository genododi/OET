#!/usr/bin/env python3
"""Split verified official Medicine sample PDFs (requires pypdf==6.10.0).
Usage: python scripts/import-official-exam-papers.py SAMPLE_1.pdf SAMPLE_2.pdf
Obtain the originals from sourceUrl in src/data/officialExamAssets.json.
Source changes require a fresh page/layout review before updating pinned hashes.
"""
import argparse
import hashlib
import json
from pathlib import Path
from pypdf import PdfReader, PdfWriter

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'src/data/officialExamAssets.json'


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('samples', type=Path, nargs=2)
    args = parser.parse_args()
    manifest = json.loads(MANIFEST.read_text())
    originals = [source.read_bytes() for source in args.samples]
    # Verify both inputs before writing any output. Never infer page mappings for a new edition.
    for number, data in enumerate(originals, 1):
        expected = {a['sourceSha256'] for a in manifest['assets'] if a['path'].startswith(f'sample-{number}-')}
        if expected != {sha256(data)}:
            raise SystemExit(f'Sample {number} differs from the reviewed source PDF; inspect it before changing the manifest.')
    for asset in manifest['assets']:
        number = int(asset['path'].split('-')[1])
        reader = PdfReader(args.samples[number - 1])
        writer = PdfWriter()
        for page_number in asset['sourcePages']:
            page = reader.pages[page_number - 1]
            if asset.get('crop'):
                # Visual separation only: cropping does not remove the other role's text.
                # Public practice cards are not confidential; do not use this as redaction.
                height, width = float(page.mediabox.height), float(page.mediabox.width)
                lower, upper = (0, .5) if asset['crop'] == 'speaking-candidate' else (.5, 1)
                page.mediabox.lower_left = (0, height * lower)
                page.mediabox.upper_right = (width, height * upper)
                page.cropbox = page.mediabox
            writer.add_page(page)
        output = ROOT / 'public/official-exam-papers' / asset['path']
        with output.open('wb') as stream:
            writer.write(stream)
        asset['sha256'] = sha256(output.read_bytes())
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n')
    print('Rebuilt 10 sections/cards from the pinned official originals.')


if __name__ == '__main__':
    main()
