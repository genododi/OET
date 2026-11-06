import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]


def module(name):
    spec = importlib.util.spec_from_file_location(name.replace('-', '_'), ROOT / 'scripts' / (name + '.py'))
    value = importlib.util.module_from_spec(spec); spec.loader.exec_module(value)
    return value


blocks = module('import-usmle-blocks')
mirror = module('mirror-usmle-library')
publisher = module('publish-usmle-library')


def page(number, ordinal, identifier, body):
    rows = [{'text': ordinal, 'x': .08, 'y': .96}, {'text': 'Question Id: ' + identifier, 'x': .08, 'y': .92}]
    rows += [{'text': text, 'x': .08, 'y': .82 - i * .04} for i, text in enumerate(body)]
    return {'page': number, 'rows': rows}


class SharedUsmle(unittest.TestCase):
    def test_export_is_explicitly_opted_in_and_never_serializes_learner_fields(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); library = root / 'library'; stage = root / 'stage'
            (library / 'originals').mkdir(parents=True)
            data = b'%PDF-1.4\nSynthetic block\n%%EOF'; import hashlib
            sha = hashlib.sha256(data).hexdigest(); (library / 'originals' / (sha + '.pdf')).write_bytes(data)
            resource = {'sha256': sha, 'publicSharing': True, 'size': len(data), 'path': '/Users/private/original.pdf'}
            q = {'id': 'shared', 'sourceId': sha, 'publicSharing': True, 'questionImages': [], 'answerImages': ['media/private.jpg'], 'note': 'private learner note', 'profile': 'Private profile'}
            snapshot = publisher.build_snapshot({'importedAt': None, 'resources': [resource, {'publicSharing': False}], 'questions': [q, {**q, 'id': 'private', 'publicSharing': False}]}, library, stage, {})
            self.assertEqual(len(snapshot['questions']), 1); self.assertEqual(len(snapshot['resources']), 1)
            self.assertNotIn('note', snapshot['questions'][0]); self.assertNotIn('profile', snapshot['questions'][0]); self.assertNotIn('path', snapshot['resources'][0])
            self.assertEqual(snapshot['questions'][0]['answerImages'], [])

    def test_phone_overlay_and_explanation_choice_exclusion_do_not_create_a_scored_key(self):
        pages = [page(1, '9:30 AM phone overlay', '1001', ['A synthetic question. Which option?', 'A. Synthetic one', 'B. Synthetic two', 'Submit']),
                 page(2, '1 of 2', '1001', ['Original explanation.', '(Choice A) Incorrect synthetic option.', 'Educational objective: Synthetic two.']),
                 page(3, '2 of 2', '1002', ['A second synthetic question?', 'A. New one', 'B. New two', 'Submit']),
                 page(4, '2 of 2', '1002', ['Correct answer: A', 'Synthetic explanation.'])]
        result = blocks.parse_pages(pages)
        self.assertEqual([q['number'] for q in result], [1, 2])
        self.assertEqual(result[0]['questionPages'], [1]); self.assertEqual(result[0]['answerPages'], [2])
        self.assertIsNone(result[0]['key']); self.assertTrue(result[0]['reviewOnly']); self.assertEqual(result[0]['unverifiedAnswerHint'], 'B')
        self.assertEqual(result[1]['key'], 'A'); self.assertFalse(result[1]['reviewOnly'])

    def test_missing_question_screenshot_never_reveals_an_answer_as_the_question(self):
        result = blocks.parse_pages([page(1, '1 of 1', '1001', ['Worked explanation table', 'Correct answer: A'])])[0]
        self.assertEqual(result['questionPages'], []); self.assertEqual(result['answerPages'], [1]); self.assertTrue(result['reviewOnly'])
        self.assertNotIn('Worked explanation table', result['prompt'])

    def test_reusing_a_source_key_requires_identical_clinical_numbers_and_option_labels(self):
        prompt = 'A synthetic question with 1.60 units. ' * 5
        old = {'id': 'old', 'sourceId': 'bank', 'sourceName': 'Saved source', 'prompt': prompt, 'options': [{'id': 'A', 'label': 'One'}, {'id': 'B', 'label': 'Two'}], 'key': 'B'}
        q = {'prompt': prompt, 'options': [{'id': 'A', 'label': 'Two'}, {'id': 'B', 'label': 'One'}]}
        self.assertEqual(blocks.match_existing_key(q, [old])[0], 'A')
        self.assertIsNone(blocks.match_existing_key({**q, 'prompt': prompt.replace('1.60', '160')}, [old]))

    def test_provider_paths_and_filename_years_are_supported_without_inventing_a_year(self):
        source = Path('/source')
        self.assertTrue(blocks.eligible_pdf(source / 'NBME/31.pdf', source)); self.assertTrue(blocks.eligible_pdf(source / 'AMBOSS Step 1 2026.pdf', source))
        self.assertFalse(blocks.eligible_pdf(source / 'Answers All tests PDF.pdf', source)); self.assertFalse(blocks.eligible_pdf(source / 'OET listening.pdf', source))
        self.assertFalse(blocks.eligible_pdf(source / '._AMBOSS 2026.pdf', source)); self.assertFalse(blocks.eligible_pdf(source / '.metadata/UWorld.pdf', source))
        self.assertEqual(blocks.source_labels('AMBOSS Step 1 2026.pdf')['productionYear'], 2026)
        self.assertIsNone(blocks.source_labels('Block 90.pdf')['productionYear'])

    def test_public_original_restore_and_corruption_check_preserve_local_question_data(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); public = root / 'public'; library = root / 'library'; public.mkdir(); library.mkdir()
            data = b'%PDF-1.4\nSynthetic source\n%%EOF'; import hashlib
            sha = hashlib.sha256(data).hexdigest()
            catalog = {'resources': [{'sha256': sha, 'size': len(data), 'publicSharing': True, 'asset': f'https://github.com/genododi/OET/releases/download/usmle-test/{sha}.pdf'}], 'questions': []}
            (public / 'index.json').write_text(json.dumps(catalog)); (library / 'index.json').write_text('saved local bank')
            with patch.object(mirror.urllib.request, 'urlopen', return_value=io.BytesIO(data)):
                self.assertEqual(mirror.mirror(public, library)['state'], 'ready')
            self.assertEqual((library / 'index.json').read_text(), 'saved local bank')
            (library / 'originals' / (sha + '.pdf')).write_bytes(b'x' * len(data))
            with self.assertRaisesRegex(ValueError, 'original changed'): mirror.mirror(public, library, True)


if __name__ == '__main__': unittest.main()
