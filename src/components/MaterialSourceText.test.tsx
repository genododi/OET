import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MaterialSourceText } from './MaterialSourceText';
const layout={version:1,width:1000,height:1400,blocks:[{text:'PATIENT DETAILS',lines:[{text:'PATIENT DETAILS',x:.1,y:.05,width:.4,height:.025,confidence:.99}]},{text:'SpO2 88% on room air\n(1) __________ mg',lines:[{text:'SpO2 88% on room air',x:.1,y:.15,width:.4,height:.02,confidence:.7,uncertainWords:['88%']},{text:'(1) __________ mg',x:.1,y:.2,width:.4,height:.02,confidence:.98}]}]};
const text=layout.blocks.map(b=>b.text).join('\n\n');
const props={id:'photo',filename:'case.jpg',format:'jpg',assetPath:'case.jpg',textPath:'case.json'};
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
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
