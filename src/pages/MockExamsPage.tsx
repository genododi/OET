import { useMemo, useState } from 'react';
import { mockExams, TARGET_ADVANCED_MOCK_COUNT, TARGET_MEDICINE_MOCK_COUNT } from '../data/mockExams';
import { physicianRecallHint, recallSources } from '../data/recallSources';
import { ListPagination } from '../components/ListPagination';
import { buildMockSession } from '../lib/sessionBuilder';
import { usePagination } from '../hooks/usePagination';
import {
  countMedicineAdvancedMockBySubtest,
  countMedicineCatalog,
  matchesProfessionFilter,
  orderProfessions,
  sortByPreferredProfession,
  TARGET_MEDICINE_ADVANCED_PER_SUBTEST,
} from '../lib/preferredProfession';
import { DifficultyBadge } from '../components/DifficultyBadge';
import { SubtestBadge } from '../components/SubtestBadge';
import { SessionRunner } from '../components/SessionRunner';
import { useProgress } from '../hooks/useProgress';
import type { Difficulty, MockExam, OetSubtest } from '../types';

const difficulties: Array<Difficulty | 'all'> = ['all', 'advanced'];
const subtestFilters: Array<OetSubtest | 'all'> = ['all', 'listening', 'reading', 'writing', 'speaking'];

interface Props {
  defaultProfession?: string;
}

export function MockExamsPage({ defaultProfession = 'Medicine' }: Props) {
  const [activeExam, setActiveExam] = useState<MockExam | null>(null);
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all');
  const [subtest, setSubtest] = useState<OetSubtest | 'all'>('all');
  const { isComplete } = useProgress();

  const professions = useMemo(
    () =>
      orderProfessions(
        ['all', ...Array.from(new Set(mockExams.map((e) => e.profession)))],
        defaultProfession,
      ),
    [defaultProfession],
  );
  const [profession, setProfession] = useState(defaultProfession);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = mockExams.filter((exam) => {
      if (difficulty !== 'all' && exam.difficulty !== difficulty) return false;
      if (!matchesProfessionFilter(exam.profession, profession)) return false;
      if (subtest !== 'all' && !exam.subtests.includes(subtest)) return false;
      if (!q) return true;
      return [
        exam.title,
        exam.profession,
        exam.description,
        exam.sourceHint ?? '',
        ...(exam.tags ?? []),
        ...exam.subtests,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
    return sortByPreferredProfession(items, defaultProfession);
  }, [query, difficulty, profession, subtest, defaultProfession]);

  const { page, setPage, totalPages, pageItems, total, rangeStart, rangeEnd } =
    usePagination(filtered);

  const medicineCatalogCount = useMemo(() => countMedicineCatalog(mockExams), []);

  const showMedicineAdvancedSubtestCounts =
    profession === 'Medicine' && difficulty === 'advanced';

  const medicineAdvancedSubtestCounts = useMemo(
    () => countMedicineAdvancedMockBySubtest(mockExams),
    [],
  );

  const difficultyCounts = useMemo(() => {
    const counts: Record<Difficulty | 'all', number> = {
      all: mockExams.length,
      beginner: 0,
      intermediate: 0,
      advanced: 0,
    };
    mockExams.forEach((exam) => {
      counts[exam.difficulty] += 1;
    });
    return counts;
  }, []);

  if (activeExam) {
    return (
      <SessionRunner config={buildMockSession(activeExam)} onExit={() => setActiveExam(null)} />
    );
  }

  const doctorsHub = recallSources.find((s) => s.handle === '@OETDoctorsHub');

  return (
    <div className="page-section">
      <p className="page-intro">
        {profession === 'Medicine' ? (
          <>
            {total.toLocaleString()} of {medicineCatalogCount.toLocaleString()} medicine timed mocks
            shown
            {medicineCatalogCount >= TARGET_MEDICINE_MOCK_COUNT
              ? ` (${TARGET_MEDICINE_MOCK_COUNT.toLocaleString()}+ physician-focused)`
              : ''}
            .{' '}
          </>
        ) : (
          <>
            {mockExams.length.toLocaleString()} timed mock exams —{' '}
            {medicineCatalogCount.toLocaleString()} for Medicine (shown first).{' '}
            {difficultyCounts.advanced.toLocaleString()} advanced
            {difficultyCounts.advanced >= TARGET_ADVANCED_MOCK_COUNT
              ? ` (${TARGET_ADVANCED_MOCK_COUNT.toLocaleString()}+ expert pool)`
              : ''}
            .{' '}
          </>
        )}
        {physicianRecallHint}
        {doctorsHub && (
          <>
            {' '}
            Medicine debriefs often appear on <code>{doctorsHub.handle}</code>.
          </>
        )}
      </p>

      <div className="card listening-audio-notice">
        <strong>🎧 Listening mocks &amp; audio</strong>
        <p className="meta">
          In-app listening tasks now use generated question-matched audio clips, so the recording
          matches the active mock or practice question. Official sample-test recordings remain in{' '}
          <strong>Book PDFs</strong> for paper-based listening practice.
        </p>
      </div>

      <div className="search-bar">
        <input
          type="search"
          placeholder="Search mock exams…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search mock exams"
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
              ? `Advanced catalog (${difficultyCounts.all.toLocaleString()})`
              : `${d.charAt(0).toUpperCase() + d.slice(1)} (${difficultyCounts[d].toLocaleString()})`}
          </button>
        ))}
      </div>

      <div className="filter-bar">
        {subtestFilters.map((s) => (
          <button
            key={s}
            type="button"
            className={`filter-chip ${subtest === s ? 'filter-chip-active' : ''}`}
            onClick={() => setSubtest(s)}
          >
            {s === 'all'
              ? showMedicineAdvancedSubtestCounts
                ? `All sub-tests (${medicineAdvancedSubtestCounts.all.toLocaleString()})`
                : 'All sub-tests'
              : showMedicineAdvancedSubtestCounts
                ? `${s.charAt(0).toUpperCase() + s.slice(1)} (${medicineAdvancedSubtestCounts[s].toLocaleString()}${medicineAdvancedSubtestCounts[s] >= TARGET_MEDICINE_ADVANCED_PER_SUBTEST ? '+' : ''})`
                : s.charAt(0).toUpperCase() + s.slice(1)}
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
        <p className="empty-state">No mock exams match your filters.</p>
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
          {pageItems.map((exam) => (
            <article key={exam.id} className="card exam-card">
              <div className="card-header-row">
                <DifficultyBadge difficulty={exam.difficulty} />
                <span className="meta">{exam.durationMinutes} min</span>
                {isComplete(exam.id) && <span className="tag tag-complete">Completed</span>}
              </div>
              <h3>{exam.title}</h3>
              <p className="meta">{exam.profession}</p>
              <p className="description">{exam.description}</p>
              <div className="badge-row">
                {exam.subtests.map((s) => (
                  <SubtestBadge key={s} subtest={s} small />
                ))}
              </div>
              <div className="card-footer">
                <span>{exam.questionsCount} items</span>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setActiveExam(exam)}
                >
                  Start mock
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
