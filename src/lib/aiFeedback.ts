import type { SessionTask } from '../types/session';
import { hasLocalAi, localAiRequest } from './localAi';
import { buildMedicalEvidencePacket, MEDICAL_COACH_POLICY, MEDICAL_SKILL_FOCUS } from './oetMedicalCoach';
import { medicalReviewMessages } from './medicalReview';

/**
 * OET communication coaching: the Mac uses the local model and a second evidence check.
 * The optional browser connection calls the public Anthropic API directly from the
 * browser using a key the person pastes into Settings (stored only in their own localStorage —
 * see lib/apiKeyStore.ts). This app has no backend, so the key never touches any server of ours;
 * requests go straight from the browser to api.anthropic.com.
 *
 * Model id may need updating over time — check https://platform.claude.com/docs for current model strings
 * if requests start failing with a "model not found" style error.
 */
const MODEL = 'claude-sonnet-5';
const API_URL = 'https://api.anthropic.com/v1/messages';
const REQUEST_TIMEOUT_MS = 30_000;

export interface AiFeedbackResult {
  estimatedGrade: string;
  summary: string;
  strengths: string[];
  improvements: string[];
}

export interface AiFeedbackError {
  error: string;
}

function isAiFeedbackError(x: AiFeedbackResult | AiFeedbackError): x is AiFeedbackError {
  return 'error' in x;
}

export { isAiFeedbackError };

async function callClaude(system: string, userContent: string, apiKey: string, task: SessionTask, learnerResponse: string): Promise<AiFeedbackResult | AiFeedbackError> {
  if (hasLocalAi()) {
    try {
      const signal = AbortSignal.timeout(240_000);
      const result = await localAiRequest([{ role: 'system', content: system }, { role: 'user', content: userContent }], signal, false, true);
      const data = await result.json();
      const draft = data?.choices?.[0]?.message?.content;
      if (!parseAiFeedback(draft ?? '')) return { error: 'The local mentor did not return a complete review. Please retry.' };
      const checked = await localAiRequest(medicalReviewMessages(task, learnerResponse, draft, RESPONSE_FORMAT_INSTRUCTION), signal, false, true, 0, true);
      const final = await checked.json();
      const parsed = parseAiFeedback(final?.choices?.[0]?.message?.content ?? '');
      return parsed ? {...parsed,estimatedGrade:'Practice review only'} : { error: 'The local mentor did not return a complete review. Please retry.' };
    } catch (error) { return { error: error instanceof Error ? error.message : 'The local mentor could not respond.' }; }
  }
  if (!apiKey.trim()) {
    return { error: 'No API key set. Add your Anthropic API key in Settings to use AI feedback.' };
  }

  let response: Response;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system,
        messages: [{ role: 'user', content: userContent }],
      }),
      signal: controller.signal,
    });
  } catch (error) {
    return {
      error:
        error instanceof DOMException && error.name === 'AbortError'
          ? 'The AI review timed out after 30 seconds. Your built-in tutor feedback is still available.'
          : 'Network error reaching the Anthropic API. Your built-in tutor feedback is still available.',
    };
  } finally {
    window.clearTimeout(timeout);
  }

  if (response.status === 401) {
    return { error: 'That API key was rejected (401). Double-check it in Settings.' };
  }
  if (response.status === 429) {
    return { error: 'Rate limited by the Anthropic API (429). Wait a moment and try again.' };
  }
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return { error: `Anthropic API error (${response.status}). ${text.slice(0, 200)}` };
  }

  const data = await response.json().catch(() => null);
  const textBlock = data?.content?.find((c: { type: string }) => c.type === 'text');
  const raw: string | undefined = textBlock?.text;
  if (!raw) {
    return { error: 'Received an empty response from the API.' };
  }

  const parsed = parseAiFeedback(raw);
  if (parsed) return {...parsed,estimatedGrade:'Practice review only'};
  return {
    error: 'The AI response did not match the required feedback format. Your built-in tutor feedback is still available.',
  };
}

export function parseAiFeedback(raw: string): AiFeedbackResult | null {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    if (typeof parsed.estimatedGrade !== 'string') return null;
    if (typeof parsed.summary !== 'string') return null;
    if (!Array.isArray(parsed.strengths) || !Array.isArray(parsed.improvements)) return null;
    return {
      estimatedGrade: parsed.estimatedGrade.slice(0, 80),
      summary: parsed.summary.slice(0, 1_000),
      strengths: parsed.strengths.map(String).map((value) => value.slice(0, 300)).slice(0, 6),
      improvements: parsed.improvements.map(String).map((value) => value.slice(0, 300)).slice(0, 6),
    };
  } catch {
    return null;
  }
}

const RESPONSE_FORMAT_INSTRUCTION = `Respond with ONLY a JSON object (no markdown fences, no preamble) in exactly this shape:
{"estimatedGrade": "Practice review only", "summary": "2-3 sentences identifying the most important evidence-based priority and any missing source", "strengths": ["specific strength evidenced by actual candidate wording"], "improvements": ["criterion: actual wording → why it matters → fact-preserving suggested wording", "one short next drill"]}`;

export async function getAiWritingFeedback(
  task: SessionTask,
  draft: string,
  apiKey: string,
): Promise<AiFeedbackResult | AiFeedbackError> {
  if (!draft.trim()) {
    return { error: 'Write a draft before requesting AI feedback.' };
  }
  const system = `${MEDICAL_COACH_POLICY}
${MEDICAL_SKILL_FOCUS.writing}
Evaluate the draft against the supplied notes, not an imagined ideal case. If the draft changes a clinical fact, identify the exact discrepancy before polishing grammar. Do not assign an official band or turn heuristic percentages into OET scores. ${RESPONSE_FORMAT_INSTRUCTION}`;
  const userContent = buildMedicalEvidencePacket({ task, response: draft, reveal: true, query: 'reader purpose requested action clinical factual accuracy urgency medication allergy chronology', maxChars: 12000 });
  return callClaude(system, userContent, apiKey, task, draft);
}

export async function getAiSpeakingFeedback(
  task: SessionTask,
  transcript: string,
  apiKey: string,
): Promise<AiFeedbackResult | AiFeedbackError> {
  if (!transcript.trim()) {
    return { error: 'No transcript available yet — record or type a response first.' };
  }
  const system = `${MEDICAL_COACH_POLICY}
${MEDICAL_SKILL_FOCUS.speaking}
This is text-only review. Speech recognition can mishear names and medical terms; flag an ambiguous word for checking instead of inventing a correction. Do not grade pronunciation, accent, intelligibility or actual fluency. Assess only evidenced communication and language; do not assign an overall speaking band from text. ${RESPONSE_FORMAT_INSTRUCTION}`;
  const userContent = buildMedicalEvidencePacket({ task, response: transcript, reveal: true, query: 'patient concerns empathy explanation understanding next step clinical meaning', maxChars: 12000 });
  return callClaude(system, userContent, apiKey, task, transcript);
}
