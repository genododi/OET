import type { CompletedSession } from '../types/session';
import type { OetSubtest } from '../types';

const SUBTESTS: OetSubtest[] = ['listening', 'reading', 'writing', 'speaking'];

export function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function offsetDay(now: Date, offset: number): Date {
  const date = new Date(now);
  date.setDate(date.getDate() + offset);
  return date;
}

/** Calendar dates, rather than 24-hour intervals, keep streaks correct across DST. */
export function examDaysRemaining(examDate: string | undefined, now = new Date()): number | null {
  if (!examDate || !/^\d{4}-\d{2}-\d{2}$/.test(examDate)) return null;
  const [year, month, day] = examDate.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  if (localDayKey(parsed) !== examDate) return null;
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
}

export function summarizeStudyActivity(completed: CompletedSession[], now = new Date()) {
  const scored = completed.filter((session) => {
    const timestamp = new Date(session.completedAt).getTime();
    return (session.kind === 'practice' || session.kind === 'mock') && Number.isFinite(timestamp) &&
      timestamp <= now.getTime() && session.review?.taskReviews.some((task) =>
        SUBTESTS.includes(task.subtest as OetSubtest) && task.scorePercent !== null && Number.isFinite(task.scorePercent),
      );
  });
  const activeDays = new Set(scored.map((session) => localDayKey(new Date(session.completedAt))));
  const today = localDayKey(now);
  const todaySessions = scored.filter((session) => localDayKey(new Date(session.completedAt)) === today).length;
  let streak = 0;
  let offset = activeDays.has(today) ? 0 : -1;
  while (activeDays.has(localDayKey(offsetDay(now, offset)))) {
    streak += 1;
    offset -= 1;
  }
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = offsetDay(now, index - 6);
    return { date: localDayKey(date), label: date.toLocaleDateString(undefined, { weekday: 'short' }), active: activeDays.has(localDayKey(date)) };
  });
  const recentDays = new Set(week.map((day) => day.date));
  const trainedSkills = new Set(scored.filter((session) => recentDays.has(localDayKey(new Date(session.completedAt))))
    .flatMap((session) => session.review!.taskReviews.filter((task) => task.scorePercent !== null && Number.isFinite(task.scorePercent))
      .map((task) => task.subtest)));
  return { todaySessions, streak, week, skills: SUBTESTS.map((subtest) => ({ subtest, trained: trainedSkills.has(subtest) })) };
}
