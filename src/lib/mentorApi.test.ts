import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMentorStreamParser, MENTOR_TIMEOUT_MS, streamMentorReply } from './mentorApi';
import { bankBySubtest } from '../data/sessionTaskBank';
import type { MentorContext } from './mentor';

const context: MentorContext = { task: bankBySubtest.reading[0], response: '', action: 'hint', hintLevel: 1, learnerMemory: 'Reading needs work', messages: [{ id: 'u1', role: 'user', text: 'Give me a hint.' }] };
const delta = (text: string) => `event: content_block_delta\ndata: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text } })}\n\n`;
const stop = 'event: message_stop\ndata: {"type":"message_stop"}\n\n';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('streamed tutor replies', () => {
  it('handles arbitrary chunk boundaries and ignores thinking blocks', () => {
    const onText = vi.fn();
    const parser = createMentorStreamParser(onText);
    const events = 'data: {"type":"content_block_delta","delta":{"type":"thinking_delta","thinking":"private"}}\n\n' + delta('Find the ') + delta('evidence.') + stop;
    for (let index = 0; index < events.length; index += 7) parser.push(events.slice(index, index + 7));
    expect(parser.finish()).toBe('Find the evidence.');
    expect(onText).toHaveBeenLastCalledWith('Find the evidence.');
    expect(onText.mock.calls.flat().join('')).not.toContain('private');
  });
  it('reports truncated streams and provider errors rather than treating partial replies as complete', () => {
    const parser = createMentorStreamParser(() => {});
    parser.push(delta('Partial'));
    expect(() => parser.finish()).toThrow('before the tutor finished');
    expect(() => parser.push('data: {"type":"error"}\n\n')).toThrow('interrupted');
  });
  it('supports CRLF frames and detects the output limit', () => {
    const parser = createMentorStreamParser(() => {});
    parser.push((delta('A reply') + stop).replace(/\n/g, '\r\n'));
    expect(parser.finish()).toBe('A reply');
    expect(() => createMentorStreamParser(() => {}).push(delta('a'.repeat(16001)))).toThrow('too long');
  });
  it('sends a bounded conversation with the correct model and streams the answer', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(delta('Which word limits the claim?') + stop, { headers: { 'content-type': 'text/event-stream' } }));
    vi.stubGlobal('fetch', fetch);
    const text = await streamMentorReply(context, 'test-key', new AbortController().signal, () => {});
    expect(text).toContain('limits the claim');
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body).toMatchObject({ model: 'claude-sonnet-5', stream: true, messages: [{ role: 'user', content: 'Give me a hint.' }] });
    expect(body.system).toContain('Reading needs work');
    expect(body.system).not.toContain('test-key');
  });
  it('handles rejected credentials without echoing provider response bodies', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('private diagnostic', { status: 401 })));
    await expect(streamMentorReply(context, 'invalid', new AbortController().signal, () => {})).rejects.toThrow('API key was rejected');
  });
  it('times out an unresponsive request and supports user cancellation', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    })));
    const pending = streamMentorReply(context, 'key', new AbortController().signal, () => {});
    const check = expect(pending).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(MENTOR_TIMEOUT_MS);
    await check;
    const controller = new AbortController();
    const cancelled = streamMentorReply(context, 'key', controller.signal, () => {});
    const cancelledCheck = expect(cancelled).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await cancelledCheck;
  });
});
