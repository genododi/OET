import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MaterialSourceText } from './MaterialSourceText';
const layout={version:1,width:1000,height:1400,blocks:[{text:'PATIENT DETAILS',lines:[{text:'PATIENT DETAILS',x:.1,y:.05,width:.4,height:.025,confidence:.99}]},{text:'SpO2 88% on room air\n(1) __________ mg',lines:[{text:'SpO2 88% on room air',x:.1,y:.15,width:.4,height:.02,confidence:.7,uncertainWords:['88%']},{text:'(1) __________ mg',x:.1,y:.2,width:.4,height:.02,confidence:.98}]}]};
const text=layout.blocks.map(b=>b.text).join('\n\n');
const props={id:'photo',filename:'case.jpg',format:'jpg',assetPath:'case.jpg',textPath:'case.json'};
it('renders inert HTML tables and headings, and restricted ranges cannot reveal other source blocks',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({text:'Dose\n5 mg',pages:[{number:1,text:'Dose\n5 mg',blocks:[{kind:'heading',text:'Dose',level:3},{kind:'table',rows:[[{text:'5 mg',header:false,colSpan:1,rowSpan:1}]]}]}]})})));
 const view=render(<MaterialSourceText {...props} format="html"/>);
 await screen.findByRole('heading',{name:'Dose'});expect(screen.getByRole('cell')).toHaveTextContent('5 mg');
 expect(screen.getByRole('button',{name:'Download readable TXT'})).toBeVisible();expect(view.container.querySelector('iframe')).toBeNull();
 view.rerender(<MaterialSourceText {...props} format="html" ranges={[{page:1,start:0,end:4}]}/>);
 expect(screen.queryByRole('cell')).toBeNull();expect(screen.queryByText('5 mg')).toBeNull();
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('presents extracted slide text in order and retains the original scanned slide for checking',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({text:'Dose 5 mg\nReview in two weeks',pages:[{number:1,text:'Dose 5 mg',extraction:'ocr',previewPath:'slide-1.png'},{number:2,text:'Review in two weeks',extraction:'text'}]})})));
 render(<MaterialSourceText {...props} format="pptx" filename="Case notes.pptx"/>);
 await screen.findByText('Dose 5 mg');
 expect(screen.getByAltText('Original slide 1: Case notes.pptx')).toHaveAttribute('src',expect.stringContaining('slide-1.png'));
 fireEvent.click(screen.getByRole('button',{name:'Next slide'}));
 expect(screen.getByLabelText('Source slide')).toHaveValue('2');expect(screen.getByText('Review in two weeks')).toBeVisible();
});
it('shows selectable positioned OCR and uncertain wording, while a restricted task cannot expose the full page',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({text,pages:[{number:1,text,layout,extraction:'ocr'}]})})));
 const view=render(<MaterialSourceText {...props}/>);
 await screen.findByText('PATIENT DETAILS');
 expect(screen.getByTitle('Uncertain recognition: check the original')).toHaveTextContent('88%');
 fireEvent.click(screen.getByRole('button',{name:'Match page layout'}));
 const source=screen.getByRole('region',{name:'Recognised text in page layout'});
 expect(within(source).getByText('(1) __________ mg')).toHaveAttribute('x','100');
 fireEvent.click(screen.getByRole('button',{name:'Readable text'}));
 expect(screen.queryByRole('region',{name:'Recognised text in page layout'})).toBeNull();
 view.rerender(<MaterialSourceText {...props} ranges={[{page:1,start:0,end:15}]}/>);
 expect(screen.queryByText(/88% on room air/)).toBeNull();
 expect(screen.queryByRole('button',{name:'Match page layout'})).toBeNull();
});
it('opens the source image automatically when recognition is pending, including converted phone photos',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({text:'',pages:[{number:1,text:'',previewPath:'preview.png'}]})})));
 render(<MaterialSourceText {...props} format="heic"/>);
 const img=await screen.findByAltText('Original source: case.jpg');
 expect(img).toHaveAttribute('src',expect.stringContaining('preview.png'));
 expect(img.closest('details')).toHaveAttribute('open');
});

it('labels difficult handwriting as unverified rather than displaying it as a checked transcript',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({text:'Handwritten draft',pages:[{number:1,text:'Handwritten draft',extraction:'ocr',needsReview:true}]})})));
 render(<MaterialSourceText {...props}/>);
 await screen.findByText(/Handwritten or difficult text/);
 expect(screen.getByText('Handwritten draft')).toBeVisible();
});

it('uses recovered PDF positions and rotation without changing the stable question-range text',async()=>{
 const stable='Original source used by the question range';
 const display={text:'Category',layout:{version:1,width:1000,height:700,blocks:[{text:'Category',lines:[{text:'Category',x:.03,y:.1,width:.02,height:.3,rotation:-90,confidence:1}]}]}};
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({text:stable,pages:[{number:1,text:stable,extraction:'text',display}]})})));
 const view=render(<MaterialSourceText {...props} format="pdf"/>);
 await screen.findByText('Category');
 fireEvent.click(screen.getByRole('button',{name:'Match page layout'}));
 expect(view.container.querySelector('text[transform]')).toHaveAttribute('transform','translate(47.6 280) rotate(-90)');
 view.rerender(<MaterialSourceText {...props} format="pdf" ranges={[{page:1,start:0,end:8}]} />);
 expect(screen.getByText('Original')).toBeVisible();expect(screen.queryByText('Category')).toBeNull();
});
