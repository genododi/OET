import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  OetSessionStage,
  SessionConfig,
  SessionTask,
  SpeakingCriteria,
} from '../types/session';
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
import { isTaskAnswerCorrect, oetResponseMode } from '../lib/oetResponseMode';
import { GRADE_A_EVIDENCE_REQUIREMENTS } from '../lib/oetThresholds';

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

function firstTaskIndexForStage(config: SessionConfig, stage: OetSessionStage): number {
  const firstTaskId = stage.taskIds[0];
  if (!firstTaskId) return Math.min(1, config.tasks.length - 1);
  const index = config.tasks.findIndex((task) => task.id === firstTaskId);
  return index >= 0 ? index : Math.min(1, config.tasks.length - 1);
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
  const [stageIndex, setStageIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(
    config.stages?.[0]?.durationSeconds ?? config.durationMinutes * 60,
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [writingSubmitted, setWritingSubmitted] = useState<Record<string, boolean>>({});
  const [speakingResults, setSpeakingResults] = useState<Record<string, SpeakingEvaluationResult>>({});
  const [flaggedTasks, setFlaggedTasks] = useState<Record<string, boolean>>({});
  const [consumedListeningPlayback, setConsumedListeningPlayback] = useState<Record<string, boolean>>({});
  const completionStarted = useRef(false);

  const task = config.tasks[taskIndex];
  const currentStage = config.stages?.[stageIndex];
  const listeningGroup = useMemo(() => getListeningGroup(config.tasks, taskIndex), [config.tasks, taskIndex]);
  const groupSize = listeningGroup?.length ?? 1;
  const listeningTaskCount = useMemo(
    () => config.tasks.filter((candidate) => candidate.subtest === 'listening').length,
    [config.tasks],
  );
  const enforceSinglePlayListening =
    config.kind === 'mock' ||
    Boolean(config.enforceSinglePlayListening) ||
    listeningTaskCount >= GRADE_A_EVIDENCE_REQUIREMENTS.minimumReceptiveItems;

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
  const allowImmediateReview = config.kind !== 'mock';
  const responseLocked =
    currentStage?.mode === 'reading-only' ||
    currentStage?.mode === 'speaking-preparation' ||
    currentStage?.mode === 'speaking-warmup';

  const usmleScore = useMemo(() => {
    if (config.kind !== 'usmle-block' && config.kind !== 'usmle-custom') return null;
    if (phase !== 'done') return null;
    return computeUsmleScore(config.tasks, answers);
  }, [config, answers, phase]);

  const startSession = () => {
    completionStarted.current = false;
    setPhase('active');
    const firstStage = config.stages?.[0];
    setStageIndex(0);
    setTaskIndex(firstStage ? firstTaskIndexForStage(config, firstStage) : 1);
    setSecondsLeft(firstStage?.durationSeconds ?? config.durationMinutes * 60);
  };

  const finishSession = useCallback(() => {
    if (completionStarted.current) return;
    completionStarted.current = true;

    const review = computeSessionReview(config, answers, notes, speakingResults);
    const mcqTasks = config.tasks.filter((t) => t.options?.length);
    let correct = 0;
    mcqTasks.forEach((t) => {
      if (isTaskAnswerCorrect(t, answers[t.id])) correct += 1;
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

  const enterStage = useCallback(
    (nextStageIndex: number) => {
      const nextStage = config.stages?.[nextStageIndex];
      if (!nextStage) {
        finishSession();
        return;
      }
      setStageIndex(nextStageIndex);
      setSecondsLeft(nextStage.durationSeconds);
      setTaskIndex(firstTaskIndexForStage(config, nextStage));
      if (!window.navigator.userAgent.toLowerCase().includes('jsdom')) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [config, finishSession],
  );

  useEffect(() => {
    if (phase !== 'active' || secondsLeft <= 0) return;
    const timer = window.setTimeout(() => {
      if (secondsLeft > 1) {
        setSecondsLeft(secondsLeft - 1);
      } else if (currentStage && config.stages && stageIndex + 1 < config.stages.length) {
        enterStage(stageIndex + 1);
      } else {
        finishSession();
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [config.stages, currentStage, enterStage, finishSession, phase, secondsLeft, stageIndex]);

  const goNext = () => {
    if (currentStage && config.stages) {
      const visibleTaskIds = currentStage.taskIds;
      const currentPosition = task ? visibleTaskIds.indexOf(task.id) : -1;
      const listeningPosition = listeningGroup
        ? currentPosition + listeningGroup.length - 1
        : currentPosition;
      if (visibleTaskIds.length === 0 || listeningPosition >= visibleTaskIds.length - 1) {
        enterStage(stageIndex + 1);
        return;
      }
    }
    const nextIndex = taskIndex + groupSize;
    if (nextIndex >= config.tasks.length) {
      finishSession();
    } else {
      setTaskIndex(nextIndex);
    }
  };

  const goPrev = () => {
    if (taskIndex <= 1) return;
    if (currentStage?.taskIds.length && task) {
      const currentPosition = currentStage.taskIds.indexOf(task.id);
      if (currentPosition <= 0) return;
    }
    const prev = taskIndex - 1;
    if (prev >= 1 && config.tasks[prev]?.subtest === 'listening') {
      let groupStart = prev;
      while (groupStart > 1 && config.tasks[groupStart - 1]?.subtest === 'listening') {
        groupStart -= 1;
      }
      setTaskIndex(groupStart);
      return;
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
        if (config.kind !== 'mock') {
          setRevealed((r) => ({ ...r, [task.id]: true }));
        }
      }
    },
    [config.kind, task],
  );

  const timerClass =
    secondsLeft <= 60 && phase === 'active'
      ? 'session-timer session-timer-urgent'
      : 'session-timer';
  const progressTaskIndex = listeningGroup ? taskIndex + groupSize - 1 : taskIndex;
  const currentStageTaskPosition =
    currentStage && task ? currentStage.taskIds.indexOf(task.id) : -1;
  const stageProgressCurrent = currentStage
    ? currentStage.taskIds.length === 0
      ? 1
      : Math.max(1, currentStageTaskPosition + groupSize)
    : progressTaskIndex;
  const stageProgressMax = currentStage
    ? Math.max(1, currentStage.taskIds.length)
    : config.tasks.length - 1;
  const nextStage = config.stages?.[stageIndex + 1];
  const nextButtonLabel =
    currentStage &&
    (currentStage.taskIds.length === 0 || stageProgressCurrent >= currentStage.taskIds.length)
      ? nextStage
        ? `Begin ${nextStage.label}`
        : 'Finish mock'
      : 'Next task';

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
              : `Exam-like mode: answers are hidden until you submit.${enforceSinglePlayListening ? ' Listening audio is one-use in this session.' : ''} Practice signals are coaching indicators, not official OET score predictions; use the Grade A command center for stricter internal targets.`}
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

  if (phase === 'done') {
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
                completionStarted.current = false;
                setPhase('intro');
                setTaskIndex(0);
                setStageIndex(0);
                setAnswers({});
                setNotes({});
                setRevealed({});
                setWritingSubmitted({});
                setSpeakingResults({});
                setConsumedListeningPlayback({});
                setSecondsLeft(
                  config.stages?.[0]?.durationSeconds ?? config.durationMinutes * 60,
                );
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
          {currentStage && config.stages
            ? `Phase ${stageIndex + 1} / ${config.stages.length}`
            : `Step ${taskIndex} / ${config.tasks.length - 1}`}
        </span>
      </div>

      {currentStage && (
        <section className="oet-stage-banner" aria-label="Current OET exam phase">
          <div>
            <span className="oet-stage-kicker">OET simulation · {config.subtitle}</span>
            <h2>{currentStage.label}</h2>
            <p>{currentStage.instructions}</p>
          </div>
          <div className="oet-stage-sequence" aria-label="OET phase sequence">
            {config.stages?.map((stage, index) => (
              <span
                key={stage.id}
                className={
                  index === stageIndex
                    ? 'oet-stage-dot oet-stage-dot-current'
                    : index < stageIndex
                      ? 'oet-stage-dot oet-stage-dot-complete'
                      : 'oet-stage-dot'
                }
                title={stage.label}
              >
                {index + 1}
              </span>
            ))}
          </div>
        </section>
      )}

      <div
        className="session-progress-bar"
        role="progressbar"
        aria-valuenow={stageProgressCurrent}
        aria-valuemin={1}
        aria-valuemax={stageProgressMax}
      >
        <div
          className="session-progress-fill"
          style={{ width: `${(stageProgressCurrent / stageProgressMax) * 100}%` }}
        />
      </div>

      {currentStage?.mode === 'speaking-warmup' ? (
        <article className="card session-task-card oet-warmup-card">
          <span className="session-task-type">Unassessed warm-up</span>
          <h3>Professional introduction and equipment check</h3>
          <p className="session-instructions">
            Introduce yourself and answer a few general questions about your work. This phase is not
            scored. Your first role-play card opens when you continue or when the clock expires.
          </p>
          <ul className="session-checklist">
            <li>Confirm that your microphone is working</li>
            <li>State your profession and current clinical setting</li>
            <li>Do not rehearse or preview the role-play cards</li>
          </ul>
        </article>
      ) : listeningGroup ? (
        <ListeningSection
          tasks={listeningGroup}
          answers={answers}
          onAnswer={(taskId, optionId) => setAnswers((a) => ({ ...a, [taskId]: optionId }))}
          revealed={revealed}
          onReveal={(taskId) => setRevealed((r) => ({ ...r, [taskId]: true }))}
          examMode={enforceSinglePlayListening}
          hideFeedback={config.kind === 'mock'}
          playbackConsumed={Boolean(consumedListeningPlayback[listeningGroup[0]!.id])}
          onPlaybackStart={() =>
            setConsumedListeningPlayback((current) => ({
              ...current,
              [listeningGroup[0]!.id]: true,
            }))
          }
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
          {task.provenance && (
            <div className="task-provenance">
              <span>Original practice aligned to</span>{' '}
              <a href={task.provenance.sourceUrl} target="_blank" rel="noopener noreferrer">
                {task.provenance.sourceLabel}
              </a>
              <span> · {task.provenance.reviewStatus}</span>
            </div>
          )}

          {(task.audioSrc || task.audioExternalUrl) && (
            <AudioPlayer
              key={`${task.id}:${task.audioRevision ?? task.audioSrc ?? task.audioExternalUrl}`}
              src={task.audioSrc}
              externalUrl={task.audioExternalUrl}
              label={task.audioLabel ?? task.title}
              note={task.audioNote}
              examMode={task.subtest === 'listening' && enforceSinglePlayListening}
              examPlayed={Boolean(consumedListeningPlayback[task.id])}
              onExamPlay={() =>
                setConsumedListeningPlayback((current) => ({ ...current, [task.id]: true }))
              }
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

          {task.options && oetResponseMode(task) === 'short-text' && !listeningGroup && (
            <div className="session-response">
              <label htmlFor={`text-${task.id}`}>Your answer</label>
              <input
                id={`text-${task.id}`}
                type="text"
                className="session-text-input"
                value={answers[task.id] ?? ''}
                onChange={(e) => setAnswers((a) => ({ ...a, [task.id]: e.target.value }))}
                placeholder="Type your answer..."
                disabled={taskRevealed || responseLocked}
                autoComplete="off"
              />
              {allowImmediateReview && !taskRevealed && (
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

          {task.options && oetResponseMode(task) === 'single-choice' && (
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
                      disabled={taskRevealed || responseLocked}
                    />
                    {opt.label}
                  </label>
                );
              })}
              {allowImmediateReview && !taskRevealed && (
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
                placeholder={responseLocked ? 'Writing is locked during reading time.' : 'Write your letter here...'}
                disabled={writingSubmitted[task.id] || responseLocked}
              />
              {task.checklist && !writingSubmitted[task.id] && (
                <ul className="session-checklist">
                  {task.checklist.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              {allowImmediateReview && !writingSubmitted[task.id] && !responseLocked && (
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
              {currentStage?.mode === 'speaking-preparation' ? (
                <div className="oet-response-lock" role="status">
                  Preparation time — read and plan now. Recording unlocks in the role-play phase.
                </div>
              ) : (
                <SpeakingRecorder
                  key={task.id}
                  taskId={task.id}
                  criteria={task.speakingCriteria ?? defaultSpeakingCriteria}
                  onResult={handleSpeakingResult}
                  showDetailedReview={allowImmediateReview && taskRevealed}
                />
              )}
            </div>
          )}

          {task.subtest === 'break' && (
            <p className="session-break-note">Pause the screen if needed, then continue when ready.</p>
          )}

          {allowImmediateReview && (mcqEval || writingEval || (speakingEval && taskRevealed)) && (
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
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={
            taskIndex <= 1 ||
            Boolean(
              currentStage &&
                (currentStage.taskIds.length === 0 || currentStageTaskPosition <= 0),
            ) ||
            responseLocked
          }
          onClick={goPrev}
        >
          Previous
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={goNext}>
          {currentStage ? nextButtonLabel : taskIndex + groupSize >= config.tasks.length ? 'Finish session' : 'Next task'}
        </button>
      </div>
    </div>
  );
}
