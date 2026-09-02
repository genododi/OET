import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import type { SessionTask } from '../types/session';
import {
  correctAnswerLabel,
  isTaskAnswerCorrect,
  oetResponseMode,
} from '../lib/oetResponseMode';

interface Props {
  tasks: SessionTask[];
  answers: Record<string, string>;
  onAnswer: (taskId: string, text: string) => void;
  revealed: Record<string, boolean>;
  onReveal: (taskId: string) => void;
  examMode?: boolean;
  playbackConsumed?: boolean;
  onPlaybackStart?: () => void;
  /** A live mock never reveals answers before final submission. */
  hideFeedback?: boolean;
}

function isCorrectAnswer(task: SessionTask, userText: string | undefined): boolean | null {
  if (!userText) return null;
  return isTaskAnswerCorrect(task, userText);
}

export default function ListeningSection({
  tasks,
  answers,
  onAnswer,
  revealed,
  onReveal,
  examMode = false,
  playbackConsumed = false,
  onPlaybackStart,
  hideFeedback = false,
}: Props) {
  const [playing, setPlaying] = useState(false);
  const [playbackFinished, setPlaybackFinished] = useState(false);
  const [currentIdx, setCurrentIdx] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopPlayback = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlaying(false);
    setCurrentIdx(null);
  }, []);

  function playTask(index: number) {
    if (index >= tasks.length) {
      audioRef.current = null;
      setPlaying(false);
      setCurrentIdx(null);
      setPlaybackFinished(true);
      return;
    }

    const task = tasks[index]!;
    const audio = new Audio(task.audioSrc);
    audioRef.current = audio;
    setCurrentIdx(index);
    audio.onended = () => playTask(index + 1);
    audio.onerror = () => {
      // A local development build can briefly lack generated MP3s. Keep the
      // session usable by moving to the next original script rather than stalling.
      playTask(index + 1);
    };
    void audio.play().catch(() => stopPlayback());
  }

  const togglePlay = () => {
    if (examMode && (playing || playbackConsumed || playbackFinished)) return;
    if (playing) {
      stopPlayback();
      return;
    }
    if (examMode) onPlaybackStart?.();
    setPlaying(true);
    playTask(0);
  };

  useEffect(() => stopPlayback, [stopPlayback]);

  return (
    <div className="card listening-section">
      <div className="listening-section-header">
        <span className="oet-paper-label">LISTENING SUB-TEST · QUESTION PAPER</span>
        <h3>Listening — Parts A, B and C</h3>
        <p className="session-instructions">
          {examMode
            ? 'You will hear each extract once only. Complete your answers as you listen. You have two minutes to check answers at the end of the recording.'
            : 'The original question-matched clips play in sequence. Use replay for coached practice, then use a qualifying set for strict one-use playback.'}
        </p>
      </div>

      <div className="listening-player">
        <button
          type="button"
          className="btn btn-primary"
          disabled={examMode && (playing || playbackConsumed || playbackFinished)}
          onClick={togglePlay}
        >
          {examMode
            ? playing
              ? 'Audio sequence playing…'
              : playbackConsumed || playbackFinished
                ? 'Playback used'
                : '▶ Play all audio once'
            : playing
              ? '⏹ Stop'
              : '▶ Play audio'}
        </button>
        {currentIdx !== null && (
          <span className="listening-time">
            Question {currentIdx + 1} / {tasks.length}
          </span>
        )}
        <span className="listening-voice-info">Question-matched audio</span>
      </div>

      <ol className="listening-questions">
        {tasks.map((task, idx) => {
          const part = task.title.match(/\bPart ([ABC])\b/i)?.[1]?.toUpperCase() ?? 'A';
          const previousPart = idx > 0
            ? tasks[idx - 1]?.title.match(/\bPart ([ABC])\b/i)?.[1]?.toUpperCase()
            : undefined;
          const partIndex = tasks.slice(0, idx).filter((candidate) =>
            candidate.title.match(/\bPart ([ABC])\b/i)?.[1]?.toUpperCase() === part,
          ).length;
          const showPartHeading = idx === 0 || part !== previousPart;
          const extractNumber =
            part === 'A' ? Math.floor(partIndex / 12) + 1 : part === 'C' ? Math.floor(partIndex / 6) + 1 : partIndex + 1;
          const showExtractHeading =
            (part === 'A' && partIndex % 12 === 0) ||
            part === 'B' ||
            (part === 'C' && partIndex % 6 === 0);

          return (
          <Fragment key={task.id}>
            {showPartHeading && (
              <li className="oet-listening-part-heading">
                <span>Part {part}</span>
                <strong>
                  {part === 'A'
                    ? 'Two patient consultations · Questions 1–24'
                    : part === 'B'
                      ? 'Six workplace extracts · Questions 25–30'
                      : 'Two presentation or interview extracts · Questions 31–42'}
                </strong>
              </li>
            )}
            {showExtractHeading && (
              <li className="oet-listening-extract-heading">
                Extract {extractNumber}
              </li>
            )}
            <li
              className={`listening-question-item ${currentIdx === idx ? 'listening-question-active' : ''}`}
            >
            <div className="listening-question-header">
              <span className="listening-question-num">Question {idx + 1}</span>
              <span className="listening-question-type">{task.title}</span>
              {currentIdx === idx && <span className="listening-now-playing">Now playing</span>}
            </div>
            <p className="listening-question-prompt">{task.prompt}</p>
            <div className="session-response">
              {oetResponseMode(task) === 'short-text' ? (
                <>
                  <label htmlFor={`ls-text-${task.id}`}>Your answer</label>
                  <input
                    id={`ls-text-${task.id}`}
                    type="text"
                    className="session-text-input"
                    value={answers[task.id] ?? ''}
                    onChange={(event) => onAnswer(task.id, event.target.value)}
                    placeholder="Type the word or short phrase..."
                    disabled={revealed[task.id]}
                    autoComplete="off"
                  />
                </>
              ) : (
                <fieldset className="session-mcq">
                  <legend className="sr-only">Select an answer</legend>
                  {task.options?.map((option) => {
                    const selected = answers[task.id] === option.id;
                    const isUserWrong = revealed[task.id] && selected && !option.correct;
                    const isCorrect = revealed[task.id] && option.correct;
                    return (
                      <label
                        key={option.id}
                        className={`session-option ${selected ? 'session-option-selected' : ''} ${isUserWrong ? 'session-option-wrong' : ''} ${isCorrect ? 'session-option-correct' : ''}`}
                      >
                        <input
                          type="radio"
                          name={task.id}
                          value={option.id}
                          checked={selected}
                          onChange={() => onAnswer(task.id, option.id)}
                          disabled={revealed[task.id]}
                        />
                        {option.label}
                      </label>
                    );
                  })}
                </fieldset>
              )}
              {!hideFeedback && !revealed[task.id] && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={!(answers[task.id] ?? '').trim()}
                  onClick={() => onReveal(task.id)}
                >
                  Check answer
                </button>
              )}
              {!hideFeedback && revealed[task.id] && (
                <div className={`listening-feedback ${isCorrectAnswer(task, answers[task.id]) ? 'listening-feedback-correct' : 'listening-feedback-incorrect'}`}>
                  {isCorrectAnswer(task, answers[task.id])
                    ? '✓ Correct'
                    : `✗ Incorrect — correct answer: "${correctAnswerLabel(task)}"`}
                </div>
              )}
            </div>
            </li>
          </Fragment>
          );
        })}
      </ol>
    </div>
  );
}
