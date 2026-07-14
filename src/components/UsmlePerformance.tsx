import { useState } from 'react';
import type { UsmleStep } from '../types/usmle';
import { getUsmleDisciplineStats, getUsmleOverallStats } from '../lib/usmleAnalytics';
import { usmleDisciplineMap } from '../data/usmleDisciplines';

const STEPS: { value: UsmleStep | ''; label: string }[] = [
  { value: '', label: 'All Steps' },
  { value: 'step1', label: 'Step 1' },
  { value: 'step2', label: 'Step 2 CK' },
  { value: 'step3', label: 'Step 3' },
];

export function UsmlePerformance() {
  const [stepFilter, setStepFilter] = useState<UsmleStep | ''>('');

  const step = stepFilter || undefined;
  const stats = getUsmleDisciplineStats(step as UsmleStep | undefined);
  const overall = getUsmleOverallStats(step as UsmleStep | undefined);

  const hasData = overall.totalSessions > 0;

  return (
    <div className="card usmle-performance">
      <div className="usmle-performance-header">
        <h3>Performance Analytics</h3>
        <select
          value={stepFilter}
          onChange={(e) => setStepFilter(e.target.value as UsmleStep | '')}
        >
          {STEPS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {!hasData ? (
        <p className="meta">Complete a USMLE block or quiz to see performance data.</p>
      ) : (
        <>
          <div className="usmle-performance-summary">
            <div className="usmle-performance-stat">
              <span className="usmle-performance-stat-value">{overall.totalSessions}</span>
              <span className="usmle-performance-stat-label">Sessions</span>
            </div>
            <div className="usmle-performance-stat">
              <span className="usmle-performance-stat-value">{overall.totalQuestions}</span>
              <span className="usmle-performance-stat-label">Questions</span>
            </div>
            <div className="usmle-performance-stat">
              <span className="usmle-performance-stat-value">{overall.averagePercent}%</span>
              <span className="usmle-performance-stat-label">Avg. Accuracy</span>
            </div>
          </div>

          {stats.length > 0 && (
            <div className="usmle-discipline-breakdown">
              <h4>Discipline Breakdown</h4>
              <div className="usmle-discipline-bars">
                {stats.map((s) => {
                  const meta = usmleDisciplineMap.get(s.discipline as any);
                  return (
                    <div key={s.discipline} className="usmle-discipline-bar-row">
                      <div className="usmle-discipline-bar-label">
                        <span style={{ color: meta?.color }}>{meta?.shortLabel ?? s.discipline}</span>
                        <span>{s.percentCorrect}%</span>
                      </div>
                      <div className="usmle-discipline-bar-track">
                        <div
                          className="usmle-discipline-bar-fill"
                          style={{
                            width: `${s.percentCorrect}%`,
                            backgroundColor: meta?.color ?? '#666',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
