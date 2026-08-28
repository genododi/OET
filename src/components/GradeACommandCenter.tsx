import { useMemo } from 'react';
import type { OetSubtest } from '../types';
import type { CompletedSession } from '../types/session';
import {
  recommendGradeAFocus,
  summarizeSubtestHistory,
  type ProductiveCriterion,
} from '../lib/taskHistory';
import type { OetPart } from '../lib/oetExamTiming';
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
    gate: 'Four timed 10+ item sets covering Parts A–C, with the latest three at 90%+ and every error explained from the audio.',
  },
  reading: {
    focus: 'Practise fast gist, synonym matching, and rejecting partial-match distractors.',
    gate: 'Four timed 10+ item sets covering Parts A–C, with the latest three at 90%+ without sacrificing Part A timing.',
  },
  writing: {
    focus: 'Write purpose-first, select only relevant notes, and edit for clear professional English.',
    gate: 'Four complete 180–200-word letters, with the latest three at 85%+ and every rubric dimension reviewed.',
  },
  speaking: {
    focus: 'Lead with empathy, use patient language, signpost clearly, and safety-net naturally.',
    gate: 'Four two-role-play recorded sets, with the latest three at 85%+ and both checklists complete.',
  },
};

interface Props {
  completed: CompletedSession[];
  onStartBaseline: () => void;
  onStartSmart: (subtests?: OetSubtest[]) => void;
  onStartPart: (
    subtest: Extract<OetSubtest, 'listening' | 'reading'>,
    part: OetPart,
  ) => void;
  onStartProductive: (
    subtest: Extract<OetSubtest, 'writing' | 'speaking'>,
    criterion: ProductiveCriterion,
  ) => void;
  dueReviewCount: number;
  onStartReview: () => void;
}

export function GradeACommandCenter({
  completed,
  onStartBaseline,
  onStartSmart,
  onStartPart,
  onStartProductive,
  dueReviewCount,
  onStartReview,
}: Props) {
  const summaries = useMemo(
    () => summarizeSubtestHistory(completed, SUBTESTS, GRADE_A_EVIDENCE_REQUIREMENTS.recentWindow),
    [completed],
  );
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
  const focus = useMemo(() => recommendGradeAFocus(completed), [completed]);

  const masteredCount = summaries.filter(
    (summary) => readinessBySubtest.get(summary.subtest)?.status === 'target-met',
  ).length;
  const focusCopy = (() => {
    if (focus.kind === 'baseline') {
      return {
        title: 'Establish your four-skill baseline',
        description: 'Complete a 115-minute qualified baseline: 10 Listening, 10 Reading, one letter and two recorded role-plays.',
        button: 'Start baseline session',
      };
    }
    if (focus.kind === 'part') {
      const label = `${focus.subtest[0]!.toUpperCase()}${focus.subtest.slice(1)} Part ${focus.part}`;
      return {
        title: `Repair ${label} · ${focus.scorePercent}%`,
        description: `Your weakest sub-test contains a measured part gap across ${focus.attemptCount} recent item attempts.`,
        button: `Start ${label} focus`,
      };
    }
    if (focus.kind === 'criterion') {
      const label = `${focus.subtest[0]!.toUpperCase()}${focus.subtest.slice(1)} ${focus.criterion}`;
      return {
        title: `Repair ${label} · ${focus.scorePercent}%`,
        description: `${focus.attemptCount} scored attempt${focus.attemptCount === 1 ? '' : 's'} identify this as the most actionable gap inside your weakest sub-test.`,
        button: `Start ${label} focus`,
      };
    }
    return {
      title:
        focus.scorePercent === null
          ? `Establish a ${focus.subtest} baseline`
          : `Prioritise ${focus.subtest} · ${focus.scorePercent}%`,
      description:
        focus.scorePercent === null
          ? `Sample ${focus.subtest} before adding more practice to measured sub-tests.`
          : PRESCRIPTIONS[focus.subtest].focus,
      button: `Start ${focus.subtest} focus`,
    };
  })();

  const startRecommended = () => {
    if (dueReviewCount > 0) {
      onStartReview();
      return;
    }
    if (focus.kind === 'baseline') {
      onStartBaseline();
    } else if (focus.kind === 'part') {
      onStartPart(focus.subtest, focus.part);
    } else if (focus.kind === 'criterion') {
      onStartProductive(focus.subtest, focus.criterion);
    } else {
      onStartSmart([focus.subtest]);
    }
  };

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
                    ? summary.unqualifiedAttemptCount > 0
                      ? `${summary.unqualifiedAttemptCount} drill${summary.unqualifiedAttemptCount === 1 ? '' : 's'} logged · qualified set needed`
                      : 'Baseline needed'
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
          <strong>
            {dueReviewCount > 0
              ? `Correct ${dueReviewCount} due mistake${dueReviewCount === 1 ? '' : 's'}`
              : focusCopy.title}
          </strong>
          <p>
            {dueReviewCount > 0
              ? 'Retrieve these answers before adding new material; corrected errors return after 1, 3, 7 and 14 days.'
              : focusCopy.description}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={startRecommended}
        >
          {dueReviewCount > 0
            ? `Start mistake review (${dueReviewCount})`
            : focusCopy.button}
        </button>
      </div>
      <p className="grade-a-disclaimer">
        Internal readiness targets require at least four recent attempts and three consecutive target-level results. Listening and Reading attempts need at least 10 scored items across Parts A–C; Writing needs a complete 180–200-word letter; Speaking needs two sufficient recordings. These are not an official OET score conversion—use timed full mocks and qualified feedback to validate exam readiness.
      </p>
    </section>
  );
}
