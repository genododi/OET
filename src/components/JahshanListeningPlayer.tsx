import { useEffect, useRef, useState } from 'react';
import collection from '../data/jahshanCollection.json';
import './jahshanListening.css';
type Track = (typeof collection.files)[number];
type Segment = { start: number; end: number; text: string };
type Transcript = { trackId: string; sourceSha256: string; kind: string; segments: Segment[] };
const timestamp = (time: number) => `${Math.floor(time / 60)}:${Math.floor(time % 60).toString().padStart(2, '0')}`;
export function JahshanListeningPlayer(props: { track: Track; audioUrl?: string }) {
  return <Player key={props.track.id} {...props} />;
}
function Player({ track, audioUrl }: { track: Track; audioUrl?: string }) {
  const player = useRef<HTMLAudioElement>(null);
  const activeLine = useRef<HTMLButtonElement>(null);
  const transcriptBox = useRef<HTMLDivElement>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [follow, setFollow] = useState(true);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${import.meta.env.BASE_URL}jahshan-transcripts/${track.id}.json`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Unavailable');
      const data: Transcript = await response.json();
      if (data.trackId !== track.id || data.sourceSha256 !== track.sha256 || data.kind !== 'automatic-transcription' || !Array.isArray(data.segments) || !data.segments.length || data.segments.some(s => !Number.isFinite(s.start) || !Number.isFinite(s.end) || s.start < 0 || s.end < s.start || typeof s.text !== 'string')) throw new Error('Wrong transcript');
      if (!controller.signal.aborted) { setTranscript(data); setState('ready'); }
    }).catch(() => { if (!controller.signal.aborted) setState('unavailable'); });
    return () => controller.abort();
  }, [track.id, track.sha256]);
  const current = transcript?.segments.findIndex(segment => time >= segment.start && time < segment.end) ?? -1;
  useEffect(() => {
    const box = transcriptBox.current; const line = activeLine.current;
    if (follow && playing && box && line) box.scrollTo({ top: Math.max(0, line.offsetTop - box.clientHeight / 2 + line.offsetHeight / 2), behavior: 'smooth' });
  }, [current, follow, playing]);
  return <div className="jahshan-listening-player">
    {audioUrl ? <audio ref={player} key={audioUrl} controls preload="metadata" src={audioUrl} aria-label={track.name} onLoadedMetadata={event => setTime(event.currentTarget.currentTime)} onTimeUpdate={event => setTime(event.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} /> : <p>Connect the collection above to play the original recording here.</p>}
    <section className="jahshan-transcript" aria-label="Transcript of selected recording">
      <h3>Recording transcript</h3><p className="meta">{track.relativePath.split('/').slice(1).join(' / ')}</p>
      <p className="meta">Automatically transcribed from the original human recording. Recognition errors are possible. Intervals with unreliable recognition are marked “Unclear”; replay those timestamps. Use the printed answer key for marking.</p>
      {state === 'loading' && <p role="status">Loading this recording’s transcript…</p>}
      {state === 'unavailable' && <p role="status">The transcript for this recording is unavailable. Try reloading when your connection is available.</p>}
      {state === 'ready' && transcript && <>
        <div className="transcript-actions"><label><input type="checkbox" checked={follow} onChange={event => setFollow(event.target.checked)} /> Follow the audio</label><a href={`data:text/plain;charset=utf-8,${encodeURIComponent(transcript.segments.map(s => `[${timestamp(s.start)}] ${s.text}`).join('\n'))}`} download={`${track.name.replace(/\.mp3$/i, '')}-transcript.txt`}>Download transcript</a></div>
        <div ref={transcriptBox} className="transcript-box" tabIndex={0} aria-label="Recording text">{transcript.segments.map((segment, index) => <button type="button" ref={index === current ? activeLine : undefined} key={index} aria-label={`${timestamp(segment.start)} ${segment.text}`} className={`transcript-line${index === current ? ' transcript-current' : ''}`} aria-current={index === current ? 'true' : undefined} disabled={!audioUrl} onClick={() => { if (player.current) { player.current.currentTime = segment.start; setTime(segment.start); } }}><span className="transcript-time">{timestamp(segment.start)}</span><span>{segment.text}</span></button>)}</div>
        <p className="meta">Select a timestamp to move the recording to that sentence.</p>
      </>}
    </section>
  </div>;
}
