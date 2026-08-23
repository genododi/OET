import type { SessionTask } from '../types/session';

/**
 * Optional, opt-in AI examiner feedback. Calls the public Anthropic API directly from the
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

async function callClaude(system: string, userContent: string, apiKey: string): Promise<AiFeedbackResult | AiFeedbackError> {
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
  if (parsed) return parsed;
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
{"estimatedGrade": "A/B/C+/C/D-style OET band estimate", "summary": "2-3 sentence overall assessment", "strengths": ["short point", "short point"], "improvements": ["short actionable point", "short actionable point"]}`;

export async function getAiWritingFeedback(
  task: SessionTask,
  draft: string,
  apiKey: string,
): Promise<AiFeedbackResult | AiFeedbackError> {
  if (!draft.trim()) {
    return { error: 'Write a draft before requesting AI feedback.' };
  }
  const system = `You are an experienced OET (Occupational English Test) Writing sub-test examiner for the Medicine profession. Grade referral/discharge/transfer/advice letters strictly against the real OET Writing criteria: Purpose, Content, Conciseness & Clarity, Genre, Organisation & Layout, and Language. Be specific and actionable, referencing the candidate's actual wording where relevant. ${RESPONSE_FORMAT_INSTRUCTION}`;
  const userContent = `Task: ${task.title}\n\n${task.prompt ?? ''}\n\n---\nCandidate's letter draft:\n${draft}`;
  return callClaude(system, userContent, apiKey);
}

export async function getAiSpeakingFeedback(
  task: SessionTask,
  transcript: string,
  apiKey: string,
): Promise<AiFeedbackResult | AiFeedbackError> {
  if (!transcript.trim()) {
    return { error: 'No transcript available yet — record or type a response first.' };
  }
  const system = `You are an experienced OET (Occupational English Test) Speaking sub-test examiner for the Medicine profession. Grade the candidate's role-play response strictly against the real OET Speaking criteria: Intelligibility, Fluency, Appropriateness of Language, Resources of Grammar and Expression (linguistic criteria), and Relationship-building, Understanding & Incorporating the Patient's Perspective, Providing Structure, Information-gathering, and Information-giving (clinical communication criteria). This transcript comes from speech-to-text and may contain minor recognition errors — judge content and structure, not transcription artefacts. Be specific and actionable. ${RESPONSE_FORMAT_INSTRUCTION}`;
  const userContent = `Role-play card: ${task.title}\n\n${task.prompt ?? ''}\n\nExpected checklist: ${(task.checklist ?? []).join('; ')}\n\n---\nCandidate's spoken transcript:\n${transcript}`;
  return callClaude(system, userContent, apiKey);
}
