import { expect, it } from 'vitest';
import { automaticMentorObservation, automaticReviewReady } from './automaticMentor';
import { bankBySubtest } from '../data/sessionTaskBank';
import { buildMentorSystemPrompt, mentorGreeting } from './mentor';
it('follows actual answers and current draft without turning partial work into a score',()=>{
 expect(automaticMentorObservation(bankBySubtest.reading[0],'1. first\n2. \n3. third').progress).toContain('2 numbered answers');
 const observation=automaticMentorObservation(bankBySubtest.writing[0],'My short opening sentence.');
 expect(observation.stage).toBe('Draft in progress');expect(observation.progress).toContain('4 words');expect(observation).not.toHaveProperty('score');
 expect(automaticReviewReady('writing','short draft')).toBe(false);
 expect(automaticReviewReady('writing',Array(45).fill('word').join(' '))).toBe(true);
});
it('gives direct guidance and tells the local model not to routinely quiz the learner',()=>{
 const task=bankBySubtest.reading[0];
 expect(mentorGreeting(task)).not.toContain('?');
 expect(buildMentorSystemPrompt({task,response:'',action:'strategy',messages:[],hintLevel:0,learnerMemory:''})).toContain('Do not quiz the learner');
});
