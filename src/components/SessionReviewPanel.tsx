import type { OetSubtest } from '../types';
import type { SessionTask } from '../types/session';
import type { McqEvaluation, WritingEvaluation } from '../lib/oetScoring';
import { getReadinessLevel, readinessLabel } from '../lib/oetScoring';
import type { SpeakingEvaluationResult } from '../lib/speakingEvaluation';
import { speakingPassClass } from '../lib/speakingEvaluation';
import { SubtestBadge } from './SubtestBadge';

interface TaskReviewPanelProps {
  task: SessionTask;
  mcqEval: McqEvaluation | null;
  writingEval: WritingEvaluation | null;
  speakingEval: SpeakingEvaluationResult | null;
  userDraft?: string;
}

function PassBadge({ passed, examReady }: { passed: boolean; examReady?: boolean }) {
  if (examReady) {
    return <span className="oet-badge oet-badge-exam-ready">Exam-ready</span>;
  }
  if (passed) {
    return <span className="oet-badge oet-badge-pass">Practice pass</span>;
  }
  return <span className="oet-badge oet-badge-fail">Needs work</span>;
}

export function TaskReviewPanel({
  task,
  mcqEval,
  writingEval,
  speakingEval,
  userDraft,
}: TaskReviewPanelProps) {
  if (mcqEval) {
    const subtest = task.subtest as OetSubtest;
    const level = getReadinessLevel(subtest, mcqEval.correct ? 100 : 0);

    return (
      <section className="session-review" aria-label="Answer review">
        <div className="session-review-header">
          <h4>Answer review</h4>
          <PassBadge passed={mcqEval.correct} examReady={mcqEval.correct} />
        </div>
        <p className={`session-review-verdict ${mcqEval.correct ? 'review-pass' : 'review-fail'}`}>
          {mcqEval.correct ? 'Correct' : 'Incorrect'} — {mcqEval.explanation}
        </p>
        <p className="session-review-meta">
          Your answer: <strong>{mcqEval.selectedLabel ?? 'None'}</strong> · Correct:{' '}
          <strong>{mcqEval.correctLabel}</strong>
        </p>
        {task.subtest === 'listening' && task.audioTranscript && (
          <details className="session-review-details" open>
            <summary>Audio evidence</summary>
            <p className="session-audio-evidence">“{task.audioTranscript}”</p>
          </details>
        )}
        <details className="session-review-details" open>
          <summary>Why each option passes or fails</summary>
          <ul className="session-review-options">
            {mcqEval.optionFeedback.map((opt) => (
              <li
                key={opt.id}
                className={opt.correct ? 'review-option-correct' : 'review-option-wrong'}
              >
                <strong>{opt.label}</strong>
                <span>{opt.explanation}</span>
              </li>
            ))}
          </ul>
        </details>
        <details className="session-review-details">
          <summary>How to answer perfectly</summary>
          <ul className="session-perfect-tips">
            {mcqEval.perfectAnswerTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
          <p className="session-review-meta">{readinessLabel(level)}</p>
        </details>
      </section>
    );
  }

  if (writingEval) {
    return (
      <section className="session-review" aria-label="Writing review">
        <div className="session-review-header">
          <h4>Writing rubric review</h4>
          <PassBadge passed={writingEval.practicePass} examReady={writingEval.examReady} />
        </div>
        <p className="session-review-meta">
          Overall score: <strong>{writingEval.overallScore}%</strong> · {writingEval.wordCount} words
          (target 180–200)
        </p>
        <div className="session-rubric-grid">
          {writingEval.rubricScores.map((r) => (
            <div
              key={r.dimension}
              className={`session-rubric-item ${r.score >= 75 ? 'rubric-good' : r.score >= 65 ? 'rubric-mid' : 'rubric-low'}`}
            >
              <span className="session-rubric-dim">{r.dimension}</span>
              <span className="session-rubric-score">{r.score}%</span>
              <p className="session-rubric-feedback">{r.feedback}</p>
            </div>
          ))}
        </div>
        {writingEval.gaps.length > 0 && (
          <div className="session-review-gaps">
            <strong>Gaps to address:</strong>
            <ul>
              {writingEval.gaps.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </div>
        )}
        {task.modelAnswer || task.sampleAnswer ? (
          <details className="session-review-details">
            <summary>Model answer snippet</summary>
            <div className="session-sample">
              <pre>{task.modelAnswer ?? task.sampleAnswer}</pre>
            </div>
          </details>
        ) : null}
        {userDraft && (
          <details className="session-review-details">
            <summary>Your draft</summary>
            <div className="session-sample session-sample-user">
              <pre>{userDraft}</pre>
            </div>
          </details>
        )}
        <details className="session-review-details">
          <summary>How to answer perfectly</summary>
          <ul className="session-perfect-tips">
            {writingEval.perfectAnswerTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
          {writingEval.modelPoints.length > 0 && (
            <ul className="session-perfect-tips">
              {writingEval.modelPoints.slice(0, 4).map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </details>
      </section>
    );
  }

  if (speakingEval) {
    return (
      <section className={`session-review speaking-feedback ${speakingPassClass(speakingEval)}`}>
        <div className="session-review-header">
          <h4>Speaking rubric review</h4>
          <PassBadge passed={speakingEval.practicePass} examReady={speakingEval.examReady} />
        </div>
        <p className="session-review-meta">
          Overall: <strong>{speakingEval.score}%</strong> · {speakingEval.wordCount} words ·{' '}
          {speakingEval.wordsPerMinute} wpm
        </p>
        <div className="session-rubric-grid session-rubric-grid-3">
          <div className="session-rubric-item rubric-good">
            <span className="session-rubric-dim">Communication</span>
            <span className="session-rubric-score">{speakingEval.dimensions.communication}%</span>
          </div>
          <div className="session-rubric-item rubric-good">
            <span className="session-rubric-dim">Clinical communication</span>
            <span className="session-rubric-score">
              {speakingEval.dimensions.clinicalCommunication}%
            </span>
          </div>
          <div className="session-rubric-item rubric-good">
            <span className="session-rubric-dim">Language</span>
            <span className="session-rubric-score">{speakingEval.dimensions.language}%</span>
          </div>
        </div>
        <p className="speaking-suggestion">{speakingEval.suggestion}</p>
        {task.speakingCriteria?.samplePhrases && task.speakingCriteria.samplePhrases.length > 0 && (
          <details className="session-review-details" open>
            <summary>Model phrases</summary>
            <ul className="session-perfect-tips">
              {task.speakingCriteria.samplePhrases.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </details>
        )}
        <details className="session-review-details">
          <summary>How to answer perfectly</summary>
          <ul className="session-perfect-tips">
            {speakingEval.perfectAnswerTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </details>
      </section>
    );
  }

  return null;
}

interface SessionSummaryProps {
  title: string;
  review: import('../lib/oetScoring').SessionReviewSummary;
}

export function SessionSummaryPanel({ title, review }: SessionSummaryProps) {
  return (
    <section className="session-summary" aria-label="Session summary">
      <div className="session-summary-overall">
        <p className="session-summary-percent">{review.overallPercent}%</p>
        <p className="session-summary-label">Overall readiness</p>
        {review.overallExamReady ? (
          <span className="oet-badge oet-badge-exam-ready">Grade B equivalent — exam-ready</span>
        ) : review.overallPracticePass ? (
          <span className="oet-badge oet-badge-pass">Practice pass — keep building</span>
        ) : (
          <span className="oet-badge oet-badge-fail">Below practice pass — review weak areas</span>
        )}
      </div>

      <div className="session-summary-subtests">
        {review.subtestScores.map((s) => (
          <div key={s.subtest} className="session-summary-subtest">
            <SubtestBadge subtest={s.subtest} small />
            <span className="session-summary-subtest-score">{s.percentScore}%</span>
            {s.total != null && (
              <span className="session-summary-subtest-detail">
                {s.correct}/{s.total} MCQ
              </span>
            )}
            {s.examReady ? (
              <span className="oet-badge oet-badge-exam-ready oet-badge-sm">Ready</span>
            ) : s.practicePass ? (
              <span className="oet-badge oet-badge-pass oet-badge-sm">Pass</span>
            ) : (
              <span className="oet-badge oet-badge-fail oet-badge-sm">Review</span>
            )}
          </div>
        ))}
      </div>

      {review.weakAreas.length > 0 && (
        <div className="session-review-gaps">
          <strong>Weak areas to focus on:</strong>
          <ul>
            {review.weakAreas.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <details className="session-review-details">
        <summary>Task-by-task review ({review.taskReviews.length})</summary>
        <ul className="session-task-review-list">
          {review.taskReviews.map((tr) => (
            <li key={tr.taskId} className={tr.passed === true ? 'review-pass' : tr.passed === false ? 'review-fail' : ''}>
              <SubtestBadge subtest={tr.subtest as OetSubtest} small />
              {tr.scorePercent != null && <span>{tr.scorePercent}%</span>}
              <span>{tr.summary}</span>
            </li>
          ))}
        </ul>
      </details>

      <p className="session-summary-note meta">
        {title} — thresholds: Listening/Reading 70% practice / 80% exam-ready; Writing/Speaking rubric
        65% / 75%.
      </p>
    </section>
  );
}
