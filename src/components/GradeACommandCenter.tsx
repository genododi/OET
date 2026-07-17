import { useMemo } from 'react';
import type { OetSubtest } from '../types';
import type { CompletedSession } from '../types/session';
import { summarizeSubtestHistory } from '../lib/taskHistory';
import { GRADE_A_TRAINING_TARGETS } from '../lib/oetThresholds';
import { SubtestBadge } from './SubtestBadge';

const SUBTESTS: OetSubtest[] = ['listening', 'reading', 'writing', 'speaking'];

const PRESCRIPTIONS: Record<OetSubtest, { focus: string; gate: string }> = {
  listening: {
    focus: 'Train evidence capture: numbers, names, negation, and speaker purpose.',
    gate: 'Two timed sets at 90%+ with every error explained from the audio.',
  },
  reading: {
    focus: 'Practise fast gist, synonym matching, and rejecting partial-match distractors.',
    gate: 'Two timed sets at 90%+ without sacrificing Part A timing.',
  },
  writing: {
    focus: 'Write purpose-first, select only relevant notes, and edit for clear professional English.',
    gate: 'Three letters that meet every checklist point after independent review.',
  },
  speaking: {
    focus: 'Lead with empathy, use patient language, signpost clearly, and safety-net naturally.',
    gate: 'Three recorded role-plays with a complete clinical-communication checklist.',
  },
};

interface Props {
  completed: CompletedSession[];
  onStartSmart: (subtests?: OetSubtest[]) => void;
}

export function GradeACommandCenter({ completed, onStartSmart }: Props) {
  const summaries = useMemo(() => summarizeSubtestHistory(completed, SUBTESTS, 6), [completed]);
  const priority = useMemo(
    () =>
      [...summaries].sort((a, b) => {
        const aGap = a.rollingPercent === null ? 999 : GRADE_A_TRAINING_TARGETS[a.subtest] - a.rollingPercent;
        const bGap = b.rollingPercent === null ? 999 : GRADE_A_TRAINING_TARGETS[b.subtest] - b.rollingPercent;
        return bGap - aGap;
      })[0],
    [summaries],
  );

  const masteredCount = summaries.filter(
    (s) => s.rollingPercent !== null && s.rollingPercent >= GRADE_A_TRAINING_TARGETS[s.subtest],
  ).length;
  const hasAnyBaseline = summaries.some((s) => s.rollingPercent !== null);
  const nextPriority = hasAnyBaseline ? priority : undefined;

  return (
    <section className="card grade-a-command" aria-labelledby="grade-a-title">
      <div className="grade-a-head">
        <div>
          <span className="grade-a-eyebrow">Grade A training system</span>
          <h2 id="grade-a-title">A-grade command center</h2>
          <p className="meta">
            A strict, evidence-based plan across all four skills — designed to make an A-grade performance repeatable, not lucky.
          </p>
        </div>
        <div className="grade-a-score" aria-label={`${masteredCount} of 4 skills at internal target`}>
          <strong>{masteredCount}/4</strong>
          <span>skills at target</span>
        </div>
      </div>

      <div className="grade-a-grid">
        {summaries.map((summary) => {
          const target = GRADE_A_TRAINING_TARGETS[summary.subtest];
          const score = summary.rollingPercent;
          const gap = score === null ? null : target - score;
          const isOnTarget = gap !== null && gap <= 0;
          return (
            <article key={summary.subtest} className={`grade-a-skill ${isOnTarget ? 'grade-a-skill-ready' : ''}`}>
              <div className="grade-a-skill-top">
                <SubtestBadge subtest={summary.subtest} small />
                <span className={isOnTarget ? 'grade-a-status-ready' : 'grade-a-status'}>
                  {score === null
                    ? 'Baseline needed'
                    : isOnTarget
                      ? 'Target met'
                      : `${Math.max(0, gap ?? 0)} pts to target`}
                </span>
              </div>
              <div className="grade-a-progress-label">
                <strong>{score === null ? '—' : `${score}%`}</strong>
                <span>internal target {target}%</span>
              </div>
              <div className="grade-a-track" aria-hidden="true">
                <span style={{ width: `${Math.min(100, score ?? 0)}%` }} />
                <i style={{ left: `${target}%` }} />
              </div>
              <p>{PRESCRIPTIONS[summary.subtest].focus}</p>
              <small>{PRESCRIPTIONS[summary.subtest].gate}</small>
              <button type="button" className="link-btn grade-a-drill" onClick={() => onStartSmart([summary.subtest])}>
                Train {summary.subtest} →
              </button>
            </article>
          );
        })}
      </div>

      <div className="grade-a-next">
        <div>
          <span className="grade-a-next-label">Next best move</span>
          <strong>{nextPriority ? `Prioritise ${nextPriority.subtest}` : 'Establish your baseline'}</strong>
          <p>{nextPriority ? PRESCRIPTIONS[nextPriority.subtest].focus : 'Complete a mixed Smart Session to reveal your starting point.'}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => onStartSmart(nextPriority ? [nextPriority.subtest] : undefined)}>
          {nextPriority ? `Start ${nextPriority.subtest} focus` : 'Start baseline session'}
        </button>
      </div>
      <p className="grade-a-disclaimer">
        Internal readiness targets, not an official OET score conversion. Use timed full mocks and qualified feedback to validate exam readiness.
      </p>
    </section>
  );
}
