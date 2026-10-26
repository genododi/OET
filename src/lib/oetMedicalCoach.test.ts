import { describe, expect, it } from 'vitest';
import { buildMedicalEvidencePacket, evidenceExcerpt } from './oetMedicalCoach';
import { buildMentorSystemPrompt, guidedMentorReply, type MentorContext } from './mentor';
import { buildLocalMentorConversation } from './mentorApi';
import type { SessionTask } from '../types/session';

const task: SessionTask = { id: 'case-fidelity', subtest: 'writing', title: 'Urgent referral', instructions: 'Write a referral to the surgeon.', prompt: 'Possible appendicitis, not confirmed. Mother has diabetes. Patient is allergic to penicillin. Request same-day assessment.' };
const context: MentorContext = { task, response: 'She has confirmed appendicitis and diabetes.', learnerMemory: '', hintLevel: 0, action: 'feedback', messages: [{id:'u',role:'user',text:'Check whether my clinical facts match the notes.'}] };

describe('medical OET evidence and context', () => {
  it('retains the source ending and current draft as valid JSON instead of chopping the request', () => {
    const source = 'Beginning of case.\n' + 'Unrelated administrative history.\n'.repeat(1200) + '\nUrgent same-day assessment. Penicillin allergy.';
    const response = 'Dear Dr Smith,\n' + 'Background wording. '.repeat(500) + '\nFINAL CLAIM: No known allergies.';
    const prompt = buildMentorSystemPrompt({...context, task:{...task,prompt:source}, response}, 14000);
    expect(prompt.length).toBeLessThanOrEqual(14000);
    const packet=JSON.parse(prompt.split('Lesson data: ')[1]);
    expect(packet.caseOrQuestion).toContain('Penicillin allergy');
    expect(packet.learnerResponse).toContain('FINAL CLAIM: No known allergies');
    expect(packet.omittedSections).toContain('caseOrQuestion');
    expect(packet.omittedSections).toContain('learnerResponse');
  });
  it('keeps short case notes and an ordinary OET letter complete, including quoted and non-ASCII text', () => {
    const response='Dear Dr Sánchez, I am referring Mrs Lane for urgent assessment of possible appendicitis. She reports a penicillin allergy.';
    const packet=JSON.parse(buildMedicalEvidencePacket({task,response,reveal:true}));
    expect(packet.learnerResponse).toBe(response);expect(packet.caseOrQuestion).toBe(task.prompt);
    expect(packet.omittedSections).toEqual([]);
    const noisy={...task, prompt:'"\\\n'.repeat(3000), options:Array.from({length:20},(_,i)=>({id:String(i),label:'"long option"'.repeat(100),explanation:'"example"'.repeat(100),correct:i===0}))};
    const bounded=buildMedicalEvidencePacket({task:noisy,response,reveal:true,maxChars:9000});
    expect(bounded.length).toBeLessThanOrEqual(9000);expect(JSON.parse(bounded).optionsOmitted).toBe(true);
    expect(JSON.parse(bounded).learnerResponse).toBe(response);
  });
  it('retrieves relevant middle evidence as well as both ends and labels omissions', () => {
    const excerpt=evidenceExcerpt('START\n'+'irrelevant text '.repeat(100)+'\nInsulin was stopped on Tuesday.\n'+'other background '.repeat(100)+'END',600,'insulin stopped Tuesday');
    expect(excerpt).toContain('START');expect(excerpt).toContain('END');expect(excerpt).toContain('Insulin was stopped');expect(excerpt).toContain('omitted');expect(excerpt.length).toBeLessThanOrEqual(600);
  });
  it('preserves the latest doctor question instead of losing its final clinical qualifier', () => {
    const messages=Array.from({length:6},(_,i)=>({id:String(i),role:i%2?'user' as const:'assistant' as const,text:'Old turn '.repeat(500)}));
    messages.push({id:'last',role:'user',text:'Please review this wording. '.repeat(80)+'IMPORTANT: the mother has diabetes, not the patient.'});
    const conversation=buildLocalMentorConversation({...context,messages});
    expect(conversation.at(-1)?.content).toContain('the mother has diabetes, not the patient');
    expect(conversation.reduce((sum,m)=>sum+m.content.length,0)).toBeLessThanOrEqual(6500);
    expect(conversation[0].role).toBe('user');
  });
  it('gives source-based coaching rules without giving a patient hidden keys or scoring absent evidence', () => {
    const speaking={...context,task:{...task,subtest:'speaking' as const, audioTranscript:'HIDDEN_KEY'},action:'patient' as const};
    const prompt=buildMentorSystemPrompt(speaking,14000);
    expect(prompt).toContain('SIMULATED PATIENT');expect(prompt).toContain('not doctor task instructions as patient history');expect(prompt).not.toContain('HIDDEN_KEY');
    expect(buildMentorSystemPrompt(context)).toContain('family versus personal history');
    expect(guidedMentorReply({...context,task:{...task,subtest:'reading'}})).toContain('No verified answer key');
    expect(guidedMentorReply({...context,task:{...task,subtest:'reading'}})).not.toContain('Clinical communication');
  });
});
