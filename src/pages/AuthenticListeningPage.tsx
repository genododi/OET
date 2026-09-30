import { useState } from 'react';
import catalog from '../data/authenticListening.json';
import { SavedStudyNotes } from '../components/SavedStudyNotes';
import { RealListeningTestRunner } from '../components/RealListeningTestRunner';
import { realListeningTests } from '../data/realListeningTests';
import './studySources.css';

export function AuthenticListeningPage() {
  const [selected, setSelected] = useState(catalog.tests[0].id);
  const [loaded, setLoaded] = useState(false);
  const [review, setReview] = useState(false);
  const [offlineTest, setOfflineTest] = useState<string | null>(null);
  const test = catalog.tests.find(item => item.id === selected)!;
  const scored = realListeningTests.find(item => item.id === offlineTest);
  if (scored) return <RealListeningTestRunner test={scored} onExit={() => setOfflineTest(null)} />;
  return <div className="page-section study-sources">
    <section className="card study-source-hero"><span className="hero-eyebrow">REAL VOICES · OFFICIAL OET</span><h2>Listen to the original recordings</h2><p>Five human-recorded OET sample tests, with the question packs and answer keys linked by OET. No AI voices or NotebookLM Audio Overviews in this collection.</p><a href={catalog.sourceUrl} target="_blank" rel="noopener noreferrer">Publisher’s matching test packs ↗</a><p className="meta">Source pairing and OET publisher checked {catalog.verifiedAt}. Recordings stream from OET’s SoundCloud account and require internet access.</p></section>
    <div className="study-skill-tabs" role="group" aria-label="Choose official listening test">{catalog.tests.map((item, index) => <button key={item.id} aria-pressed={selected === item.id} onClick={() => { setSelected(item.id); setLoaded(false); setReview(false); }}>Sample {index + 1}</button>)}</div>
    <article className="card"><span className="tag">Official recording · Parts A, B & C</span><h2>{test.title}</h2><p>Open this sample’s question pack first. Complete the Listening section (questions 1–42) while the recording plays. The pack also contains other sub-tests.</p><div className="study-source-links"><a className="btn btn-primary" href={test.questionsUrl} target="_blank" rel="noopener noreferrer">Open matching question pack ↗</a><a className="btn btn-secondary" href={test.audioUrl} target="_blank" rel="noopener noreferrer">Listen on SoundCloud ↗</a></div>
      {loaded ? <iframe key={`audio-${test.id}`} className="original-audio-frame" title={`${test.title} original recording`} allow="autoplay" src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(test.audioUrl)}&auto_play=false&hide_related=true&show_comments=false&show_reposts=false&visual=false`} /> : <button className="btn btn-secondary" onClick={() => setLoaded(true)}>Load original audio player</button>}
      <p className="meta">Loading the player connects to SoundCloud. If your browser blocks it, use “Listen on SoundCloud”. For exam practice, play once without pausing; for review, replay the difficult passages.</p>
      <SavedStudyNotes key={`notes-${test.id}`} storageKey={`oet-original-${test.id}-v1`} label="My numbered answers and listening review" rows={12} placeholder={'Part A — 1–24\n1.\n2.\n\nPart B — 25–30\n25.\n\nPart C — 31–42\n31.\n\nReview: time stamp, phrase I missed, correction'} />
      <button className="btn btn-secondary" aria-expanded={review} onClick={() => setReview(!review)}>{review ? 'Hide answer-key link' : 'Review with the official answer key'}</button>
      {review && <p><a href={test.answersUrl} target="_blank" rel="noopener noreferrer">Open {test.title} answer key ↗</a> — Compare against the Listening section. Record your raw result and corrections; no estimated OET grade is assigned.</p>}
    </article>
    <section className="card"><h3>Two bundled recordings with scored answer sheets</h3><p>These previously imported editions have their own verified papers and 42-question answer sheets. Use the paper inside each test; do not mix it with a newer publisher pack.</p><div className="study-source-links">{realListeningTests.map(item => <button className="btn btn-secondary" key={item.id} onClick={() => setOfflineTest(item.id)}>{item.title} →</button>)}</div></section>
    <section className="card"><h3>Learn with a real tutor</h3><p>Publisher-hosted videos for guided listening practice. These are lessons, not extra scored exams.</p><div className="study-source-links"><a href="https://www.youtube.com/watch?v=fRgUg_TLelg" target="_blank" rel="noopener noreferrer">Official OET: Sample Test 4 guided practice ↗</a><a href="https://www.youtube.com/watch?v=e4CyOdo9DFU" target="_blank" rel="noopener noreferrer">OET SLC: Listening Part A sample lesson ↗</a><a href="https://t.me/s/officialoet" target="_blank" rel="noopener noreferrer">Official OET on Telegram ↗</a></div><p className="meta">Use the recording’s own question paper. Unverified Telegram reposts are not presented as matched tests.</p></section>
  </div>;
}
