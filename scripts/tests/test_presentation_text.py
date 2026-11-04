import json
from pathlib import Path
import runpy
import struct
import sys
import tempfile
import unittest
import zipfile
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from presentation_text import presentation_text, plain_text, embedded_audio
legacy=runpy.run_path(str(Path(__file__).resolve().parents[1]/'read-legacy-ppt.py'))

class PresentationTextTests(unittest.TestCase):
    def test_keeps_formatted_words_together_and_uses_real_slide_order(self):
        with tempfile.TemporaryDirectory() as directory:
            source=Path(directory)/'dose.pptx'
            with zipfile.ZipFile(source,'w') as deck:
                deck.writestr('ppt/presentation.xml','<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst><p:sldId r:id="first"/><p:sldId r:id="second"/></p:sldIdLst></p:presentation>')
                deck.writestr('ppt/_rels/presentation.xml.rels','<Relationships><Relationship Id="first" Target="slides/slide2.xml"/><Relationship Id="second" Target="slides/slide10.xml"/></Relationships>')
                slide='<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:p><a:r><a:t>{}</a:t></a:r><a:r><a:t> mg daily</a:t></a:r></a:p></p:sld>'
                deck.writestr('ppt/slides/slide10.xml',slide.format('10'));deck.writestr('ppt/slides/slide2.xml',slide.format('5'))
            result=presentation_text(source,'sha',Path(directory),False)
            self.assertEqual([page['text'] for page in result['pages']],['5 mg daily','10 mg daily'])

    def test_unicode_notes_are_decoded_without_corrupting_units(self):
        with tempfile.TemporaryDirectory() as directory:
            source=Path(directory)/'notes.txt';source.write_bytes('Dose 5 mg\nFollow-up: 2 weeks'.encode('utf-16'))
            self.assertEqual(plain_text(source),'Dose 5 mg\nFollow-up: 2 weeks')

    def test_legacy_presentation_atoms_keep_slide_boundaries_and_unicode(self):
        def record(kind,data,options=0):return struct.pack('<HHI',options,kind,len(data))+data
        body=record(1011,b'')+record(4000,'Patient: José\rDose 5 mg'.encode('utf-16-le'))+record(1011,b'')+record(4008,b'Review in 2 weeks')
        result=legacy['read_slides'](record(4080,body,15))
        self.assertEqual(len(result['pages']),2);self.assertIn('Dose 5 mg',result['pages'][0]['text'])
        self.assertEqual(result['pages'][1]['text'],'Review in 2 weeks')

    def test_only_embedded_audio_is_exposed_as_contained_media(self):
        with tempfile.TemporaryDirectory() as directory:
            source=Path(directory)/'deck.pptx'
            with zipfile.ZipFile(source,'w') as deck:
                deck.writestr('ppt/media/audio1.mp3',b'ID3recording');deck.writestr('ppt/media/image1.png',b'image');deck.writestr('elsewhere/other.mp3',b'ID3other')
            with zipfile.ZipFile(source) as deck:self.assertEqual([entry.filename for entry in embedded_audio(deck)],['ppt/media/audio1.mp3'])

if __name__=='__main__':unittest.main()
