import runpy
from pathlib import Path
import unittest
import numpy as np
module=runpy.run_path(str(Path(__file__).resolve().parents[1]/'verify-recording-question-links.py'))

class RecordingEvidenceTests(unittest.TestCase):
    def test_same_audio_survives_gain_change_and_time_offset(self):
        random=np.random.default_rng(41);signal=random.uniform(.02,.5,2000)
        reference=np.r_[np.zeros(50),signal*.4,np.zeros(30)]
        self.assertGreater(module['correlation'](signal,reference,15,16),.999)
        self.assertLess(module['correlation'](random.uniform(.02,.5,2000),reference,15,16),.5)

    def test_silent_windows_cannot_verify_a_recording(self):
        self.assertIsNone(module['correlation'](np.zeros(2000),np.zeros(2000),15,15))

    def test_excerpt_ignores_the_general_instruction_range(self):
        self.assertEqual(module['spoken_questions']('For questions 25 to 30. Now look at question 25. Question 26. Question 27. Question 28.','B'),[25,26,27,28])
        self.assertEqual(module['spoken_questions']('For questions 31 to 42. Now read questions 37 to 42.','C'),[37,38,39,40,41,42])
        self.assertIsNone(module['spoken_questions']('A healthcare conversation without numbered questions.','A'))

if __name__=='__main__':unittest.main()
