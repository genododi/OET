import { useMemo, useState } from 'react';
import { AshganGuideSection } from '../components/AshganGuideSection';
import { guideSections } from '../data/guide';

const categoryLabels: Record<string, string> = {
  overview: 'Overview',
  subtest: 'Sub-test guidance',
  scoring: 'Scoring',
  registration: 'Registration',
};

const categories = ['all', 'overview', 'subtest', 'scoring', 'registration'] as const;

export function GuidePage({
  defaultExpandedId = 'guide-medicine',
  focusAshgan = false,
}: {
  defaultExpandedId?: string;
  focusAshgan?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<(typeof categories)[number]>('all');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([defaultExpandedId]));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return guideSections.filter((section) => {
      if (category !== 'all' && section.category !== category) return false;
      if (!q) return true;
      const haystack = [section.title, ...section.content, categoryLabels[section.category]]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query, category]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="page-section">
      <p className="page-intro">
        Essential OET knowledge — format, timing, scoring, profession-specific advice, and curated
        Telegram instructor guides.
      </p>

      <AshganGuideSection focus={focusAshgan} />

      <div className="search-bar">
        <input
          type="search"
          placeholder="Search guide…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search study guide"
        />
      </div>

      <div className="filter-bar">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            className={`filter-chip ${category === c ? 'filter-chip-active' : ''}`}
            onClick={() => setCategory(c)}
          >
            {c === 'all' ? 'All' : categoryLabels[c]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="empty-state">No guide sections match your search.</p>
      ) : (
        <div className="guide-list">
          {filtered.map((section) => {
            const isOpen = expanded.has(section.id);
            return (
              <article key={section.id} className="card guide-card">
                <button
                  type="button"
                  className="guide-card-toggle"
                  aria-expanded={isOpen}
                  onClick={() => toggle(section.id)}
                >
                  <div>
                    <span className="guide-category">{categoryLabels[section.category]}</span>
                    <h3>{section.title}</h3>
                  </div>
                  <span className="guide-chevron" aria-hidden="true">
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
                {isOpen && (
                  <ul>
                    {section.content.map((paragraph, i) => (
                      <li key={i}>{paragraph}</li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
