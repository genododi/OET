import { afterEach, expect, it, vi } from 'vitest';
import { localAiReply } from './localAi';
import { getAiWritingFeedback } from './aiFeedback';

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
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ estimatedGrade: 'Practice review only', summary: 'Make the referral purpose clear.', strengths: ['Formal opening'], improvements: ['State the urgent request in sentence one.'] }) } }] }))));
  const result = await getAiWritingFeedback({ id: 'writing', subtest: 'writing', title: 'Referral', instructions: 'Write a referral letter.' }, 'Dear Dr Smith, I am referring the patient.', '');
  expect(result).toMatchObject({ summary: 'Make the referral purpose clear.' });
});
