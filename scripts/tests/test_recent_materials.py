import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('recent', Path(__file__).parents[1]/'build-recent-materials.py')
recent = importlib.util.module_from_spec(spec)
spec.loader.exec_module(recent)


class RecentMaterialsTests(unittest.TestCase):
    def file(self, sha='a'*64, **changes):
        return dict(id='file-one', filename='Case.pdf', sha256=sha, format='pdf', bytes=100, collection='OET', skills=['writing'], relativePath='GENODODI OET/Telegram Inbox/Case.pdf', **changes)

    def test_first_import_survives_recognition_and_duplicate_sources(self):
        file = self.file()
        entries = recent.build_entries([[file], [dict(file, id='duplicate')]], {file['sha256']: '2026-10-20T00:00:00+00:00'}, [],
            [dict(file, sourcePaths=['Local notes/Case.pdf', 'Telegram Inbox/Case.pdf'])], [(file['sha256'], 'Authorized study group')], '2026-10-28T00:00:00+00:00')
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0]['id'], 'file-one')
        self.assertEqual(entries[0]['addedAt'], '2026-10-20T00:00:00+00:00')
        self.assertEqual(entries[0]['sources'], [{'kind': 'local', 'label': 'Local resources'}, {'kind': 'telegram', 'label': 'Telegram · Authorized study group'}])
        self.assertNotIn('sourcePaths', entries[0])
        self.assertNotIn('relativePath', entries[0])

    def test_new_bytes_sort_first_and_pending_date_is_stable(self):
        old = self.file()
        new = self.file('b'*64)
        entries = recent.build_entries([[old, new]], {old['sha256']: '2026-10-20T00:00:00+00:00'}, [], [], [], '2026-10-28T00:00:00+00:00')
        repeated = recent.build_entries([[old, new]], {old['sha256']: '2026-10-20T00:00:00+00:00', new['sha256']: '2026-10-28T01:00:00+00:00'}, entries, [], [], '2026-10-29T00:00:00+00:00')
        self.assertEqual(entries, repeated)
        self.assertEqual(entries[0]['sha256'], new['sha256'])

    def test_multiple_sources_keep_generic_telegram_without_a_ledger(self):
        file = self.file()
        entries = recent.build_entries([[file]], {}, [], [dict(file, sourcePaths=['Case.pdf'])], [], '2026-10-28T00:00:00+00:00')
        self.assertIn({'kind': 'telegram', 'label': 'Telegram'}, entries[0]['sources'])


if __name__ == '__main__':
    unittest.main()
