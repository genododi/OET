import { useMemo, useState } from 'react';
import { examExperiences } from '../data/experiences';
import { getRelatedPdfId } from '../data/experienceLinks';
import { orderProfessions, sortByPreferredProfession } from '../lib/preferredProfession';
import { SubtestBadge } from '../components/SubtestBadge';
import type { NavSection, OetSubtest } from '../types';

interface Props {
  onNavigate: (section: NavSection, itemId?: string) => void;
  defaultProfession?: string;
}

export function ExperiencesPage({ onNavigate, defaultProfession = 'Medicine' }: Props) {
  const [query, setQuery] = useState('');
  const [profession, setProfession] = useState(defaultProfession);

  const professions = useMemo(
    () =>
      orderProfessions(
        ['all', ...Array.from(new Set(examExperiences.map((e) => e.profession)))],
        defaultProfession,
      ),
    [defaultProfession],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = examExperiences.filter((exp) => {
      if (profession !== 'all' && exp.profession !== profession) return false;
      if (!q) return true;
      const haystack = [
        exp.author,
        exp.profession,
        exp.summary,
        exp.source,
        exp.telegramGroup ?? '',
        ...exp.highlights,
        ...Object.values(exp.subtests),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
    return sortByPreferredProfession(items, defaultProfession);
  }, [query, profession, defaultProfession]);

  return (
    <div className="page-section">
      <p className="page-intro">
        Real exam recaps from Telegram — filtered for physicians by default. Follow{' '}
        <code>@OETDoctorsHub</code> for medicine-specific debriefs. Prompts change every session.
      </p>

      <div className="search-bar">
        <input
          type="search"
          placeholder="Search experiences, groups, topics…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search exam experiences"
        />
      </div>

      <div className="filter-bar">
        {professions.map((p) => (
          <button
            key={p}
            type="button"
            className={`filter-chip ${profession === p ? 'filter-chip-active' : ''}`}
            onClick={() => setProfession(p)}
          >
            {p === 'all' ? 'All professions' : p}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="empty-state">No experiences match your filters.</p>
      ) : (
        <div className="experience-list">
          {filtered.map((exp) => (
            <article key={exp.id} className="card experience-card">
              <div className="experience-header">
                <div>
                  <h3>{exp.author}</h3>
                  <p className="meta">
                    {exp.profession} · {exp.examDate} · {exp.score}
                  </p>
                </div>
                <div className="experience-source">
                  <span className="tag tag-telegram">Telegram</span>
                  <span className="source-text">{exp.source}</span>
                  {exp.telegramGroup && (
                    <code className="telegram-handle">{exp.telegramGroup}</code>
                  )}
                </div>
              </div>
              <p className="experience-summary">{exp.summary}</p>
              <div className="highlights">
                <strong>Key takeaways</strong>
                <ul>
                  {exp.highlights.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
              {Object.keys(exp.subtests).length > 0 && (
                <div className="subtest-recalls">
                  {Object.entries(exp.subtests).map(([subtest, detail]) => (
                    <div key={subtest} className="recall-item">
                      <SubtestBadge subtest={subtest as OetSubtest} small />
                      <p>{detail}</p>
                    </div>
                  ))}
                </div>
              )}
              {getRelatedPdfId(exp.id) && (
                <div className="experience-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => onNavigate('experience-pdfs', getRelatedPdfId(exp.id))}
                  >
                    View full PDF write-up →
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
