import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AudioPlayer } from './AudioPlayer';
import { PdfViewer } from './PdfViewer';
import { useProgress } from '../hooks/useProgress';
import { paperSamples } from '../data/officialExamPractice';
import audioManifest from '../data/realListeningAudio.generated.json';
import { baseUrl } from '../lib/baseUrl';
import {
  isRealListeningAnswerCorrect,
  type RealListeningPart,
  type RealListeningTest,
} from '../data/realListeningTests';

interface Props {
  test: RealListeningTest;
  onExit: () => void;
  onComplete?: () => void;
  onPlaybackStart?: (startedAt: number) => void;
}

const partRanges: Record<RealListeningPart, string> = {
  A: 'Questions 1–24 · words or short phrases',
  B: 'Questions 25–30 · choose A, B or C',
  C: 'Questions 31–42 · choose A, B or C',
};

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

export function RealListeningTestRunner({ test, onExit, onComplete, onPlaybackStart }: Props) {
  const { markComplete } = useProgress();
  const [phase, setPhase] = useState<'intro' | 'active' | 'done'>('intro');
  const [handwritten, setHandwritten] = useState(true);
  const [part, setPart] = useState<RealListeningPart>('A');
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const durationSeconds = Math.ceil(audioManifest.tests.find(item => item.id === test.id)!.outputDurationSeconds);
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const deadline = useRef<number | null>(null);
  const playbackKey = `oet-listening-active-${test.id}-v1`;
  const [interrupted, setInterrupted] = useState(() => {
    try { return !onComplete && sessionStorage.getItem(playbackKey) === 'true'; } catch { return false; }
  });
  const savePlayback = (active: boolean) => { if (onComplete) return; try { if (active) sessionStorage.setItem(playbackKey, 'true'); else sessionStorage.removeItem(playbackKey); } catch { /* The recording remains guarded for this open page. */ } };
  const [playbackUsed, setPlaybackUsed] = useState(false);
  const completed = useRef(false);

  const visibleQuestions = useMemo(
    () => test.answers.filter((question) => question.part === part),
    [part, test.answers],
  );
  const score = useMemo(
    () => test.answers.filter((question) => isRealListeningAnswerCorrect(question, answers[question.number] ?? '')).length,
    [answers, test.answers],
  );

  const finish = useCallback(() => {
    if (completed.current || interrupted) return;
    completed.current = true;
    try { sessionStorage.removeItem(playbackKey); } catch { /* Completion still works without storage. */ }
    markComplete({
      id: test.mockId,
      kind: 'mock',
      title: test.title,
      completedAt: new Date().toISOString(),
      durationMinutes: test.durationMinutes,
      score: handwritten ? undefined : { correct: score, total: 42 },
    });
    setPhase('done');
    onComplete?.();
  }, [markComplete, score, test, interrupted, onComplete, handwritten, playbackKey]);

  useEffect(() => {
    if (phase !== 'active' || !playbackUsed || interrupted) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil(((deadline.current ?? Date.now()) - Date.now()) / 1000));
      setSecondsLeft(remaining);
      // Completion follows the actual recording end, never a separate countdown.
    };
    const timer = window.setInterval(tick, 250);
    window.addEventListener('focus', tick);
    return () => { clearInterval(timer); window.removeEventListener('focus', tick); };
  }, [phase, playbackUsed, interrupted]);

  useEffect(() => {
    if (phase === 'active') window.scrollTo({ top: 0 });
  }, [phase]);

  if (interrupted) return <section className="card"><h2>Listening was interrupted</h2><p role="alert">This is not a completed exam attempt. A recording cannot be replayed inside the same attempt. End this attempt and restart when you can listen continuously.</p><button className="btn btn-primary" onClick={() => { savePlayback(false); onExit(); }}>End interrupted attempt</button></section>;

  if (phase === 'intro') {
    return (
      <div className="session real-listening-runner">
        <button type="button" className="btn btn-ghost back-btn" onClick={onExit}>← Back</button>
        <article className="card real-listening-intro">
          <span className="session-kind">Real source audio · 42 questions</span>
          <h2>{test.title}</h2>
          <p>
            The original question paper, answer key and human recordings form a verified sample set.
            Print the paper before starting if you want to handwrite your answers. The recording
            includes the preparation pauses and the final two-minute checking period; no extra checking time is added.
          </p>
          <p><label><input type="checkbox" checked={handwritten} onChange={e => setHandwritten(e.target.checked)} /> I will write my listening answers on paper</label></p>
          <ul className="session-checklist">
            <li>Part A: 24 note-completion answers</li>
            <li>Part B: 6 workplace extract questions</li>
            <li>Part C: 12 presentation/interview questions</li>
            <li>Audio plays once; timing starts with playback and submission follows the end of the recording</li>
            <li>The exact duration follows this sample recording (approximately 40 minutes), not an arbitrary 40-minute cutoff</li>
          </ul>
          <div className="real-listening-source-proof">
            {test.sourceParts.map((sourcePart) => (
              <span key={sourcePart.part}>Part {sourcePart.part} · {Math.round(sourcePart.durationSeconds / 60)} min</span>
            ))}
          </div>
          <div className="session-intro-actions">
            <a className="btn btn-secondary" href={`${baseUrl}${test.questionPdf.slice(1)}`} target="_blank" rel="noopener noreferrer">Open listening paper to print ↗</a>
            <button type="button" className="btn btn-primary" onClick={() => setPhase('active')}>Start real listening test</button>
            <a className="btn btn-secondary" href={test.sourceUrl} target="_blank" rel="noopener noreferrer">Official source ↗</a>
          </div>
        </article>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="session real-listening-runner">
        <article className="card session-done-card">
          <span className="session-done-icon" aria-hidden="true">✓</span>
          <h2>Real listening test complete</h2>
          <p className="real-listening-score">{handwritten ? 'Handwritten paper complete' : `${score} / 42`}</p>
          {!handwritten && <p>{score >= 38 ? 'Excellent precision.' : score >= 30 ? 'Strong attempt—review the missed evidence.' : 'Review the paper with the recording transcript and retry.'}</p>}
          {handwritten && <p>No automatic mark is assigned to handwritten answers. Compare your paper with the <a href={paperSamples[test.id.endsWith('2') ? 1 : 0].answersUrl} target="_blank" rel="noopener noreferrer">official answer key</a>.</p>}
          {!handwritten && <div className="real-listening-review">
            {test.answers.map((question) => {
              const value = answers[question.number] ?? '';
              const correct = isRealListeningAnswerCorrect(question, value);
              return (
                <div key={question.number} className={correct ? 'correct' : 'incorrect'}>
                  <strong>{question.number}</strong>
                  <span>{value || 'No answer'}</span>
                  {!correct && <span>Answer: {question.accepted[0]}</span>}
                </div>
              );
            })}
          </div>}
          <div className="session-intro-actions">
            <button type="button" className="btn btn-primary" onClick={onExit}>Back to mocks</button>
            <button type="button" className="btn btn-secondary" onClick={() => {
              completed.current = false;
              setAnswers({});
              setPart('A');
              setSecondsLeft(durationSeconds);
              deadline.current = null;
              setInterrupted(false);
              setPlaybackUsed(false);
              setPhase('intro');
            }}>Retry</button>
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="session real-listening-runner">
      <div className="session-toolbar">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onExit}>← Exit</button>
        <div className={secondsLeft <= 60 ? 'session-timer session-timer-urgent' : 'session-timer'}>{formatTime(secondsLeft)}</div>
        <span className="session-progress">{handwritten ? 'Handwritten answer sheet' : `${Object.values(answers).filter(answer => answer.trim()).length} / 42 answered`}</span>
      </div>

      <AudioPlayer
        src={`${baseUrl}${test.audioPath.replace(/^\//, '')}`}
        label={`${test.title} — continuous Part A, B and C recording`}
        note={test.sourceLabel}
        examMode
        examPlayed={playbackUsed}
        onExamPlay={() => { const startedAt = Date.now(); savePlayback(true); deadline.current = startedAt + durationSeconds * 1000; onPlaybackStart?.(startedAt); setPlaybackUsed(true); }}
        onPlaybackEnd={finish}
        onPlaybackError={() => setInterrupted(true)}
        scenarioId={test.id}
      />

      {interrupted && <p role="alert">The audio was interrupted. This is not a completed exam attempt. Exit and restart when the recording can play continuously.</p>}
      {!playbackUsed && <p>Start the recording when you are ready. The paper and response sheet open with playback.</p>}
      {playbackUsed && !interrupted && <div className="real-listening-workspace">
        <PdfViewer src={`${baseUrl}${test.questionPdf.replace(/^\//, '')}`} title={`${test.title} question paper`} />
        <section className="card real-listening-answer-sheet" aria-label="Listening answer sheet">
          <div className="real-listening-part-tabs" role="tablist" aria-label="Listening test part">
            {(['A', 'B', 'C'] as const).map((candidate) => (
              <button key={candidate} type="button" role="tab" aria-selected={part === candidate} className={part === candidate ? 'active' : ''} onClick={() => setPart(candidate)}>Part {candidate}</button>
            ))}
          </div>
          <h3>Part {part}</h3>
          <p className="meta">{partRanges[part]}</p>
          {handwritten && <p>Complete the printed answer booklet. Follow the recording’s directions and stop when it ends.</p>}
          {!handwritten && <div className="real-listening-answers">
            {visibleQuestions.map((question) => (
              <div className="real-listening-answer" key={question.number}>
                <label htmlFor={`real-listening-${question.number}`}>{question.number}</label>
                {part === 'A' ? (
                  <input id={`real-listening-${question.number}`} type="text" value={answers[question.number] ?? ''} onChange={(event) => setAnswers((current) => ({ ...current, [question.number]: event.target.value }))} autoComplete="off" />
                ) : (
                  <div className="real-listening-choice" id={`real-listening-${question.number}`} role="group" aria-label={`Question ${question.number}`}>
                    {['A', 'B', 'C'].map((choice) => (
                      <button key={choice} type="button" className={answers[question.number] === choice ? 'selected' : ''} onClick={() => setAnswers((current) => ({ ...current, [question.number]: choice }))}>{choice}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>}
          <div className="real-listening-sheet-actions">
            {part !== 'A' && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPart(part === 'C' ? 'B' : 'A')}>Previous part</button>}
            {part !== 'C' ? <button type="button" className="btn btn-primary btn-sm" onClick={() => setPart(part === 'A' ? 'B' : 'C')}>Next part</button> : <p className="meta">Answers submit automatically at the end of the recording, after its included checking time.</p>}
          </div>
        </section>
      </div>}
    </div>
  );
}
