import { useState } from 'react';
import type { UsmleStep, UsmleDiscipline } from '../types/usmle';
import { usmleDisciplines } from '../data/usmleDisciplines';
import { getUsmleTaskCount } from '../lib/usmleSessionBuilder';

interface Props {
  step: UsmleStep;
  onStart: (step: UsmleStep, discipline: UsmleDiscipline | undefined, questionCount: number, timeMinutes: number, isCustom: boolean) => void;
  onBack: () => void;
}

const STEP_LABELS: Record<UsmleStep, string> = {
  step1: 'Step 1 — Basic Sciences',
  step2: 'Step 2 CK — Clinical Knowledge',
  step3: 'Step 3 — Clinical Management',
};

const DEFAULT_BLOCK_SIZES: Record<UsmleStep, number> = {
  step1: 40,
  step2: 40,
  step3: 30,
};

const DEFAULT_BLOCK_TIMES: Record<UsmleStep, number> = {
  step1: 60,
  step2: 60,
  step3: 45,
};

export function UsmleBlockSetup({ step, onStart, onBack }: Props) {
  const totalAvailable = getUsmleTaskCount(step);
  const [mode, setMode] = useState<'block' | 'custom'>('block');
  const [discipline, setDiscipline] = useState<string>('');
  const [customCount, setCustomCount] = useState(20);
  const [customTime, setCustomTime] = useState(30);

  const isBlock = mode === 'block';
  const questionCount = isBlock ? Math.min(DEFAULT_BLOCK_SIZES[step], totalAvailable) : customCount;
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
            <strong>Standard Block</strong>
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
                min={5}
                max={Math.min(40, totalAvailable)}
                value={customCount}
                onChange={(e) => setCustomCount(Number(e.target.value))}
              />
              <span className="usmle-slider-value">{customCount}</span>
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
