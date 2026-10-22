import { useEffect, useRef, useState } from 'react';
import { StudyAudioPlayer } from './StudyAudioPlayer';
import { detectListeningPartStarts, extractListeningKeywords } from '../lib/listeningKeywords';
import { SaveStudyOffline } from './SaveStudyOffline';
import type { OfflineAsset } from '../lib/offlineStudy';
import './jahshanListening.css';
type Track = { id: string; name: string; sha256: string; url: string };
interface Props { track: Track; audioUrl: string; offlineAudioUrl?: string; offlineAssets?: OfflineAsset[]; transcriptPath: string; inlineTranscript?: Transcript; mimeType?: string; heading?: string; description?: string; playbackNote?: string; selectedPart?: 'A' | 'B' | 'C'; partSelection?: number; onPlaybackPart?: (part: 'A' | 'B' | 'C') => void; seekOnLoad?: boolean; }
type Segment = { start: number; end: number; text: string };
export type Transcript = { trackId: string; sourceSha256: string; kind: string; segments: Segment[] };
const matches = (data: Transcript, id: string, sha256: string) => data.trackId === id && data.sourceSha256 === sha256 && data.kind === 'automatic-transcription' && Array.isArray(data.segments) && data.segments.length > 0 && data.segments.every(s => Number.isFinite(s.start) && Number.isFinite(s.end) && s.start >= 0 && s.end >= s.start && typeof s.text === 'string');
const timestamp = (time: number) => `${Math.floor(time / 60)}:${Math.floor(time % 60).toString().padStart(2, '0')}`;
export function RecordingTranscriptPlayer(props: Props) {
  return <Player key={`${props.track.id}:${props.track.sha256}:${props.transcriptPath}`} {...props} />;
}
function Player({ track, audioUrl, offlineAudioUrl, offlineAssets = [], transcriptPath, inlineTranscript, mimeType, heading, description, playbackNote, selectedPart, partSelection, onPlaybackPart, seekOnLoad }: Props) {
  const player = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const activeLine = useRef<HTMLButtonElement>(null);
  const transcriptBox = useRef<HTMLDivElement>(null);
  const previousPart = useRef(selectedPart);
  const previousSelection = useRef(partSelection);
  const pendingPart = useRef<'A' | 'B' | 'C' | null>(seekOnLoad ? selectedPart ?? null : null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [audioEnded, setAudioEnded] = useState(false);
  const [follow, setFollow] = useState(true);
  const [transcript, setTranscript] = useState<Transcript | null>(() => inlineTranscript && matches(inlineTranscript, track.id, track.sha256) ? inlineTranscript : null);
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>(() => inlineTranscript ? matches(inlineTranscript, track.id, track.sha256) ? 'ready' : 'unavailable' : 'loading');
  useEffect(() => {
    if (inlineTranscript) return;
    const controller = new AbortController();
    void fetch(`${import.meta.env.BASE_URL}${transcriptPath}`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Unavailable');
      const data: Transcript = await response.json();
      if (!matches(data, track.id, track.sha256)) throw new Error('Wrong transcript');
      if (!controller.signal.aborted) { setTranscript(data); setState('ready'); }
    }).catch(() => { if (!controller.signal.aborted) setState('unavailable'); });
    return () => controller.abort();
  }, [track.id, track.sha256, transcriptPath, inlineTranscript]);
  const seek = (next: number) => {
    if (!player.current || duration <= 0) return;
    const position = Math.max(0, Math.min(next, duration));
    player.current.currentTime = position; setTime(position);
  };
  useEffect(() => {
    if (!selectedPart) return;
    const partChanged = previousPart.current !== selectedPart;
    const selectedAgain = previousSelection.current !== partSelection;
    if (partChanged || selectedAgain) {
      previousPart.current = selectedPart;
      previousSelection.current = partSelection;
      pendingPart.current = selectedPart;
    }
    if (!pendingPart.current || !transcript || duration <= 0) return;
    const start = detectListeningPartStarts(transcript.segments, track.name)[pendingPart.current];
    if (start !== undefined) {
      const position = Math.max(0, Math.min(start, duration));
      if (player.current) {
        player.current.currentTime = position;
        setTime(position);
      }
      pendingPart.current = null;
    }
  }, [selectedPart, partSelection, transcript, duration, track.name]);
  const current = transcript?.segments.findIndex(segment => time >= segment.start && time < segment.end) ?? -1;
  useEffect(() => {
    if (!playing || !transcript || !onPlaybackPart) return;
    const starts = detectListeningPartStarts(transcript.segments, track.name);
    const currentPart = (Object.entries(starts) as ['A' | 'B' | 'C', number][]).filter(([, start]) => time >= start).sort((a,b) => b[1]-a[1])[0]?.[0];
    if (currentPart) onPlaybackPart(currentPart);
  }, [time, playing, transcript, onPlaybackPart, track.name]);
  const revisionKeywords = transcript ? extractListeningKeywords(transcript.segments.map(segment => segment.text).join(' ')) : [];
  useEffect(() => {
    const box = transcriptBox.current; const line = activeLine.current;
    if (!follow || !box || !line) return;
    const bounds = box.getBoundingClientRect(); const sentence = line.getBoundingClientRect();
    if (sentence.top < bounds.top + 8 || sentence.bottom > bounds.bottom - 8) {
      box.scrollTo?.({ top: Math.max(0, box.scrollTop + sentence.top - bounds.top - box.clientHeight / 2 + sentence.height / 2), behavior: playing ? 'smooth' : 'auto' });
    }
  }, [current, follow, playing, time]);
  return <div className="jahshan-listening-player">
    {heading && <h3>{heading}</h3>}
    {description && <p className="meta">{description} · Original human recording</p>}
    <StudyAudioPlayer src={audioUrl} mimeType={mimeType} label={track.name} sourceUrl={track.url} audioRef={player} onTimeChange={setTime} onPlayingChange={setPlaying} onReady={setDuration} onEnded={() => setAudioEnded(true)} />
    {playbackNote && <p className="meta">{playbackNote}</p>}
    <SaveStudyOffline id={`recording-${track.sha256}`} title={track.name} assets={[
      { url: offlineAudioUrl ?? audioUrl, label: 'Original recording', sha256: track.sha256, mimeType: mimeType ?? (/\.mp3(?:$|\?)/i.test(offlineAudioUrl ?? audioUrl) ? 'audio/mpeg' : /\.ogg(?:$|\?)/i.test(audioUrl) ? 'audio/ogg' : /\.wav(?:$|\?)/i.test(audioUrl) ? 'audio/wav' : 'audio/mp4') },
      { url: `${import.meta.env.BASE_URL}${transcriptPath}`, label: 'Recording transcript', optional: true }, ...offlineAssets,
    ]} />
    <section className="jahshan-transcript" aria-label="Transcript of selected recording">
      <h3>Recording transcript</h3><p className="meta">{description ?? track.name}</p>
      <p className="meta">Automatically transcribed from the original human recording. Recognition errors are possible. Intervals with unreliable recognition are marked “Unclear”; replay those timestamps. Use the printed answer key for marking.</p>
      {state === 'loading' && <p role="status">Loading this recording’s transcript…</p>}
      {state === 'unavailable' && <p role="status">The transcript for this recording is unavailable. You can still use the original audio. Reopen this task after the next library update.</p>}
      {state === 'ready' && transcript && <>
        <div className="transcript-actions"><label><input type="checkbox" checked={follow} onChange={event => setFollow(event.target.checked)} /> Follow the audio</label><a href={`data:text/plain;charset=utf-8,${encodeURIComponent(transcript.segments.map(s => `[${timestamp(s.start)}] ${s.text}`).join('\n'))}`} download={`${track.name.replace(/\.mp3$/i, '')}-transcript.txt`}>Download transcript</a></div>
        <div ref={transcriptBox} className="transcript-box" tabIndex={0} aria-label="Recording text">{transcript.segments.map((segment, index) => <button type="button" ref={index === current ? activeLine : undefined} key={index} aria-label={`${timestamp(segment.start)} ${segment.text}`} className={`transcript-line${index === current ? ' transcript-current' : ''}`} aria-current={index === current ? 'true' : undefined} disabled={!duration} onClick={() => seek(segment.start)}><span className="transcript-time">{timestamp(segment.start)}</span><span>{segment.text}</span></button>)}</div>
        <p className="meta">Select a timestamp to move the recording to that sentence.</p>
        {audioEnded && revisionKeywords.length > 0 && <aside className="listening-keyword-review" aria-label="Listening keywords to revise"><h4>After listening · keywords to revise</h4><p className="meta">Key terms picked from this recording’s transcript.</p><ul>{revisionKeywords.map(keyword => <li key={keyword}>{keyword}</li>)}</ul></aside>}
      </>}
    </section>
  </div>;
}
