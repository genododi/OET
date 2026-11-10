import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {FirstAidRevision} from './FirstAidRevision';
afterEach(()=>{vi.unstubAllGlobals();delete window.oetDesktop;});
it('withholds textbook matching before an answer is revealed, then fetches exact local excerpts and page links',async()=>{
 window.oetDesktop={} as NonNullable<typeof window.oetDesktop>;
 const fetcher=vi.fn().mockResolvedValue({json:async()=>({state:'matched',sourceName:'My First Aid 2026.pdf',sourceSha256:'a'.repeat(64),edition:2026,matches:[{page:637,text:'Exact source passage.',matched:['renal','collagen']}]})});vi.stubGlobal('fetch',fetcher);
 const view=render(<FirstAidRevision enabled={false} questionId="q1" prompt="A renal question" answer="A supplied answer"/>);
 expect(fetcher).not.toHaveBeenCalled();expect(screen.queryByRole('region')).toBeNull();
 view.rerender(<FirstAidRevision enabled questionId="q1" prompt="A renal question" answer="A supplied answer"/>);
 await screen.findByText('Exact source passage.');
 expect(JSON.parse(fetcher.mock.calls[0][1].body).answer).toBe('A supplied answer');
 expect(screen.getByRole('link',{name:'Open this textbook page ↗'})).toHaveAttribute('href',expect.stringContaining('#page=637'));
 fireEvent.change(screen.getByRole('searchbox'),{target:{value:'collagen'}});fireEvent.click(screen.getByRole('button',{name:'Find in First Aid'}));
 await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(2));expect(JSON.parse(fetcher.mock.calls[1][1].body).query).toBe('collagen');
});
it('never fetches the learner’s local textbook from the public website',()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 render(<FirstAidRevision enabled questionId="web" prompt="Question"/>);
 expect(screen.getByText(/Open this question in the Mac app/)).toBeVisible();expect(fetcher).not.toHaveBeenCalled();
});
