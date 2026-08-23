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
import {
  buildOfflineSpeakingFeedback,
  buildOfflineWritingFeedback,
} from '../lib/offlineTutor';

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
  const responseText = mode === 'writing' ? draft ?? '' : transcript ?? '';
  const offline = responseText.trim()
    ? mode === 'writing'
      ? buildOfflineWritingFeedback(task, responseText)
      : buildOfflineSpeakingFeedback(task, responseText)
    : null;

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

  return (
    <div className="ai-feedback-panel">
      {offline && (
        <div className="offline-tutor-result" data-testid="offline-tutor-result">
          <div className="ai-feedback-header">
            <strong>Built-in tutor: {offline.estimatedGrade}</strong>
            <span className="tag">Works offline</span>
          </div>
          <div className="tutor-rubric-grid">
            {offline.rubricScores.map((rubric) => (
              <div key={rubric.dimension} className="tutor-rubric-item">
                <span>{rubric.dimension}</span>
                <strong>{rubric.score}%</strong>
              </div>
            ))}
          </div>
          {offline.strengths.length > 0 && (
            <p><strong>Working well:</strong> {offline.strengths.join(' ')}</p>
          )}
          {offline.improvements.length > 0 && (
            <p><strong>Improve next:</strong> {offline.improvements.join(' ')}</p>
          )}
          <p><strong>Next drill:</strong> {offline.nextDrill}</p>
          <p className="meta ai-feedback-disclaimer">{offline.disclaimer}</p>
        </div>
      )}

      {!hasKey && (
        <div className="ai-feedback-locked">
          <span>Optional: add your own Anthropic key for a second AI review.</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={openSettings}>
            AI settings
          </button>
        </div>
      )}

      {hasKey && !result && !loading && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={request}>
          Get optional AI review
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
