import { useState } from 'react';
import type { SessionTask } from '../types/session';
import { useApiKey } from '../lib/apiKeyStore';
import { useSettingsContext } from '../lib/settingsContext';
import {
  getAiWritingFeedback,
  getAiSpeakingFeedback,
  isAiFeedbackError,
  type AiFeedbackResult,
} from '../lib/aiFeedback';

interface Props {
  task: SessionTask;
  mode: 'writing' | 'speaking';
  draft?: string;
  transcript?: string;
}

export function AiFeedbackPanel({ task, mode, draft, transcript }: Props) {
  const { apiKey, hasKey } = useApiKey();
  const { openSettings } = useSettingsContext();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiFeedbackResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const request = async () => {
    setLoading(true);
    setError(null);
    const outcome =
      mode === 'writing'
        ? await getAiWritingFeedback(task, draft ?? '', apiKey ?? '')
        : await getAiSpeakingFeedback(task, transcript ?? '', apiKey ?? '');
    setLoading(false);
    if (isAiFeedbackError(outcome)) {
      setError(outcome.error);
      setResult(null);
    } else {
      setResult(outcome);
    }
  };

  if (!hasKey) {
    return (
      <div className="ai-feedback-panel ai-feedback-locked">
        <span>🤖 Want a genuine AI examiner read on this response?</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={openSettings}>
          Add your Anthropic API key
        </button>
      </div>
    );
  }

  return (
    <div className="ai-feedback-panel">
      {!result && !loading && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={request}>
          🤖 Get AI examiner feedback
        </button>
      )}
      {loading && <p className="meta">Asking Claude for an examiner-style review…</p>}
      {error && (
        <div className="ai-feedback-error">
          <p>{error}</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={request}>
            Try again
          </button>
        </div>
      )}
      {result && (
        <div className="ai-feedback-result">
          <div className="ai-feedback-header">
            <strong>🤖 AI examiner estimate: {result.estimatedGrade}</strong>
            <button type="button" className="btn btn-ghost btn-sm" onClick={request}>
              Re-run
            </button>
          </div>
          {result.summary && <p>{result.summary}</p>}
          {result.strengths.length > 0 && (
            <div>
              <strong>Strengths</strong>
              <ul>
                {result.strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {result.improvements.length > 0 && (
            <div>
              <strong>Improve next</strong>
              <ul>
                {result.improvements.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="meta ai-feedback-disclaimer">
            AI-generated, not an official OET score — use alongside the rubric review above.
          </p>
        </div>
      )}
    </div>
  );
}
