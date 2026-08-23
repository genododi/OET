import { useMemo, useState, type FormEvent } from 'react';
import type { NavSection, OetSubtest } from '../types';
import { useStudyPlan } from '../hooks/useStudyPlan';
import {
  assignmentDate,
  createDiagnosticProfile,
  validateDiagnosticProfile,
} from '../lib/studyPlanner';

interface Props {
  onNavigate: (section: NavSection, itemId?: string) => void;
}

const subtests: readonly OetSubtest[] = ['listening', 'reading', 'writing', 'speaking'];

function defaultExamDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 42);
  return date.toISOString().slice(0, 10);
}

export function StudyPlannerPage({ onNavigate }: Props) {
  const { profile, plan, saveProfile, clearPlan } = useStudyPlan();
  const [examDate, setExamDate] = useState(profile?.examDate ?? defaultExamDate());
  const [studyDaysPerWeek, setStudyDaysPerWeek] = useState(profile?.studyDaysPerWeek ?? 5);
  const [minutesPerDay, setMinutesPerDay] = useState(profile?.minutesPerDay ?? 60);
  const [baseline, setBaseline] = useState<Record<OetSubtest, number>>(
    profile?.baseline ?? { listening: 350, reading: 350, writing: 350, speaking: 350 },
  );
  const [errors, setErrors] = useState<string[]>([]);

  const gapSummary = useMemo(
    () => subtests.map((subtest) => ({ subtest, gap: Math.max(0, 450 - baseline[subtest]) })),
    [baseline],
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const nextProfile = createDiagnosticProfile({ examDate, studyDaysPerWeek, minutesPerDay, baseline });
    const nextErrors = validateDiagnosticProfile(nextProfile);
    setErrors(nextErrors);
    if (nextErrors.length === 0) saveProfile(nextProfile);
  };

  return (
    <div className="page-section planner-page">
      <section className="card planner-intro">
        <span className="hero-eyebrow">Medicine · Grade A target</span>
        <h2>Diagnostic and study plan</h2>
        <p>
          Enter your latest scaled results or honest baseline estimates. The planner prioritises the
          largest gaps to 450, schedules timed practice, and rotates error review before your exam.
        </p>
      </section>

      <form className="card diagnostic-form" onSubmit={submit}>
        <div className="planner-form-grid">
          <label>
            Exam date
            <input type="date" value={examDate} onChange={(event) => setExamDate(event.target.value)} />
          </label>
          <label>
            Study days per week
            <input type="number" min="1" max="7" value={studyDaysPerWeek} onChange={(event) => setStudyDaysPerWeek(Number(event.target.value))} />
          </label>
          <label>
            Minutes per study day
            <input type="number" min="20" max="240" step="5" value={minutesPerDay} onChange={(event) => setMinutesPerDay(Number(event.target.value))} />
          </label>
        </div>

        <h3>Baseline scaled scores</h3>
        <div className="diagnostic-score-grid">
          {subtests.map((subtest) => (
            <label key={subtest}>
              <span>{subtest}</span>
              <input
                aria-label={`${subtest} baseline score`}
                type="number"
                min="0"
                max="500"
                step="10"
                value={baseline[subtest]}
                onChange={(event) => setBaseline((current) => ({ ...current, [subtest]: Number(event.target.value) }))}
              />
              <small>{gapSummary.find((item) => item.subtest === subtest)?.gap ?? 0} points to 450</small>
            </label>
          ))}
        </div>

        {errors.length > 0 && (
          <ul className="form-errors" role="alert">
            {errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        )}
        <div className="session-intro-actions">
          <button type="submit" className="btn btn-primary">Generate Grade A plan</button>
          {plan && <button type="button" className="btn btn-ghost" onClick={clearPlan}>Reset plan</button>}
        </div>
      </form>

      {plan && profile && (
        <section className="card study-plan-results" data-testid="study-plan-results">
          <div className="card-header-row">
            <div>
              <span className="hero-eyebrow">Your adaptive schedule</span>
              <h3>{plan.assignments.length} planned sessions</h3>
            </div>
            <div className="plan-target">Target <strong>450+</strong></div>
          </div>
          <p className="meta">
            {plan.weeklyMinutes} minutes per week · priority: {profile.weakAreas.join(', ') || 'balanced maintenance'}
          </p>
          <div className="plan-assignment-list">
            {plan.assignments.slice(0, 14).map((assignment) => (
              <article key={assignment.id} className="plan-assignment">
                <time dateTime={assignmentDate(plan, assignment)}>{assignmentDate(plan, assignment)}</time>
                <div>
                  <div className="badge-row">
                    <span className={`subtest-badge subtest-${assignment.subtest}`}>{assignment.subtest}</span>
                    <span className="tag">{assignment.kind}</span>
                  </div>
                  <strong>{assignment.title}</strong>
                  <p className="meta">{assignment.focus} · {assignment.minutes} min</p>
                </div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => onNavigate('practice', assignment.subtest)}>
                  Start
                </button>
              </article>
            ))}
          </div>
          {plan.assignments.length > 14 && <p className="meta">Showing the next 14 sessions; the full plan remains saved on this device.</p>}
        </section>
      )}
    </div>
  );
}
