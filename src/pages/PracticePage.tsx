import { useEffect, useMemo, useState } from 'react';
import {
  practiceModules,
  TARGET_ADVANCED_PRACTICE_COUNT,
  TARGET_MEDICINE_PRACTICE_COUNT,
} from '../data/practice';
import type { Difficulty, OetSubtest, PracticeModule } from '../types';
import { DifficultyBadge } from '../components/DifficultyBadge';
import { ListPagination } from '../components/ListPagination';
import { SubtestBadge } from '../components/SubtestBadge';
import { SessionRunner } from '../components/SessionRunner';
import { buildPracticeSession, buildSmartSession } from '../lib/sessionBuilder';
import { usePagination } from '../hooks/usePagination';
import type { SessionConfig } from '../types/session';
import {
  countMedicineAdvancedPracticeBySubtest,
  countMedicineCatalog,
  matchesProfessionFilter,
  moduleProfession,
  orderProfessions,
  sortByPreferredProfession,
  TARGET_MEDICINE_ADVANCED_PER_SUBTEST,
} from '../lib/preferredProfession';
import { useProgress } from '../hooks/useProgress';
import { videoSamplesFor } from '../data/videoSamples';

const filters: Array<OetSubtest | 'all'> = ['all', 'listening', 'reading', 'writing', 'speaking'];
const difficulties: Array<Difficulty | 'all'> = ['all', 'beginner', 'intermediate', 'advanced'];

interface Props {
  initialFilter?: OetSubtest;
  defaultProfession?: string;
  onFilterChange?: (filter: OetSubtest | 'all') => void;
}

export function PracticePage({
  initialFilter,
  defaultProfession = 'Medicine',
  onFilterChange,
}: Props) {
  const [filter, setFilter] = useState<OetSubtest | 'all'>(initialFilter ?? 'all');
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all');
  const [query, setQuery] = useState('');
  const [activeModule, setActiveModule] = useState<PracticeModule | null>(null);
  const [smartConfig, setSmartConfig] = useState<SessionConfig | null>(null);
  const { isComplete, completed } = useProgress();

  const professions = useMemo(
    () =>
      orderProfessions(
        ['all', ...Array.from(new Set(practiceModules.map((m) => moduleProfession(m.profession))))],
        defaultProfession,
      ),
    [defaultProfession],
  );
  const [profession, setProfession] = useState(defaultProfession);

  useEffect(() => {
    if (initialFilter) setFilter(initialFilter);
  }, [initialFilter]);

  const setFilterAndRoute = (next: OetSubtest | 'all') => {
    setFilter(next);
    onFilterChange?.(next);
  };

  const difficultyCounts = useMemo(() => {
    const counts: Record<Difficulty | 'all', number> = {
      all: practiceModules.length,
      beginner: 0,
      intermediate: 0,
      advanced: 0,
    };
    practiceModules.forEach((m) => {
      counts[m.difficulty] += 1;
    });
    return counts;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = practiceModules.filter((m) => {
      if (filter !== 'all' && m.subtest !== filter) return false;
      if (difficulty !== 'all' && m.difficulty !== difficulty) return false;
      if (!matchesProfessionFilter(m.profession, profession)) return false;
      if (!q) return true;
      return [
        m.title,
        m.topic,
        m.description,
        m.subtest,
        moduleProfession(m.profession),
        m.sourceHint ?? '',
        ...(m.tags ?? []),
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
    return sortByPreferredProfession(items, defaultProfession);
  }, [filter, difficulty, query, profession, defaultProfession]);

  const { page, setPage, totalPages, pageItems, total, rangeStart, rangeEnd } =
    usePagination(filtered);

  const medicineCatalogCount = useMemo(
    () => countMedicineCatalog(practiceModules),
    [],
  );

  const showMedicineAdvancedSubtestCounts =
    profession === 'Medicine' && difficulty === 'advanced';

  const medicineAdvancedSubtestCounts = useMemo(
    () => countMedicineAdvancedPracticeBySubtest(practiceModules),
    [],
  );

  const videoSamples = useMemo(() => videoSamplesFor(filter), [filter]);

  if (activeModule) {
    return (
      <SessionRunner
        config={buildPracticeSession(activeModule)}
        onExit={() => setActiveModule(null)}
      />
    );
  }

  if (smartConfig) {
    return <SessionRunner config={smartConfig} onExit={() => setSmartConfig(null)} />;
  }

  return (
    <div className="page-section">
      <article className="card smart-practice-card">
        <div>
          <h3>🎯 Smart Practice</h3>
          <p className="meta">
            Auto-built from your history across all four sub-tests — prioritises items you haven't
            seen yet or scored poorly on, instead of repeating the same set.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() =>
            setSmartConfig(
              buildSmartSession({
                subtests: filter === 'all' ? [] : [filter],
                completed,
              }),
            )
          }
        >
          Start Smart Practice{filter !== 'all' ? ` — ${filter}` : ''}
        </button>
      </article>

      <p className="page-intro">
        {profession === 'Medicine' ? (
          <>
            {total.toLocaleString()} of {medicineCatalogCount.toLocaleString()} medicine practice
            modules shown
            {medicineCatalogCount >= TARGET_MEDICINE_PRACTICE_COUNT
              ? ` (${TARGET_MEDICINE_PRACTICE_COUNT.toLocaleString()}+ physician-focused)`
              : ''}
            . Build referral writing and patient/colleague speaking before full mocks.
          </>
        ) : (
          <>
            {practiceModules.length.toLocaleString()} practice modules —{' '}
            {medicineCatalogCount.toLocaleString()} for Medicine (shown first).{' '}
            {difficultyCounts.advanced.toLocaleString()} advanced
            {difficultyCounts.advanced >= TARGET_ADVANCED_PRACTICE_COUNT
              ? ` (${TARGET_ADVANCED_PRACTICE_COUNT.toLocaleString()}+ expert pool)`
              : ''}
            . Build referral writing and GP speaking before full mocks.
          </>
        )}
      </p>

      <article className="card video-samples-card">
        <div>
          <h3>📺 YouTube sample walk-throughs</h3>
          <p className="meta">
            Curated from Official OET, E2 OET, and Swoosh English. These links supplement the
            original in-app tests; third-party recordings are not copied into the app.
          </p>
        </div>
        <div className="video-sample-links">
          {videoSamples.map((sample) => (
            <a
              key={`${sample.provider}-${sample.subtest}`}
              className="video-sample-link"
              href={sample.url}
              target="_blank"
              rel="noopener noreferrer"
              title={sample.note}
            >
              <span>{sample.subtest}</span>
              {sample.provider} →
            </a>
          ))}
        </div>
      </article>

      <div className="search-bar">
        <input
          type="search"
          placeholder="Search practice modules…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search practice modules"
        />
      </div>

      <div className="filter-bar">
        {difficulties.map((d) => (
          <button
            key={d}
            type="button"
            className={`filter-chip ${difficulty === d ? 'filter-chip-active' : ''}`}
            onClick={() => setDifficulty(d)}
          >
            {d === 'all'
              ? `All levels (${difficultyCounts.all.toLocaleString()})`
              : `${d.charAt(0).toUpperCase() + d.slice(1)} (${difficultyCounts[d].toLocaleString()})`}
          </button>
        ))}
      </div>

      <div className="filter-bar">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            className={`filter-chip ${filter === f ? 'filter-chip-active' : ''}`}
            onClick={() => setFilterAndRoute(f)}
          >
            {f === 'all'
              ? showMedicineAdvancedSubtestCounts
                ? `All (${medicineAdvancedSubtestCounts.all.toLocaleString()})`
                : 'All'
              : showMedicineAdvancedSubtestCounts
                ? `${f.charAt(0).toUpperCase() + f.slice(1)} (${medicineAdvancedSubtestCounts[f].toLocaleString()}${medicineAdvancedSubtestCounts[f] >= TARGET_MEDICINE_ADVANCED_PER_SUBTEST ? '+' : ''})`
                : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="filter-bar filter-bar-scroll">
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
        <p className="empty-state">No practice modules match your search.</p>
      ) : (
        <>
          <ListPagination
            page={page}
            totalPages={totalPages}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            total={total}
            onPageChange={setPage}
          />
          <div className="card-grid">
          {pageItems.map((mod) => (
            <article key={mod.id} className="card exam-card">
              <div className="card-header-row">
                <SubtestBadge subtest={mod.subtest} />
                <DifficultyBadge difficulty={mod.difficulty} />
                {isComplete(mod.id) && <span className="tag tag-complete">Completed</span>}
              </div>
              <h3>{mod.title}</h3>
              <p className="meta">
                {mod.topic} · {moduleProfession(mod.profession)}
              </p>
              <p className="description">{mod.description}</p>
              <div className="card-footer">
                <span>
                  {mod.tasksCount} task{mod.tasksCount !== 1 ? 's' : ''} · {mod.durationMinutes} min
                </span>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setActiveModule(mod)}
                >
                  Practise
                </button>
              </div>
            </article>
          ))}
          </div>
          <ListPagination
            page={page}
            totalPages={totalPages}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            total={total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
