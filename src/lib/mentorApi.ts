import { buildMentorSystemPrompt, type MentorContext } from './mentor';

export const MENTOR_MODEL = 'claude-sonnet-5';
export const MENTOR_TIMEOUT_MS = 60_000;
const MAX_REPLY_CHARS = 16000;

/** Parses split SSE frames and exposes only text, never private thinking events. */
export function createMentorStreamParser(onText: (text: string) => void) {
  let buffer = '';
  let reply = '';
  let finished = false;
  let truncated = false;
  const parseFrame = (frame: string) => {
    const data = frame.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n');
    if (!data || data === '[DONE]') return;
    let event;
    try { event = JSON.parse(data); } catch { throw new Error('The tutor sent an unreadable reply. Please try again.'); }
    if (event.type === 'error') throw new Error('The tutor connection was interrupted. Please try again.');
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta' && typeof event.delta.text === 'string') {
      reply += event.delta.text;
      if (reply.length > MAX_REPLY_CHARS) throw new Error('The tutor reply was too long. Ask a more focused question.');
      onText(reply);
    }
    if (event.type === 'message_delta' && event.delta?.stop_reason === 'max_tokens') truncated = true;
    if (event.type === 'message_stop') finished = true;
  };
  return {
    push(chunk: string) {
      buffer += chunk;
      // Preserve a trailing CR until the next chunk in case it splits a CRLF pair.
      buffer = buffer.replace(/\r\n/g, '\n');
      if (buffer.length > 100000) throw new Error('The tutor stream was too large. Please retry.');
      let boundary;
      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        parseFrame(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
      }
    },
    finish() {
      if (buffer.trim()) parseFrame(buffer);
      if (!finished) throw new Error('The connection ended before the tutor finished. Please retry.');
      if (!reply.trim()) throw new Error('The tutor returned no text. Please retry.');
      if (truncated) throw new Error('The tutor reached its reply limit. Ask a shorter question and retry.');
      return reply;
    },
  };
}

export async function streamMentorReply(context: MentorContext, apiKey: string, signal: AbortSignal, onText: (text: string) => void): Promise<string> {
  if (!apiKey.trim()) throw new Error('Add your Anthropic API key in Settings to start Live AI.');
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal.aborted) controller.abort();
  signal.addEventListener('abort', cancel, { once: true });
  let timedOut = false;
  const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, MENTOR_TIMEOUT_MS);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    // Full conversation remains on device; send a bounded recent window.
    const messages = context.messages.slice(-20).map((message) => ({ role: message.role, content: message.text.slice(0, 12000) }));
    while (messages[0]?.role === 'assistant') messages.shift();
    if (!messages.length) throw new Error('Ask a question to start the conversation.');
    const result = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: controller.signal,
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey.trim(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: MENTOR_MODEL, max_tokens: 2400, thinking: { type: 'disabled' }, stream: true, system: buildMentorSystemPrompt(context), messages }),
    });
    if (!result.ok) {
      const errors: Record<number, string> = { 401: 'The API key was rejected. Update it in Settings.', 403: 'This API account cannot access the tutor model.', 429: 'The provider is busy or your usage limit was reached. Try again shortly.' };
      throw new Error(errors[result.status] ?? `The tutor service returned ${result.status}. Try again or use the built-in guide.`);
    }
    if (!result.body) throw new Error('Streaming is unavailable in this browser. Try another browser or use the built-in guide.');
    reader = result.body.getReader();
    const decoder = new TextDecoder();
    const parser = createMentorStreamParser(onText);
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      parser.push(decoder.decode(value, { stream: true }));
    }
    parser.push(decoder.decode());
    return parser.finish();
  } catch (error) {
    if (timedOut) throw new Error('The tutor timed out after 60 seconds. Your lesson is saved; try again or use the built-in guide.', { cause: error });
    if (signal.aborted) throw new DOMException('Stopped', 'AbortError');
    if (error instanceof TypeError) throw new Error('Could not connect to the tutor. Check your connection or use the built-in guide.', { cause: error });
    throw error;
  } finally {
    window.clearTimeout(timeout);
    signal.removeEventListener('abort', cancel);
    await reader?.cancel().catch(() => {});
    reader?.releaseLock();
  }
}
