import { isDesktop } from './desktop';
export const hasLocalAi = isDesktop;
export interface LocalMessage { role: 'system' | 'user' | 'assistant'; content: string }
export async function localAiRequest(messages: LocalMessage[], signal: AbortSignal, stream = false, json = false, temperature?: number, careful = false) {
  const result = await fetch(`${import.meta.env.BASE_URL}desktop/ai/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
    body: JSON.stringify({ messages, stream, json, max_tokens: json ? 1100 : 1600, ...(temperature !== undefined ? {temperature} : {}), ...(careful ? {careful:true} : {}) }),
  });
  if (!result.ok) {
    const data = await result.json().catch(() => null);
    throw new Error(typeof data?.error === 'string' ? data.error : 'The local mentor could not respond. Close other heavy apps and retry.');
  }
  return result;
}
export async function localAiReply(messages: LocalMessage[], signal: AbortSignal, onText: (text: string) => void, temperature?: number, careful = false) {
  const result = await localAiRequest(messages, signal, true, false, temperature, careful);
  if (!result.body) throw Error('The local mentor returned no reply.');
  const reader = result.body.getReader(), decoder = new TextDecoder();
  let buffer = '', text = '', finished = false;
  try {
    while (true) {
      const chunk = await reader.read();
      buffer += decoder.decode(chunk.value, { stream: !chunk.done }).replace(/\r\n/g, '\n');
      const lines = buffer.split('\n'); buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const raw = line.slice(5).trim();
        if (raw === '[DONE]') { finished = true; continue; }
        const event = JSON.parse(raw);
        if (event.error) throw Error('The local mentor was interrupted. Please retry.');
        if (event.choices?.[0]?.finish_reason === 'length') throw Error('The reply reached its limit. Ask a shorter question.');
        const delta = event.choices?.[0]?.delta?.content;
        if (typeof delta === 'string') { text += delta; if (text.length > 16000) throw Error('The reply was too long. Ask a more focused question.'); onText(text); }
      }
      if (chunk.done) break;
    }
    if (!finished || !text.trim()) throw Error('The local mentor did not finish. Try again.');
    return text;
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
