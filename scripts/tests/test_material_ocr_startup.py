import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS))
spec = importlib.util.spec_from_file_location('material_ocr', SCRIPTS / 'recognize-material-pages.py')
ocr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ocr)


class OcrStartupTests(unittest.TestCase):
    def test_fresh_checkout_creates_temporary_directory(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            library = root / 'library'
            for catalog in [root / 'src/data/desktopMaterials.generated.json',
                            root / 'public/imported-resources/catalog.json', library / 'catalog.json']:
                catalog.parent.mkdir(parents=True, exist_ok=True)
                catalog.write_text(json.dumps({'files': []}))
            self.assertFalse((root / 'tmp').exists())
            with patch.object(ocr, 'ROOT', root), patch.object(ocr.shutil, 'which', return_value='/unused/tesseract'), \
                    patch.object(sys, 'argv', ['recognize-material-pages.py', '--library', str(library), '--limit', '0']):
                ocr.main()
            self.assertEqual(json.loads((root / 'tmp/material-ocr-failures.json').read_text()), [])
            self.assertEqual(list((root / 'tmp').glob('oet-ocr-sources-*')), [])
