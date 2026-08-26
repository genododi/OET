import type { CompletedSession } from '../types/session';
import type { OetSubtest } from '../types';
import type { OetPart } from './oetExamTiming';
import { bankBySubtest, oetTaskPart } from '../data/sessionTaskBank';

/** Matches the bank id suffix embedded in every generated task id, e.g. "...-lis-3" -> "lis-3". */
const CANONICAL_ID_PATTERN = /(lis|read|write|speak)-\d+$/;

export interface TaskStat {
  canonicalId: string;
  subtest: OetSubtest;
  timesSeen: number;
  timesPassed: number;
  mistakeCount: number;
  consecutivePasses: number;
  lastSeenAt: number;
  lastPassed: boolean;
  lastScorePercent: number | null;
  nextReviewAt: number | null;
  dueForReview: boolean;
  /** Higher = weaker/staler = higher priority to resurface. */
  priority: number;
}

export interface SubtestTrendPoint {
  completedAt: string;
  percentScore: number;
}

export interface SubtestHistorySummary {
  subtest: OetSubtest;
  attemptCount: number;
  rollingPercent: number | null;
  trend: SubtestTrendPoint[];
}

export interface PartHistorySummary {
  subtest: Extract<OetSubtest, 'listening' | 'reading'>;
  part: OetPart;
  attemptCount: number;
  accuracyPercent: number | null;
}

export type WritingCriterion =
  | 'Purpose'
  | 'Content'
  | 'Conciseness & Clarity'
  | 'Genre'
  | 'Organisation'
  | 'Language';

export type SpeakingCriterion =
  | 'Relationship & structure'
  | 'Clinical communication'
  | 'Language & pace';

export type ProductiveCriterion = WritingCriterion | SpeakingCriterion;

export interface ProductiveCriterionHistorySummary {
  subtest: Extract<OetSubtest, 'writing' | 'speaking'>;
  criterion: ProductiveCriterion;
  attemptCount: number;
  rollingPercent: number | null;
}

export const PRODUCTIVE_CRITERIA: Record<
  Extract<OetSubtest, 'writing' | 'speaking'>,
  readonly ProductiveCriterion[]
> = {
  writing: ['Purpose', 'Content', 'Conciseness & Clarity', 'Genre', 'Organisation', 'Language'],
  speaking: ['Relationship & structure', 'Clinical communication', 'Language & pace'],
};

const DAY_MS = 86_400_000;
const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14] as const;

function canonicalIdOf(taskId: string): string | null {
  const match = taskId.match(CANONICAL_ID_PATTERN);
  return match ? match[0] : null;
}

/** Build per-content-item stats (seen count, pass rate, recency) across all history, keyed by canonical id. */
export function buildTaskStats(
  completed: CompletedSession[],
  now: number = Date.now(),
): Map<string, TaskStat> {
  const stats = new Map<string, TaskStat>();

  // Oldest first so "lastSeenAt" ends up as the most recent attempt.
  const chronological = [...completed].sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime(),
  );

  chronological.forEach((session) => {
    const seenAt = new Date(session.completedAt).getTime();
    session.review?.taskReviews.forEach((t) => {
      const canonicalId = canonicalIdOf(t.taskId);
      if (!canonicalId) return;
      if (t.subtest === 'intro' || t.subtest === 'break') return;
      if (t.passed === null && t.scorePercent === null) return; // not attempted

      const subtest = t.subtest as OetSubtest;
      const existing = stats.get(canonicalId) ?? {
        canonicalId,
        subtest,
        timesSeen: 0,
        timesPassed: 0,
        mistakeCount: 0,
        consecutivePasses: 0,
        lastSeenAt: 0,
        lastPassed: false,
        lastScorePercent: null,
        nextReviewAt: null,
        dueForReview: false,
        priority: 0,
      };

      existing.timesSeen += 1;
      if (t.passed) {
        existing.timesPassed += 1;
        existing.consecutivePasses += 1;
      } else {
        existing.mistakeCount += 1;
        existing.consecutivePasses = 0;
      }
      existing.lastSeenAt = seenAt;
      existing.lastPassed = Boolean(t.passed);
      existing.lastScorePercent = t.scorePercent;
      stats.set(canonicalId, existing);
    });
  });

  // Priority: unseen items are handled separately (max priority). Seen items get higher
  // priority the weaker and staler they are — this is what drives spaced repetition.
  stats.forEach((s) => {
    const daysSinceSeen = Math.max(0, (now - s.lastSeenAt) / DAY_MS);
    const passRate = s.timesSeen > 0 ? s.timesPassed / s.timesSeen : 0;
    const weaknessBoost = (1 - passRate) * 3; // 0..3, higher when consistently wrong
    const staleness = Math.min(daysSinceSeen / 3, 3); // caps out after ~9 days
    if (s.mistakeCount > 0) {
      const intervalIndex = Math.max(0, Math.min(s.consecutivePasses - 1, REVIEW_INTERVAL_DAYS.length - 1));
      const intervalDays = s.lastPassed ? REVIEW_INTERVAL_DAYS[intervalIndex]! : 0;
      s.nextReviewAt = s.lastSeenAt + intervalDays * DAY_MS;
      s.dueForReview = s.nextReviewAt <= now;
    }
    const dueBoost = s.dueForReview ? 4 : 0;
    s.priority = weaknessBoost + staleness + dueBoost;
  });

  return stats;
}

/**
 * Mistakes that are due for active recall, ordered by urgency. A failed answer is
 * due immediately; successful corrections expand to 1, 3, 7 and 14-day reviews.
 */
export function dueReviewStats(
  stats: Map<string, TaskStat>,
  subtests?: readonly OetSubtest[],
): TaskStat[] {
  const allowed = subtests ? new Set(subtests) : null;
  return [...stats.values()]
    .filter((stat) => stat.dueForReview && (!allowed || allowed.has(stat.subtest)))
    .sort((a, b) => b.priority - a.priority || a.nextReviewAt! - b.nextReviewAt!);
}

export function countDueReviewTasks(
  completed: CompletedSession[],
  now: number = Date.now(),
): number {
  return dueReviewStats(buildTaskStats(completed, now)).length;
}

/**
 * Weighted-random pick of `count` bank items for `subtest`, favouring items never
 * seen, then weak/stale items, without fully excluding mastered ones (so nothing
 * silently disappears from rotation).
 */
export function weightedPick<T extends { id: string }>(
  bank: readonly T[],
  count: number,
  stats: Map<string, TaskStat>,
  rand: () => number = Math.random,
): T[] {
  if (bank.length === 0 || count <= 0) return [];

  const pool = bank.map((item) => {
    const stat = stats.get(item.id);
    // Unseen items get a strong flat bonus so new content surfaces before over-drilled content.
    const weight = stat ? 1 + stat.priority : 5;
    return { item, weight };
  });

  const picked: T[] = [];
  const working = [...pool];
  const target = Math.min(count, bank.length);

  for (let i = 0; i < target; i += 1) {
    const totalWeight = working.reduce((sum, w) => sum + w.weight, 0);
    let r = rand() * totalWeight;
    let idx = 0;
    for (; idx < working.length; idx += 1) {
      r -= working[idx]!.weight;
      if (r <= 0) break;
    }
    const chosen = working.splice(Math.min(idx, working.length - 1), 1)[0]!;
    picked.push(chosen.item);
  }

  return picked;
}

/** Rolling (recency-weighted) percent score per subtest from the last N attempts of each. */
export function summarizeSubtestHistory(
  completed: CompletedSession[],
  subtests: OetSubtest[],
  windowSize = 8,
): SubtestHistorySummary[] {
  return subtests.map((subtest) => {
    const points: SubtestTrendPoint[] = [];
    [...completed]
      .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
      .forEach((session) => {
        const score = session.review?.subtestScores.find((s) => s.subtest === subtest);
        if (
          subtest === 'speaking' &&
          session.review?.taskReviews.some(
            (review) => review.subtest === 'speaking' && review.evidenceQualified === false,
          ) &&
          !session.review.taskReviews.some(
            (review) => review.subtest === 'speaking' && review.evidenceQualified === true,
          )
        ) {
          return;
        }
        if (score && (score.percentScore > 0 || score.total)) {
          points.push({ completedAt: session.completedAt, percentScore: score.percentScore });
        }
      });

    const recent = points.slice(-windowSize);
    if (recent.length === 0) {
      return { subtest, attemptCount: 0, rollingPercent: null, trend: recent };
    }

    // Weight more recent attempts slightly higher (simple linear weighting).
    const weights = recent.map((_, i) => i + 1);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const weighted = recent.reduce((sum, p, i) => sum + p.percentScore * weights[i]!, 0) / totalWeight;

    return {
      subtest,
      attemptCount: points.length,
      rollingPercent: Math.round(weighted),
      trend: recent,
    };
  });
}

/** Rolling item accuracy for Listening and Reading Parts A, B and C. */
export function summarizePartHistory(
  completed: CompletedSession[],
  windowSize = 20,
): PartHistorySummary[] {
  const eligibleSubtests = ['listening', 'reading'] as const;
  const parts = ['A', 'B', 'C'] as const;
  const taskById = new Map(
    eligibleSubtests.flatMap((subtest) =>
      bankBySubtest[subtest].map((task) => [task.id, task] as const),
    ),
  );
  const outcomes = new Map<string, boolean[]>();

  [...completed]
    .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
    .forEach((session) => {
      session.review?.taskReviews.forEach((review) => {
        if (review.passed === null) return;
        const canonicalId = canonicalIdOf(review.taskId);
        if (!canonicalId) return;
        const task = taskById.get(canonicalId);
        if (!task || (task.subtest !== 'listening' && task.subtest !== 'reading')) return;
        const part = oetTaskPart(task);
        if (!part) return;
        const key = `${task.subtest}-${part}`;
        const values = outcomes.get(key) ?? [];
        values.push(review.passed);
        outcomes.set(key, values);
      });
    });

  return eligibleSubtests.flatMap((subtest) =>
    parts.map((part): PartHistorySummary => {
      const recent = (outcomes.get(`${subtest}-${part}`) ?? []).slice(-windowSize);
      const correct = recent.filter(Boolean).length;
      return {
        subtest,
        part,
        attemptCount: recent.length,
        accuracyPercent: recent.length > 0 ? Math.round((correct / recent.length) * 100) : null,
      };
    }),
  );
}

/** Rolling Writing and recorded-Speaking criterion evidence from recent task reviews. */
export function summarizeProductiveCriterionHistory(
  completed: CompletedSession[],
  windowSize = 8,
): ProductiveCriterionHistorySummary[] {
  const values = new Map<string, number[]>();
  [...completed]
    .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
    .forEach((session) => {
      session.review?.taskReviews.forEach((review) => {
        if (review.subtest !== 'writing' && review.subtest !== 'speaking') return;
        const subtest = review.subtest;
        if (subtest === 'speaking' && review.evidenceQualified !== true) return;
        review.criteriaScores?.forEach((score) => {
          const allowed = PRODUCTIVE_CRITERIA[subtest];
          if (!allowed.includes(score.criterion as ProductiveCriterion)) return;
          if (!Number.isFinite(score.scorePercent)) return;
          const key = `${subtest}-${score.criterion}`;
          const history = values.get(key) ?? [];
          history.push(Math.max(0, Math.min(100, score.scorePercent)));
          values.set(key, history);
        });
      });
    });

  return (['writing', 'speaking'] as const).flatMap((subtest) =>
    PRODUCTIVE_CRITERIA[subtest].map((criterion): ProductiveCriterionHistorySummary => {
      const recent = (values.get(`${subtest}-${criterion}`) ?? []).slice(-windowSize);
      if (recent.length === 0) {
        return { subtest, criterion, attemptCount: 0, rollingPercent: null };
      }
      const weights = recent.map((_, index) => index + 1);
      const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
      const rollingPercent = Math.round(
        recent.reduce((sum, score, index) => sum + score * weights[index]!, 0) / totalWeight,
      );
      return { subtest, criterion, attemptCount: recent.length, rollingPercent };
    }),
  );
}

/** Most frequently recurring weak-area strings across recent sessions — the "what to fix next" list. */
export function topRecurringWeakAreas(completed: CompletedSession[], limit = 4): string[] {
  const counts = new Map<string, number>();
  completed.slice(0, 12).forEach((session) => {
    session.review?.weakAreas.forEach((area) => {
      counts.set(area, (counts.get(area) ?? 0) + 1);
    });
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([area]) => area);
}
