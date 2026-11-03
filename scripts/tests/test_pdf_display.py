import importlib.util
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from pdf_layout import attach_pdf_display, pdf_display_pages, same_words

class PdfDisplayTests(unittest.TestCase):
    def test_geometry_is_separate_from_stable_question_offsets(self):
        original='First column         Second column\n'+('A value         B value\n'*5)
        data={'text':original,'pages':[{'number':1,'text':original,'extraction':'text'}]}
        display={'text':original,'layout':{'blocks':[]}}
        with patch('pdf_layout.pdf_display_pages',return_value=[display]):self.assertEqual(attach_pdf_display(data,'source',True),1)
        self.assertEqual(data['text'],original);self.assertEqual(data['pages'][0]['text'],original)
        self.assertTrue(same_words('Drug dose 5 mg','Drug dose 5 mg'))
        self.assertFalse(same_words('Drug dose 5 mg','Drug dose 50 mg'))
        self.assertFalse(same_words(('clinical note '*100)+'dose 5 mg',('clinical note '*100)+'dose 50 mg'))
    def test_strips_invalid_pdf_control_characters_without_reordering_words(self):
        xml=b'<html xmlns="http://www.w3.org/1999/xhtml"><page width="100" height="100"><block><line xMin="10" xMax="90" yMin="20" yMax="30"><word xMin="10" xMax="90">Source\x03text</word></line></block></page></html>'
        with patch('pdf_layout.subprocess.run') as run:
            run.return_value.stdout=xml
            result=pdf_display_pages('fixture')
        self.assertEqual(result[0]['text'],'Sourcetext');self.assertEqual(result[0]['layout']['blocks'][0]['lines'][0]['x'],.1)

class SampleImportTests(unittest.TestCase):
    def test_accepts_only_complete_printed_numbering_and_retains_physical_pages(self):
        spec=importlib.util.spec_from_file_location('samples',Path(__file__).resolve().parents[1]/'import-usmle-samples.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        pages=['Federation of State Medical\nThis booklet was updated April 2026.', 'BLOCK 1, ITEMS 1-20\n'+'\n'.join(f'{i}. A synthetic source question {i}?\n(A) Option one\n(B) Option two\n(C) Option three\n(D) Option four' for i in range(1,120)), 'ANSWER KEY FOR USMLE STEP 1\n'+'\n'.join(f'{i}. B' for i in range(1,120))]
        result=module.parse_sample(pages);self.assertEqual(len(result['questions']),119);self.assertEqual(result['year'],2026)
        self.assertEqual(result['questions'][0]['sourcePages'],[2]);self.assertEqual(result['questions'][0]['key'],'B')
        with self.assertRaisesRegex(ValueError,'key coverage'):module.parse_sample(pages[:-1]+[pages[-1]+'\n1. A'])

if __name__=='__main__':unittest.main()
