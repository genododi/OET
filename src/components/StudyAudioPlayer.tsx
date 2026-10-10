import { useRef, useState } from 'react';
import type { RefObject } from 'react';
import './jahshanListening.css';
const timestamp = (time: number) => `${Math.floor(time / 60)}:${Math.floor(time % 60).toString().padStart(2, '0')}`;
interface Props {
  src: string;
  label: string;
  sourceUrl?: string;
  audioRef?: RefObject<HTMLAudioElement | null>;
  onTimeChange?: (time: number) => void;
  onPlayingChange?: (playing: boolean) => void;
  onReady?: (duration: number) => void;
}
// Shared HTML controls avoid depending on Safari's native media-control icons.
export function StudyAudioPlayer(props: Props) {
  return <Playback key={props.src} {...props} />;
}
function Playback({ src, label, sourceUrl, audioRef, onTimeChange, onPlayingChange, onReady }: Props) {
  const ownRef = useRef<HTMLAudioElement>(null);
  const player = audioRef ?? ownRef;
  const [failed, setFailed] = useState(false);
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [message, setMessage] = useState('');
  const updateTime = (value: number) => { setTime(value); onTimeChange?.(value); };
  const updatePlaying = (value: boolean) => { setPlaying(value); onPlayingChange?.(value); };
  const updateDuration = (value: number) => { const next = Number.isFinite(value) ? value : 0; setDuration(next); onReady?.(next); };
  const seek = (next: number) => {
    if (!player.current || duration <= 0 || failed) return;
    const position = Math.max(0, Math.min(next, duration));
    player.current.currentTime = position; updateTime(position);
  };
  const changeVolume = (value: number) => {
    if (player.current) { player.current.volume = value; setVolume(value); }
  };
  const toggle = async () => {
    const audio = player.current;
    if (!audio) return;
    setMessage('');
    if (!audio.paused) { audio.pause(); return; }
    try { await audio.play(); }
    catch (error) {
      if (player.current !== audio || (error instanceof DOMException && error.name === 'AbortError')) return;
      if (audio.error) { setFailed(true); onReady?.(0); }
      else setMessage('Playback did not start. Press Play again, or open the audio directly below.');
    }
  };
  return <>
    <audio ref={player} hidden preload="metadata" src={src} aria-label={label}
      onLoadStart={() => { setFailed(false); updateTime(0); updateDuration(0); updatePlaying(false); setMessage(''); }}
      onLoadedMetadata={event => { setFailed(false); updateTime(event.currentTarget.currentTime); updateDuration(event.currentTarget.duration); }}
      onDurationChange={event => updateDuration(event.currentTarget.duration)}
      onTimeUpdate={event => updateTime(event.currentTarget.currentTime)} onPlay={() => updatePlaying(true)} onPause={() => updatePlaying(false)} onEnded={() => updatePlaying(false)}
      onVolumeChange={event => setVolume(event.currentTarget.volume)} onError={() => { setFailed(true); updatePlaying(false); onReady?.(0); }} />
    <div className="jahshan-audio-controls" role="group" aria-label="Recording playback controls">
      <div className="jahshan-audio-buttons">
        <button type="button" className="btn btn-primary" disabled={failed} onClick={() => void toggle()}>{playing ? 'Pause recording' : 'Play recording'}</button>
        <button type="button" className="btn btn-secondary" disabled={!duration || failed} onClick={() => seek(time - 15)}>Back 15 seconds</button>
        <button type="button" className="btn btn-secondary" disabled={!duration || failed} onClick={() => seek(time + 15)}>Forward 15 seconds</button>
        <span className="jahshan-audio-time">{timestamp(time)} / {duration ? timestamp(duration) : 'Loading…'}</span>
      </div>
      <label>Recording position<input type="range" min={0} max={duration || 1} step={0.1} value={Math.min(time, duration || 1)} disabled={!duration || failed} aria-valuetext={`${timestamp(time)} of ${timestamp(duration)}`} onChange={event => seek(Number(event.target.value))} /></label>
      <div className="jahshan-audio-options"><label>Volume<input type="range" min={0} max={1} step={0.05} value={volume} aria-valuetext={`${Math.round(volume * 100)} percent`} onChange={event => changeVolume(Number(event.target.value))} /></label><a href={src} target="_blank" rel="noopener noreferrer">Open audio directly ↗</a></div>
    </div>
    {message && <p role="status">{message}</p>}
    {failed && <div role="alert" className="jahshan-audio-error"><p>This recording could not load. Check your connection and try again.</p><button className="btn btn-secondary" onClick={() => { setFailed(false); player.current?.load(); }}>Retry audio</button>{sourceUrl && <> <a href={sourceUrl} target="_blank" rel="noopener noreferrer">Open original recording ↗</a></>}</div>}
  </>;
}
