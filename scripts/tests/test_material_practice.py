import runpy
import unittest
from pathlib import Path

module=runpy.run_path(str(Path(__file__).resolve().parents[1]/'build-material-practice.py'))
questions=module['questions_on_page'];keys=module['parse_key']

class PrintedSourceTests(unittest.TestCase):
    def test_numbered_blanks_keep_their_actual_context(self):
        actual=questions('Patient Chloe\nSymptoms\nUnsteady after (1) …………………\nMedication (2)\n ………………… for anxiety',3,'A')
        self.assertEqual([q['number'] for q in actual],[1,2])
        self.assertIn('Medication',actual[1]['prompt'])
        self.assertEqual(actual[0]['sourcePage'],3)

    def test_standalone_question_heading_and_options(self):
        actual=questions('Part B\nQuestions 1 - 6\nQuestion 1 Audio\nQuestion 1\nQuestion text\nYou hear a nurse.\nWhat does she recommend?\nSelect one:\nA. A review.\nB. A referral.\nC. No action.',4,'B')
        self.assertEqual(len(actual),1)
        self.assertEqual(actual[0]['choices'],['A','B','C'])
        self.assertIn('What does she recommend?',actual[0]['prompt'])

    def test_case_note_numbers_are_not_exam_questions(self):
        self.assertEqual(questions('Patient details\n21 years old\n10 cigarettes daily\n1. Continue medication\n2. Review next week',1),[])

    def test_keys_keep_part_number_and_printed_wording(self):
        self.assertEqual(keys('Part A\n1. C\n2. 60 mg/day\nPart B\n1.A 2.C'),{('A',1):'C',('A',2):'60 mg/day',('B',1):'A',('B',2):'C'})
        self.assertEqual(keys('Answers\nDizzy spells\nUnsteady',plain=True),{(None,1):'Dizzy spells',(None,2):'Unsteady'})
        self.assertEqual(keys('1. What medicine should be used?'),{})

    def test_repeated_patient_questions_keep_printed_order(self):
        actual=questions('Patient Joseph\nSymptom (1) .....\nMedicine (2) .....\nPatient Julie\nSymptom (1) .....\nMedicine (2) .....',1,'A')
        self.assertEqual([q['number'] for q in actual],[1,2,1,2])

    def test_conflicting_repeated_keys_are_not_guessed(self):
        self.assertEqual(keys('Part A\n1. headache\nPart A\n1. dizziness'),{})

    def test_key_is_scoped_to_the_matching_test(self):
        first={'sourceSha256':'same','part':'A','pages':[1,2],'questions':[{'number':1}]}
        second={'sourceSha256':'same','part':'A','pages':[6,7],'questions':[{'number':1}]}
        pages=[{'number':5,'text':'ANSWER KEY\nPart A\n1. headache'},{'number':10,'text':'ANSWER KEY\nPart A\n1. dizziness'}]
        match=module['in_book_key'](second,[first,second],pages)
        self.assertEqual(match[0]['number'],10)
        self.assertEqual(match[1][('A',1)],'dizziness')

if __name__=='__main__':unittest.main()
