"""Check, import, publish and rebuild without touching a learner's running session.

An exclusive local lock prevents overlapping runs. Only generated study data is
committed; an unclean checkout or diverging GitHub source requires review.
"""
import argparse
import datetime
import fcntl
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import signal

ROOT=Path(__file__).resolve().parents[1]
NODE_RUNTIME=Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin'
os.environ['PATH']=os.pathsep.join([str(NODE_RUNTIME),'/opt/homebrew/bin',str(Path.home()/'.local/bin'),os.environ.get('PATH','')])
GENERATED=['public/imported-resources','public/material-practice','src/data/desktopMaterials.generated.json','public/supplied-materials/text']

def run(command,timeout=21600,capture=False):
    process=subprocess.Popen(command,cwd=ROOT,text=True,stdout=subprocess.PIPE if capture else None,start_new_session=True)
    try:output,_=process.communicate(timeout=timeout)
    except BaseException:
        try:os.killpg(process.pid,signal.SIGTERM)
        except ProcessLookupError:pass
        process.wait();raise
    if process.returncode:raise subprocess.CalledProcessError(process.returncode,command,output)
    return output.rstrip('\n') if capture else None

def generated_only(status):
    return all(any(line[3:]==allowed or line[3:].startswith(allowed+'/') for allowed in GENERATED) for line in status.splitlines())

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--source',default='/Volumes/GENODODI/OET');parser.add_argument('--library',default='/Volumes/GENODODI/OET/Mac App/offline-library');parser.add_argument('--check-only',action='store_true');args=parser.parse_args()
    state_root=Path.home()/'Library/Application Support/OET Study/library-sync';state_root.mkdir(parents=True,exist_ok=True)
    with (state_root/'sync.lock').open('w') as lock:
        try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError:print('A study-library update is already running.');return
        state={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':args.source,'status':'checking'}
        def save(**changes):
            state.update(changes);temporary=state_root/'status.tmp';temporary.write_text(json.dumps(state,ensure_ascii=False,indent=2)+'\n');temporary.replace(state_root/'status.json')
        try:
            if not Path(args.source).is_dir():save(status='waiting-for-drive');print('GENODODI is disconnected; existing study data is unchanged.');return
            if run(['git','branch','--show-current'],capture=True)!='main':raise ValueError('Automatic publication requires the main branch; other branch work is preserved.')
            status=run(['git','status','--porcelain'],capture=True)
            if run(['git','diff','--cached','--name-only'],capture=True):raise ValueError('The Git index contains staged work; automatic sync will not commit it.')
            if status and not generated_only(status):save(status='waiting-for-source-review');raise ValueError('The project has outstanding source changes. Finish or preserve them before automatic publication.')
            head=run(['git','rev-parse','HEAD'],capture=True)
            remote=run(['git','ls-remote','--exit-code','origin','refs/heads/main'],capture=True,timeout=60).split()[0]
            if head!=remote:
                if status:raise ValueError('GitHub source changed while generated updates are pending; review is needed.')
                run(['git','fetch','origin','main'],timeout=300);run(['git','merge','--ff-only','origin/main']);head=run(['git','rev-parse','HEAD'],capture=True)
            save(status='source-checked',gitCommit=head)
            if args.check_only:
                run(['npm','run','desktop:check'],timeout=120);save(status='verified');return
            run([sys.executable,'scripts/import-offline-library.py','--source',args.source,'--output',args.library])
            run([sys.executable,'scripts/expand-study-archives.py','--library',args.library,'--destination',str(Path(args.source)/'Imported Archives')])
            run([sys.executable,'scripts/import-offline-library.py','--source',args.source,'--output',args.library])
            save(status='recognising-source-pages')
            run([sys.executable,'scripts/recognize-material-pages.py','--library',args.library,'--limit','250'])
            save(status='transcribing-recordings')
            run(['uv','run','--offline','--with','mlx-whisper','python','scripts/transcribe-materials.py','--library',args.library,'--limit','10'])
            save(status='publishing-originals')
            run([sys.executable,'scripts/publish-offline-library.py','--library',args.library,'--workers','1','--apply'])
            run([sys.executable,'scripts/build-material-practice.py','--library',args.library])
            run(['node','scripts/verify-material-practice.mjs'])
            run(['node','scripts/verify-imported-resources.mjs'])
            changed=run(['git','status','--porcelain'],capture=True)
            # Refuse unrelated concurrent edits even when this run started clean.
            for line in changed.splitlines():
                path=line[3:]
                if not any(path==allowed or path.startswith(allowed+'/') for allowed in GENERATED):raise ValueError('Other source work appeared during sync; generated files were preserved without committing it.')
            if changed:
                run(['npm','run','test:unit','--','--maxWorkers=2'],timeout=600)
                run(['git','add','--',*GENERATED]);run(['git','commit','-m','Update supplied OET practice resources and source-matched transcripts']);run(['git','push','origin','main'],timeout=300)
            current=run(['git','rev-parse','HEAD'],capture=True)
            try:installed=json.loads((Path.home()/'Applications/OET Study.app/Contents/Resources/build-info.json').read_text())
            except (OSError,ValueError):installed={}
            rebuild=bool(changed) or installed.get('gitCommit')!=current
            if rebuild:
                save(status='building-mac-app',gitCommit=current);run(['npm','run','desktop:build'])
                run(['env','OET_SMOKE_EXECUTABLE='+str(Path.home()/'Applications/OET Study.app/Contents/MacOS/OET Study'),'OET_SMOKE_LIBRARY=1','node','scripts/verify-macos-app.mjs'])
            run(['npm','run','desktop:check'],timeout=120)
            # The workflow remains responsible for publishing only verified web assets.
            runs=[]
            for attempt in range(4):
                runs=json.loads(run(['gh','run','list','--workflow','deploy.yml','--commit',current,'--limit','1','--json','databaseId,status,conclusion'],capture=True,timeout=60))
                if runs:break
                time.sleep(10)
            if not runs:raise ValueError('No GitHub Pages verification run was found for the published commit.')
            run(['gh','run','watch',str(runs[0]['databaseId']),'--exit-status','--interval','30'],timeout=7200)
            run([sys.executable,'scripts/verify-live-materials.py'],timeout=600)
            save(status='complete',gitCommit=current,updated=bool(changed),reopenApp=rebuild);print(json.dumps(state),flush=True)
        except Exception as error:
            save(status='needs-attention',message=str(error));raise

if __name__=='__main__':main()
