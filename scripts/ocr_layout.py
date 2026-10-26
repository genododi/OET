"""Keep OCR geometry and paragraph boundaries without rewriting source wording."""
import csv
import io
import statistics

LAYOUT_VERSION = 1
IMAGE_FORMATS = {'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'tif', 'tiff', 'bmp', 'gif', 'avif'}

def from_tsv(value):
    rows = list(csv.DictReader(io.StringIO(value), delimiter='\t', quoting=csv.QUOTE_NONE))
    page = next((r for r in rows if r['level'] == '1'), None)
    if not page or float(page['width']) <= 0 or float(page['height']) <= 0:
        raise ValueError('OCR did not report valid page dimensions')
    width, height = float(page['width']), float(page['height'])
    groups = {}
    for row in rows:
        if row['level'] != '5' or not row.get('text', '').strip():
            continue
        key = tuple(int(row[k]) for k in ['block_num', 'par_num', 'line_num'])
        groups.setdefault(key, []).append(row)
    blocks = {}
    for key, words in sorted(groups.items()):
        left = min(float(w['left']) for w in words)
        top = min(float(w['top']) for w in words)
        right = max(float(w['left']) + float(w['width']) for w in words)
        bottom = max(float(w['top']) + float(w['height']) for w in words)
        confidence = statistics.mean(max(0, float(w['conf'])) / 100 for w in words)
        line = {'text': ' '.join(w['text'].strip() for w in words),
                'x': round(left / width, 5), 'y': round(top / height, 5),
                'width': round((right-left) / width, 5), 'height': round((bottom-top) / height, 5),
                'confidence': round(confidence, 3),
                'words': [{'text': w['text'].strip(), 'x': round(float(w['left']) / width, 5), 'width': round(float(w['width']) / width, 5), 'confidence': round(max(0, float(w['conf'])) / 100, 3)} for w in words],
                'uncertainWords': [w['text'].strip() for w in words if float(w['conf']) < 60]}
        blocks.setdefault(key[:2], []).append(line)
    paragraphs = [{'text': '\n'.join(line['text'] for line in lines), 'lines': lines} for lines in blocks.values()]
    return {'text': '\n\n'.join(p['text'] for p in paragraphs),
            'layout': {'version': LAYOUT_VERSION, 'width': width, 'height': height, 'blocks': paragraphs}}

def from_vision(observations, width, height, needs_review=False):
    # Separate columns instead of merging every observation at the same y position.
    blocks = []
    typical = statistics.median(item['height'] for item in observations) if observations else .02
    for item in sorted(observations, key=lambda item: (-item['y'], item['x'])):
        text = item['text']
        left=max(0,item['x']);right=min(1,item['x']+item['width'])
        top=max(0,1-item['y']-item['height']);bottom=min(1,1-item['y'])
        line = {'text': text, 'x': round(left,5), 'y': round(top,5),
                'width': round(max(0,right-left),5), 'height': round(max(0,bottom-top),5),
                'confidence': item.get('confidence', 1),
                'uncertainWords': [text] if needs_review or item.get('confidence', 1) < .6 else []}
        previous = blocks[-1]['lines'][-1] if blocks else None
        if previous and line['y'] > previous['y'] + previous['height']*.4 and line['y']-previous['y']-previous['height'] <= typical*.9 and abs(line['x']-previous['x']) <= .06:
            blocks[-1]['lines'].append(line);blocks[-1]['text'] += '\n' + text
        else:blocks.append({'text': text, 'lines': [line]})
    return {'needsReview': needs_review, 'text': '\n\n'.join(block['text'] for block in blocks),
            'layout': {'version': LAYOUT_VERSION, 'width': width, 'height': height, 'blocks': blocks}}

def table_rule_bands(image):
    """Read-only detection of thin, long intersecting rules; optional dependencies."""
    try:
        from PIL import Image
        import numpy as np
    except ImportError:
        return None
    with Image.open(image) as source:
        dark = np.asarray(source.convert('L')) < 150
    rows = np.flatnonzero(dark.mean(axis=1) > .65)
    columns = np.flatnonzero(dark.mean(axis=0) > .6)
    def bands(values):
        return np.split(values, np.flatnonzero(np.diff(values) > 1) + 1) if len(values) else []
    horizontal, vertical = bands(rows), bands(columns)
    if len(horizontal) < 3 or len(vertical) < 2 or any(len(b) > max(2,dark.shape[0]*.02) for b in horizontal) or any(len(b) > max(2,dark.shape[1]*.02) for b in vertical):
        return None
    return rows, columns

def remove_table_rules(image):
    """Remove detected rules only from the temporary OCR image, never an original."""
    rules = table_rule_bands(image)
    if rules is None:
        return False
    from PIL import Image
    import numpy as np
    rows, columns = rules
    with Image.open(image) as source:
        output = np.asarray(source.convert('RGB')).copy()
    rows=np.unique(np.clip(np.concatenate([rows+n for n in range(-2,3)]),0,output.shape[0]-1))
    columns=np.unique(np.clip(np.concatenate([columns+n for n in range(-2,3)]),0,output.shape[1]-1))
    output[rows, :, :] = 255
    output[:, columns, :] = 255
    Image.fromarray(output).save(image)
    return True
