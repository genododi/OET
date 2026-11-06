#!/usr/bin/env python3
"""Check the published study snapshot without reading any learner data."""
import hashlib
import json
from pathlib import Path
import re


def verify(root, repository=None):
    repository = repository or Path(__file__).resolve().parents[1]
    catalog = json.loads((root / 'index.json').read_text())
    manifest = json.loads((root / 'page-manifest.json').read_text())
    assert catalog['version'] == manifest['version'] == 1
    resources = {row['sha256']: row for row in catalog['resources']}
    sources = {identity: row for row in catalog['resources'] for identity in [row.get('id', row['sha256']), row['sha256']]}
    assert len(resources) == len(catalog['resources']), 'Duplicate source hashes'
    ids = set()
    for sha, row in resources.items():
        assert re.fullmatch('[a-f0-9]{64}', sha) and row['publicSharing'] is True
        assert row['kind'] in ['pdf', 'deck', 'question-bank'] and type(row['size']) is int and row['size'] > 0
        if row['kind'] == 'pdf': assert re.fullmatch(r'https://github\.com/genododi/OET/releases/download/usmle-[A-Za-z0-9._-]+/' + sha + r'\.pdf', row['asset'])
        else: assert not row.get('asset'), 'Do not export a raw learner deck or unrelated local path'
    for q in catalog['questions']:
        assert q['id'] not in ids, 'Duplicate question IDs'
        ids.add(q['id'])
        assert q['publicSharing'] is True and q['sourceId'] in sources
        source = sources[q['sourceId']]
        assert not source.get('questionBoundaryReview'), 'Unreviewed source boundaries'
        if source['kind'] == 'pdf': assert q['originalAsset'] == source['asset']
        else: assert not q.get('originalAsset'), 'Question-bank data is not an original PDF'
        if q.get('sourceGroup') == 'GENODODI Telegram folder': assert not q.get('answerImages'), 'Full Telegram explanation scans belong in the original PDF'
        assert not any(field in q for field in ['note', 'answer', 'progress', 'path', 'profile', 'userData'])
        assert not any('/Users/' in str(value) or '/Volumes/' in str(value) for value in q.values())
        if not q['reviewOnly']:
            keys = [option['id'] for option in q['options'] if option.get('correct')]
            assert keys == [q['key']] and q['prompt'].strip() and len(q['options']) >= 2, 'Unverified scored question'
        for asset in q['questionImages'] + q['answerImages']:
            local = re.fullmatch(r'usmle-library/pages/([a-f0-9]{64}\.webp)', asset)
            remote = re.fullmatch(r'https://raw\.githubusercontent\.com/genododi/OET/main/shared-usmle-media/([a-f0-9]{64}\.webp)', asset)
            assert local or remote, 'Unexpected public image origin'
            name = (local or remote)[1]
            assert name in manifest['files']
            assert manifest['files'][name]['storage'] == ('repository' if remote else 'pages')
    for name, item in manifest['files'].items():
        assert re.fullmatch(r'[a-f0-9]{64}\.webp', name)
        assert item['storage'] in ['pages', 'repository']
        data = ((repository / 'shared-usmle-media' if item['storage'] == 'repository' else root / 'pages') / name).read_bytes()
        assert len(data) == item['bytes'] and hashlib.sha256(data).hexdigest() == item['sha256']
        assert data[:4] == b'RIFF' and data[8:12] == b'WEBP'
    return {'publicSources': len(resources), 'publicOriginalPdfs': sum(row['kind'] == 'pdf' for row in resources.values()), 'questions': len(ids), 'sourceImages': len(manifest['files'])}


if __name__ == '__main__':
    print(json.dumps(verify(Path(__file__).resolve().parents[1] / 'public/usmle-library')))
