import { expect, it } from 'vitest';
import { readableParagraph, validSourceLayout } from './sourceTextLayout';

export const layout = {version:1 as const,width:1000,height:1400,blocks:[{text:'PATIENT DETAILS',lines:[{text:'PATIENT DETAILS',x:.1,y:.05,width:.4,height:.025,confidence:.99}]},{text:'SpO2 88% on room air\n(1) __________ mg',lines:[{text:'SpO2 88% on room air',x:.1,y:.15,width:.4,height:.02,confidence:.7,uncertainWords:['88%']},{text:'(1) __________ mg',x:.1,y:.2,width:.4,height:.02,confidence:.98}]}]};
it('rejects corrupt geometry, mismatched wording and null nodes without losing the text fallback',()=>{
 expect(validSourceLayout(layout)).toBe(true);
 expect(validSourceLayout(layout,'Different page')).toBe(false);
 expect(validSourceLayout({...layout,blocks:[null]})).toBe(false);
 expect(validSourceLayout({...layout,blocks:[{text:'x',lines:[null]}]})).toBe(false);
 expect(validSourceLayout({...layout,blocks:[{text:'x',lines:[{text:'x',x:Infinity,y:0,width:1,height:1,confidence:1}]}]})).toBe(false);
});
it('reflows wrapped prose while retaining medical values, lists, answer blanks and table rows',()=>{
 const prose='The patient was referred yesterday for further assessment of\nprogressive breathlessness and requires review today.';
 expect(readableParagraph(prose)).toBe(prose.replace('\n',' '));
 const exact='PATIENT DETAILS:\nSpO2 88% on room air\n• No known drug allergies\n(1) __________ mg\nDrug     Dose     Time\nA        5 mg     06:00';
 expect(readableParagraph(exact)).toBe(exact);
});

it('recognises separated columns without treating an ordinary paragraph as a table',async()=>{
 const {sourceHasColumns}=await import('./sourceTextLayout');
 expect(sourceHasColumns(layout)).toBe(false);
 const second={text:'Time',lines:[{text:'Time',x:.7,y:.15,width:.1,height:.02,confidence:.99}]};
 expect(sourceHasColumns({...layout,blocks:[layout.blocks[1],second]})).toBe(true);
});
