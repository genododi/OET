import importlib.util
import io
import json
import hashlib
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('mirror_library', Path(__file__).parents[1] / 'mirror-offline-library.py')
module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)


class InternalLibraryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name); self.public = self.root / 'public'; self.source = self.root / 'external'; self.destination = self.root / 'Mac'
        (self.public / 'imported-resources/text').mkdir(parents=True)
        (self.source / 'files').mkdir(parents=True)
        self.data = b'Synthetic original recording'
        self.sha = hashlib.sha256(self.data).hexdigest()
        self.name = self.sha + '.ogg'
        self.row = {'sha256': self.sha, 'id': 'test', 'filename': 'Synthetic.ogg', 'format': 'ogg', 'bytes': len(self.data), 'textPath': f'imported-resources/text/{self.sha}.json', 'assetPath': f'https://github.com/genododi/OET/releases/download/test/{self.name}', 'skills': ['listening']}
        (self.source / 'files' / self.name).write_bytes(self.data)
        (self.public / 'imported-resources/catalog.json').write_text(json.dumps({'version': 1, 'files': [self.row]}))
        (self.public / self.row['textPath']).write_text(json.dumps({'sourceSha256': self.sha, 'text': 'Synthetic transcript'}))

    def tearDown(self):
        self.temp.cleanup()

    def mirror(self, downloader=None):
        return module.mirror_library(self.public, self.source, self.destination, downloader=downloader, reserve_bytes=0, progress=lambda *a, **k: None)

    def test_drive_copy_remains_complete_and_idempotent_when_external_source_is_removed(self):
        receipt = self.mirror()
        self.assertTrue(receipt['complete']); self.assertEqual(receipt['copiedFromDrive'], 1)
        original = self.source / 'files' / self.name
        original.unlink()
        def offline(url): raise AssertionError('A verified local copy must not need the network')
        repeated = self.mirror(offline)
        self.assertEqual(repeated['copiedFromDrive'], 0); self.assertEqual(repeated['downloadedFromGitHub'], 0)
        self.assertEqual((self.destination / 'files' / self.name).read_bytes(), self.data)
        local = json.loads((self.destination / 'catalog.json').read_text())
        self.assertEqual(local['files'][0]['assetPath'], 'offline-library/files/' + self.name)
        self.assertTrue((self.destination / 'text' / f'{self.sha}.json').exists())

    def test_missing_external_original_downloads_only_its_declared_release(self):
        (self.source / 'files' / self.name).unlink(); calls = []
        def download(url): calls.append(url); return io.BytesIO(self.data)
        receipt = self.mirror(download)
        self.assertEqual(calls, [self.row['assetPath']]); self.assertEqual(receipt['downloadedFromGitHub'], 1)

    def test_bad_transfer_never_publishes_an_unverified_local_catalog(self):
        (self.source / 'files' / self.name).unlink()
        with self.assertRaisesRegex(ValueError, 'checksum'):
            self.mirror(lambda url: io.BytesIO(b'wrong'))
        self.assertFalse((self.destination / 'files' / self.name).exists())
        self.assertFalse((self.destination / 'catalog.json').exists())
        self.assertFalse(list((self.destination / 'files').glob('*.part')))

    def test_repair_preserves_an_altered_local_copy_and_all_external_originals(self):
        self.mirror(); target = self.destination / 'files' / self.name; target.write_bytes(b'Altered local copy')
        self.mirror()
        self.assertEqual(target.read_bytes(), self.data)
        preserved = list((self.destination / 'quarantine').iterdir())
        self.assertEqual(len(preserved), 1); self.assertEqual(preserved[0].read_bytes(), b'Altered local copy')
        self.assertEqual((self.source / 'files' / self.name).read_bytes(), self.data)

    def test_unreleased_urls_and_mismatched_text_are_rejected_before_copying(self):
        bad = {**self.row, 'assetPath': 'https://example.com/private-bank.ogg'}
        with self.assertRaises(ValueError): module.validate_row(bad)
        (self.public / self.row['textPath']).write_text(json.dumps({'sourceSha256': 'wrong'}))
        with self.assertRaisesRegex(ValueError, 'text'):
            self.mirror()
        self.assertFalse((self.destination / 'catalog.json').exists())


if __name__ == '__main__': unittest.main()
