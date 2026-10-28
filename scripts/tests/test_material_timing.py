import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('transcription', Path(__file__).parents[1]/'transcribe-materials.py')
transcription = importlib.util.module_from_spec(spec)
spec.loader.exec_module(transcription)


class TranscriptTimingTests(unittest.TestCase):
    def test_reversed_timestamp_preserves_words_and_marks_uncertainty(self):
        segments, uncertain = transcription.normalise_segments([{'start': 1126.5, 'end': 1126.48, 'text': ' Yes. '}], 2377.99)
        self.assertEqual(segments[0]['text'], 'Yes.')
        self.assertEqual(segments[0]['end'], segments[0]['start'])
        self.assertTrue(segments[0]['timingUncertain'])
        self.assertLess(uncertain[0]['start'], uncertain[0]['end'])

    def test_clips_boundary_and_discards_nonfinite_or_out_of_recording(self):
        segments, _ = transcription.normalise_segments([{'start': -1, 'end': 1, 'text': 'First'}, {'start': 9, 'end': 12, 'text': 'Last'}, {'start': 11, 'end': 12, 'text': 'Outside'}, {'start': float('nan'), 'end': 1, 'text': 'Invalid'}], 10)
        self.assertEqual([s['text'] for s in segments], ['First', 'Last'])
        self.assertEqual(segments[0]['start'], 0)
        self.assertEqual(segments[-1]['end'], 10)
