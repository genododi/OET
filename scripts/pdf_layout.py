"""Native PDF word geometry for display, separate from stable extraction offsets.

Never changes the text used by question ranges. Poppler's block order preserves
columns; word boxes provide a faithful selectable page view for tables/cards.
"""
import collections
import re
import subprocess
import unicodedata
import xml.etree.ElementTree as ET


def pdf_display_pages(source):
    result = subprocess.run(['pdftotext', '-bbox-layout', str(source), '-'], capture_output=True, timeout=120, check=True)
    xml = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', result.stdout.decode('utf-8', errors='replace'))
    root = ET.fromstring(xml)
    ns = {'p': 'http://www.w3.org/1999/xhtml'}
    pages = []
    for page in root.findall('.//p:page', ns):
        width, height = float(page.attrib['width']), float(page.attrib['height'])
        blocks = []
        for block in page.findall('.//p:block', ns):
            lines = []
            for line in block.findall('p:line', ns):
                words = []
                for word in line.findall('p:word', ns):
                    text = ''.join(word.itertext())
                    x1, x2 = float(word.attrib['xMin']), float(word.attrib['xMax'])
                    if text and 0 <= x1 < x2 <= width + .01:
                        words.append({'text': text, 'x': x1 / width, 'width': (x2 - x1) / width, 'confidence': 1})
                x1, x2 = float(line.attrib['xMin']), float(line.attrib['xMax'])
                y1, y2 = float(line.attrib['yMin']), float(line.attrib['yMax'])
                if words and 0 <= x1 < x2 <= width + .01 and 0 <= y1 < y2 <= height + .01:
                    lines.append({'text': ' '.join(w['text'] for w in words), 'x': x1 / width, 'y': y1 / height, 'width': (x2 - x1) / width, 'height': (y2 - y1) / height, 'confidence': 1, 'words': words})
            if lines:
                blocks.append({'text': '\n'.join(line['text'] for line in lines), 'lines': lines})
        text = '\n\n'.join(b['text'] for b in blocks)
        for block in blocks:
            for line in block['lines']:
                if line['height'] * height > line['width'] * width * 2 and len(line['text']) > 8:
                    line['rotation'] = -90
        pages.append({'version': 2, 'text': text, 'layout': {'version': 1, 'width': width, 'height': height, 'blocks': blocks}} if blocks else None)
    return pages


def same_words(before, after):
    # An arrangement change must not add or lose a clinical word or number.
    # Ignore ordering, typography and line-end hyphenation, not token differences.
    def tokens(s):
        s = unicodedata.normalize('NFKC', s).casefold().replace('\u00ad', '')
        s = re.sub(r'-\s*\n\s*', '', s)
        return collections.Counter(re.findall(r'\w+|[<>≤≥±%]', s))
    a, b = tokens(before), tokens(after)
    return bool(a) and a == b


def attach_pdf_display(data, source, columns_only=False):
    pages = data.get('pages', [])
    candidates = [p for p in pages if p.get('extraction') == 'text' and not p.get('layout') and p.get('display', {}).get('version') != 2 and (not columns_only or len(re.findall(r'\S {8,}\S', p['text'])) >= 5)]
    if not candidates:
        return 0
    displays = pdf_display_pages(source)
    changed = 0
    for page in candidates:
        display = displays[page['number'] - 1] if page['number'] <= len(displays) else None
        if display and same_words(page['text'], display['text']):
            page['display'] = display
            changed += 1
    return changed
