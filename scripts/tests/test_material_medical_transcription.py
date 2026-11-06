import json
from pathlib import Path
import runpy
import tempfile
import unittest

medical = runpy.run_path(str(Path(__file__).parents[1]/'medical_transcription.py'))


class MedicalTranscriptionTests(unittest.TestCase):
    def test_vocabulary_prefers_matched_terms_and_all_three_dialects(self):
        terms = medical['vocabulary']('A patient with hypothyroidism takes levothyroxine.')
        self.assertEqual(terms[:2], ['hypothyroidism', 'levothyroxine'])
        self.assertLessEqual(len(medical['vocabulary'](' '.join(medical['VOCABULARY']))), 32)
        for hint, expected in [('uk', 'British'), ('australia', 'Australian'), ('us', 'American')]:
            self.assertIn(expected, medical['prompt_for']('', hint))

    def test_context_never_traverses_answers_or_other_source_sheets(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path = root/'public/material-practice/sheets'; path.mkdir(parents=True)
            (path.parent/'index.json').write_text(json.dumps({'files': {'exact': {'sheetPath': 'material-practice/sheets/test.json'}}}))
            sheet = {'sourceSha256': 'exact', 'units': [{'label': 'Consultation', 'questions': [{'prompt': 'Thyroid review', 'answer': {'text': 'secret-key'}, 'answers': ['another-secret']}], 'answerSources': ['printed-key']}]}
            (path/'test.json').write_text(json.dumps(sheet))
            text = medical['recording_context']('exact', root)
            self.assertIn('Thyroid review', text)
            self.assertNotIn('secret', text)
            self.assertNotIn('printed-key', text)
            sheet['sourceSha256'] = 'different'
            (path/'test.json').write_text(json.dumps(sheet))
            self.assertEqual(medical['recording_context']('exact', root), '')

    def test_flags_similar_medical_spelling_and_uncertain_numbers_without_replacing(self):
        words = [{'word': word, 'probability': .2} for word in ['No', '0.5', 'micrograms', 'tachyarithmia']]
        before = json.dumps(words)
        self.assertEqual(medical['review_terms'](words), ['No', '0.5', 'micrograms', 'tachyarithmia'])
        self.assertEqual(json.dumps(words), before)
        self.assertEqual(medical['review_terms']([{'word':'arrhythmia','probability':.99}]), [])
        self.assertEqual(medical['review_terms']([{'word':'dysphagia','probability':.99}]), [])

    def test_native_boundaries_keep_words_and_absolute_times_without_manual_resegmentation(self):
        calls = []
        def decode(samples, **options):
            calls.append(options)
            return {'segments': [{'start':23.8,'end':24.2,'text':' ECG','words': [{'start':23.8,'end':24.2,'word':' ECG','probability':.9}]}]}
        result = medical['transcribe_medical']('unused', model='cached-model',
            transcribe=decode, load_audio=lambda _: [0] * (48 * 16000))
        self.assertEqual(len(result['segments']), 1)
        self.assertEqual(result['segments'][0], {'start':23.8,'end':24.2,'text':'ECG'})
        self.assertEqual(len(calls), 1)
        self.assertTrue(calls[0]['word_timestamps'])
        self.assertFalse(calls[0]['condition_on_previous_text'])

    def test_no_aligned_speech_fails_so_an_existing_transcript_is_preserved(self):
        with self.assertRaisesRegex(ValueError, 'existing transcript preserved'):
            medical['transcribe_medical']('unused',model='cached-model',
                transcribe=lambda *a, **kw: {'segments': []}, load_audio=lambda _: [0]*16000)

    def test_window_keeps_negation_decimals_units_and_medical_words_verbatim(self):
        def decode(*args, **kw):
            return {'segments':[{'start':0,'end':3.5,'text':'No tachyarithmia. 0.5 micrograms.','words':[{'start':i,'end':i+.5,'word':w,'probability':.2} for i,w in enumerate(['No ', 'tachyarithmia. ', '0.5 ', 'micrograms.'])]}]}
        result=medical['transcribe_medical']('unused',model='cached-model',transcribe=decode,load_audio=lambda _: [0]*(6*16000))
        self.assertEqual(result['segments'][0]['text'],'No tachyarithmia. 0.5 micrograms.')
        self.assertFalse(result['recognitionProfile']['clinicalTextAutoReplaced'])
