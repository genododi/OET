import { expect, it } from 'vitest';
import { findReadingEvidence } from './readingEvidence';
it('locates matching source wording without marking a repeated question or a bare choice letter',()=>{
 const text='Daily pulse monitoring is essential during treatment.\nWhich treatment requires pulse monitoring?\nUnrelated administrative information follows.';
 const q={id:'q1',prompt:'Which treatment requires pulse monitoring?',answer:'A'};
 const found=findReadingEvidence(text,[q]);
 expect(found).toHaveLength(1);expect(text.slice(found[0].start,found[0].end)).toBe('Daily pulse monitoring is essential during treatment.');
 expect(findReadingEvidence('The patient is in the clinic.',[{id:'q',prompt:'What information about the patient is given?'}])).toEqual([]);
});
it('only uses the source page associated with a question and never invents a match',()=>{
 const q={id:'q',prompt:'Which neurological reflex is present?',answer:'patellar reflex',pages:[4]};
 expect(findReadingEvidence('A patellar reflex is present.',[q],3)).toEqual([]);
 expect(findReadingEvidence('A patellar reflex is present.',[q],4)).toHaveLength(1);
 expect(findReadingEvidence('Administrative contact information.',[q],4)).toEqual([]);
});
it('keeps decimal percentages and their full sentence together',()=>{
 const text='The annual incidence fell from 5.0% to 2.8% after 2010.';
 const found=findReadingEvidence(text,[{id:'rate',prompt:'How did annual incidence change?'}]);
 expect(found).toHaveLength(1);expect(text.slice(found[0].start,found[0].end)).toBe(text);
});
