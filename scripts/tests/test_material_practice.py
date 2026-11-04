import runpy
import unittest
from pathlib import Path
import sys
import json
import tempfile
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from material_audio_matches import printed_questions, publish_audio_matches

module=runpy.run_path(str(Path(__file__).resolve().parents[1]/'build-material-practice.py'))
questions=module['questions_on_page'];keys=module['parse_key']

class PrintedSourceTests(unittest.TestCase):
    def test_audio_with_answers_in_its_title_is_not_a_printed_answer_key(self):
        self.assertFalse(module['key_file']({'format':'mp3','filename':'Listening Test With Answers.mp3'}))
    def test_recording_parts_are_read_from_prefix_suffix_and_compact_names(self):
        for name,part in [('test 1-B.mp3','B'),('Listening C.mp3','C'),('Partc2.ogg','C'),('A1.mp3','A'),('A-Chloe.m4a','A')]:self.assertEqual(module['part_of'](name),part)
        self.assertIsNone(module['part_of']('Chloe full recording.mp3'))

    def test_verified_markers_keep_printed_numbers_and_exact_key_identity(self):
        part={'part':'B','inline':False,'content':[{'questionId':'B-1','text':'25.','sourcePage':3},{'text':'What does the nurse advise?\nA Review\nB Rest\nC Referral','sourcePage':3}]}
        rows=printed_questions(part,{'questions':[{'id':'B-1','number':1,'answer':'C','keyPage':9}]})
        self.assertEqual(rows[0][1]['number'],25);self.assertEqual(rows[0][1]['keyText'],'C');self.assertIn('C Referral',rows[0][1]['prompt'])

    def test_original_audio_receives_only_its_own_source_matched_listening_questions(self):
        files={s:{'filename':s,'format':'mp3' if s in ['audio','other'] else 'pdf'} for s in ['audio','other','paper','reading']}
        unit={'id':'part-a','sourceSha256':'paper','skills':['listening'],'questions':[{'number':1}],'recordings':['audio'],'answerSources':[]}
        wrong=dict(unit,id='reading',sourceSha256='reading',skills=['reading'])
        payloads={'audio':{'units':[wrong]},'paper':{'units':[unit]},'reading':{'units':[wrong]},'other':{'units':[]}}
        with patch('material_audio_matches.jahshan_matches',return_value={}):report=publish_audio_matches(Path('.'),files,payloads,lambda sha:{'sha256':sha}, {'mp3'})
        self.assertEqual([u['id'] for u in payloads['audio']['units']],['part-a']);self.assertEqual(payloads['other']['units'],[])
        self.assertEqual(next(row for row in report['files'] if row['sha256']=='other')['status'],'no-verified-question-paper')

    def test_verified_excerpt_cannot_receive_questions_outside_its_announced_range(self):
        files={sha:{'filename':sha,'format':'mp3' if sha!='paper' else 'pdf'} for sha in ['audio','excerpt','paper']}
        unit=dict(id='part-b',part='B',sourceSha256='paper',skills=['listening'],pages=[3],questions=[dict(number=n,sourcePage=3) for n in [25,29,30]],recordings=['audio'],answerSources=[])
        payloads={'paper':{'units':[unit]},'audio':{'units':[]},'excerpt':{'units':[]}}
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'src/data').mkdir(parents=True)
            (root/'src/data/recordingQuestionMatches.json').write_text(json.dumps({'version':1,'links':[{'recordingSha256':'excerpt','referenceSha256':'audio','questions':{'B':[29,30]},'verification':{'method':'three-separated-acoustic-envelope-windows','minimumCorrelation':.99}}]}))
            with patch('material_audio_matches.jahshan_matches',return_value={}):publish_audio_matches(root,files,payloads,lambda sha:{'sha256':sha}, {'mp3'})
        self.assertEqual([q['number'] for q in payloads['excerpt']['units'][0]['questions']],[29,30])
        self.assertEqual(payloads['excerpt']['units'][0]['recordings'],['excerpt'])
    def test_unrelated_papers_are_not_linked_by_a_numbered_subject_folder_or_generic_test_title(self):
        self.assertFalse(module['named_test_folder']('/sources/3. Reading'))
        self.assertFalse(module['named_test_folder']('/sources/Sample Test 1/Reading references'))
        self.assertTrue(module['named_test_folder']('/sources/4- Sample Test 2'))
        self.assertFalse(module['descriptive_stem']({'filename':'Sample Test 1 Questions.pdf'}))
        self.assertTrue(module['descriptive_stem']({'filename':'Summary Depression Questions.pdf'}))

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

    def test_unverified_handwriting_is_not_promoted_to_a_question_or_key(self):
        self.assertEqual(questions('Part A\n(1) _______ mg',1,'A',needs_review=True),[])
        unit={'sourceSha256':'same','part':'A','pages':[1],'questions':[{'number':1}]}
        self.assertIsNone(module['in_book_key'](unit,[unit],[{'number':2,'text':'ANSWER KEY\nPart A\n1. 50 mg','needsReview':True}]))

if __name__=='__main__':unittest.main()
