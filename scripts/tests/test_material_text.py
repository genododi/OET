import json
from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from html_text import html_text
from study_text import study_text

class MaterialTextTests(unittest.TestCase):
    def extract(self,content,extension='html',encoding='utf-8'):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/('source.'+extension);path.write_bytes(content.encode(encoding))
            return html_text(path,'sha') if extension=='html' else study_text(path,'sha')

    def test_saved_html_retains_words_entities_and_semantics_without_active_content(self):
        result=self.extract('<html><head><script>steal()</script></head><body><h1>Case notes</h1><p><span>hyper</span><b>tension</b> &amp; patient&rsquo;s concern</p><p hidden>hidden answer</p><iframe src="https://example.com">unsafe</iframe><ol start="3"><li>Review</li><li>Refer</li></ol><table><tr><th>Dose</th><th>Time</th></tr><tr><td>5 mg</td><td>daily</td></tr></table></body></html>')
        self.assertIn('hypertension & patient’s concern',result['text'])
        for unwanted in ['steal','hidden answer','unsafe','<html>']:self.assertNotIn(unwanted,result['text'])
        blocks=result['pages'][0]['blocks'];self.assertEqual([b['kind'] for b in blocks],['heading','paragraph','list','table'])
        self.assertEqual(blocks[2]['start'],3);self.assertEqual(blocks[3]['rows'][1][0]['text'],'5 mg')

    def test_empty_shell_and_damaged_font_encoding_are_honest(self):
        self.assertIn('no readable study text',self.extract('<head><title>App</title></head><body><div id="app"></div><script>load()</script></body>')['notice'])
        result=self.extract('<p>'+'&#1145;'*20+'</p>')
        self.assertTrue(result['pages'][0]['questionExtractionBlocked'])

    def test_txt_encodings_keep_doses_numbering_and_columns(self):
        text='PATIENT DETAILS\r\n\r\n1. Dose 5 µg — daily\r\n2. Review in 2 weeks\r\n\r\nDrug\tDose\r\nA\t5 mg'
        for encoding in ['utf-8-sig','utf-16','utf-16-le','utf-16-be','utf-32','cp1252']:
            result=self.extract(text,'txt',encoding)
            self.assertIn('5 µg — daily',result['text']);self.assertNotIn('\r',result['text']);self.assertNotIn('\0',result['text'])
            self.assertEqual(result['pages'][0]['blocks'][-1]['kind'],'pre')

    def test_json_strings_and_nested_context_become_readable_without_losing_values(self):
        result=self.extract(json.dumps({'title':'Case 1','questions':[{'prompt':'What next?','options':{'A':'Refer','B':'Review'},'answer':'B','explanation':'Stable patient.\nReview in 2 weeks.'}]}),'json')
        for phrase in ['Title: Case 1','What next?','A: Refer','B: Review','Answer: B','Stable patient.\nReview in 2 weeks.']:self.assertIn(phrase,result['text'])
        self.assertNotIn('"prompt"',result['text'])

if __name__=='__main__':unittest.main()
