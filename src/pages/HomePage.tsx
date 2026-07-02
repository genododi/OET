import { mockExams } from '../data/mockExams';
import { practiceModules } from '../data/practice';
import { examExperiences } from '../data/experiences';
import { bookPdfs } from '../data/books';
import { experiencePdfs } from '../data/experiencePdfs';
import { tips } from '../data/tips';
import { pearlsPitfalls } from '../data/pearlsPitfalls';
import { usmleQBanks } from '../data/usmleCourses';
import { useProgress } from '../hooks/useProgress';
import { matchesProfessionFilter } from '../lib/preferredProfession';
import type { NavSection, OetSubtest } from '../types';

interface Props {
  onNavigate: (section: NavSection, itemId?: string) => void;
  preferredProfession?: string;
}

const subtestNav: { name: string; subtest: OetSubtest; time: string; icon: string }[] = [
  { name: 'Listening', subtest: 'listening', time: '~45 min', icon: '🎧' },
  { name: 'Reading', subtest: 'reading', time: '60 min', icon: '📄' },
  { name: 'Writing', subtest: 'writing', time: '45 min', icon: '✍️' },
  { name: 'Speaking', subtest: 'speaking', time: '~20 min', icon: '🗣️' },
];

export function HomePage({ onNavigate, preferredProfession = 'Medicine' }: Props) {
  const { completed, completedCount } = useProgress();

  const medicineMocks = mockExams.filter((e) =>
    matchesProfessionFilter(e.profession, preferredProfession),
  ).length;
  const medicinePractice = practiceModules.filter((m) =>
    matchesProfessionFilter(m.profession, preferredProfession),
  ).length;
  const doctorsHubExperiences = examExperiences.filter(
    (e) => e.profession === preferredProfession || e.telegramGroup === '@OETDoctorsHub',
  ).length;

  const stats = [
    { label: 'Medicine mocks', value: medicineMocks, section: 'mock' as NavSection },
    { label: 'Medicine practice', value: medicinePractice, section: 'practice' as NavSection },
    { label: 'Tips', value: tips.length, section: 'tips' as NavSection },
    { label: 'Pearls', value: pearlsPitfalls.length, section: 'pearls' as NavSection },
    { label: 'Doctor experiences', value: doctorsHubExperiences, section: 'experiences' as NavSection },
    { label: 'PDFs', value: bookPdfs.length + experiencePdfs.length, section: 'books' as NavSection },
  ];

  return (
    <div className="home">
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

      <section className="hero card">
        <div className="hero-content">
          <span className="hero-eyebrow">OET for Physicians · Medicine</span>
          <h2>Your medicine-focused OET study partner</h2>
          <p>
            Full-length mocks, referral-letter writing drills, GP role-play practice, and real exam
            debriefs from <code>@OETDoctorsHub</code> — tailored for doctors preparing for UK, Australia,
            and Ireland registration.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary" onClick={() => onNavigate('mock')}>
              Start a medicine mock
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => onNavigate('guide')}>
              Medicine study guide
            </button>
          </div>
        </div>
        <div className="hero-stats hero-stats-6">
          {stats.map((s) => (
            <button
              key={s.label}
              type="button"
              className="stat-card"
              onClick={() => onNavigate(s.section)}
            >
              <span className="stat-value">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </button>
          ))}
        </div>
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
          <button type="button" className="quick-link-tile" onClick={() => onNavigate('experiences')}>
            <span className="quick-link-icon">💬</span>
            <strong>@OETDoctorsHub experiences</strong>
            <span className="meta">Real medicine exam recaps</span>
          </button>
          <button
            type="button"
            className="quick-link-tile"
            onClick={() => onNavigate('guide', 'ashgan')}
          >
            <span className="quick-link-icon">📱</span>
            <strong>Dr. Ashgan Telegram guide</strong>
            <span className="meta">Instructor advice · join group for full history</span>
          </button>
          <button type="button" className="quick-link-tile" onClick={() => onNavigate('books')}>
            <span className="quick-link-icon">📚</span>
            <strong>Medicine PDF library</strong>
            <span className="meta">Official guides & graded samples</span>
          </button>
        </div>
      </section>

      <section className="card usmle-home-teaser">
        <h3>Also preparing for USMLE?</h3>
        <p>
          Browse {usmleQBanks.length} publicly announced Coursology Q-Banks — UWorld, AMBOSS, NBME, UWSA,
          CMS, Mehlman HY, and medical libraries — for Step 1, Step 2 CK, and Step 3.
        </p>
        <div className="feature-links">
          <button type="button" className="link-btn" onClick={() => onNavigate('usmle')}>
            USMLE Q-Bank catalog →
          </button>
          <a
            href="https://coursology-qbank.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="link-btn"
          >
            Open Coursology portal ↗
          </a>
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
          <p>Actionable strategies plus common mistakes gathered from candidates and educators.</p>
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
          <h3>💬 @OETDoctorsHub Experiences</h3>
          <p>
            Medicine exam recaps — referral scenarios, speaking cards, and timing tips from doctor study
            groups.
          </p>
          <div className="feature-links">
            <button type="button" className="link-btn" onClick={() => onNavigate('experiences')}>
              Doctor experiences →
            </button>
            <button type="button" className="link-btn" onClick={() => onNavigate('experience-pdfs')}>
              Experience PDFs →
            </button>
          </div>
        </article>
        <article className="card feature-card">
          <h3>📚 PDF Library</h3>
          <p>Official OET medicine guides, model referral letters, role-play cards, and debrief PDFs.</p>
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
