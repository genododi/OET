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
  return task.options?.find((o) => o.correct)?.label ?? '';
}

function isCorrectAnswer(task: SessionTask, userText: string | undefined): boolean | null {
  const label = correctLabel(task);
  if (!label || !userText) return null;
  return userText.trim().toLowerCase() === label.trim().toLowerCase();
}

export default function ListeningSection({ tasks, answers, onAnswer, revealed, onReveal }: Props) {
  const [playing, setPlaying] = useState(false);
  const [currentIdx, setCurrentIdx] = useState<number | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utterancesRef = useRef<SpeechSynthesisUtterance[]>([]);
  const pauseTimeRef = useRef(0);
  const totalDurationRef = useRef(0);

  const buildUtterances = useCallback(() => {
    if (!synthRef.current) return;

    let totalSec = 0;
    const utts = tasks.map((task) => {
      const text = task.audioTranscript || task.prompt || '';
      const words = text.split(/\s+/).length;
      const estSec = (words / 3) + 1.5;
      totalSec += estSec;

      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = 1;
      utt.pitch = 1;
      return utt;
    });
    totalDurationRef.current = totalSec;
    utterancesRef.current = utts;
  }, [tasks]);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    buildUtterances();
  }, [buildUtterances]);

  useEffect(() => {
    return () => {
      synthRef.current?.cancel();
    };
  }, []);

  const startPlayback = useCallback(() => {
    const synth = synthRef.current;
    if (!synth || utterancesRef.current.length === 0) return;

    synth.cancel();
    const utts = utterancesRef.current;
    const startIdx = pauseTimeRef.current > 0
      ? Math.min(Math.floor((pauseTimeRef.current / totalDurationRef.current) * utts.length), utts.length - 1)
      : 0;

    const playQueue = (index: number) => {
      if (index >= utts.length) {
        setPlaying(false);
        setCurrentIdx(null);
        return;
      }
      setCurrentIdx(index);
      const utt = utts[index];
      utt.onend = () => {
        if (index + 1 < utts.length) {
          playQueue(index + 1);
        } else {
          setPlaying(false);
          setCurrentIdx(null);
        }
      };
      synth.speak(utt);
    };

    pauseTimeRef.current = 0;
    setPlaying(true);
    playQueue(startIdx);
  }, []);

  const togglePlay = () => {
    const synth = synthRef.current;
    if (!synth) return;
    if (playing) {
      synth.cancel();
      setPlaying(false);
      setCurrentIdx(null);
    } else {
      startPlayback();
    }
  };

  return (
    <div className="card listening-section">
      <div className="listening-section-header">
        <h3>Listening — continuous playback</h3>
        <p className="session-instructions">
          All questions are shown below. Audio is generated fresh for this session in story dialogue style.
        </p>
      </div>

      <div className="listening-player">
        <button type="button" className="btn btn-primary" onClick={togglePlay}>
          {playing ? '⏸ Stop' : '▶ Play all audio'}
        </button>
        {currentIdx !== null && (
          <span className="listening-time">
            Question {currentIdx + 1} / {tasks.length}
          </span>
        )}
        <span className="listening-voice-info">Story dialogue playback</span>
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
                onChange={(e) => onAnswer(task.id, e.target.value)}
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
