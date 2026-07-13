import { useCallback, useEffect, useRef, useState } from 'react';
import type { SessionTask } from '../types/session';

interface Props {
  tasks: SessionTask[];
  answers: Record<string, string>;
  onAnswer: (taskId: string, text: string) => void;
  revealed: Record<string, boolean>;
  onReveal: (taskId: string) => void;
}

function correctLabel(task: SessionTask): string {
  return task.options?.find((option) => option.correct)?.label ?? '';
}

function isCorrectAnswer(task: SessionTask, userText: string | undefined): boolean | null {
  const label = correctLabel(task);
  if (!label || !userText) return null;
  return userText.trim().toLowerCase() === label.trim().toLowerCase();
}

export default function ListeningSection({ tasks, answers, onAnswer, revealed, onReveal }: Props) {
  const [playing, setPlaying] = useState(false);
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
      stopPlayback();
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
    if (playing) {
      stopPlayback();
      return;
    }
    setPlaying(true);
    playTask(0);
  };

  useEffect(() => stopPlayback, [stopPlayback]);

  return (
    <div className="card listening-section">
      <div className="listening-section-header">
        <h3>Listening — continuous playback</h3>
        <p className="session-instructions">
          The original question-matched clips play once in sequence, like a complete listening
          section. Do not pause or replay in exam practice mode.
        </p>
      </div>

      <div className="listening-player">
        <button type="button" className="btn btn-primary" onClick={togglePlay}>
          {playing ? '⏹ Stop' : '▶ Play all audio once'}
        </button>
        {currentIdx !== null && (
          <span className="listening-time">
            Question {currentIdx + 1} / {tasks.length}
          </span>
        )}
        <span className="listening-voice-info">Question-matched audio</span>
      </div>

      <ol className="listening-questions">
        {tasks.map((task, idx) => (
          <li
            key={task.id}
            className={`listening-question-item ${currentIdx === idx ? 'listening-question-active' : ''}`}
          >
            <div className="listening-question-header">
              <span className="listening-question-num">Question {idx + 1}</span>
              <span className="listening-question-type">{task.title}</span>
              {currentIdx === idx && <span className="listening-now-playing">Now playing</span>}
            </div>
            <p className="listening-question-prompt">{task.prompt}</p>
            <div className="session-response">
              <label htmlFor={`ls-text-${task.id}`}>Your answer</label>
              <input
                id={`ls-text-${task.id}`}
                type="text"
                className="session-text-input"
                value={answers[task.id] ?? ''}
                onChange={(event) => onAnswer(task.id, event.target.value)}
                placeholder="Type your answer..."
                disabled={revealed[task.id]}
                autoComplete="off"
              />
              {!revealed[task.id] && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={!(answers[task.id] ?? '').trim()}
                  onClick={() => onReveal(task.id)}
                >
                  Check answer
                </button>
              )}
              {revealed[task.id] && (
                <div className={`listening-feedback ${isCorrectAnswer(task, answers[task.id]) ? 'listening-feedback-correct' : 'listening-feedback-incorrect'}`}>
                  {isCorrectAnswer(task, answers[task.id])
                    ? '✓ Correct'
                    : `✗ Incorrect — correct answer: "${correctLabel(task)}"`}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
