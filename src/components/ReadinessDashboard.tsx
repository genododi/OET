import { useMemo } from 'react';
import type { OetSubtest } from '../types';
import type { CompletedSession } from '../types/session';
import type { OetPart } from '../lib/oetExamTiming';
import {
  summarizePartHistory,
  summarizeSubtestHistory,
  topRecurringWeakAreas,
  type SubtestHistorySummary,
} from '../lib/taskHistory';
import { OET_THRESHOLDS, getReadinessLevel, readinessLabel } from '../lib/oetThresholds';
import { SubtestBadge } from './SubtestBadge';

const ALL_SUBTESTS: OetSubtest[] = ['listening', 'reading', 'writing', 'speaking'];

interface Props {
  completed: CompletedSession[];
  onStartSmart: (subtests?: OetSubtest[]) => void;
  onStartPart: (
    subtest: Extract<OetSubtest, 'listening' | 'reading'>,
    part: OetPart,
  ) => void;
}

function levelClass(level: ReturnType<typeof getReadinessLevel>): string {
  if (level === 'exam-ready') return 'readiness-fill-ready';
  if (level === 'practice-pass') return 'readiness-fill-pass';
  return 'readiness-fill-low';
}

function Sparkline({ summary }: { summary: SubtestHistorySummary }) {
  if (summary.trend.length < 2) return null;
  return (
    <div className="readiness-sparkline" aria-hidden="true">
      {summary.trend.map((point, i) => (
        <span
          key={`${point.completedAt}-${i}`}
          className="readiness-spark-bar"
          style={{ height: `${Math.max(6, point.percentScore)}%` }}
          title={`${point.percentScore}%`}
        />
      ))}
    </div>
  );
}

export function ReadinessDashboard({ completed, onStartSmart, onStartPart }: Props) {
  const summaries = useMemo(
    () => summarizeSubtestHistory(completed, ALL_SUBTESTS, 8),
    [completed],
  );
  const recurringWeakAreas = useMemo(() => topRecurringWeakAreas(completed, 5), [completed]);
  const weakestPart = useMemo(
    () =>
      summarizePartHistory(completed)
        .filter((summary) => summary.attemptCount >= 2 && summary.accuracyPercent !== null)
        .sort(
          (a, b) =>
            a.accuracyPercent! - b.accuracyPercent! || b.attemptCount - a.attemptCount,
        )[0],
    [completed],
  );

  const attempted = summaries.filter((s) => s.attemptCount > 0);

  const weakest = attempted.reduce<SubtestHistorySummary | null>((worst, s) => {
    if (s.rollingPercent === null) return worst;
    if (!worst || (worst.rollingPercent ?? 100) > s.rollingPercent) return s;
    return worst;
  }, null);

  if (attempted.length === 0) {
    return (
      <section className="card readiness-dashboard readiness-empty">
        <h3>Readiness dashboard</h3>
        <p className="meta">
          Complete a mock or practice module and this will fill in with your per-sub-test trend and
          weakest areas — used to auto-build your Smart Session.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => onStartSmart()}>
          🎯 Start a Smart Session
        </button>
      </section>
    );
  }

  return (
    <section className="card readiness-dashboard">
      <div className="readiness-header">
        <h3>Readiness dashboard</h3>
        {weakest && (
          <span className="readiness-weakest-tag">
            Weakest link: <strong>{weakest.subtest}</strong> ({weakest.rollingPercent}%)
          </span>
        )}
      </div>

      <div className="readiness-grid">
        {summaries.map((s) => {
          const percent = s.rollingPercent;
          const level = percent === null ? null : getReadinessLevel(s.subtest, percent);
          return (
            <div key={s.subtest} className="readiness-row">
              <div className="readiness-row-top">
                <SubtestBadge subtest={s.subtest} small />
                <span className="readiness-percent">{percent === null ? '—' : `${percent}%`}</span>
              </div>
              <div className="readiness-bar-track">
                {percent !== null && (
                  <div
                    className={`readiness-bar-fill ${level ? levelClass(level) : ''}`}
                    style={{ width: `${Math.min(100, percent)}%` }}
                  />
                )}
                <span
                  className="readiness-threshold-marker"
                  style={{ left: `${OET_THRESHOLDS[s.subtest].examReady}%` }}
                  title={`Strong-practice threshold: ${OET_THRESHOLDS[s.subtest].examReady}%`}
                />
              </div>
              <div className="readiness-row-bottom">
                <span className="meta">
                  {s.attemptCount === 0
                    ? 'Not attempted yet'
                    : level
                      ? readinessLabel(level)
                      : ''}
                </span>
                <Sparkline summary={s} />
              </div>
            </div>
          );
        })}
      </div>

      {recurringWeakAreas.length > 0 && (
        <div className="readiness-weak-areas">
          <strong>Keeps coming up:</strong>
          <ul>
            {recurringWeakAreas.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {weakestPart && (
        <div className="readiness-part-focus" data-testid="part-focus-target">
          <div>
            <span className="grade-a-next-label">Precision target</span>
            <strong>
              {weakestPart.subtest[0]!.toUpperCase()}{weakestPart.subtest.slice(1)} Part{' '}
              {weakestPart.part}: {weakestPart.accuracyPercent}%
            </strong>
            <p>
              Based on {weakestPart.attemptCount} recent item attempts. Drill this component before
              another broad set.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onStartPart(weakestPart.subtest, weakestPart.part)}
          >
            Drill {weakestPart.subtest} Part {weakestPart.part}
          </button>
        </div>
      )}

      <div className="readiness-actions">
        <button type="button" className="btn btn-primary" onClick={() => onStartSmart()}>
          🎯 Start a Smart Session
        </button>
        {weakest && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onStartSmart([weakest.subtest])}
          >
            Drill only {weakest.subtest}
          </button>
        )}
      </div>
      <p className="meta readiness-footnote">
        Smart Session pulls from every sub-test task in the bank — prioritising items you've never
        seen or scored poorly on, so repeated mocks stop repeating the same questions.
      </p>
    </section>
  );
}
