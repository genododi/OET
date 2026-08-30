import { useEffect, useRef, useState } from 'react';

interface Props {
  src?: string;
  externalUrl?: string;
  label: string;
  note?: string;
  /** Exam-style: replace native controls with a one-use play action. */
  examMode?: boolean;
  /** Controlled session-level guard so navigating away cannot reset a consumed play. */
  examPlayed?: boolean;
  onExamPlay?: () => void;
  scenarioId?: string;
  revision?: string;
}

export function AudioPlayer({
  src,
  externalUrl,
  label,
  note,
  examMode = false,
  examPlayed = false,
  onExamPlay,
  scenarioId,
  revision,
}: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [availability, setAvailability] = useState<{
    src: string | undefined;
    value: boolean | null;
  }>({ src, value: src ? null : false });
  const [errorState, setErrorState] = useState<{
    src: string | undefined;
    message: string | null;
  }>({ src, message: null });
  const [examPlayback, setExamPlayback] = useState<'ready' | 'playing' | 'finished'>('ready');
  const available = availability.src === src ? availability.value : src ? null : false;
  const error = errorState.src === src ? errorState.message : null;

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const audio = audioRef.current;
    fetch(src, { method: 'HEAD', cache: 'no-store' })
      .then((res) => {
        if (!cancelled) setAvailability({ src, value: res.ok });
      })
      .catch(() => {
        if (!cancelled) setAvailability({ src, value: false });
      });
    return () => {
      cancelled = true;
      audio?.pause();
    };
  }, [src]);

  if (externalUrl && !src) {
    return (
      <div className="audio-player audio-player-external">
        <div className="audio-player-header">
          <span className="audio-player-icon" aria-hidden="true">
            🎧
          </span>
          <div>
            <strong>{label}</strong>
            {note && <p className="meta audio-player-note">{note}</p>}
          </div>
        </div>
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary btn-sm"
        >
          Open official audio →
        </a>
      </div>
    );
  }

  if (available === null) {
    return (
      <div className="audio-player audio-player-loading">
        <span className="meta">Checking audio…</span>
      </div>
    );
  }

  const playSrc = available ? src : undefined;

  const startExamPlayback = async () => {
    if (examPlayed || examPlayback !== 'ready' || !audioRef.current) return;
    try {
      await audioRef.current.play();
      setExamPlayback('playing');
      onExamPlay?.();
    } catch {
      setErrorState({ src, message: 'Could not start this question-matched audio clip.' });
      setExamPlayback('ready');
    }
  };

  if (!playSrc && externalUrl) {
    return (
      <div className="audio-player audio-player-external">
        <div className="audio-player-header">
          <span className="audio-player-icon" aria-hidden="true">
            🎧
          </span>
          <div>
            <strong>{label}</strong>
            <p className="meta audio-player-note">
              Local file missing — run <code>npm run import-audio</code> or use the CDN link below.
            </p>
            {note && <p className="meta">{note}</p>}
          </div>
        </div>
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary btn-sm"
        >
          Stream from OET CDN →
        </a>
      </div>
    );
  }

  if (!playSrc) {
    return (
      <div className="audio-player audio-player-missing">
        <strong>{label}</strong>
        {scenarioId ? (
          <p className="meta">
            Question-matched audio not found. Run <code>npm run generate:question-audio</code> to
            rebuild the generated listening clips.
          </p>
        ) : (
          <p className="meta">
            Audio not found. Run <code>npm run import-audio</code> to download official listening
            files.
          </p>
        )}
        {note && <p className="meta">{note}</p>}
      </div>
    );
  }

  return (
    <div
      className="audio-player"
      data-scenario-id={scenarioId}
      data-audio-revision={revision}
    >
      <div className="audio-player-header">
        <span className="audio-player-icon" aria-hidden="true">
          🎧
        </span>
        <div>
          <strong>{label}</strong>
          {examMode && (
            <p className="meta audio-player-note">
              One-use playback — once started, this clip cannot be paused, restarted or replayed in this session.
            </p>
          )}
          {note && !examMode && <p className="meta audio-player-note">{note}</p>}
        </div>
        {scenarioId && <span className="audio-match-badge">Question matched</span>}
      </div>
      <audio
        key={src}
        ref={audioRef}
        controls={!examMode}
        preload="metadata"
        src={playSrc}
        className="audio-player-element"
        onError={() =>
          setErrorState({ src, message: 'Could not load this question-matched audio clip.' })
        }
        onEnded={() => {
          if (examMode) setExamPlayback('finished');
        }}
      >
        <track kind="captions" />
      </audio>
      {examMode && (
        <button
          type="button"
          className="btn btn-primary btn-sm"
          aria-label={`Play ${label} once`}
          disabled={examPlayed || examPlayback !== 'ready'}
          onClick={() => void startExamPlayback()}
        >
          {examPlayback === 'playing'
            ? 'Audio playing…'
            : examPlayed || examPlayback === 'finished'
              ? 'Playback used'
              : '▶ Play once'}
        </button>
      )}
      {error && <p className="meta audio-player-error">{error}</p>}
      {externalUrl && (
        <a href={externalUrl} target="_blank" rel="noopener noreferrer" className="link-btn audio-fallback-link">
          Alternate source on oet.com →
        </a>
      )}
    </div>
  );
}
