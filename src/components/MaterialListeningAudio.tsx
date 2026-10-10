import { useEffect, useRef, useState } from 'react';
import { StudyAudioPlayer } from './StudyAudioPlayer';
export function MaterialListeningAudio() {
  const [audio, setAudio] = useState<{ url: string; name: string } | null>(null);
  const currentUrl = useRef('');
  useEffect(() => () => { if (currentUrl.current) URL.revokeObjectURL(currentUrl.current); }, []);
  return <section className="material-local-audio" aria-label="Matching source recording">
    <h4>Play your matching recording</h4>
    <p>This document has no bundled recording. Choose its matching original audio file to play while you read and answer below.</p>
    <label>Choose matching audio<input type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg" onChange={event => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
      currentUrl.current = URL.createObjectURL(file);
      setAudio({ url: currentUrl.current, name: file.name });
    }} /></label>
    {audio && <><p className="meta">{audio.name} · Selected on your device</p><StudyAudioPlayer src={audio.url} label={audio.name} /></>}
    <p className="meta">The file stays on your device. Choose it again after reloading. Match its test and part to this document.</p>
    <div className="study-source-links"><a href="#jahshan">Jahshan recordings with matched questions →</a><a href="#practice/listening">Official listening tests →</a></div>
  </section>;
}
