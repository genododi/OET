import {beforeEach,expect,it,vi} from 'vitest';
import {queueTestReview,readTestReviews,recoverInterruptedReviews,reviewEvidence,finalizeTestReview} from './testReviews';
import {localAiReply} from './localAi';
import {buildTestReviewSnapshot} from './testReviewSnapshot';
vi.mock('./localAi',()=>({hasLocalAi:()=>true,localAiReply:vi.fn().mockResolvedValue('Mistakes to revisit\nQ2: compare your response with the supplied key.\nImportant points\nRead the condition.\nNew learning\nPreserve the qualifier.\nMy next practice\nRepeat Q2.\nCoverage and limits\nNo key supplied for Q3.')}));
vi.mock('./testReviewSnapshot',()=>({buildTestReviewSnapshot:vi.fn(async(id:string)=>({title:id,skill:'reading',questions:[{id:'Q1',prompt:'Question one',response:'A',key:'A'},{id:'Q2',prompt:'Question two',response:'B',key:'C'},{id:'Q3',prompt:'Question without a key',response:'answer'}],limitations:['No verified key for Q3.']}))}));
beforeEach(()=>{localStorage.clear();vi.clearAllMocks();});
it('automatically saves a completed test review once and sends its own answers and keys',async()=>{
 queueTestReview('test-one','Reading test one');queueTestReview('test-one','Reading test one');
 await vi.waitFor(()=>expect(readTestReviews()[0]?.state).toBe('complete'));
 expect(localAiReply).toHaveBeenCalledTimes(2);
 const messages=vi.mocked(localAiReply).mock.calls[0][0];expect(messages[1].content).toContain('Learner: B\nSupplied key: C');expect(messages[1].content).toContain('[not supplied; do not score]');
 expect(readTestReviews()[0]).toMatchObject({title:'Reading test one',answered:3,total:3,engine:'local'});
});
it('keeps an unfinished review honest after the app is restarted',()=>{
 localStorage.setItem('oet-test-reviews-v1',JSON.stringify([{id:'interrupted',completionId:'closed-app-test',title:'Saved test',createdAt:'2026-11-10',state:'writing',text:'',answered:4,total:5}]));
 recoverInterruptedReviews();expect(readTestReviews()[0].state).toBe('failed');expect(readTestReviews()[0].message).toContain('app closed');
});
it('preserves every answer/key pair before limiting a long source excerpt',()=>{
 const evidence=reviewEvidence({title:'Test',skill:'reading',questions:[{id:'Q42',prompt:'Last question',response:'my response',key:'printed key'}],sourceText:'long context '.repeat(9000),limitations:[]});
 expect(evidence.text).toContain('Q42: Last question\nLearner: my response\nSupplied key: printed key');expect(evidence.text.length).toBeLessThan(29000);
});
it('freezes the learner response at finish time even when the answer is edited before the review starts',async()=>{
 localStorage.setItem('oet-benchmark-v1:freeze','original response');
 vi.mocked(buildTestReviewSnapshot).mockImplementationOnce(async(_id,title,store)=>({title,skill:'reading',questions:[{id:'Q1',prompt:'Selected question',response:store!.getItem('oet-benchmark-v1:freeze')!,key:'source key'}],limitations:[]}));
 queueTestReview('frozen-attempt','Snapshot test');
 localStorage.setItem('oet-benchmark-v1:freeze','later edited response');
 await vi.waitFor(()=>expect(readTestReviews()[0]?.state).toBe('complete'));
 const content=vi.mocked(localAiReply).mock.calls[0][0][1].content;
 expect(content).toContain('original response');expect(content).not.toContain('later edited response');
});
it('uses recorded answer counts instead of an inaccurate AI coverage claim',()=>{
 const result=finalizeTestReview('Useful feedback.\n\n**Coverage and limits**\nAll questions were graded.',{title:'Partial attempt',skill:'reading',questions:[{id:'Q1',prompt:'One',response:'A',key:'A'},{id:'Q2',prompt:'Two',response:'',key:'B'}],limitations:[]});
 expect(result).toContain('1 of 2 questions');expect(result).not.toContain('All questions were graded');
 const evidence=reviewEvidence({title:'Partial attempt',skill:'reading',questions:[{id:'Q1',prompt:'One',response:'A',key:'A'},{id:'Q2',prompt:'Two',response:'',key:'do not reveal this unanswered key'}],limitations:[]});
 expect(evidence.text).not.toContain('do not reveal this unanswered key');
});
