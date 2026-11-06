#!/usr/bin/env python3
"""Check the published study snapshot without reading any learner data."""
import hashlib
import json
from pathlib import Path
import re


def verify(root):
    catalog = json.loads((root / 'index.json').read_text())
    manifest = json.loads((root / 'page-manifest.json').read_text())
    assert catalog['version'] == manifest['version'] == 1
    resources = {row['sha256']: row for row in catalog['resources']}
    assert len(resources) == len(catalog['resources']), 'Duplicate source hashes'
    ids = set()
    for sha, row in resources.items():
        assert re.fullmatch('[a-f0-9]{64}', sha) and row['publicSharing'] is True
        assert re.fullmatch(r'https://github\.com/genododi/OET/releases/download/usmle-[A-Za-z0-9._-]+/' + sha + r'\.pdf', row['asset'])
        assert row['kind'] == 'pdf' and type(row['size']) is int and row['size'] > 0
    for q in catalog['questions']:
        assert q['id'] not in ids, 'Duplicate question IDs'
        ids.add(q['id'])
        assert q['publicSharing'] is True and q['sourceId'] in resources
        assert not resources[q['sourceId']].get('questionBoundaryReview'), 'Unreviewed source boundaries'
        assert q['originalAsset'] == resources[q['sourceId']]['asset']
        assert not q.get('answerImages'), 'Full explanation scans belong in the original PDF'
        assert not any(field in q for field in ['note', 'answer', 'progress', 'path', 'profile', 'userData'])
        assert not any('/Users/' in str(value) or '/Volumes/' in str(value) for value in q.values())
        if not q['reviewOnly']:
            keys = [option['id'] for option in q['options'] if option.get('correct')]
            assert keys == [q['key']] and q.get('questionPages'), 'Unverified scored question'
        for asset in q['questionImages']:
            assert re.fullmatch(r'usmle-library/pages/[a-f0-9]{64}\.webp', asset)
            assert Path(asset).name in manifest['files']
    for name, item in manifest['files'].items():
        assert re.fullmatch(r'[a-f0-9]{64}\.webp', name)
        data = (root / 'pages' / name).read_bytes()
        assert len(data) == item['bytes'] and hashlib.sha256(data).hexdigest() == item['sha256']
        assert data[:4] == b'RIFF' and data[8:12] == b'WEBP'
    return {'publicOriginals': len(resources), 'questions': len(ids), 'sourceImages': len(manifest['files'])}


if __name__ == '__main__':
    print(json.dumps(verify(Path(__file__).resolve().parents[1] / 'public/usmle-library')))
