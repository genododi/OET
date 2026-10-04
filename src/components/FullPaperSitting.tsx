import { useState } from 'react';
import { realListeningTests } from '../data/realListeningTests';
import audioManifest from '../data/realListeningAudio.generated.json';
import { paperSamples } from '../data/officialExamPractice';
import { RealListeningTestRunner } from './RealListeningTestRunner';
import { OfficialPaperRunner } from './OfficialPaperRunner';

type Sitting = { phase: 'listening' | 'reading' | 'writing' | 'done'; listeningStartedAt: number | null };
export function FullPaperSitting({ sample, onExit }: { sample: number; onExit: () => void }) {
  const key = `oet-full-paper-sitting-${sample}-v1`;
  const [sitting, setSitting] = useState<Sitting>(() => {
    try { const saved = JSON.parse(localStorage.getItem(key) ?? 'null'); if (saved && ['listening', 'reading', 'writing', 'done'].includes(saved.phase) && (saved.listeningStartedAt === null || typeof saved.listeningStartedAt === 'number')) return saved; } catch { /* Start fresh if storage is unavailable. */ }
    return { phase: 'listening', listeningStartedAt: null };
  });
  const [interrupted] = useState(sitting.phase === 'listening' && sitting.listeningStartedAt !== null);
  const [storageError, setStorageError] = useState(false);
  const paper = paperSamples[sample - 1];
  const listeningSeconds = audioManifest.tests[sample - 1].outputDurationSeconds;
  const change = (value: Sitting) => { setSitting(value); try { localStorage.setItem(key, JSON.stringify(value)); } catch { setStorageError(true); } };
  const reset = () => { try { localStorage.removeItem(key); } catch { /* The next screen reports storage problems. */ } onExit(); };
  if (interrupted) return <section className="card"><h2>Listening was interrupted</h2><p>A recording cannot be restarted inside the same paper-test attempt. Start a new sitting when you can listen continuously.</p><button className="btn btn-primary" onClick={reset}>End interrupted attempt</button></section>;
  if (sitting.phase === 'done') return <section className="card"><h2>Written sitting complete</h2><p>You have finished Listening, Reading and Writing in order. Review your handwritten papers with the official key and sample letter. Speaking is a separate test with two role-plays.</p><a className="btn btn-primary" href={paper.answersUrl} target="_blank" rel="noopener noreferrer">Review official answers ↗</a><a className="btn btn-secondary" href="#practice/speaking">Prepare Speaking →</a><button className="btn btn-secondary" onClick={reset}>New written sitting</button></section>;
  return <div className="page-section"><section className="card"><strong>Full OET on Paper written sitting · Sample {sample}</strong><p>Listening → Reading (15 + 45 minutes) → Writing (5 + 40 minutes). No scheduled study breaks or feedback between sections. Have the complete printed question pack ready before playing the recording.</p><a href={paper.questionsUrl} target="_blank" rel="noopener noreferrer">Open complete question pack to print ↗</a>{storageError && <p role="alert">Progress cannot be saved. Keep this page open throughout the sitting.</p>}</section>
    {sitting.phase === 'listening' ? <RealListeningTestRunner test={realListeningTests[sample - 1]} onExit={onExit} onPlaybackStart={startedAt => change({ phase: 'listening', listeningStartedAt: startedAt })} onComplete={() => change({ ...sitting, phase: 'reading' })} /> : <OfficialPaperRunner key={sitting.phase} skill={sitting.phase} sample={sample} onExit={onExit} continuousStart={(sitting.listeningStartedAt ?? 0) + listeningSeconds * 1000 + (sitting.phase === 'writing' ? 3600_000 : 0)} onComplete={() => change({ ...sitting, phase: sitting.phase === 'reading' ? 'writing' : 'done' })} />}
  </div>;
}
