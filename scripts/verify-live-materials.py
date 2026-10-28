"""Release-only verification: the deployed practice data must match local source."""
import hashlib
import json
from pathlib import Path
import subprocess
import time

ROOT=Path(__file__).resolve().parents[1]

def main():
    commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
    targets=['recent-materials.json','material-practice/index.json','imported-resources/catalog.json']
    index=json.loads((ROOT/'public/material-practice/index.json').read_text())
    targets.append(next(iter(index['files'].values()))['sheetPath'])
    transcripts=sorted((ROOT/'public/material-practice/transcripts').glob('*.json'))
    if transcripts:targets.append(str(transcripts[0].relative_to(ROOT/'public')))
    for attempt in range(6):
        try:
            for target in targets:
                live=subprocess.check_output(['curl','--fail','--silent','--show-error','--location','--max-time','30',f'https://genododi.github.io/OET/{target}?release={commit}'],timeout=40)
                expected=(ROOT/'public'/target).read_bytes()
                if hashlib.sha256(live).digest()!=hashlib.sha256(expected).digest():raise ValueError('GitHub Pages still serves a different '+target)
            print(json.dumps({'githubPagesMatches':commit,'verifiedFiles':len(targets)}));return
        except (ValueError,subprocess.SubprocessError):
            if attempt==5:raise
            time.sleep(10)

if __name__=='__main__':main()
