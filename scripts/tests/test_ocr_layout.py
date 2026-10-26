import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from ocr_layout import from_tsv, from_vision
class OcrLayoutTests(unittest.TestCase):
 def test_columns_values_and_blanks_remain_at_their_source_positions(self):
  header='level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n'
  rows=['1\t1\t0\t0\t0\t0\t0\t0\t1000\t1400\t-1\t',
        '5\t1\t1\t1\t1\t1\t100\t200\t80\t20\t99\tDose',
        '5\t1\t1\t1\t2\t1\t100\t240\t80\t20\t45\t5mg',
        '5\t1\t2\t1\t1\t1\t600\t200\t90\t20\t98\tTime',
        '5\t1\t2\t1\t2\t1\t600\t240\t90\t20\t98\t06:00',
        '5\t1\t3\t1\t1\t1\t100\t300\t200\t20\t99\t(1)____']
  result=from_tsv(header+'\n'.join(rows));blocks=result['layout']['blocks']
  self.assertEqual(result['text'],'Dose\n5mg\n\nTime\n06:00\n\n(1)____')
  self.assertEqual(blocks[1]['lines'][0]['x'],.6)
  self.assertEqual(blocks[0]['lines'][1]['uncertainWords'],['5mg'])
 def test_vision_converts_bottom_origin_without_merging_columns(self):
  r=from_vision([{'text':'left','x':.1,'y':.8,'width':.2,'height':.03},{'text':'right','x':.6,'y':.8,'width':.2,'height':.03}],1000,1400)
  self.assertEqual(len(r['layout']['blocks']),2)
  self.assertEqual(r['layout']['blocks'][0]['lines'][0]['y'],.17)
 def test_empty_photo_is_valid_but_has_no_invented_text(self):
  result=from_tsv('level\twidth\theight\ttext\n1\t100\t200\t\n')
  self.assertEqual(result['text'],'');self.assertEqual(result['layout']['blocks'],[])

class TablePreparationTests(unittest.TestCase):
 def test_removes_grid_rules_but_keeps_cell_marks_and_leaves_prose_untouched(self):
  try:
   from PIL import Image, ImageDraw
   import numpy
  except ImportError:self.skipTest('Optional image preparation libraries are unavailable')
  import tempfile
  from ocr_layout import remove_table_rules
  with tempfile.TemporaryDirectory() as folder:
   p=Path(folder)/'grid.png';image=Image.new('RGB',(500,300),'white');draw=ImageDraw.Draw(image)
   for y in [0,100,200,299]:draw.line((0,y,499,y),fill='black')
   for x in [0,250,499]:draw.line((x,0,x,299),fill='black')
   draw.rectangle((50,50,70,70),fill='black');image.save(p)
   self.assertTrue(remove_table_rules(p))
   with Image.open(p) as result:self.assertEqual(result.getpixel((0,100)),(255,255,255));self.assertEqual(result.getpixel((60,60)),(0,0,0))
   p=Path(folder)/'prose.png';image=Image.new('RGB',(500,300),'white');ImageDraw.Draw(image).text((20,30),'No known drug allergies',fill='black');image.save(p);before=p.read_bytes()
   self.assertFalse(remove_table_rules(p));self.assertEqual(p.read_bytes(),before)

class VisionParagraphTests(unittest.TestCase):
 def test_recovers_paragraph_spacing_without_combining_parallel_columns(self):
  r=from_vision([{'text':'First line','x':.1,'y':.8,'width':.4,'height':.02},{'text':'Second line','x':.1,'y':.77,'width':.4,'height':.02},{'text':'New paragraph','x':.1,'y':.65,'width':.4,'height':.02}],1000,1400,needs_review=True)
  self.assertEqual(r['text'],'First line\nSecond line\n\nNew paragraph')
  self.assertTrue(r['needsReview'])
  self.assertEqual(r['layout']['blocks'][0]['lines'][0]['uncertainWords'],['First line'])

class VisionBoundsTests(unittest.TestCase):
 def test_clips_small_vision_box_overshoot_without_rewriting_words(self):
  r=from_vision([{'text':'was prescribed','x':.79,'y':.2,'width':.23,'height':.03}],1000,1400,needs_review=True)
  line=r['layout']['blocks'][0]['lines'][0]
  self.assertEqual(line['text'],'was prescribed');self.assertEqual(line['width'],.21)
  self.assertLessEqual(line['x']+line['width'],1)

if __name__=='__main__':unittest.main()
