import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SessionConfig, SessionTask, SpeakingCriteria } from '../types/session';
import { useProgress } from '../hooks/useProgress';
import { SubtestBadge } from './SubtestBadge';
import { AudioPlayer } from './AudioPlayer';
import { SpeakingRecorder } from './SpeakingRecorder';
import { TaskReviewPanel, SessionSummaryPanel } from './SessionReviewPanel';
import ListeningSection from './ListeningSection';
import type { SubtestType } from '../types';
import {
  computeSessionReview,
  evaluateMcqAnswer,
  evaluateWritingDraft,
  type WritingEvaluation,
} from '../lib/oetScoring';
import type { SpeakingEvaluationResult } from '../lib/speakingEvaluation';
import { usmleDisciplineMap } from '../data/usmleDisciplines';
import { computeUsmleScore } from '../lib/usmleScoring';
import { saveUsmleSession } from '../lib/usmleAnalytics';
import { LabValuesPanel } from './LabValuesPanel';
import { CalculatorPanel } from './CalculatorPanel';
import { QuestionFlagButton } from './QuestionFlagButton';

interface Props {
  config: SessionConfig;
  onExit: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function subtestLabel(task: SessionTask): string {
  if (task.subtest === 'intro') return 'Introduction';
  if (task.subtest === 'break') return 'Break';
  return task.subtest.charAt(0).toUpperCase() + task.subtest.slice(1);
}

function getListeningGroup(
  tasks: SessionTask[],
  startIndex: number,
): SessionTask[] | null {
  if (startIndex >= tasks.length || tasks[startIndex]?.subtest !== 'listening') return null;
  const group: SessionTask[] = [];
  for (let i = startIndex; i < tasks.length; i++) {
    if (tasks[i]?.subtest !== 'listening') break;
    group.push(tasks[i]);
  }
  return group.length >= 2 ? group : null;
}

const defaultSpeakingCriteria: SpeakingCriteria = {
  expectedKeywords: ['understand', 'patient', 'explain', 'help'],
  checklist: ['Empathy / rapport first', 'Plain language', 'Check understanding', 'Safety-net advice'],
  samplePhrases: [],
};

export function SessionRunner({ config, onExit }: Props) {
  const { markComplete } = useProgress();
  const [phase, setPhase] = useState<'intro' | 'active' | 'done'>('intro');
  const [taskIndex, setTaskIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(config.durationMinutes * 60);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [writingSubmitted, setWritingSubmitted] = useState<Record<string, boolean>>({});
  const [speakingResults, setSpeakingResults] = useState<Record<string, SpeakingEvaluationResult>>({});
  const [flaggedTasks, setFlaggedTasks] = useState<Record<string, boolean>>({});

  const task = config.tasks[taskIndex];
  const listeningGroup = useMemo(() => getListeningGroup(config.tasks, taskIndex), [config.tasks, taskIndex]);
  const groupSize = listeningGroup?.length ?? 1;

  const sessionReview = useMemo(
    () => computeSessionReview(config, answers, notes, speakingResults),
    [config, answers, notes, speakingResults],
  );

  const mcqEval = useMemo(() => {
    if (!task?.options || !revealed[task.id]) return null;
    return evaluateMcqAnswer(task, answers[task.id]);
  }, [task, revealed, answers]);

  const writingEval = useMemo((): WritingEvaluation | null => {
    if (task?.subtest !== 'writing' || !writingSubmitted[task.id]) return null;
    return evaluateWritingDraft(task, notes[task.id] ?? '');
  }, [task, writingSubmitted, notes]);

  const speakingEval = speakingResults[task?.id ?? ''] ?? null;
  const taskRevealed = task ? revealed[task.id] : false;

  const usmleScore = useMemo(() => {
    if (config.kind !== 'usmle-block' && config.kind !== 'usmle-custom') return null;
    if (phase !== 'done') return null;
    return computeUsmleScore(config.tasks, answers);
  }, [config, answers, phase]);

  useEffect(() => {
    if (phase !== 'active' || secondsLeft <= 0) return;
    const timer = window.setTimeout(
      () => setSecondsLeft((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [phase, secondsLeft]);

  const startSession = () => {
    setPhase('active');
    setTaskIndex(1);
    setSecondsLeft(config.durationMinutes * 60);
  };

  const finishSession = useCallback(() => {
    const review = computeSessionReview(config, answers, notes, speakingResults);
    const mcqTasks = config.tasks.filter((t) => t.options?.length);
    let correct = 0;
    mcqTasks.forEach((t) => {
      const selected = answers[t.id];
      const right = t.options?.find((o) => o.correct);
      if (selected && right && selected === right.id) correct += 1;
    });

    const isUsmle = config.kind === 'usmle-block' || config.kind === 'usmle-custom';

    markComplete({
      id: config.id,
      kind: config.kind,
      title: config.title,
      completedAt: new Date().toISOString(),
      durationMinutes: config.durationMinutes,
      score: mcqTasks.length > 0 ? { correct, total: mcqTasks.length } : undefined,
      review: {
        subtestScores: review.subtestScores,
        overallPercent: review.overallPercent,
        overallPracticePass: review.overallPracticePass,
        overallExamReady: review.overallExamReady,
        weakAreas: review.weakAreas,
        taskReviews: review.taskReviews,
      },
    });

    if (isUsmle) {
      const usmleScore = computeUsmleScore(config.tasks, answers);
      const step = config.tasks.find((t) => t.usmleStep)?.usmleStep ?? 'step1';
      saveUsmleSession(
        step,
        usmleScore.percentCorrect,
        usmleScore.total,
        usmleScore.disciplineBreakdown.map((d) => ({ discipline: d.discipline, percentCorrect: d.percentCorrect })),
      );
    }

    setPhase('done');
  }, [config, markComplete, answers, notes, speakingResults]);

  const goNext = () => {
    const nextIndex = taskIndex + groupSize;
    if (nextIndex >= config.tasks.length) {
      finishSession();
    } else {
      setTaskIndex(nextIndex);
    }
  };

  const goPrev = () => {
    if (taskIndex <= 1) return;
    const prev = taskIndex - 1;
    if (prev >= 1 && config.tasks[prev]?.subtest === 'listening') {
      const group = getListeningGroup(config.tasks, prev);
      if (group) {
        setTaskIndex(prev);
        return;
      }
    }
    setTaskIndex(Math.max(1, prev));
  };

  const revealMcq = () => {
    if (!task) return;
    setRevealed((r) => ({ ...r, [task.id]: true }));
  };

  const submitWriting = () => {
    if (!task) return;
    setWritingSubmitted((s) => ({ ...s, [task.id]: true }));
  };

  const toggleFlag = (taskId: string) => {
    setFlaggedTasks((f) => ({ ...f, [taskId]: !f[taskId] }));
  };

  const handleSpeakingResult = useCallback(
    (result: SpeakingEvaluationResult | null) => {
      if (!task || task.subtest !== 'speaking') return;
      if (result) {
        setSpeakingResults((prev) => ({ ...prev, [task.id]: result }));
        setRevealed((r) => ({ ...r, [task.id]: true }));
      }
    },
    [task],
  );

  const timerClass =
    secondsLeft <= 60 && phase === 'active'
      ? 'session-timer session-timer-urgent'
      : 'session-timer';
  const visiblePhase = phase === 'active' && secondsLeft <= 0 ? 'done' : phase;
  const progressTaskIndex = listeningGroup ? taskIndex + groupSize - 1 : taskIndex;

  if (phase === 'intro') {
    return (
      <div className="session">
        <button type="button" className="btn btn-ghost back-btn" onClick={onExit}>
          ← Back
        </button>
        <article className="card session-intro-card">
          <span className="session-kind">
            {config.kind === 'usmle-block'
              ? 'USMLE Block'
              : config.kind === 'usmle-custom'
                ? 'USMLE Quiz'
                : config.kind === 'mock'
                  ? 'Mock exam'
                  : 'Practice module'}
          </span>
          <h2>{config.title}</h2>
          <p className="meta">{config.subtitle}</p>
          <p className="description">{config.tasks[0]?.instructions}</p>
          {config.tasks[0]?.checklist && (
            <ul className="session-checklist">
              {config.tasks[0].checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          <p className="meta session-threshold-note">
            {config.kind === 'usmle-block' || config.kind === 'usmle-custom'
              ? 'Answers are hidden until you submit. A three-digit estimated score and pass/fail assessment are shown at the end of each block.'
              : 'Exam-like mode: answers are hidden until you submit. Review shows OET pass criteria (70%+ practice / 80%+ exam-ready for Listening & Reading).'}
          </p>
          <div className="badge-row">
            {config.subtests.map((s) => (
              <SubtestBadge key={s} subtest={s} />
            ))}
          </div>
          <div className="session-intro-actions">
            <button type="button" className="btn btn-primary" onClick={startSession}>
              Start {config.durationMinutes}-minute session
            </button>
            <button type="button" className="btn btn-secondary" onClick={onExit}>
              Cancel
            </button>
          </div>
        </article>
      </div>
    );
  }

  if (visiblePhase === 'done') {
    return (
      <div className="session">
        <article className="card session-done-card">
          <span className="session-done-icon" aria-hidden="true">
            ✓
          </span>
          <h2>Session complete</h2>
          <p className="description">
            {config.title} — progress and review saved locally on this device.
          </p>
          <SessionSummaryPanel title={config.title} review={sessionReview} />
          {usmleScore && (
            <div className="card usmle-score-card">
              <h3>USMLE Performance</h3>
              <div className="usmle-score-row">
                <div className="usmle-score-stat">
                  <span className="usmle-score-stat-value">{usmleScore.percentCorrect}%</span>
                  <span className="usmle-score-stat-label">Percent Correct</span>
                </div>
                <div className="usmle-score-stat">
                  <span className="usmle-score-stat-value">{usmleScore.correct}/{usmleScore.total}</span>
                  <span className="usmle-score-stat-label">Correct</span>
                </div>
                {usmleScore.estimatedThreeDigitScore != null && (
                  <div className="usmle-score-stat">
                    <span className="usmle-score-stat-value">{usmleScore.estimatedThreeDigitScore}</span>
                    <span className="usmle-score-stat-label">Estimated Score</span>
                  </div>
                )}
                <div className="usmle-score-stat">
                  <span className={`usmle-score-stat-value ${usmleScore.passed ? 'usmle-pass' : 'usmle-fail'}`}>
                    {usmleScore.passed ? 'PASS' : 'FAIL'}
                  </span>
                  <span className="usmle-score-stat-label">{usmleScore.passed ? 'Above threshold' : 'Needs improvement'}</span>
                </div>
              </div>
            </div>
          )}
          <div className="session-intro-actions">
            <button type="button" className="btn btn-primary" onClick={onExit}>
              Back to {config.kind === 'usmle-block' || config.kind === 'usmle-custom' ? 'USMLE' : config.kind === 'mock' ? 'mocks' : 'practice'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setPhase('intro');
                setTaskIndex(0);
                setAnswers({});
                setNotes({});
                setRevealed({});
                setWritingSubmitted({});
                setSpeakingResults({});
                setSecondsLeft(config.durationMinutes * 60);
              }}
            >
              Retry session
            </button>
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="session">
      <div className="session-toolbar">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onExit}>
          ← Exit
        </button>
        <div className={timerClass} aria-live="polite">
          {formatTime(secondsLeft)}
        </div>
        <span className="session-progress">
          Step {taskIndex} / {config.tasks.length - 1}
        </span>
      </div>

      <div
        className="session-progress-bar"
        role="progressbar"
        aria-valuenow={progressTaskIndex}
        aria-valuemin={1}
        aria-valuemax={config.tasks.length - 1}
      >
        <div
          className="session-progress-fill"
          style={{ width: `${(progressTaskIndex / (config.tasks.length - 1)) * 100}%` }}
        />
      </div>

      {listeningGroup ? (
        <ListeningSection
          tasks={listeningGroup}
          answers={answers}
          onAnswer={(taskId, optionId) => setAnswers((a) => ({ ...a, [taskId]: optionId }))}
          revealed={revealed}
          onReveal={(taskId) => setRevealed((r) => ({ ...r, [taskId]: true }))}
        />
      ) : (
        <article className="card session-task-card">
          <div className="card-header-row">
            <span className="session-task-type">{subtestLabel(task)}</span>
            {task.subtest !== 'intro' && task.subtest !== 'break' && (
              <SubtestBadge subtest={task.subtest as SubtestType} small />
            )}
            {task.usmleDiscipline && (
              <span
                className="tag usmle-discipline-tag"
                style={{ backgroundColor: usmleDisciplineMap.get(task.usmleDiscipline)?.color ?? '#666' }}
              >
                {usmleDisciplineMap.get(task.usmleDiscipline)?.shortLabel ?? task.usmleDiscipline}
              </span>
            )}
            <div className="card-header-spacer" />
            {(config.kind === 'usmle-block' || config.kind === 'usmle-custom') && (
              <>
                <LabValuesPanel />
                <CalculatorPanel />
                <QuestionFlagButton taskId={task.id} flagged={!!flaggedTasks[task.id]} onToggle={toggleFlag} />
              </>
            )}
          </div>
          <h3>{task.title}</h3>
          <p className="session-instructions">{task.instructions}</p>

          {(task.audioSrc || task.audioExternalUrl) && (
            <AudioPlayer
              key={`${task.id}:${task.audioRevision ?? task.audioSrc ?? task.audioExternalUrl}`}
              src={task.audioSrc}
              externalUrl={task.audioExternalUrl}
              label={task.audioLabel ?? task.title}
              note={task.audioNote}
              examMode={task.subtest === 'listening' && config.kind === 'mock'}
              scenarioId={task.id}
              revision={task.audioRevision}
            />
          )}

          {task.hasImage && task.imageSrc && (
            <figure className="usmle-image-figure">
              <img src={task.imageSrc} alt={task.imageCaption ?? 'Clinical image'} className="usmle-vignette-image" />
              {task.imageCaption && <figcaption>{task.imageCaption}</figcaption>}
            </figure>
          )}

          {task.readingPassage && (
            <div className="session-reading-layout">
              <div className="session-reading-passage">
                {task.readingPassageTitle && (
                  <h4 className="session-reading-passage-title">{task.readingPassageTitle}</h4>
                )}
                <div className="session-reading-passage-body">{task.readingPassage}</div>
              </div>
              {task.prompt && (
                <div className="session-reading-question">
                  <span className="session-reading-question-label">Question</span>
                  <p>{task.prompt}</p>
                </div>
              )}
            </div>
          )}

          {!task.readingPassage && task.prompt && (
            <div className="session-prompt">
              <pre>{task.prompt}</pre>
            </div>
          )}

          {task.options && task.subtest === 'listening' && !listeningGroup && (
            <div className="session-response">
              <label htmlFor={`text-${task.id}`}>Your answer</label>
              <input
                id={`text-${task.id}`}
                type="text"
                className="session-text-input"
                value={answers[task.id] ?? ''}
                onChange={(e) => setAnswers((a) => ({ ...a, [task.id]: e.target.value }))}
                placeholder="Type your answer..."
                disabled={taskRevealed}
                autoComplete="off"
              />
              {!taskRevealed && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={!(answers[task.id] ?? '').trim()}
                  onClick={revealMcq}
                >
                  Check answer
                </button>
              )}
            </div>
          )}

          {task.options && task.subtest !== 'listening' && (
            <fieldset className="session-mcq">
              <legend className="sr-only">Select an answer</legend>
              {task.options.map((opt) => {
                const selected = answers[task.id] === opt.id;
                const showResult = taskRevealed;
                const isUserWrong = showResult && selected && !opt.correct;
                const isCorrect = showResult && opt.correct;
                return (
                  <label
                    key={opt.id}
                    className={`session-option ${selected ? 'session-option-selected' : ''} ${
                      isUserWrong ? 'session-option-wrong' : ''
                    } ${isCorrect ? 'session-option-correct' : ''}`}
                  >
                    <input
                      type="radio"
                      name={task.id}
                      value={opt.id}
                      checked={selected}
                      onChange={() => setAnswers((a) => ({ ...a, [task.id]: opt.id }))}
                      disabled={taskRevealed}
                    />
                    {opt.label}
                  </label>
                );
              })}
              {!taskRevealed && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={!answers[task.id]}
                  onClick={revealMcq}
                >
                  Check answer & review
                </button>
              )}
            </fieldset>
          )}

          {task.subtest === 'writing' && (
            <div className="session-response">
              <label htmlFor={`notes-${task.id}`}>Your letter draft</label>
              <textarea
                id={`notes-${task.id}`}
                rows={8}
                value={notes[task.id] ?? ''}
                onChange={(e) => setNotes((n) => ({ ...n, [task.id]: e.target.value }))}
                placeholder="Write your letter here..."
                disabled={writingSubmitted[task.id]}
              />
              {task.checklist && !writingSubmitted[task.id] && (
                <ul className="session-checklist">
                  {task.checklist.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              {!writingSubmitted[task.id] && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={!(notes[task.id] ?? '').trim()}
                  onClick={submitWriting}
                >
                  Submit draft & review
                </button>
              )}
            </div>
          )}

          {task.subtest === 'speaking' && (
            <div className="session-response session-speaking">
              {task.checklist && !taskRevealed && (
                <ul className="session-checklist">
                  {task.checklist.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              <SpeakingRecorder
                taskId={task.id}
                criteria={task.speakingCriteria ?? defaultSpeakingCriteria}
                onResult={handleSpeakingResult}
                showDetailedReview={taskRevealed}
              />
            </div>
          )}

          {task.subtest === 'break' && (
            <p className="session-break-note">Pause the screen if needed, then continue when ready.</p>
          )}

          {(mcqEval || writingEval || (speakingEval && taskRevealed)) && (
            <TaskReviewPanel
              task={task}
              mcqEval={mcqEval}
              writingEval={writingEval}
              speakingEval={taskRevealed ? speakingEval : null}
              userDraft={notes[task.id]}
            />
          )}
        </article>
      )}

      <div className="session-nav">
        <button type="button" className="btn btn-secondary btn-sm" disabled={taskIndex <= 1} onClick={goPrev}>
          Previous
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={goNext}>
          {taskIndex + groupSize >= config.tasks.length ? 'Finish session' : 'Next task'}
        </button>
      </div>
    </div>
  );
}
