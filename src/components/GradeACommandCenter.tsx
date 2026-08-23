import { useMemo } from 'react';
import type { OetSubtest } from '../types';
import type { CompletedSession } from '../types/session';
import { summarizeSubtestHistory } from '../lib/taskHistory';
import {
  assessGradeATrainingReadiness,
  GRADE_A_EVIDENCE_REQUIREMENTS,
  GRADE_A_TRAINING_TARGETS,
} from '../lib/oetThresholds';
import { SubtestBadge } from './SubtestBadge';

const SUBTESTS: OetSubtest[] = ['listening', 'reading', 'writing', 'speaking'];

const PRESCRIPTIONS: Record<OetSubtest, { focus: string; gate: string }> = {
  listening: {
    focus: 'Train evidence capture: numbers, names, negation, and speaker purpose.',
    gate: 'Three timed sets, with the latest two at 90%+ and every error explained from the audio.',
  },
  reading: {
    focus: 'Practise fast gist, synonym matching, and rejecting partial-match distractors.',
    gate: 'Three timed sets, with the latest two at 90%+ without sacrificing Part A timing.',
  },
  writing: {
    focus: 'Write purpose-first, select only relevant notes, and edit for clear professional English.',
    gate: 'Three letters, with the latest two at 85%+ and every rubric dimension reviewed.',
  },
  speaking: {
    focus: 'Lead with empathy, use patient language, signpost clearly, and safety-net naturally.',
    gate: 'Three recorded role-plays, with the latest two at 85%+ and a complete checklist.',
  },
};

interface Props {
  completed: CompletedSession[];
  onStartSmart: (subtests?: OetSubtest[]) => void;
}

export function GradeACommandCenter({ completed, onStartSmart }: Props) {
  const summaries = useMemo(() => summarizeSubtestHistory(completed, SUBTESTS, 6), [completed]);
  const readinessBySubtest = useMemo(
    () =>
      new Map(
        summaries.map((summary) => [
          summary.subtest,
          assessGradeATrainingReadiness(
            summary.subtest,
            summary.trend.map((point) => point.percentScore),
          ),
        ]),
      ),
    [summaries],
  );
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
    (summary) => readinessBySubtest.get(summary.subtest)?.status === 'target-met',
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
          const readiness = readinessBySubtest.get(summary.subtest)!;
          const score = readiness.rollingPercent;
          const gap = score === null ? null : target - score;
          const isOnTarget = readiness.status === 'target-met';
          return (
            <article key={summary.subtest} className={`grade-a-skill ${isOnTarget ? 'grade-a-skill-ready' : ''}`}>
              <div className="grade-a-skill-top">
                <SubtestBadge subtest={summary.subtest} small />
                <span className={isOnTarget ? 'grade-a-status-ready' : 'grade-a-status'}>
                  {score === null
                    ? 'Baseline needed'
                    : isOnTarget
                      ? 'Target met'
                      : readiness.attemptsStillNeeded > 0
                        ? `${readiness.attemptsStillNeeded} more baseline set${readiness.attemptsStillNeeded === 1 ? '' : 's'}`
                        : gap !== null && gap > 0
                          ? `${gap} pts to target`
                          : 'Repeat target once more'}
                </span>
              </div>
              <div className="grade-a-progress-label">
                <strong>{score === null ? '—' : `${score}%`}</strong>
                <span>
                  internal target {target}% · streak {Math.min(readiness.consecutiveAtTarget, GRADE_A_EVIDENCE_REQUIREMENTS.consecutiveAtTarget)}/{GRADE_A_EVIDENCE_REQUIREMENTS.consecutiveAtTarget}
                </span>
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
        Internal readiness targets require at least three recent attempts and two consecutive target-level results. They are not an official OET score conversion; use timed full mocks and qualified feedback to validate exam readiness.
      </p>
    </section>
  );
}
