#!/usr/bin/env python3
"""Import a pinned, individually licensed Step 1 corpus into the private Mac bank.

No Telegram credentials, paid banks, model calls or public question uploads.
Downloads and original media are retained; only the private index is replaced.
"""
import argparse
import concurrent.futures
import datetime
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import unicodedata
import urllib.request
import xml.etree.ElementTree as ET

REPO = 'todd866/cohort'
REVISION = '839dde632f515ffa27423f0c9868dae8a77c408e'
MANIFEST_SHA = '37d0df55d04f6feb0cefd3164f43ad232ae52b269bbfea6dd00db2b408ae3a11'
BASE = 'open-content/usmle/step1/'
DOMAINS = {
    'biochem': ('Biochemistry', 'biochemistry'), 'biochemistry': ('Biochemistry', 'biochemistry'),
    'genetics': ('Genetics', 'biochemistry'), 'pharmacology': ('Pharmacology', 'pharmacology'),
    'microbiology': ('Microbiology', 'microbiology'), 'cardiovascular': ('Cardiology', 'cardiology'),
    'renal': ('Nephrology', 'nephrology'), 'endocrine': ('Endocrinology', 'endocrinology'),
    'hematology': ('Hematology', 'hematology'), 'respiratory': ('Pulmonology', 'pulmonology'),
    'gastrointestinal': ('Gastroenterology', 'gastroenterology'),
    'musculoskeletal': ('Musculoskeletal', 'musculoskeletal'),
    'neuroscience': ('Neurology', 'neurology'), 'neuro': ('Neurology', 'neurology'),
    'reproductive': ('Reproductive medicine', 'obgyn'), 'immunology': ('Immunology', 'immunology'),
    'epidemiology': ('Epidemiology', 'biostatistics'), 'biostats': ('Biostatistics', 'biostatistics'),
    'psych': ('Psychiatry', 'psychiatry'), 'physiology': ('Physiology', 'physiology'),
}
sha = lambda value: hashlib.sha256(value).hexdigest()


def content_identity(prompt, options):
    def normal(text):
        return ''.join(c for c in unicodedata.normalize('NFKC', text).casefold() if c.isalnum())
    return sha(json.dumps([normal(prompt), sorted(normal(o['label']) for o in options)], ensure_ascii=False).encode())


def download(cache, name, expected=None):
    if not re.fullmatch(r'[A-Za-z0-9_./-]+', name) or '..' in name.split('/'):
        raise ValueError('Unsafe source path')
    target = cache / name
    if not target.exists():
        request = urllib.request.Request(f'https://raw.githubusercontent.com/{REPO}/{REVISION}/{name}', headers={'User-Agent': 'OET-private-study-import'})
        with urllib.request.urlopen(request, timeout=40) as response:
            data = response.read(8_000_001)
        if len(data) > 8_000_000:
            raise ValueError('Oversized source file')
        if expected and sha(data) != expected:
            raise ValueError(f'Source checksum mismatch: {name}')
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    data = target.read_bytes()
    if expected and sha(data) != expected:
        raise ValueError(f'Cached source checksum mismatch: {name}')
    return data


def parse_question(item, number, sources):
    envelope = item.get('publicUsmle', {})
    rights = envelope.get('itemText', {})
    if rights.get('licence') != 'CC-BY-4.0' or not rights.get('attribution'):
        raise ValueError('Question lacks an explicit compatible content licence and attribution')
    if envelope.get('origin') not in ('generated', 'authored'):
        raise ValueError('Question origin is unknown')
    if item.get('rotation') != 'usmle-step1-open' or 'usmle/step1' not in item.get('moduleNodes', []):
        raise ValueError('Source does not explicitly classify this question as Step 1')
    prompt = item.get('stem', '').strip()
    options = item.get('options', [])
    if not prompt or not 2 <= len(options) <= 10:
        raise ValueError('Incomplete question')
    if [o.get('label') for o in options] != list('ABCDEFGHIJ'[:len(options)]):
        raise ValueError('Ambiguous option labels')
    if any(not o.get('text', '').strip() or type(o.get('isCorrect')) is not bool for o in options):
        raise ValueError('Missing option text or explicit answer flag')
    correct = [o for o in options if o['isCorrect']]
    if len(correct) != 1:
        raise ValueError('Exactly one source answer is required')
    evidence = envelope.get('evidence', {})
    source = sources.get(evidence.get('sourceId'))
    if not source or not any(p['id'] == evidence.get('passageId') for p in source.get('passages', [])):
        raise ValueError('Source citation cannot be resolved')
    url = source.get('canonicalUrl', '')
    if not url.startswith('https://'):
        raise ValueError('Citation lacks a valid HTTPS source URL')
    domain = next((node.rsplit('/', 1)[-1] for node in item['moduleNodes'] if node.startswith('usmle/step1/')), '')
    subject, discipline = DOMAINS.get(domain, (None, None))
    identity = sha(('cohort-step1:' + item['id']).encode())
    explanation = '\n\n'.join(filter(None, [item.get('context', '').strip(), *[f"{o['label']}. {o['text']}\n{o.get('explanation', '').strip()}" for o in options]]))
    return {
        'id': 'private-usmle-' + identity[:24], 'identity': identity,
        'prompt': prompt, 'options': [{'id': o['label'], 'label': o['text'], 'correct': o['isCorrect']} for o in options],
        'key': correct[0]['label'], 'explanation': explanation, 'step': 'step1',
        'subject': subject, 'discipline': discipline, 'classification': 'Source-labelled Step 1 practice; not official exam items',
        'number': number, 'block': (number - 1) // 20 + 1, 'reviewOnly': False,
        'productionYear': None, 'productionYears': [], 'yearEvidence': [],
        'sourceId': 'cohort-open-step1', 'sourceName': 'Cohort · Open Step 1 practice',
        'sourceUrl': f'https://github.com/{REPO}/tree/{REVISION}',
        'sourceLicense': rights['licence'], 'sourceAttribution': rights['attribution'],
        'sourceOrigin': envelope['origin'], 'sourceRevision': REVISION,
        'sourceNote': f"Source citation: {source['title']}\n{url}\nQuestion ID: {item['id']}\nAdaptation: reformatted for offline practice; original answer and option explanations retained. Production year is not stated.",
        'questionImages': [], 'answerImages': [],
    }


def render_media(item, cache, root, manifest):
    url = item.get('imageUrl')
    if not url:
        return []
    if not re.fullmatch(r'/figures/usmle/step1/[A-Za-z0-9_-]+\.svg', url):
        raise ValueError('Unsupported or external clinical exhibit')
    name = BASE + 'media/' + url.rsplit('/', 1)[-1]
    envelope = item['publicUsmle'].get('media', {})
    licence = envelope.get('licence', {}).get('id')
    if licence not in ('cc-by-4.0', 'cc-by-sa-4.0') or not envelope.get('attribution'):
        raise ValueError('Clinical exhibit lacks compatible licence/attribution')
    data = download(cache, name, manifest[name]['sha256'])
    if envelope.get('contentHash') != 'sha256:' + sha(data):
        raise ValueError('Clinical exhibit differs from the question provenance')
    tree = ET.fromstring(data)
    for node in tree.iter():
        if node.tag.rsplit('}', 1)[-1].lower() in ('script', 'foreignobject'):
            raise ValueError('Active content in clinical exhibit')
        if any(k.lower().startswith('on') or (k.rsplit('}', 1)[-1] == 'href' and not v.startswith('#')) for k, v in node.attrib.items()):
            raise ValueError('External or active reference in clinical exhibit')
    with tempfile.TemporaryDirectory(prefix='step1-exhibit-') as temp:
        output = Path(temp) / 'exhibit.png'
        subprocess.run(['rsvg-convert', '-w', '1600', '-o', str(output), str(cache / name)], check=True, capture_output=True, timeout=30)
        image = output.read_bytes()
    relative = 'media/' + sha(image) + '.png'
    target = root / relative
    target.parent.mkdir(exist_ok=True)
    if not target.exists():
        target.write_bytes(image); target.chmod(0o600)
    return [relative]


def merge_questions(previous, incoming):
    questions = {q['id']: q for q in previous}
    fingerprints = {content_identity(q['prompt'], q['options']): q for q in previous}
    added = duplicates = 0
    for question in incoming:
        fingerprint = content_identity(question['prompt'], question['options'])
        existing = fingerprints.get(fingerprint)
        if existing:
            old_answer = next((o['label'] for o in existing['options'] if o['id'] == existing['key']), None)
            new_answer = next(o['label'] for o in question['options'] if o['correct'])
            if old_answer != new_answer:
                raise ValueError('Conflicting source answers for duplicate question; index preserved')
            if existing['id'] != question['id']:
                duplicates += 1
                continue
        old = questions.get(question['id'])
        question['addedAt'] = old['addedAt'] if old else datetime.datetime.now(datetime.timezone.utc).isoformat()
        questions[question['id']] = question
        fingerprints[fingerprint] = question
        if not old:
            added += 1
    return list(questions.values()), added, duplicates


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--library', type=Path, default=Path.home() / 'Library/Application Support/OET Study/usmle-library')
    parser.add_argument('--cache', type=Path, required=True)
    args = parser.parse_args(); root = args.library; cache = args.cache
    state = Path.home() / 'Library/Application Support/OET Study/library-sync'
    # Caller must own the project's exclusive release lock as well.
    marker = json.loads((state / 'interactive-upgrade-lock.json').read_text())
    os.kill(marker['pid'], 0)
    if marker.get('purpose') != 'Expand Step 1 from licensed public question sources':
        raise ValueError('Another maintenance task owns the release lock')
    with (state / 'sync.lock').open('a') as probe:
        try:
            fcntl.flock(probe, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            pass
        else:
            raise ValueError('Release lock holder is no longer active')
    root.mkdir(parents=True, exist_ok=True)
    private_lock = root / 'import.lock'
    fd = os.open(private_lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    os.write(fd, json.dumps({'pid': os.getpid()}).encode()); os.close(fd)
    try:
        manifest = json.loads(download(cache, 'FOSS-DISTRIBUTION-MANIFEST.json', MANIFEST_SHA))
        files = {f['path']: f for f in manifest['files']}
        for name in ['LICENSE-CONTENT.md', BASE + 'sources.json']:
            download(cache, name, files[name]['sha256'])
        paths = sorted(p for p in files if p.startswith(BASE + 'questions/') and p.endswith('.json'))
        if len(paths) != 556:
            raise ValueError('Pinned corpus inventory changed')
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
            raw = list(pool.map(lambda name: download(cache, name, files[name]['sha256']), paths))
        sources = {s['id']: s for s in json.loads((cache / (BASE + 'sources.json')).read_text())['sources']}
        incoming = []
        for number, data in enumerate(raw, 1):
            item = json.loads(data); question = parse_question(item, number, sources)
            question['questionImages'] = render_media(item, cache, root, files)
            if question['questionImages']:
                media = item['publicUsmle']['media']
                question['sourceNote'] += f"\nClinical exhibit: {media['attribution']} · {media['licence']['id']}. SVG converted to PNG; original retained."
            incoming.append(question)
        index = json.loads((root / 'index.json').read_text())
        questions, added, duplicates = merge_questions(index['questions'], incoming)
        current = datetime.datetime.now(datetime.timezone.utc).isoformat()
        resource = {'id': 'cohort-open-step1', 'sha256': MANIFEST_SHA, 'name': 'Cohort · Open Step 1 practice', 'kind': 'question-bank', 'size': sum(map(len, raw)), 'questions': len(incoming), 'addedAt': current, 'productionYear': None, 'sourceUrl': f'https://github.com/{REPO}/tree/{REVISION}', 'sourceLicense': 'CC-BY-4.0', 'sourceAttribution': 'MD3 contributors', 'sourceOrigin': 'generated', 'sourceRevision': REVISION}
        resources = [r for r in index['resources'] if r['id'] != resource['id']]
        old_resource = next((r for r in index['resources'] if r['id'] == resource['id']), None)
        if old_resource:
            resource['addedAt'] = old_resource['addedAt']
        resources.append(resource)
        report = {'importedAt': current, 'source': resource, 'added': added, 'duplicatesSkipped': duplicates, 'questionsValidated': len(incoming), 'clinicalExhibits': sum(bool(q['questionImages']) for q in incoming), 'totalQuestions': len(questions), 'step1Questions': sum(q['step'] == 'step1' for q in questions), 'privateOnly': True, 'telegramCoverageVerified': False}
        # Preserve a content-addressed copy of the prior index; never overwrite backups.
        original = (root / 'index.json').read_bytes(); backup = root / 'backups' / (sha(original) + '.json')
        backup.parent.mkdir(exist_ok=True)
        if not backup.exists():
            backup.write_bytes(original); backup.chmod(0o600)
        pending = root / 'index.next.json'
        pending.write_text(json.dumps({**index, 'questions': questions, 'resources': resources, 'importedAt': current}, ensure_ascii=False)); pending.chmod(0o600)
        pending.replace(root / 'index.json')
        (cache / 'import-report.json').write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps(report, indent=2))
    finally:
        private_lock.unlink()


if __name__ == '__main__':
    main()
