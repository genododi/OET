#!/usr/bin/env python3
"""Publish only explicitly shared study records, never learner/profile data.

Large original PDFs live in checksummed GitHub Release assets. Recognised text
and source-page images are static web assets, available on the Mac offline too.
"""
import argparse
import concurrent.futures
import copy
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import time

ROOT = Path(__file__).resolve().parents[1]
REPO = 'genododi/OET'
TAG = 'usmle-telegram-library-v1'
MEDIA_URL = f'https://raw.githubusercontent.com/{REPO}/main/shared-usmle-media/'


def select_shared_sources(index, selected_source_ids):
    """Select study banks without ever touching profile or learner records."""
    selected = set(selected_source_ids)
    result = copy.deepcopy(index)
    for question in result['questions']:
        if question['sourceId'] in selected:
            question['publicSharing'] = True
            question.setdefault('sourceGroup', 'Imported USMLE question library')
    for resource in result['resources']:
        if resource.get('id') in selected or resource['sha256'] in selected:
            resource['publicSharing'] = True
            resource.setdefault('sourceGroup', 'Imported USMLE question library')
    return result


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for data in iter(lambda: stream.read(4 * 1024 * 1024), b''): h.update(data)
    return h.hexdigest()


def gh(*args, absent_ok=False):
    for attempt in range(4):
        result = subprocess.run(['gh', *args], cwd=ROOT, capture_output=True, text=True, timeout=1800)
        if result.returncode == 0: return result.stdout
        if absent_ok and ('not found' in result.stderr.lower() or 'HTTP 404' in result.stderr): return None
        if attempt == 3: raise RuntimeError(result.stderr[-500:])
        time.sleep(5 * (attempt + 1))


def build_snapshot(index, library, output, originals):
    resources = [dict(row) for row in index['resources'] if row.get('publicSharing') is True]
    sources = {identity: row for row in resources for identity in [row.get('id', row['sha256']), row['sha256']]}
    question_fields = {'id', 'identity', 'prompt', 'options', 'key', 'explanation', 'step', 'subject', 'discipline', 'classification', 'block', 'number', 'sourceNote', 'reviewOnly', 'productionYear', 'productionYears', 'yearEvidence', 'sourceId', 'sourceName', 'addedAt', 'questionImages', 'answerImages', 'publicSharing', 'sourceGroup', 'questionPages', 'answerPages', 'answerProvenance', 'unverifiedAnswerHint', 'sourceKeyReference', 'sourceOrigin', 'sourceLicense', 'sourceAttribution', 'sourceUrl', 'sourceRevision'}
    questions = [{key: value for key, value in q.items() if key in question_fields} for q in index['questions'] if q.get('publicSharing') is True and q['sourceId'] in sources]
    page_root = output / 'pages'; page_root.mkdir(parents=True, exist_ok=True)
    assets = {}
    for q in questions:
        source_resource = sources[q['sourceId']]
        if source_resource.get('kind') == 'pdf':
            q['originalAsset'] = f'https://github.com/{REPO}/releases/download/{TAG}/{source_resource["sha256"]}.pdf'
        for field in ['questionImages', 'answerImages']:
            if field == 'answerImages' and q.get('sourceGroup') == 'GENODODI Telegram folder':
                # Full explanation scans remain in the public original PDF and
                # the Mac's local cache. Do not duplicate every scroll capture
                # into the website bundle; keep its clinical question exhibits.
                q[field] = []
                continue
            images = []
            for asset in q[field]:
                if not re.fullmatch(r'media/[a-f0-9]{64}\.(?:jpg|png|webp)', asset): raise ValueError('Unexpected shared image identity')
                source = library / asset
                if digest(source) != source.stem: raise ValueError('Source-page image integrity mismatch')
                target = page_root / (source.stem + '.webp')
                if not target.exists():
                    from PIL import Image
                    with Image.open(source) as image: image.convert('RGB').save(target, 'WEBP', quality=88, method=5)
                in_repository = q.get('sourceGroup') != 'GENODODI Telegram folder'
                images.append(MEDIA_URL + target.name if in_repository else 'usmle-library/pages/' + target.name)
                in_repository = in_repository or assets.get(target.name, {}).get('storage') == 'repository'
                assets[target.name] = {'sha256': digest(target), 'bytes': target.stat().st_size, 'storage': 'repository' if in_repository else 'pages'}
            q[field] = images
    for q in questions:
        for field in ['questionImages', 'answerImages']:
            q[field] = [MEDIA_URL + Path(asset).name if assets[Path(asset).name]['storage'] == 'repository' else 'usmle-library/pages/' + Path(asset).name for asset in q[field]]
    public_resources = []
    for row in resources:
        sha = row['sha256']
        allowed = {'id', 'sha256', 'name', 'kind', 'addedAt', 'size', 'questions', 'productionYear', 'productionYears', 'yearEvidence', 'publicSharing', 'sourceGroup', 'block', 'pageCount', 'questionBoundaryReview', 'expectedQuestions', 'sourceOrigin', 'sourceLicense', 'sourceAttribution', 'sourceUrl', 'sourceRevision'}
        item = {key: value for key, value in row.items() if key in allowed}
        if row.get('kind') == 'pdf':
            original = library / 'originals' / (sha + '.pdf')
            if digest(original) != sha or original.stat().st_size != row['size']: raise ValueError('Original PDF integrity mismatch')
            item['asset'] = f'https://github.com/{REPO}/releases/download/{TAG}/{sha}.pdf'
            originals[sha] = original
        public_resources.append(item)
    snapshot = {'version': 1, 'importedAt': index['importedAt'], 'questions': questions, 'resources': public_resources,
                'warnings': ['Source keys, authorship and classification are retained. Incomplete or unkeyed cards remain review-only and are excluded from scored blocks. Full Telegram explanation scans are in their original PDFs; imported-deck explanation images are also displayed with their questions.']}
    (output / 'index.json').write_text(json.dumps(snapshot, ensure_ascii=False) + '\n')
    (output / 'page-manifest.json').write_text(json.dumps({'version': 1, 'files': assets}, ensure_ascii=False) + '\n')
    return snapshot


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--library', type=Path, required=True); parser.add_argument('--apply', action='store_true'); parser.add_argument('--share-imported-questions', action='store_true', help='Explicitly select every current imported question bank for public study sharing; never export learner data'); args = parser.parse_args()
    if (args.library / 'import.lock').exists(): raise SystemExit('Recognition/import is still running; do not publish a partial snapshot.')
    receipt = json.loads((args.library / 'telegram-import-receipt.json').read_text())
    if not receipt.get('complete'): raise SystemExit('The Telegram import is incomplete')
    index_path = args.library / 'index.json'; initial = index_path.read_bytes(); index = json.loads(initial)
    selection_path = args.library / 'public-sharing-selection.json'
    selected_sources = set(json.loads(selection_path.read_text()).get('sourceIds', [])) if selection_path.exists() else set()
    if args.share_imported_questions: selected_sources.update(q['sourceId'] for q in index['questions'])
    index = select_shared_sources(index, selected_sources)
    stage = ROOT / 'tmp/usmle-public-stage'; stage.mkdir(parents=True, exist_ok=True)
    originals = {}; snapshot = build_snapshot(index, args.library, stage, originals)
    print(json.dumps({'originals': len(originals), 'questions': len(snapshot['questions']), 'sourcePages': len(list((stage / 'pages').glob('*.webp')))}), flush=True)
    if not args.apply: return
    os.environ.setdefault('GODEBUG', 'netdns=cgo')
    release = gh('release', 'view', TAG, '--repo', REPO, '--json', 'databaseId,isDraft', absent_ok=True)
    if not release:
        notes = stage / 'release-notes.md'
        notes.write_text('USMLE study block PDFs supplied by the repository owner from the local GENODODI Telegram folder, shared publicly at the owner’s explicit request. Original authorship is retained. Checksummed files support the web collection and offline Mac app. No learner profiles, personal notes or credentials are included.\n')
        gh('release', 'create', TAG, '--repo', REPO, '--draft', '--title', 'USMLE Telegram study blocks', '--notes-file', str(notes))
        release = gh('release', 'view', TAG, '--repo', REPO, '--json', 'databaseId,isDraft')
    release_id = json.loads(release)['databaseId']
    def remote_assets():
        pages = json.loads(gh('api', '--paginate', '--slurp', f'repos/{REPO}/releases/{release_id}/assets?per_page=100'))
        return {asset['name']: asset for page in pages for asset in page}
    existing = remote_assets()
    def upload(item):
        sha, file = item; name = file.name; asset = existing.get(name)
        if asset:
            if asset['size'] != file.stat().st_size or asset.get('digest') != 'sha256:' + sha: raise ValueError('An existing release asset has a mismatched digest; preserve it for review')
            return
        # An interrupted response may still have uploaded successfully. Re-read
        # the digest before retrying; never clobber an existing remote original.
        for attempt in range(4):
            result = subprocess.run(['gh', 'release', 'upload', TAG, str(file), '--repo', REPO], cwd=ROOT, capture_output=True, text=True, timeout=1800)
            if result.returncode == 0: break
            recovered = remote_assets().get(name)
            if recovered:
                if recovered.get('digest') != 'sha256:' + sha or recovered['size'] != file.stat().st_size: raise ValueError('An interrupted upload left an unverified original; preserve it for review')
                break
            if attempt == 3: raise RuntimeError(result.stderr[-500:])
            time.sleep(5 * (attempt + 1))
        print('Uploaded original: ' + name, flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool: list(pool.map(upload, originals.items()))
    verified = remote_assets()
    for sha, original in originals.items():
        asset = verified.get(original.name)
        if not asset or asset['size'] != original.stat().st_size or asset.get('digest') != 'sha256:' + sha: raise ValueError('The public original was not verified by GitHub digest')
    if index_path.read_bytes() != initial: raise RuntimeError('The local question bank changed during publication; preserve the new imports and prepare a fresh snapshot.')
    notes = stage / 'release-notes.md'
    notes.write_text('Public source PDFs for the owner-authorized USMLE study library. Original authorship is retained. Selected imported question banks and their question/answer images are published separately in the repository, with source attribution and license metadata where supplied. Profiles, personal answers, revision notes, Anki learner history, models and credentials are not included.\n')
    gh('release', 'edit', TAG, '--repo', REPO, '--draft=false', '--title', 'USMLE study library originals', '--notes-file', str(notes))
    destination = ROOT / 'public/usmle-library'; destination.mkdir(exist_ok=True)
    manifest = json.loads((stage / 'page-manifest.json').read_text())['files']
    for name, asset in manifest.items():
        folder = ROOT / 'shared-usmle-media' if asset['storage'] == 'repository' else destination / 'pages'
        folder.mkdir(parents=True, exist_ok=True); target = folder / name; source = stage / 'pages' / name
        if target.exists():
            if digest(target) != asset['sha256']: raise ValueError('A published source image differs from the prepared snapshot; preserve it for review')
        else:
            try: os.link(source, target)
            except OSError: shutil.copyfile(source, target)
    for name in ['index.json', 'page-manifest.json']: shutil.copyfile(stage / name, destination / name)
    if selected_sources:
        if initial != (json.dumps(index, ensure_ascii=False) + '\n').encode():
            stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
            backup = args.library / 'import-backups' / f'before-public-sharing-{stamp}.json'; backup.parent.mkdir(exist_ok=True); backup.write_bytes(initial); backup.chmod(0o600)
            pending = index_path.with_suffix('.sharing.next.json'); pending.write_text(json.dumps(index, ensure_ascii=False) + '\n'); pending.chmod(0o600); pending.replace(index_path)
        pending_selection = selection_path.with_suffix('.next.json'); pending_selection.write_text(json.dumps({'version': 1, 'sourceIds': sorted(selected_sources), 'selectedAt': datetime.datetime.now(datetime.timezone.utc).isoformat()}) + '\n'); pending_selection.chmod(0o600); pending_selection.replace(selection_path)
    publication = {'version': 1, 'releaseTag': TAG, 'files': len(originals), 'questions': len(snapshot['questions']), 'originalSha256': sorted(originals), 'githubDigestVerified': True, 'sourcePages': len(json.loads((stage / 'page-manifest.json').read_text())['files'])}
    (args.library / 'telegram-publication-receipt.json').write_text(json.dumps(publication, indent=2) + '\n')
    print(json.dumps(publication), flush=True)


if __name__ == '__main__': main()
