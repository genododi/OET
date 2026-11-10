import runpy
import json
import unittest
import tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
archives=runpy.run_path(str(ROOT/'expand-study-archives.py'))
imports=runpy.run_path(str(ROOT/'import-offline-library.py'))
sync=runpy.run_path(str(ROOT/'sync-study-library.py'))

class LibraryIntegrityTests(unittest.TestCase):
    def test_updates_follow_the_external_app_and_remember_its_location_when_disconnected(self):
        locate=sync['installed_app_path']
        with tempfile.TemporaryDirectory() as folder:
            home=Path(folder);external=home/'drive/OET Study.app'
            external.mkdir(parents=True)
            self.assertEqual(locate(home,{},external),external)
            receipt=home/'Library/Application Support/OET Study/installation.json'
            receipt.parent.mkdir(parents=True)
            receipt.write_text(json.dumps({'appPath':str(external)}))
            external.rmdir()
            self.assertEqual(locate(home,{},external),external)
            self.assertEqual(locate(home,{'OET_MAC_APP':'/chosen/OET Study.app'},external),Path('/chosen/OET Study.app'))

    def test_transcription_prefers_persistent_runtime_and_stays_offline(self):
        command=sync['transcription_command']
        with tempfile.TemporaryDirectory() as folder:
            runtime=Path(folder)
            fallback=command('/library',runtime)
            self.assertEqual(fallback[:3],['env','HF_HUB_OFFLINE=1','uv'])
            self.assertIn('--offline',fallback)
            interpreter=runtime/'venv/bin/python'
            interpreter.parent.mkdir(parents=True)
            interpreter.touch()
            installed=command('/library',runtime)
            self.assertEqual(installed[:3],['env','HF_HUB_OFFLINE=1',str(interpreter)])
            self.assertNotIn('uv',installed)
            self.assertIn('--upgrade-existing',installed)

    def test_updates_use_installed_tools_without_replacing_an_explicit_selection(self):
        configure=sync['configure_developer_tools']
        with tempfile.TemporaryDirectory() as folder:
            tools=Path(folder)
            (tools/'usr/bin').mkdir(parents=True)
            (tools/'usr/bin/git').touch()
            environment={}
            configure(environment,'darwin',tools)
            self.assertEqual(environment['DEVELOPER_DIR'],str(tools))
            environment={'DEVELOPER_DIR':'/selected/tools'}
            configure(environment,'darwin',tools)
            self.assertEqual(environment['DEVELOPER_DIR'],'/selected/tools')
            environment={}
            configure(environment,'linux',tools)
            self.assertEqual(environment,{})

    def test_archive_paths_cannot_escape_or_follow_links(self):
        safe=archives['safe_entry']
        self.assertTrue(safe({'XADFileName':'Test 1/questions.pdf','XADFileSize':100}))
        for name in ['../outside.pdf','/outside.pdf','Test/../../outside.pdf','Test/.private.pdf']:
            self.assertFalse(safe({'XADFileName':name,'XADFileSize':100}))
        self.assertFalse(safe({'XADFileName':'questions.pdf','XADFileSize':100,'XADIsLink':True}))
        self.assertFalse(safe({'XADFileName':'questions.pdf','XADFileSize':3*1024**3}))

    def test_repository_metadata_is_not_published_as_study_material(self):
        excluded=imports['excluded_source']
        for path in ['src/data/settings.json','Mac App/profiles/answers.json','README.md','Imported Archives/Test/.oet-archive-import.json']:
            self.assertTrue(excluded(path))
        for path in ['Telegram Inbox/reading.pdf','AMR/clinical notes.docx','Notes/lesson.html']:
            self.assertFalse(excluded(path))

    def test_automatic_commit_cannot_include_unrelated_edits(self):
        generated=sync['generated_only']
        self.assertTrue(generated(' M public/material-practice/index.json\n?? public/imported-resources/text/new.json'))
        self.assertTrue(generated(' M public/jahshan-transcripts/exact-track.json\n M public/benchmark/transcripts/listening-1.json'))
        self.assertFalse(generated(' M src/pages/MaterialsPage.tsx'))
        self.assertFalse(generated(' M public/material-practice-other/private.txt'))
        self.assertFalse(generated(' M public/material-practice/index.json\n M package.json'))

if __name__=='__main__':unittest.main()
