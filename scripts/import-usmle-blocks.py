#!/usr/bin/env python3
"""Resumable local recognition of the owner's Telegram screenshot block PDFs.

Keys are accepted only when explicitly printed. The absence of an option from
wrong-choice explanations is recorded as a review hint, never a scored key.
"""
import argparse
import concurrent.futures
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OPTION = r'^[^\w\n]{0,6}[Oo0]?\s*([A-K])[.)]\s+(.+)$'


def eligible_pdf(path, source):
    label = path.relative_to(source).as_posix()
    return not any(part.startswith('.') for part in path.relative_to(source).parts) and path.suffix.lower() == '.pdf' and not re.search(r'\bOET\b', label, re.I) and bool(re.search(r'(?:^|/)block\s*\d+|nbme|amboss|u[- ]?world|usmle', label, re.I))


def source_labels(name):
    years = sorted({int(y) for y in re.findall(r'(?<!\d)(20(?:1\d|2\d|3\d))(?!\d)', name)}, reverse=True)
    step = 'step1' if re.search(r'step[ _-]*1\b', name, re.I) else 'step2' if re.search(r'step[ _-]*2(?:[ _-]*CK)?\b', name, re.I) else None
    return {'productionYear': years[0] if years else None, 'productionYears': years, 'yearEvidence': [f'Source filename: {name}'] if years else [], 'step': step}


def sha256(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(4 * 1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    pending = path.with_suffix('.next.json')
    pending.write_text(json.dumps(value, ensure_ascii=False) + '\n')
    pending.chmod(0o600)
    pending.replace(path)


def normalise_clinical_text(value):
    return re.sub(r'\s+', ' ', value).strip().casefold().replace('’', "'").replace('–', '-')


def trusted_source_keys(questions):
    # Public visibility does not change an original deck's verified key.
    # Exclude derivative Telegram matches so keys cannot propagate in a circle.
    trusted = {}
    for q in questions:
        correct = [option['id'] for option in q.get('options', []) if option.get('correct')]
        if q.get('sourceGroup') != 'GENODODI Telegram folder' and not q.get('sourceKeyReference') and not q.get('reviewOnly') and q.get('key') and correct == [q['key']]:
            trusted.setdefault(normalise_clinical_text(q['prompt']), []).append(q)
    return trusted


def match_existing_key(question, previous):
    # Keep decimal points, operators and units. Whitespace and typographic
    # apostrophes may differ; clinical numbers and option wording may not.
    normalise = normalise_clinical_text
    stem = normalise(question['prompt'])
    if len(stem) < 100 or len(question['options']) < 2: return None
    labels = {normalise(option['label']) for option in question['options']}
    matches = []
    for old in previous.get(stem, []) if isinstance(previous, dict) else previous:
        if old.get('publicSharing') or old.get('reviewOnly') or not old.get('key') or normalise(old['prompt']) != stem: continue
        if {normalise(option['label']) for option in old['options']} != labels: continue
        correct = [normalise(option['label']) for option in old['options'] if option['id'] == old['key']]
        if len(correct) == 1: matches.append((correct[0], old))
    if not matches or len({label for label, _ in matches}) != 1: return None
    correct, source = matches[0]
    key = next(option['id'] for option in question['options'] if normalise(option['label']) == correct)
    return key, source


def page_rows(page, body=False):
    rows = sorted(page['rows'], key=lambda r: (-round(r['y'], 3), r['x']))
    if body:
        rows = [r for r in rows if .045 < r['y'] < .91 and not re.search(r'Scanned by|Camera Scanner|Block Time Elapsed', r['text'], re.I)]
    return rows


def parse_pages(pages):
    def metadata(page):
        header = ' '.join(r['text'] for r in page_rows(page) if r['y'] >= .88)
        identifier = re.search(r'\bId\s*:\s*(\d{3,8})\b', header, re.I)
        body = page_rows(page, True)
        submitted = any(re.fullmatch(r'Subm[iIl1]?t|Subrnit', row['text'].strip(), re.I) for row in body)
        choices = [row for row in body if row['x'] < .25 and re.match(OPTION, row['text'])]
        return identifier[1] if identifier else None, submitted or (len(choices) >= 2 and identifier is not None)
    # Use repeated source item IDs to recover ordinals hidden by the phone
    # status bar. A single bad OCR of an ordinal cannot overrule its other pages.
    from collections import Counter, defaultdict
    headers = []
    votes = defaultdict(Counter)
    for page in pages:
        identifier, is_question = metadata(page)
        number = next((match for row in page_rows(page) if row['y'] >= .88 and (match := re.fullmatch(r'(\d{1,2})\s+of\s+(\d{1,2})', row['text'].strip(), re.I))), None)
        ordinal = int(number[1]) if number and 1 <= int(number[1]) <= int(number[2]) <= 60 else None
        if identifier and ordinal: votes[identifier][ordinal] += 1
        headers.append((identifier, ordinal, is_question))
    known = {}
    for identifier, counts in votes.items():
        ranked = counts.most_common()
        if len(ranked) == 1 or ranked[0][1] > ranked[1][1]: known[identifier] = ranked[0][0]
    direct = [known.get(identifier, ordinal) for identifier, ordinal, _ in headers]
    groups = {}
    previous = None
    last_question_id = None
    for position, page in enumerate(pages):
        identifier, _, is_question = headers[position]
        number = direct[position]
        if previous is not None and number is not None and number < previous: number = None
        if number is None and is_question:
            upcoming_pair = next(((offset, n) for offset, n in enumerate(direct[position + 1:], 1) if n is not None), None)
            upcoming = upcoming_pair[1] if upcoming_pair else None
            if previous is None: number = upcoming or 1
            elif identifier and identifier == last_question_id: number = previous
            elif upcoming_pair and upcoming_pair[0] <= 2 and upcoming == previous: number = previous
            else: number = previous + 1
        if number is None: number = previous
        if number is not None:
            previous = number
            groups.setdefault(number, []).append(page)
        if is_question: last_question_id = identifier
    questions = []
    for number, group in sorted(groups.items()):
        question_pages = []
        for page in group:
            rows = page_rows(page, True)
            if metadata(page)[1]:
                question_pages.append(page)
            elif not question_pages and re.match(r'^(?:A|An)\s+(?:\d|[a-z-]+\s+(?:man|woman|patient|boy|girl|infant|researcher))', ' '.join(r['text'] for r in rows), re.I):
                question_pages.append(page)
            else:
                break
        # The first page may contain a long stem and the next its choices.
        text = '\n'.join(row['text'] for page in question_pages for row in page_rows(page, True) if row['text'].strip().lower() != 'submit')
        choices = list(re.finditer(OPTION, text, re.M))
        ids = [choice[1] for choice in choices]
        valid = len(ids) >= 2 and ids == list('ABCDEFGHIJK'[:len(ids)])
        options = [{'id': choice[1], 'label': text[choice.start(2):choices[i + 1].start() if i + 1 < len(choices) else len(text)].strip(), 'correct': False} for i, choice in enumerate(choices)] if valid else []
        prompt = (text[:choices[0].start()].strip() if valid else text) or 'The question screenshot is missing or could not be identified. Open the original PDF and reveal its saved explanation for source review.'
        answer_pages = group[len(question_pages):]
        explanation_lines = []
        for page in answer_pages:
            lines = [r['text'] for r in page_rows(page, True)]
            overlap = 0
            for size in range(2, min(50, len(lines), len(explanation_lines)) + 1):
                if explanation_lines[-size:] == lines[:size]: overlap = size
            explanation_lines.extend(lines[overlap:])
        explanation = '\n'.join(explanation_lines)
        printed = set(re.findall(r'\bcorrect\s+answer\s*[:\-]\s*([A-K])\b', explanation, re.I))
        key = next(iter(printed)).upper() if len(printed) == 1 else None
        if key not in ids: key = None
        for option in options: option['correct'] = option['id'] == key
        discussed = set()
        for label in re.findall(r'\(Choices?\s+([A-K](?:\s*(?:,|and|&|or)\s*[A-K])*)\)', explanation, re.I):
            discussed.update(re.findall(r'\b[A-K]\b', label.upper()))
        remaining = set(ids) - discussed
        candidate = next(iter(remaining)) if valid and len(remaining) == 1 and discussed and re.search(r'Educational objective', explanation, re.I) else None
        questions.append({'number': number, 'prompt': prompt, 'options': options, 'key': key, 'reviewOnly': not (valid and key and prompt), 'explanation': explanation,
                          'questionPages': [p['page'] for p in question_pages], 'answerPages': [p['page'] for p in answer_pages],
                          'unverifiedAnswerHint': candidate, 'answerProvenance': 'explicit printed answer' if key else 'No explicit letter key; read the original worked explanation.'})
    return questions


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--library', type=Path, required=True)
    parser.add_argument('--recognizer', type=Path, required=True)
    parser.add_argument('--workers', type=int, default=2)
    parser.add_argument('--reparse-only', action='store_true', help='Rebuild records from the verified original snapshot and completed OCR cache without rescanning the drive')
    parser.add_argument('--resume-snapshot', action='store_true', help='Resume recognition of the verified original snapshot, avoiding a repeated external-drive transfer')
    args = parser.parse_args()
    root = args.library
    root.mkdir(parents=True, exist_ok=True)
    lock = root / 'import.lock'
    fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    os.write(fd, json.dumps({'pid': os.getpid()}).encode()); os.close(fd)
    try:
        save(root / 'telegram-import-receipt.json', {'version': 1, 'complete': False, 'source': str(args.source), 'startedAt': datetime.datetime.now(datetime.timezone.utc).isoformat()})
        index_path = root / 'index.json'
        index = json.loads(index_path.read_text()) if index_path.exists() else {'version': 1, 'questions': [], 'resources': [], 'warnings': []}
        stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
        backup = root / 'import-backups' / f'before-telegram-{stamp}.json'
        if index_path.exists(): backup.parent.mkdir(exist_ok=True); shutil.copyfile(index_path, backup)
        questions = {q['id']: q for q in index['questions']}
        trusted = trusted_source_keys(index['questions'])
        resources = {r['sha256']: r for r in index['resources']}
        files = [] if args.reparse_only or args.resume_snapshot else sorted(p for p in args.source.rglob('*') if p.is_file() and not p.is_symlink() and eligible_pdf(p, args.source))
        inventory = []
        for pdf in files:
            with pdf.open('rb') as stream:
                if stream.read(5) != b'%PDF-': raise ValueError(f'Invalid PDF: {pdf.name}')
            sha = sha256(pdf)
            target = root / 'originals' / f'{sha}.pdf'; target.parent.mkdir(exist_ok=True)
            if not target.exists():
                staged = target.with_suffix('.part'); shutil.copyfile(pdf, staged)
                if sha256(staged) != sha: raise ValueError('Source changed during copy')
                staged.chmod(0o600); staged.replace(target)
            else:
                if sha256(target) != sha: raise ValueError('Existing original integrity mismatch')
            inventory.append({'path': str(pdf), 'name': pdf.name, 'sha256': sha, 'size': target.stat().st_size, 'asset': f'originals/{sha}.pdf'})
        if args.reparse_only or args.resume_snapshot:
            inventory = json.loads((root / 'telegram-block-inventory.json').read_text())['files']
        # Identical reposts may have different filenames. Recognise each hash once.
        unique = {}
        for item in inventory:
            if item['sha256'] in unique: unique[item['sha256']].setdefault('aliases', []).append(item['name'])
            else: unique[item['sha256']] = item
        inventory = list(unique.values())
        if not args.reparse_only: save(root / 'telegram-block-inventory.json', {'version': 1, 'source': str(args.source), 'files': inventory})
        def recognise(item):
            cache = root / 'recognition' / item['sha256']
            if args.reparse_only:
                cached = [json.loads(p.read_text()) for p in sorted(cache.glob('page-*.json'))]
                if not cached or len(cached) != cached[0]['pageCount']: raise ValueError('Recognition cache is incomplete; resume the original recognition first')
                if sha256(root / item['asset']) != item['sha256']: raise ValueError('Cached original integrity mismatch')
            else: subprocess.run([str(args.recognizer.resolve()), str(root / item['asset']), str(cache)], check=True)
            return item, cache
        with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, min(2, args.workers))) as pool:
            futures = [pool.submit(recognise, item) for item in inventory]
            for future in concurrent.futures.as_completed(futures):
                item, cache = future.result()
                pages = [json.loads(p.read_text()) for p in sorted(cache.glob('page-*.json'))]
                parsed = parse_pages(pages)
                expected_counts = []
                for page in pages:
                    for row in page_rows(page):
                        match = re.fullmatch(r'\d{1,2}\s+of\s+(\d{1,2})', row['text'].strip(), re.I)
                        if match: expected_counts.append(int(match[1]))
                from collections import Counter
                expected = Counter(expected_counts).most_common(1)[0][0] if expected_counts else None
                boundary_review = not expected or [q['number'] for q in parsed] != list(range(1, expected + 1))
                if boundary_review:
                    print(json.dumps({'sourceBoundaryReview': item['name'], 'expected': expected, 'identified': len(parsed), 'originalRetained': True}), flush=True)
                    parsed = []
                now = datetime.datetime.now(datetime.timezone.utc).isoformat()
                block_label = re.search(r'block\s*(\d+)', item['name'], re.I)
                block = int(block_label[1]) if block_label else None
                labels = source_labels(item['name'])
                old_items = {qid: q for qid, q in questions.items() if q['sourceId'] == item['sha256']}
                for qid in old_items: del questions[qid]
                images = {}
                for page in pages:
                    source = cache / f'page-{page["page"]:04d}.jpg'; image_sha = sha256(source)
                    target = root / 'media' / f'{image_sha}.jpg'; target.parent.mkdir(exist_ok=True)
                    if not target.exists(): os.link(source, target)
                    images[page['page']] = f'media/{image_sha}.jpg'
                for q in parsed:
                    identity = hashlib.sha256(f'telegram-pdf:{item["sha256"]}:{q["number"]}'.encode()).hexdigest()
                    qid = 'private-usmle-' + identity[:24]
                    old = old_items.get(qid, {})
                    matched = match_existing_key(q, trusted) if not q['key'] else None
                    matched_fields = {}
                    if matched:
                        key, source = matched
                        q.update(key=key, reviewOnly=False, answerProvenance='Exact stem and option wording matched to a previously imported source key')
                        for option in q['options']: option['correct'] = option['id'] == key
                        matched_fields = {'step': source.get('step'), 'subject': source.get('subject'), 'discipline': source.get('discipline'), 'classification': 'Step/subject from an identical previously imported question; source classification may be inferred', 'sourceKeyReference': {'sourceId': source['sourceId'], 'questionId': source['id'], 'sourceName': source['sourceName']}}
                    questions[qid] = {**q, 'id': qid, 'identity': identity, 'sourceId': item['sha256'], 'sourceName': item['name'], 'block': block,
                        'subject': None, 'classification': 'Step and subject not stated in this screenshot source' if not labels['step'] else 'Step stated in the source filename; subject not assigned', **labels,
                        'sourceNote': f'Original question pages {q["questionPages"]}; worked explanation pages {q["answerPages"]}. Recognised locally from the original scan. No clinical answer was generated.',
                        'questionImages': [images[p] for p in q['questionPages']], 'answerImages': [images[p] for p in q['answerPages']],
                        'addedAt': old.get('addedAt', now), 'publicSharing': True, 'sourceGroup': 'GENODODI Telegram folder', 'originalAsset': item['asset'], **matched_fields}
                old = resources.get(item['sha256'], {})
                resources[item['sha256']] = {**old, 'id': item['sha256'], 'sha256': item['sha256'], 'name': item['name'], 'kind': 'pdf', 'asset': item['asset'], 'size': item['size'],
                    'addedAt': old.get('addedAt', now), **labels, 'questions': len(parsed), 'pageCount': len(pages), 'block': block, 'publicSharing': True, 'sourceGroup': 'GENODODI Telegram folder', 'questionBoundaryReview': boundary_review, 'expectedQuestions': expected}
                index.update(questions=list(questions.values()), resources=list(resources.values()), importedAt=now)
                save(index_path, index)
                print(json.dumps({'imported': item['name'], 'pages': len(pages), 'questions': len(parsed), 'confirmedKeys': sum(bool(q['key']) for q in parsed)}), flush=True)
        save(root / 'telegram-import-receipt.json', {'version': 1, 'complete': True, 'source': str(args.source), 'sourceHashes': [x['sha256'] for x in inventory], 'files': len(inventory),
            'questions': sum(1 for q in questions.values() if q.get('publicSharing')), 'finishedAt': datetime.datetime.now(datetime.timezone.utc).isoformat()})
    finally:
        lock.unlink()


if __name__ == '__main__': main()
