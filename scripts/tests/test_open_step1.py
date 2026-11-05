import copy
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('open_step1', Path(__file__).parents[1] / 'import-open-step1.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class OpenStep1ImportTests(unittest.TestCase):
    def setUp(self):
        self.item = {'id': 'synthetic:test:v1', 'rotation': 'usmle-step1-open', 'moduleNodes': ['usmle/step1', 'usmle/step1/physiology'], 'stem': 'Synthetic test question?', 'options': [{'label': 'A', 'text': 'Synthetic one', 'isCorrect': True, 'explanation': 'Source explanation.'}, {'label': 'B', 'text': 'Synthetic two', 'isCorrect': False}], 'publicUsmle': {'origin': 'generated', 'itemText': {'licence': 'CC-BY-4.0', 'attribution': 'Synthetic author'}, 'evidence': {'sourceId': 'synthetic-source', 'passageId': 'one'}}}
        self.sources = {'synthetic-source': {'title': 'Synthetic reference', 'canonicalUrl': 'https://example.com/reference', 'passages': [{'id': 'one'}]}}

    def parse(self, item=None):
        return module.parse_question(item or self.item, 1, self.sources)

    def test_preserves_source_key_origin_citations_and_unknown_production_year(self):
        q = self.parse()
        self.assertEqual(q['key'], 'A')
        self.assertEqual(q['step'], 'step1')
        self.assertEqual(q['sourceOrigin'], 'generated')
        self.assertIsNone(q['productionYear'])
        self.assertEqual(q['productionYears'], [])
        self.assertIn('https://example.com/reference', q['sourceNote'])
        self.assertIn('Source explanation.', q['explanation'])

    def test_rejects_unknown_rights_origin_or_exam_label(self):
        for change in ['rights', 'origin', 'step']:
            item = copy.deepcopy(self.item)
            if change == 'rights': item['publicUsmle']['itemText']['licence'] = 'unknown'
            if change == 'origin': item['publicUsmle']['origin'] = 'unknown'
            if change == 'step': item['moduleNodes'] = ['usmle/step2']
            with self.subTest(change=change), self.assertRaises(ValueError):
                self.parse(item)

    def test_never_infers_an_answer_or_fabricates_missing_references(self):
        for change in ['answer', 'labels', 'citation']:
            item = copy.deepcopy(self.item)
            if change == 'answer': item['options'][0]['isCorrect'] = False
            if change == 'labels': item['options'][1]['label'] = 'A'
            if change == 'citation': item['publicUsmle']['evidence']['passageId'] = 'missing'
            with self.subTest(change=change), self.assertRaises(ValueError):
                self.parse(item)

    def test_repeat_import_preserves_ids_dates_and_existing_questions(self):
        q = self.parse()
        merged, added, skipped = module.merge_questions([], [q])
        first_date = merged[0]['addedAt']
        again, added_again, _ = module.merge_questions(merged, [self.parse()])
        self.assertEqual((added, skipped, added_again), (1, 0, 0))
        self.assertEqual(again[0]['id'], q['id'])
        self.assertEqual(again[0]['addedAt'], first_date)
        other = {**q, 'id': 'original-private-id', 'identity': 'old', 'addedAt': '2024-01-01'}
        result, added, skipped = module.merge_questions([other], [self.parse()])
        self.assertEqual((added, skipped), (0, 1))
        self.assertEqual(result, [other])

    def test_conflicting_duplicate_answers_leave_original_untouched(self):
        q = self.parse()
        q['addedAt'] = '2024-01-01'
        original = copy.deepcopy(q)
        candidate = self.parse()
        candidate['key'] = 'B'
        for option in candidate['options']: option['correct'] = option['id'] == 'B'
        with self.assertRaisesRegex(ValueError, 'Conflicting'):
            module.merge_questions([q], [candidate])
        self.assertEqual(q, original)


if __name__ == '__main__':
    unittest.main()
