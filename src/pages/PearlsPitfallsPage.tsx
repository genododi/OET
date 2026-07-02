import { useMemo, useState } from 'react';
import { pearlsPitfalls } from '../data/pearlsPitfalls';
import { SubtestBadge } from '../components/SubtestBadge';
import type { OetSubtest } from '../types';

type TypeFilter = 'all' | 'pearl' | 'pitfall';
const subtestFilters: Array<OetSubtest | 'general' | 'all'> = [
  'all',
  'general',
  'listening',
  'reading',
  'writing',
  'speaking',
];

export function PearlsPitfallsPage() {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [subtest, setSubtest] = useState<(typeof subtestFilters)[number]>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pearlsPitfalls.filter((item) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (subtest !== 'all' && item.subtest !== subtest) return false;
      if (!q) return true;
      return [item.title, item.description, item.type, item.subtest].join(' ').toLowerCase().includes(q);
    });
  }, [typeFilter, subtest, query]);

  return (
    <div className="page-section">
      <p className="page-intro">
        High-yield pearls that boost scores and pitfalls that trip up even strong candidates.
      </p>

      <div className="search-bar">
        <input
          type="search"
          placeholder="Search pearls & pitfalls…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search pearls and pitfalls"
        />
      </div>

      <div className="filter-bar">
        {(['all', 'pearl', 'pitfall'] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={`filter-chip ${typeFilter === f ? 'filter-chip-active' : ''}`}
            onClick={() => setTypeFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'pearl' ? '✨ Pearls' : '⚠️ Pitfalls'}
          </button>
        ))}
      </div>

      <div className="filter-bar">
        {subtestFilters.map((f) => (
          <button
            key={f}
            type="button"
            className={`filter-chip ${subtest === f ? 'filter-chip-active' : ''}`}
            onClick={() => setSubtest(f)}
          >
            {f === 'all' ? 'All sub-tests' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="empty-state">No items match your search.</p>
      ) : (
        <div className="pearls-grid">
          {filtered.map((item) => (
            <article
              key={item.id}
              className={`card pearl-card ${item.type === 'pearl' ? 'pearl-card-good' : 'pearl-card-bad'}`}
            >
              <div className="card-header-row">
                <span className={`pearl-type ${item.type}`}>
                  {item.type === 'pearl' ? 'Pearl' : 'Pitfall'}
                </span>
                <SubtestBadge subtest={item.subtest} small />
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
