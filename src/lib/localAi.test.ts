import { afterEach, expect, it, vi } from 'vitest';
import { localAiReply } from './localAi';
import { getAiWritingFeedback } from './aiFeedback';
import { streamMentorReply } from './mentorApi';

afterEach(() => vi.unstubAllGlobals());
it('streams the local mentor without a provider key and never exposes reasoning fields', async () => {
  vi.stubGlobal('oetDesktop', {});
  const events = ['data: {"choices":[{"delta":{"reasoning_content":"hidden"}}]}\n\n', 'data: {"choices":[{"delta":{"content":"Read the "}}]}\n\n', 'data: {"choices":[{"delta":{"content":"question first."},"finish_reason":"stop"}]}\n\n', 'data: [DONE]\n\n'];
  const fetcher = vi.fn().mockResolvedValue(new Response(new ReadableStream({ start(controller) { for (const event of events) for (let i = 0; i < event.length; i += 9) controller.enqueue(new TextEncoder().encode(event.slice(i, i + 9))); controller.close(); } })));
  vi.stubGlobal('fetch', fetcher);
  const changed = vi.fn();
  expect(await localAiReply([{ role: 'user', content: 'How should I start?' }], new AbortController().signal, changed)).toBe('Read the question first.');
  expect(fetcher.mock.calls[0][0]).toContain('desktop/ai/chat');
  expect(fetcher.mock.calls[0][1].headers).not.toHaveProperty('x-api-key');
  expect(changed.mock.calls.flat().join('')).not.toContain('hidden');
});
it('reviews a writing response locally with an empty API key', async () => {
  vi.stubGlobal('oetDesktop', {});
  vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ estimatedGrade: 'Practice review only', summary: 'Make the referral purpose clear.', strengths: ['Formal opening'], improvements: ['State the urgent request in sentence one.'] }) } }] }))));
  const result = await getAiWritingFeedback({ id: 'writing', subtest: 'writing', title: 'Referral', instructions: 'Write a referral letter.' }, 'Dear Dr Smith, I am referring the patient.', '');
  expect(result).toMatchObject({ summary: 'Make the referral purpose clear.' });
});

it('checks a local clinical review before displaying it, without leaking the unchecked draft', async () => {
  vi.stubGlobal('oetDesktop', {});
  const event=(text:string)=>new Response(`data: ${JSON.stringify({choices:[{delta:{content:text},finish_reason:'stop'}]})}\n\ndata: [DONE]\n\n`);
  const fetcher=vi.fn().mockResolvedValueOnce(event('Unchecked invented clinical detail.')).mockResolvedValueOnce(event('The source says suspected, so preserve that uncertainty.'));
  vi.stubGlobal('fetch',fetcher);const shown=vi.fn();
  const text=await streamMentorReply({task:{id:'w',subtest:'writing',title:'Referral',instructions:'Use the notes.',prompt:'Suspected appendicitis.'},response:'Confirmed appendicitis.',action:'feedback',hintLevel:0,learnerMemory:'',messages:[{id:'u',role:'user',text:'Review my draft.'}]},'',new AbortController().signal,shown);
  expect(text).toContain('preserve that uncertainty');expect(fetcher).toHaveBeenCalledTimes(2);
  expect(shown.mock.calls.flat().join('')).not.toContain('Unchecked invented');
  const audit=JSON.parse(fetcher.mock.calls[1][1].body);expect(audit.temperature).toBe(0);
  expect(audit.messages[1].content).toContain('Suspected appendicitis');
  expect(audit.messages[1].content).not.toContain('Unchecked invented clinical detail.');
  expect(audit.messages[1].content).toContain('Confirmed appendicitis');
  expect(fetcher.mock.calls[1][1].headers).not.toHaveProperty('x-api-key');
});

it('checks patient replies against the card without including protected keys', async () => {
  vi.stubGlobal('oetDesktop', {});
  const event=(text:string)=>new Response(`data: ${JSON.stringify({choices:[{delta:{content:text},finish_reason:'stop'}]})}\n\ndata: [DONE]\n\n`);
  const fetcher=vi.fn().mockResolvedValueOnce(event('I have not been told that result.'));
  vi.stubGlobal('fetch',fetcher);
  await streamMentorReply({task:{id:'s',subtest:'speaking',title:'Card',instructions:'Discuss the worry.',prompt:'The patient is worried about an inhaler.',audioTranscript:'SECRET_KEY'},response:'',action:'patient',hintLevel:0,learnerMemory:'',messages:[{id:'u',role:'user',text:'What is your oxygen saturation?'}]},'',new AbortController().signal,()=>{});
  expect(fetcher).toHaveBeenCalledTimes(1);
  const audit=JSON.parse(fetcher.mock.calls[0][1].body);
  expect(audit.messages[1].content).toContain('oxygen saturation');
  expect(audit.messages[1].content).not.toContain('SECRET_KEY');
  expect(audit.messages[0].content).toContain('Doctor task instructions are not patient history');
});
