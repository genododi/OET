import { useState } from 'react';
import type { UsmleStep, UsmleDiscipline } from '../types/usmle';
import type { SessionConfig } from '../types/session';
import { UsmleBlockSetup } from '../components/UsmleBlockSetup';
import { SessionRunner } from '../components/SessionRunner';
import { UsmlePerformance } from '../components/UsmlePerformance';
import { buildUsmleBlockSession, buildUsmleCustomSession, getUsmleTaskCount } from '../lib/usmleSessionBuilder';

type UsmleView = 'dashboard' | 'setup' | 'session';

const STEP_CARDS: { step: UsmleStep; label: string; description: string }[] = [
  {
    step: 'step1',
    label: 'Step 1',
    description: 'Basic Sciences — anatomy, biochemistry, microbiology, pathology, pharmacology, physiology, and more',
  },
  {
    step: 'step2',
    label: 'Step 2 CK',
    description: 'Clinical Knowledge — internal medicine subspecialties, surgery, pediatrics, OB/GYN, psychiatry',
  },
  {
    step: 'step3',
    label: 'Step 3',
    description: 'Clinical Management — ambulatory care, inpatient management, biostatistics, preventive medicine',
  },
];

export function UsmlePage() {
  const [view, setView] = useState<UsmleView>('dashboard');
  const [selectedStep, setSelectedStep] = useState<UsmleStep | null>(null);
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);

  const handleStepSelect = (step: UsmleStep) => {
    setSelectedStep(step);
    setView('setup');
  };

  const handleStart = (
    step: UsmleStep,
    discipline: UsmleDiscipline | undefined,
    questionCount: number,
    timeMinutes: number,
    isCustom: boolean,
  ) => {
    const options = { step, discipline, questionCount, timeMinutes };
    const config = isCustom ? buildUsmleCustomSession(options) : buildUsmleBlockSession(options);
    setSessionConfig(config);
    setView('session');
  };

  const handleExit = () => {
    setSessionConfig(null);
    setView('dashboard');
  };

  if (view === 'session' && sessionConfig) {
    return <SessionRunner config={sessionConfig} onExit={handleExit} />;
  }

  if (view === 'setup' && selectedStep) {
    return (
      <UsmleBlockSetup
        step={selectedStep}
        onStart={handleStart}
        onBack={() => setView('dashboard')}
      />
    );
  }

  const taskCounts = STEP_CARDS.map((card) => ({
    ...card,
    count: getUsmleTaskCount(card.step),
  }));

  return (
    <div className="usmle-page">
      <section className="card usmle-hero">
        <h2>USMLE Q-Bank</h2>
        <p>
          Practice with USMLE-style multiple-choice questions for Steps 1, 2 CK, and 3.
          Each question includes a clinical vignette, detailed answer explanations, and discipline tagging.
        </p>
      </section>

      <div className="usmle-step-grid">
        {taskCounts.map((card) => (
          <button
            key={card.step}
            type="button"
            className="card usmle-step-card"
            onClick={() => handleStepSelect(card.step)}
          >
            <h3>{card.label}</h3>
            <p>{card.description}</p>
            <span className="usmle-step-count">{card.count} questions</span>
          </button>
        ))}
      </div>

      <UsmlePerformance />
    </div>
  );
}
