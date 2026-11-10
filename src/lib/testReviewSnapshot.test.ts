import {afterEach,expect,it,vi} from 'vitest';
import {buildTestReviewSnapshot} from './testReviewSnapshot';
import reading from '../data/jahshanReadingQuestions.json';
afterEach(()=>vi.unstubAllGlobals());
it('reviews all parts of the selected Benchmark test without mixing another test’s responses',async()=>{
 localStorage.setItem('oet-benchmark-v1:listening-1',JSON.stringify({'A-1':'one','B-25':'B','C-42':'C'}));
 localStorage.setItem('oet-benchmark-v1:listening-2',JSON.stringify({'A-1':'from a different test'}));
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:true,json:async()=>url.includes('/questions/')?{questions:[{part:'A',number:1,prompt:'First blank'},{part:'B',number:25,prompt:'Middle question'},{part:'C',number:42,prompt:'Last question'}]}:{text:'Selected test source.'}})));
 const snapshot=await buildTestReviewSnapshot('collection-test:benchmark:listening-1','Listening test one');
 expect(snapshot?.questions.map(q=>q.response)).toEqual(['one','B','C']);expect(snapshot?.questions[1].key).toBe('B');expect(JSON.stringify(snapshot)).not.toContain('from a different test');
});
it('collects Jahshan responses across the complete test rather than only the open part',async()=>{
 const test=reading.tests.find(test=>test.number===3)!;
 const first=test.sections[0].questions[0],last=test.sections.at(-1)!.questions.at(-1)!;
 localStorage.setItem('oet-jahshan-reading-workspace-v1',JSON.stringify({drafts:{3:{responses:{[first.id]:'first response',[last.id]:'last response'}}}}));
 const snapshot=await buildTestReviewSnapshot('collection-test:jahshan:reading:3','My reading test');
 expect(snapshot?.questions.find(q=>q.id===first.id)?.response).toBe('first response');expect(snapshot?.questions.find(q=>q.id===last.id)?.response).toBe('last response');expect(snapshot?.questions.length).toBe(test.sections.reduce((sum,section)=>sum+section.questions.length,0));
});
