import runpy
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
archives=runpy.run_path(str(ROOT/'expand-study-archives.py'))
imports=runpy.run_path(str(ROOT/'import-offline-library.py'))
sync=runpy.run_path(str(ROOT/'sync-study-library.py'))

class LibraryIntegrityTests(unittest.TestCase):
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
        self.assertFalse(generated(' M src/pages/MaterialsPage.tsx'))
        self.assertFalse(generated(' M public/material-practice-other/private.txt'))
        self.assertFalse(generated(' M public/material-practice/index.json\n M package.json'))

if __name__=='__main__':unittest.main()
