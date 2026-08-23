import type {
  DiagnosticProfile,
  OetSubtest,
  StudyPlan,
  StudyPlanAssignment,
} from '../types';

export const GRADE_A_TARGET = 450 as const;
const subtests: readonly OetSubtest[] = ['listening', 'reading', 'writing', 'speaking'];

const focusBySubtest: Record<OetSubtest, string[]> = {
  listening: [
    'Part A exact-word note completion',
    'Part B purpose and attitude',
    'Part C speaker viewpoint and evidence',
  ],
  reading: [
    'Part A 15-minute retrieval',
    'Part B workplace text purpose',
    'Part C inference and writer attitude',
  ],
  writing: [
    'Purpose and recipient selection',
    'Relevant case-note selection',
    'Concise clinical letter organisation',
  ],
  speaking: [
    'Relationship building and empathy',
    'Patient perspective and information gathering',
    'Structure, teach-back, and safety-netting',
  ],
};

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function validateDiagnosticProfile(profile: DiagnosticProfile): string[] {
  const errors: string[] = [];
  const examTime = new Date(`${profile.examDate}T23:59:59`).getTime();
  if (!profile.examDate || Number.isNaN(examTime) || examTime <= Date.now()) {
    errors.push('Choose an exam date in the future.');
  }
  if (profile.studyDaysPerWeek < 1 || profile.studyDaysPerWeek > 7) {
    errors.push('Study days must be between 1 and 7 per week.');
  }
  if (profile.minutesPerDay < 20 || profile.minutesPerDay > 240) {
    errors.push('Daily study time must be between 20 and 240 minutes.');
  }
  subtests.forEach((subtest) => {
    const score = profile.baseline[subtest];
    if (!Number.isFinite(score) || score < 0 || score > 500) {
      errors.push(`${subtest} baseline must be between 0 and 500.`);
    }
  });
  return errors;
}

export function createDiagnosticProfile(input: {
  examDate: string;
  studyDaysPerWeek: number;
  minutesPerDay: number;
  baseline: Record<OetSubtest, number>;
  completedAt?: string;
}): DiagnosticProfile {
  const weakAreas = [...subtests]
    .sort((a, b) => input.baseline[a] - input.baseline[b])
    .filter((subtest) => input.baseline[subtest] < GRADE_A_TARGET);
  return {
    schemaVersion: 1,
    targetScore: GRADE_A_TARGET,
    examDate: input.examDate,
    studyDaysPerWeek: input.studyDaysPerWeek,
    minutesPerDay: input.minutesPerDay,
    baseline: input.baseline,
    weakAreas,
    completedAt: input.completedAt ?? new Date().toISOString(),
  };
}

export function generateStudyPlan(
  profile: DiagnosticProfile,
  now: Date = new Date(),
): StudyPlan {
  const exam = new Date(`${profile.examDate}T12:00:00`);
  const start = new Date(`${dateOnly(now)}T12:00:00`);
  const totalDays = Math.max(
    1,
    Math.min(84, Math.ceil((exam.getTime() - start.getTime()) / 86_400_000)),
  );
  const priority = profile.weakAreas.length > 0 ? profile.weakAreas : [...subtests];
  const assignments: StudyPlanAssignment[] = [];
  let studyIndex = 0;

  for (let dayOffset = 0; dayOffset < totalDays; dayOffset += 1) {
    if (dayOffset % 7 >= profile.studyDaysPerWeek) continue;
    const subtest = priority[studyIndex % priority.length] ?? subtests[studyIndex % subtests.length]!;
    const focusOptions = focusBySubtest[subtest];
    const isMock = studyIndex > 0 && studyIndex % Math.max(4, profile.studyDaysPerWeek) === 0;
    const isReview = !isMock && studyIndex > 1 && studyIndex % 3 === 0;
    const kind: StudyPlanAssignment['kind'] = isMock
      ? 'mock'
      : isReview
        ? 'review'
        : studyIndex < profile.studyDaysPerWeek
          ? 'learn'
          : 'practice';
    const focus = isMock
      ? `Timed ${subtest} simulation followed by error review`
      : focusOptions[studyIndex % focusOptions.length]!;
    assignments.push({
      id: `plan-${dayOffset}-${subtest}`,
      dayOffset,
      subtest,
      title: `${kind === 'mock' ? 'Timed' : kind === 'review' ? 'Review' : 'Grade A'} ${subtest}`,
      minutes: profile.minutesPerDay,
      focus,
      kind,
    });
    studyIndex += 1;
  }

  return {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    targetScore: GRADE_A_TARGET,
    examDate: profile.examDate,
    weeklyMinutes: profile.studyDaysPerWeek * profile.minutesPerDay,
    assignments,
  };
}

export function assignmentDate(plan: StudyPlan, assignment: StudyPlanAssignment): string {
  const date = new Date(plan.generatedAt);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + assignment.dayOffset);
  return dateOnly(date);
}
