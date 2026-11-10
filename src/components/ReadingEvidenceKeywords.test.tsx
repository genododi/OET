import {fireEvent,render,screen} from '@testing-library/react';
import {expect,it} from 'vitest';
import {HighlightedReadingText,ReadingEvidenceProvider,ReadingEvidenceToggle,PositionedReadingClues} from './ReadingEvidence';

it('lets the learner choose a question and highlights only its matching keyword words',()=>{
 const view=render(<ReadingEvidenceProvider storageKey="keyword-test" questions={[{id:'q1',label:'Question 1',prompt:'Which treatment requires pulse monitoring?',answer:'secret answer'},{id:'q2',label:'Question 2',prompt:'What temperature monitoring is required?'}]}><ReadingEvidenceToggle/><p><HighlightedReadingText text="Daily pulse monitoring is essential during treatment. Temperature monitoring is also recorded."/></p></ReadingEvidenceProvider>);
 fireEvent.change(screen.getByRole('combobox',{name:'Choose a question for yellow highlights'}),{target:{value:'q1'}});
 expect([...view.container.querySelectorAll('mark.reading-evidence-mark')].map(mark=>mark.textContent)).toEqual(['pulse','monitoring','treatment']);
 expect(screen.getByLabelText('Question keywords')).toHaveTextContent('pulse');expect(view.container.textContent).not.toContain('secret answer');
});
it('uses word geometry for a page image instead of painting a whole sentence yellow',()=>{
 const text='Pulse monitoring continues during treatment.';
 const words=text.split(' ').map((word,index)=>({text:word,x:.1+index*.14,width:.1,confidence:1}));
 const layout={version:1 as const,width:1000,height:1200,blocks:[{text,lines:[{text,x:.1,y:.2,width:.8,height:.02,confidence:1,words}]}]};
 const view=render(<ReadingEvidenceProvider storageKey="geometry-test" questions={[{id:'q1',prompt:'Which treatment needs pulse monitoring?'}]}><ReadingEvidenceToggle/><svg><PositionedReadingClues layout={layout} text={text}/></svg></ReadingEvidenceProvider>);
 fireEvent.click(screen.getByRole('button',{name:'Highlight question keywords'}));
 const rectangles=[...view.container.querySelectorAll('rect')];expect(rectangles).toHaveLength(3);expect(rectangles.every(rect=>rect.getAttribute('width')==='100')).toBe(true);
});
