import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RecordingTranscriptPlayer } from '../../src/components/RecordingTranscriptPlayer';
import data from '../../tmp/benchmark-offline/data.json';
import './offline.css';
export function OfflineBenchmark() {
  const [id, setId] = useState(data[0].id);
  const selected = data.find(entry => entry.id === id)!;
  return <main><header><p className="eyebrow">OET STUDY PARTNER · OFFLINE</p><h1>Benchmark Listening</h1><p>18 original human recordings with their complete transcripts. No internet connection is needed.</p><label className="test-select">Choose a listening test<select value={id} onChange={event => setId(event.target.value)}>{data.map(entry => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</select></label><p className="meta">Tests 10 and 17 were not included in the supplied audio folder. Keep START.html and the audio folder together.</p></header>
  <section className="paper" key={id}><h2>{selected.title}</h2><RecordingTranscriptPlayer track={{id: selected.id, name:selected.title,sha256:selected.sha256,url:selected.audioPath}} audioUrl={selected.audioPath} transcriptPath="" inlineTranscript={selected.transcript} mimeType="audio/mpeg" playbackNote="Playing the downloaded original recording from this folder." /></section></main>;
}
createRoot(document.getElementById('root')!).render(<OfflineBenchmark />);
