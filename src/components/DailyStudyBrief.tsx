import type { CompletedSession } from '../types/session';
import type { NavSection } from '../types';
import { useStudyPlan } from '../hooks/useStudyPlan';
import { examDaysRemaining, summarizeStudyActivity } from '../lib/studyActivity';
import { AppIcon } from './AppIcon';

interface Props {
  completed: CompletedSession[];
  dueReviewCount: number;
  now: Date;
  onNavigate: (section: NavSection) => void;
  onStartPractice: () => void;
}

export function DailyStudyBrief({ completed, dueReviewCount, now, onNavigate, onStartPractice }: Props) {
  const { profile } = useStudyPlan();
  const activity = summarizeStudyActivity(completed, now);
  const days = examDaysRemaining(profile?.examDate, now);
  return (
    <section className="card daily-study-brief" aria-labelledby="daily-brief-title">
      <div className="section-heading-row">
        <div>
          <span className="section-kicker">Your daily routine</span>
          <h2 id="daily-brief-title">Make today count.</h2>
          <p className="meta">Practise with focus. Explain your mistakes. Retrieve them again.</p>
        </div>
        <button className="exam-countdown" type="button" onClick={() => onNavigate('planner')}>
          <AppIcon name="plan" />
          {days === null ? 'Set your exam date' : days < 0 ? 'Update your exam date' : days === 0 ? 'Exam day — you’ve prepared for this' : `${days} day${days === 1 ? '' : 's'} until your exam`}
        </button>
      </div>
      <div className="daily-brief-grid">
        <article className="daily-action">
          <span className="section-kicker">01 / Practise</span>
          <h3>{activity.todaySessions > 0 ? 'Today’s session complete' : 'One focused session'}</h3>
          <p>{activity.todaySessions > 0 ? `${activity.todaySessions} scored OET session${activity.todaySessions === 1 ? '' : 's'} today. Take time to learn from the feedback.` : 'Build your evidence with an adaptive set that targets what needs attention.'}</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onStartPractice}>{activity.todaySessions > 0 ? 'Keep practising' : 'Begin focused practice'}</button>
        </article>
        <article className="daily-action">
          <span className="section-kicker">02 / Correct & recall</span>
          <h3>{dueReviewCount > 0 ? `${dueReviewCount} correction${dueReviewCount === 1 ? '' : 's'} due` : 'Make mistakes useful'}</h3>
          <p>Save the reason you missed an answer and one rule to use next time. Corrections return after 1, 3, 7 and 14 days.</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onNavigate('mistakes')}>Open mistake notebook</button>
        </article>
        <article className="daily-consistency">
          <span className="section-kicker">03 / Stay consistent</span>
          <h3>{activity.streak} day{activity.streak === 1 ? '' : 's'} in a row</h3>
          <div className="study-week" aria-label="Study activity over the last seven days">
            {activity.week.map((day) => (
              <div key={day.date} className={day.active ? 'study-day active' : 'study-day'} title={`${day.date}: ${day.active ? 'scored session complete' : 'no scored session'}`}>
                <span aria-label={`${day.date}: ${day.active ? 'studied' : 'no study'}`}>{day.active ? '✓' : '·'}</span><small>{day.label}</small>
              </div>
            ))}
          </div>
          <div className="weekly-skill-coverage" aria-label="Skills practised in the last seven days">
            {activity.skills.map(({ subtest, trained }) => <span key={subtest} className={trained ? 'trained' : ''}>{trained ? '✓' : '○'} {subtest}</span>)}
          </div>
          <small className="meta">Scored practice counts; skill coverage is not a readiness score.</small>
        </article>
      </div>
    </section>
  );
}
