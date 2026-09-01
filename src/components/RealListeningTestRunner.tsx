import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AudioPlayer } from './AudioPlayer';
import { PdfViewer } from './PdfViewer';
import { useProgress } from '../hooks/useProgress';
import { baseUrl } from '../lib/baseUrl';
import {
  isRealListeningAnswerCorrect,
  type RealListeningPart,
  type RealListeningTest,
} from '../data/realListeningTests';

interface Props {
  test: RealListeningTest;
  onExit: () => void;
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

export function RealListeningTestRunner({ test, onExit }: Props) {
  const { markComplete } = useProgress();
  const [phase, setPhase] = useState<'intro' | 'active' | 'done'>('intro');
  const [part, setPart] = useState<RealListeningPart>('A');
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(test.durationMinutes * 60);
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
    if (completed.current) return;
    completed.current = true;
    markComplete({
      id: test.mockId,
      kind: 'mock',
      title: test.title,
      completedAt: new Date().toISOString(),
      durationMinutes: test.durationMinutes,
      score: { correct: score, total: 42 },
    });
    setPhase('done');
  }, [markComplete, score, test]);

  useEffect(() => {
    if (phase !== 'active') return;
    if (secondsLeft === 0) {
      finish();
      return;
    }
    const timer = window.setTimeout(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [finish, phase, secondsLeft]);

  useEffect(() => {
    if (phase === 'active') window.scrollTo({ top: 0 });
  }, [phase]);

  if (phase === 'intro') {
    return (
      <div className="session real-listening-runner">
        <button type="button" className="btn btn-ghost back-btn" onClick={onExit}>← Back</button>
        <article className="card real-listening-intro">
          <span className="session-kind">Real source audio · 42 questions</span>
          <h2>{test.title}</h2>
          <p>
            The question paper, answer key and Part A/B/C recordings are a verified set from the mounted
            GENODODI source folder. The three source tracks are joined into one continuous exam recording.
          </p>
          <ul className="session-checklist">
            <li>Part A: 24 note-completion answers</li>
            <li>Part B: 6 workplace extract questions</li>
            <li>Part C: 12 presentation/interview questions</li>
            <li>Audio plays once; use the embedded paper while completing the answer sheet</li>
          </ul>
          <div className="real-listening-source-proof">
            {test.sourceParts.map((sourcePart) => (
              <span key={sourcePart.part}>Part {sourcePart.part} · {Math.round(sourcePart.durationSeconds / 60)} min · {sourcePart.sha256.slice(0, 10)}…</span>
            ))}
          </div>
          <div className="session-intro-actions">
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
          <p className="real-listening-score">{score} / 42</p>
          <p>{score >= 38 ? 'Excellent precision.' : score >= 30 ? 'Strong attempt—review the missed evidence.' : 'Review the paper with the recording transcript and retry.'}</p>
          <div className="real-listening-review">
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
          </div>
          <div className="session-intro-actions">
            <button type="button" className="btn btn-primary" onClick={onExit}>Back to mocks</button>
            <button type="button" className="btn btn-secondary" onClick={() => {
              completed.current = false;
              setAnswers({});
              setPart('A');
              setSecondsLeft(test.durationMinutes * 60);
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
        <span className="session-progress">{Object.keys(answers).length} / 42 answered</span>
      </div>

      <AudioPlayer
        src={`${baseUrl}${test.audioPath.replace(/^\//, '')}`}
        label={`${test.title} — continuous Part A, B and C recording`}
        note={test.sourceLabel}
        examMode
        examPlayed={playbackUsed}
        onExamPlay={() => setPlaybackUsed(true)}
        scenarioId={test.id}
      />

      <div className="real-listening-workspace">
        <PdfViewer src={`${baseUrl}${test.questionPdf.replace(/^\//, '')}`} title={`${test.title} question paper`} />
        <section className="card real-listening-answer-sheet" aria-label="Listening answer sheet">
          <div className="real-listening-part-tabs" role="tablist" aria-label="Listening test part">
            {(['A', 'B', 'C'] as const).map((candidate) => (
              <button key={candidate} type="button" role="tab" aria-selected={part === candidate} className={part === candidate ? 'active' : ''} onClick={() => setPart(candidate)}>Part {candidate}</button>
            ))}
          </div>
          <h3>Part {part}</h3>
          <p className="meta">{partRanges[part]}</p>
          <div className="real-listening-answers">
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
          </div>
          <div className="real-listening-sheet-actions">
            {part !== 'A' && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPart(part === 'C' ? 'B' : 'A')}>Previous part</button>}
            {part !== 'C' ? <button type="button" className="btn btn-primary btn-sm" onClick={() => setPart(part === 'A' ? 'B' : 'C')}>Next part</button> : <button type="button" className="btn btn-primary btn-sm" onClick={finish}>Submit all answers</button>}
          </div>
        </section>
      </div>
    </div>
  );
}
