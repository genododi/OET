"""Keep first-import dates and attachment-only provenance for the study library.

Existing files use their first catalog appearance in Git history, never file
modification times. Recognition updates do not make an old original new again.
No chat messages, group identifiers, credentials or absolute paths are published.
"""
import argparse
import datetime
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOGS = ['src/data/desktopMaterials.generated.json', 'public/imported-resources/catalog.json']
SHA = re.compile(r'^[a-f0-9]{64}$')


def read_files(path):
    return json.loads(path.read_text())['files'] if path.exists() else []


def first_imports(root):
    dates = {}
    history = subprocess.check_output(['git', 'log', '--reverse', '--format=%H\t%cI', '--', *CATALOGS], cwd=root, text=True)
    for line in history.splitlines():
        commit, date = line.split('\t')
        for name in CATALOGS:
            result = subprocess.run(['git', 'show', f'{commit}:{name}'], cwd=root, capture_output=True, text=True)
            if result.returncode:
                continue
            for file in json.loads(result.stdout)['files']:
                dates.setdefault(file['sha256'], date)
    return dates


def source_labels(paths):
    sources = set()
    for value in paths:
        parts = value.replace('\\', '/').split('/')
        lower = [p.casefold() for p in parts]
        if 'telegram inbox' in lower or 'telegram' in lower:
            # Only an explicit source directory establishes Telegram provenance.
            sources.add(('telegram', 'Telegram'))
        elif any('google drive' in p or p == 'google-drive' for p in lower):
            sources.add(('drive', 'Google Drive'))
        elif value:
            sources.add(('local', 'Local resources'))
    return sources


def build_entries(catalogs, history, previous, external, attachments, now):
    files = {}
    sources = {}
    for catalog in catalogs:
        for file in catalog:
            sha = file['sha256']
            if not SHA.fullmatch(sha) or file.get('duplicateOf'):
                continue
            files.setdefault(sha, file)  # Bundled ID wins, just as in My OET & AMR Files.
            sources.setdefault(sha, set()).update(source_labels([file.get('relativePath', '')]))
    for file in external:
        if file['sha256'] in files:
            sources[file['sha256']].update(source_labels(file.get('sourcePaths', [])))
    for sha, group in attachments:
        if sha in files:
            sources[sha].discard(('telegram', 'Telegram'))
            sources[sha].add(('telegram', f'Telegram · {group}'))
    old = {file['sha256']: file for file in previous}
    result = []
    for sha, file in files.items():
        # Preserve recorded arrivals; backfill older imports from Git history.
        date = old.get(sha, {}).get('addedAt') or history.get(sha) or now
        origins = sources[sha] or {('collection', 'Study collection')}
        if any(kind == 'telegram' and label != 'Telegram' for kind, label in origins):
            origins.discard(('telegram', 'Telegram'))
        result.append({key: file[key] for key in ['id', 'filename', 'sha256', 'format', 'bytes', 'collection', 'skills']} | {
            'addedAt': date,
            'sources': [{'kind': kind, 'label': label} for kind, label in sorted(origins)],
        })
    return sorted(result, key=lambda file: (-datetime.datetime.fromisoformat(file['addedAt']).timestamp(), file['filename'].casefold(), file['sha256']))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--library', default='/Volumes/GENODODI/OET/Mac App/offline-library')
    args = parser.parse_args()
    target = ROOT/'public/recent-materials.json'
    external = read_files(Path(args.library)/'catalog.json')
    attachments = []
    state = Path.home()/'Library/Application Support/OET Study/library-sync'
    for name in ['telegram-downloads.json', 'telegram-study-group-for-all-downloads.json']:
        path = state/name
        if path.exists():
            ledger = json.loads(path.read_text())
            # Bounded attachment inventories only; never copy chat history.
            group = ledger.get('groupName', 'Study group')
            attachments.extend((file['sha256'], group) for file in ledger.get('saved', []) if SHA.fullmatch(file.get('sha256', '')))
    previous = json.loads(target.read_text()).get('files', []) if target.exists() else []
    files = build_entries([read_files(ROOT/name) for name in CATALOGS], first_imports(ROOT), previous, external, attachments, datetime.datetime.now(datetime.timezone.utc).isoformat())
    temporary = target.with_suffix('.tmp')
    temporary.write_text(json.dumps({'version': 1, 'files': files}, ensure_ascii=False, separators=(',', ':'))+'\n')
    temporary.replace(target)
    print(json.dumps({'recentLibraryFiles': len(files), 'telegramFiles': sum(any(s['kind'] == 'telegram' for s in f['sources']) for f in files)}))


if __name__ == '__main__':
    main()
