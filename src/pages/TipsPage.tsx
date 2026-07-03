import { useMemo, useState } from 'react';
import { tips } from '../data/tips';
import type { OetSubtest } from '../types';
import { SubtestBadge } from '../components/SubtestBadge';

const filters: Array<OetSubtest | 'general' | 'all'> = [
  'all',
  'general',
  'listening',
  'reading',
  'writing',
  'speaking',
];

export function TipsPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tips.filter((t) => {
      if (filter !== 'all' && t.subtest !== filter) return false;
      if (!q) return true;
      return [t.title, t.tip, t.category].join(' ').toLowerCase().includes(q);
    });
  }, [filter, query]);

  return (
    <div className="page-section">
      <p className="page-intro">
        Practical tips from educators and high-scoring candidates — filter by sub-test or general strategy.
      </p>

      <div className="search-bar">
        <input
          type="search"
          placeholder="Search tips…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search tips"
        />
      </div>

      <div className="filter-bar">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            className={`filter-chip ${filter === f ? 'filter-chip-active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="empty-state">No tips match your search.</p>
      ) : (
        <div className="tips-grid">
          {filtered.map((tip) => (
            <article key={tip.id} className="card tip-card">
              <div className="card-header-row">
                <SubtestBadge subtest={tip.subtest} small />
                <span className="tag">{tip.category}</span>
              </div>
              <h3>{tip.title}</h3>
              <p>{tip.tip}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
