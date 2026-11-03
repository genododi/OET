import { useState } from 'react';
import type { UsmleStep, UsmleDiscipline } from '../types/usmle';
import { usmleDisciplines } from '../data/usmleDisciplines';
import { getUsmleTaskCount } from '../lib/usmleSessionBuilder';
import type { SessionTask } from '../types/session';

interface Props {
  step: UsmleStep;
  pool?: SessionTask[];
  onStart: (step: UsmleStep, discipline: UsmleDiscipline | undefined, questionCount: number, timeMinutes: number, isCustom: boolean) => void;
  onBack: () => void;
}

const STEP_LABELS: Record<UsmleStep, string> = {
  step1: 'Step 1 — Basic Sciences',
  step2: 'Step 2 CK — Clinical Knowledge',
  step3: 'Step 3 — Clinical Management',
};

const DEFAULT_BLOCK_SIZES: Record<UsmleStep, number> = {
  step1: 20,
  step2: 20,
  step3: 20,
};

const DEFAULT_BLOCK_TIMES: Record<UsmleStep, number> = {
  step1: 30,
  step2: 30,
  step3: 30,
};

export function UsmleBlockSetup({ step, pool, onStart, onBack }: Props) {
  const [mode, setMode] = useState<'block' | 'custom'>('block');
  const [discipline, setDiscipline] = useState<string>('');
  const [customCount, setCustomCount] = useState(20);
  const [customTime, setCustomTime] = useState(30);
  const totalAvailable = pool ? pool.filter(task => task.usmleStep === step && (!discipline || task.usmleDiscipline === discipline)).length : getUsmleTaskCount(step);

  const isBlock = mode === 'block';
  const questionCount = Math.min(isBlock ? DEFAULT_BLOCK_SIZES[step] : customCount, totalAvailable);
  const timeMinutes = isBlock ? DEFAULT_BLOCK_TIMES[step] : customTime;

  const handleStart = () => {
    onStart(
      step,
      (discipline || undefined) as UsmleDiscipline | undefined,
      questionCount,
      timeMinutes,
      !isBlock,
    );
  };

  return (
    <div className="card usmle-setup">
      <div className="usmle-setup-header">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          ← Back to steps
        </button>
        <h3>{STEP_LABELS[step]}</h3>
        <p className="meta">{totalAvailable} questions available</p>
      </div>

      <div className="usmle-setup-mode">
        <label className="usmle-mode-toggle">
          <input
            type="radio"
            name="mode"
            checked={mode === 'block'}
            onChange={() => setMode('block')}
          />
          <span className="usmle-mode-label">
            <strong>Timed practice block</strong>
            <span className="meta">
              {DEFAULT_BLOCK_SIZES[step]} questions · {DEFAULT_BLOCK_TIMES[step]} minutes
            </span>
          </span>
        </label>
        <label className="usmle-mode-toggle">
          <input
            type="radio"
            name="mode"
            checked={mode === 'custom'}
            onChange={() => setMode('custom')}
          />
          <span className="usmle-mode-label">
            <strong>Custom Quiz</strong>
            <span className="meta">Choose your own question count and time</span>
          </span>
        </label>
      </div>

      <div className="usmle-setup-field">
        <label htmlFor="usmle-discipline">Discipline filter (optional)</label>
        <select
          id="usmle-discipline"
          value={discipline}
          onChange={(e) => setDiscipline(e.target.value)}
        >
          <option value="">All disciplines</option>
          {usmleDisciplines.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      {mode === 'custom' && (
        <div className="usmle-setup-custom-fields">
          <div className="usmle-setup-field">
            <label htmlFor="usmle-count">Number of questions</label>
            <div className="usmle-slider-row">
              <input
                id="usmle-count"
                type="range"
                min={1}
                max={Math.max(1, Math.min(40, totalAvailable))}
                value={Math.max(1, questionCount)}
                onChange={(e) => setCustomCount(Number(e.target.value))}
              />
              <span className="usmle-slider-value">{questionCount}</span>
            </div>
          </div>
          <div className="usmle-setup-field">
            <label htmlFor="usmle-time">Time limit (minutes)</label>
            <div className="usmle-slider-row">
              <input
                id="usmle-time"
                type="range"
                min={5}
                max={120}
                step={5}
                value={customTime}
                onChange={(e) => setCustomTime(Number(e.target.value))}
              />
              <span className="usmle-slider-value">{customTime} min</span>
            </div>
          </div>
        </div>
      )}

      <p className="meta">Practice timing follows the 2026 format: up to 20 questions in 30 minutes. This is a practice block, not a full official exam. {totalAvailable < 20 ? `Only ${totalAvailable} questions match these filters.` : ''}</p>

      <button
        type="button"
        className="btn btn-primary"
        onClick={handleStart}
        disabled={questionCount < 1}
      >
        Start {isBlock ? 'Block' : 'Quiz'} ({questionCount} questions, {timeMinutes} min)
      </button>
    </div>
  );
}
