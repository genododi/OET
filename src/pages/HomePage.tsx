import { useMemo, useState } from 'react';
import { mockExams } from '../data/mockExams';
import { practiceModules } from '../data/practice';
import { bookPdfs } from '../data/books';
import { tips } from '../data/tips';
import { pearlsPitfalls } from '../data/pearlsPitfalls';
import { studyResources } from '../data/studyResources';
import { useProgress } from '../hooks/useProgress';
import { matchesProfessionFilter } from '../lib/preferredProfession';
import {
  buildGradeABaselineSession,
  buildLatestDailyChallengeSession,
  buildPartFocusSession,
  buildProductiveFocusSession,
  buildReviewSession,
  buildSmartSession,
} from '../lib/sessionBuilder';
import { countDueReviewTasks, type ProductiveCriterion } from '../lib/taskHistory';
import type { OetPart } from '../lib/oetExamTiming';
import { SessionRunner } from '../components/SessionRunner';
import { ReadinessDashboard } from '../components/ReadinessDashboard';
import { GradeACommandCenter } from '../components/GradeACommandCenter';
import type { SessionConfig } from '../types/session';
import type { NavSection, OetSubtest } from '../types';
import { AppIcon, type AppIconName } from '../components/AppIcon';
import sourceCatalog from '../data/sourceCatalog.generated.json';

interface Props {
  onNavigate: (section: NavSection, itemId?: string) => void;
  preferredProfession?: string;
}

const subtestNav: { name: string; subtest: OetSubtest; time: string; icon: string }[] = [
  { name: 'Listening', subtest: 'listening', time: '~40 min', icon: '🎧' },
  { name: 'Reading', subtest: 'reading', time: '60 min', icon: '📄' },
  { name: 'Writing', subtest: 'writing', time: '45 min', icon: '✍️' },
  { name: 'Speaking', subtest: 'speaking', time: '~20 min', icon: '🗣️' },
];

const skillVisuals: Record<OetSubtest, { icon: AppIconName; accent: string; description: string }> = {
  listening: { icon: 'headphones', accent: 'blue', description: 'Consultations, handovers & talks' },
  reading: { icon: 'book', accent: 'violet', description: 'Parts A, B & C clinical texts' },
  writing: { icon: 'pen', accent: 'orange', description: 'Referral, transfer & discharge' },
  speaking: { icon: 'message', accent: 'pink', description: 'Patient-centred role-plays' },
};

export function HomePage({ onNavigate, preferredProfession = 'Medicine' }: Props) {
  const { completed, completedCount } = useProgress();
  const [smartConfig, setSmartConfig] = useState<SessionConfig | null>(null);
  const dueReviewCount = useMemo(() => countDueReviewTasks(completed), [completed]);

  const startSmart = (subtests?: OetSubtest[]) => {
    setSmartConfig(buildSmartSession({ subtests: subtests ?? [], completed }));
  };

  const startBaseline = () => {
    setSmartConfig(buildGradeABaselineSession(completed));
  };

  const startDailyChallenge = () => {
    setSmartConfig(buildLatestDailyChallengeSession());
  };

  const startReview = () => {
    const review = buildReviewSession({ completed });
    if (review) setSmartConfig(review);
  };

  const startPart = (
    subtest: Extract<OetSubtest, 'listening' | 'reading'>,
    part: OetPart,
  ) => {
    setSmartConfig(buildPartFocusSession({ subtest, part, completed }));
  };

  const startProductive = (
    subtest: Extract<OetSubtest, 'writing' | 'speaking'>,
    criterion: ProductiveCriterion,
  ) => {
    setSmartConfig(buildProductiveFocusSession({ subtest, criterion, completed }));
  };

  if (smartConfig) {
    return <SessionRunner config={smartConfig} onExit={() => setSmartConfig(null)} />;
  }

  const medicineMocks = mockExams.filter((e) =>
    matchesProfessionFilter(e.profession, preferredProfession),
  ).length;
  const medicinePractice = practiceModules.filter((m) =>
    matchesProfessionFilter(m.profession, preferredProfession),
  ).length;
  const stats = [
    { label: 'Medicine mocks', value: medicineMocks, section: 'mock' as NavSection },
    { label: 'Medicine practice', value: medicinePractice, section: 'practice' as NavSection },
    { label: 'Tips', value: tips.length, section: 'tips' as NavSection },
    { label: 'Pearls', value: pearlsPitfalls.length, section: 'pearls' as NavSection },
    { label: 'Curated resources', value: studyResources.length, section: 'resources' as NavSection },
    { label: 'Official PDFs', value: bookPdfs.length, section: 'books' as NavSection },
  ];
  const testsBySkill = subtestNav.map((skill) => ({
    ...skill,
    count: practiceModules.filter((module) => module.subtest === skill.subtest).length,
    ...skillVisuals[skill.subtest],
  }));

  return (
    <div className="home">
      <section className="workspace-hero">
        <div className="workspace-hero-copy">
          <div className="workspace-eyebrow"><AppIcon name="sparkles" /> Your personalised OET command desk</div>
          <h2>Build Grade A confidence,<br /><span>one clinical skill at a time.</span></h2>
          <p>
            A focused medicine workspace with adaptive practice, realistic timing, and a test
            library refreshed from your private source archive.
          </p>
          <div className="workspace-actions">
            <button type="button" className="btn btn-primary btn-workspace" onClick={() => startSmart()}>
              <AppIcon name="target" /> Start smart practice
            </button>
            <button type="button" className="btn btn-glass btn-workspace" onClick={startDailyChallenge}>
              <AppIcon name="sparkles" /> Today’s challenge
            </button>
          </div>
          <div className="workspace-trust-row">
            <span><i className="status-dot" /> Source archive synced</span>
            <span>{sourceCatalog.totalSourceRecords.toLocaleString()} indexed records</span>
            <span>Updated {new Date(sourceCatalog.generatedAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="workspace-focus-card" aria-label="Today's focus">
          <div className="focus-card-head">
            <span>Today’s focus</span>
            <span className="focus-live">LIVE</span>
          </div>
          <div className="focus-score-ring"><span>450<small>goal</small></span></div>
          <strong>Grade A momentum</strong>
          <p>Complete one adaptive set to establish your next best move.</p>
          <div className="focus-progress"><span /></div>
          <div className="focus-meta"><span>Daily plan</span><b>0 / 1</b></div>
        </div>
      </section>

      <section className="skill-library" aria-labelledby="skill-library-title">
        <div className="section-heading-row">
          <div>
            <span className="section-kicker">Practice library</span>
            <h2 id="skill-library-title">Choose your training lane</h2>
          </div>
          <button type="button" className="text-action" onClick={() => onNavigate('practice')}>
            View all tests <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="skill-card-grid">
          {testsBySkill.map((skill) => (
            <button
              key={skill.subtest}
              type="button"
              className={`skill-card skill-${skill.accent}`}
              onClick={() => onNavigate('practice', skill.subtest)}
            >
              <span className="skill-card-icon"><AppIcon name={skill.icon} /></span>
              <span className="skill-card-copy">
                <strong>{skill.name}</strong>
                <small>{skill.description}</small>
              </span>
              <span className="skill-card-count"><b>{skill.count.toLocaleString()}+</b><small>tests</small></span>
              <span className="skill-card-arrow">→</span>
            </button>
          ))}
        </div>
      </section>

      {completedCount > 0 && (
        <section className="card progress-banner">
          <div>
            <strong>{completedCount} session{completedCount !== 1 ? 's' : ''} completed</strong>
            <p className="meta">Progress saved on this device — keep going!</p>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onNavigate('mock')}>
            Continue studying
          </button>
        </section>
      )}

      <GradeACommandCenter
        completed={completed}
        onStartBaseline={startBaseline}
        onStartDailyChallenge={startDailyChallenge}
        onStartSmart={startSmart}
        onStartPart={startPart}
        onStartProductive={startProductive}
        dueReviewCount={dueReviewCount}
        onStartReview={startReview}
      />
      <ReadinessDashboard
        completed={completed}
        onStartSmart={startSmart}
        onStartPart={startPart}
        onStartProductive={startProductive}
      />

      {completedCount > 0 && (
        <section className="card recent-progress">
          <h3>Recent activity</h3>
          <ul className="recent-list">
            {completed.slice(0, 5).map((item) => (
              <li key={`${item.id}-${item.completedAt}`}>
                <span className="tag tag-complete">{item.kind === 'mock' ? 'Mock' : 'Practice'}</span>
                <span>{item.title}</span>
                <time className="meta" dateTime={item.completedAt}>
                  {new Date(item.completedAt).toLocaleDateString()}
                </time>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="workspace-metrics" aria-label="Library overview">
        {stats.map((stat) => (
          <button key={stat.label} type="button" onClick={() => onNavigate(stat.section)}>
            <span>{stat.value.toLocaleString()}</span>{stat.label}
          </button>
        ))}
      </section>

      <section className="card physician-quick-links">
        <h3>Quick links for doctors</h3>
        <div className="quick-link-grid">
          <button type="button" className="quick-link-tile" onClick={() => onNavigate('mock')}>
            <span className="quick-link-icon">🩺</span>
            <strong>Medicine mock exams</strong>
            <span className="meta">Full & mini mocks · timed sessions</span>
          </button>
          <button
            type="button"
            className="quick-link-tile"
            onClick={() => onNavigate('practice', 'writing')}
          >
            <span className="quick-link-icon">✍️</span>
            <strong>Referral letter writing</strong>
            <span className="meta">Urgent referrals & discharge summaries</span>
          </button>
          <button type="button" className="quick-link-tile" onClick={() => onNavigate('planner')}>
            <span className="quick-link-icon">🧭</span>
            <strong>Diagnostic study plan</strong>
            <span className="meta">450+ target · weakest skills first</span>
          </button>
          <button type="button" className="quick-link-tile" onClick={() => onNavigate('resources')}>
            <span className="quick-link-icon">🗂️</span>
            <strong>Curated resource library</strong>
            <span className="meta">Official files and link-only community sources</span>
          </button>
          <button type="button" className="quick-link-tile" onClick={() => onNavigate('books')}>
            <span className="quick-link-icon">📚</span>
            <strong>Medicine PDF library</strong>
            <span className="meta">Official guides & graded samples</span>
          </button>
        </div>
      </section>

      <section className="grid-2">
        <article className="card feature-card">
          <h3>📝 Mock & Practice</h3>
          <p>
            Medicine-first mocks and GP-focused drills for Listening, Reading, referral Writing, and
            patient Speaking role-plays.
          </p>
          <div className="feature-links">
            <button type="button" className="link-btn" onClick={() => onNavigate('mock')}>
              Medicine mocks →
            </button>
            <button type="button" className="link-btn" onClick={() => onNavigate('practice')}>
              Medicine practice →
            </button>
          </div>
        </article>
        <article className="card feature-card">
          <h3>💡 Tips, Pearls & Pitfalls</h3>
          <p>Actionable strategies and common mistakes aligned with published OET criteria.</p>
          <div className="feature-links">
            <button type="button" className="link-btn" onClick={() => onNavigate('tips')}>
              Tips →
            </button>
            <button type="button" className="link-btn" onClick={() => onNavigate('pearls')}>
              Pearls & pitfalls →
            </button>
          </div>
        </article>
        <article className="card feature-card">
          <h3>🧭 Source-Governed Resources</h3>
          <p>
            Official links, rights-aware community references, and original Medicine exercises with
            clear provenance.
          </p>
          <div className="feature-links">
            <button type="button" className="link-btn" onClick={() => onNavigate('resources')}>
              Browse resources →
            </button>
            <button type="button" className="link-btn" onClick={() => onNavigate('planner')}>
              Build my plan →
            </button>
          </div>
        </article>
        <article className="card feature-card">
          <h3>📚 PDF Library</h3>
          <p>Publication-cleared OET Medicine guides, samples, and original companion drills.</p>
          <div className="feature-links">
            <button type="button" className="link-btn" onClick={() => onNavigate('books')}>
              Medicine PDFs →
            </button>
            <button type="button" className="link-btn" onClick={() => onNavigate('guide')}>
              Medicine guide →
            </button>
          </div>
        </article>
      </section>

      <section className="card subtest-overview">
        <h3>Four sub-tests at a glance</h3>
        <p className="meta subtest-overview-hint">Click a sub-test to open filtered practice modules.</p>
        <div className="subtest-grid">
          {subtestNav.map((s) => (
            <button
              key={s.name}
              type="button"
              className="subtest-tile subtest-tile-btn"
              onClick={() => onNavigate('practice', s.subtest)}
            >
              <span className="subtest-icon">{s.icon}</span>
              <strong>{s.name}</strong>
              <span>{s.time}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
