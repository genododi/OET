import { useEffect, useState } from 'react';
import catalog from '../data/benchmarkCollection.json';
import { StudyAudioPlayer } from '../components/StudyAudioPlayer';
import { VoiceRecorder } from './MaterialsPage';
import type { NavSection, OetSubtest } from '../types';
import './materials.css';
import './benchmark.css';

type Entry = { id: string; skill: string; number: number; title: string; assetPath: string; startPage: number; endPage: number; textPath: string; keyPath?: string; keyPages?: number[]; answers?: Record<string, string>; audio?: { url: string; sourceUrl: string } | null };
type Page = { number: number; text: string; extraction?: string };
const entries: Entry[] = catalog.entries;
const skills: OetSubtest[] = ['listening', 'reading', 'writing', 'speaking'];
const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const asset = (s: string) => `${import.meta.env.BASE_URL}${s}`;
const speakingSource = 'https://edubenchmark.com/blog/oet-speaking-role-play-cards/';
function readSaved(key: string): Record<string, string> {
  try { const data = JSON.parse(localStorage.getItem(key) || '{}'); return Object.fromEntries(Object.entries(data).filter((pair): pair is [string, string] => typeof pair[1] === 'string')); } catch { return {}; }
}
function useResponses(id: string) {
  const key = `oet-benchmark-v1:${id}`;
  const [responses, setResponses] = useState(() => readSaved(key));
  const [error, setError] = useState(false);
  const update = (id: string, value: string) => { const next = { ...responses, [id]: value }; setResponses(next); try { localStorage.setItem(key, JSON.stringify(next)); setError(false); } catch { setError(true); } };
  return { responses, update, error };
}
function PracticeTimer({ minutes }: { minutes: number[] }) {
  const [selected, setSelected] = useState(minutes[0]);
  const [left, setLeft] = useState(minutes[0] * 60);
  const [deadline, setDeadline] = useState<number | null>(null);
  useEffect(() => {
    if (!deadline) return;
    const interval = window.setInterval(() => { const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000)); setLeft(next); if (!next) setDeadline(null); }, 250);
    return () => clearInterval(interval);
  }, [deadline]);
  return <div className="material-timer"><label>Practice timer<select value={selected} disabled={!!deadline} onChange={e => { setSelected(Number(e.target.value)); setLeft(Number(e.target.value) * 60); }}>{minutes.map(m => <option key={m} value={m}>{m} minutes</option>)}</select></label><strong aria-label="Time remaining">{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</strong><button className="btn btn-secondary" disabled={!left} onClick={() => setDeadline(deadline ? null : Date.now() + left * 1000)}>{deadline ? 'Pause timer' : 'Start timer'}</button><button className="btn btn-ghost" onClick={() => { setDeadline(null); setLeft(selected * 60); }}>Reset timer</button>{!left && <span role="status">Practice time is up.</span>}</div>;
}
function BenchmarkPaper({ entry }: { entry: Entry }) {
  const [pages, setPages] = useState<Page[] | null>(null);
  const [index, setIndex] = useState(0);
  const [all, setAll] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(asset(entry.textPath), { signal: controller.signal }).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(data => { if (!controller.signal.aborted) setPages(data.pages); }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [entry.textPath]);
  const page = pages?.[index]?.number ?? entry.startPage;
  return <section className="card" aria-label="Benchmark source paper"><div className="material-toolbar"><h3>2 · {entry.skill === 'listening' ? 'Listen and read the questions' : 'Read the complete paper'}</h3><a href={`${asset(entry.assetPath)}#page=${page}`} target="_blank" rel="noopener noreferrer">Open original · page {page} ↗</a></div>
    {entry.skill === 'listening' && (entry.audio ? <><StudyAudioPlayer mimeType="audio/mpeg" src={entry.audio.url} sourceUrl={entry.audio.sourceUrl} label={entry.title} /><p className="meta">Original human recording · full test, Parts A–C. Matched by test number and the opening patient scenario.</p></> : <p className="benchmark-notice">The supplied Drive folder has no recording for Test {entry.number}. You can review its paper and key here; audio practice is available in the other 18 tests.</p>)}
    {pages && <div className="material-page-controls"><button className="btn btn-secondary" disabled={all || index === 0} onClick={() => setIndex(index - 1)}>Previous page</button><label htmlFor="benchmark-page">Paper page</label><select id="benchmark-page" disabled={all} value={index} onChange={e => setIndex(Number(e.target.value))}>{pages.map((p, i) => <option key={p.number} value={i}>Book page {p.number} · {i + 1} of {pages.length}</option>)}</select><button className="btn btn-secondary" disabled={all || index === pages.length - 1} onClick={() => setIndex(index + 1)}>Next page</button><label><input type="checkbox" checked={all} onChange={e => setAll(e.target.checked)} /> Show all pages</label></div>}
    {failed ? <p role="alert">The paper text could not load. Open the original above, or reload to try again.</p> : !pages ? <p role="status">Loading this paper…</p> : (all ? pages : [pages[index]]).map(p => <article className="material-text-page" key={p.number}><h4>Book page {p.number}</h4>{p.extraction === 'ocr' && <p className="meta">Recognised from a scan. Check the original for diagrams or uncertain text.</p>}<div className="material-readable-text">{p.text}</div></article>)}
  </section>;
}
function BenchmarkAnswers({ entry }: { entry: Entry }) {
  const { responses, update, error } = useResponses(entry.id);
  const [part, setPart] = useState('A');
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [review, setReview] = useState(false);
  const writing = entry.skill === 'writing';
  const listening = entry.skill === 'listening';
  const numbers = writing ? [] : listening ? part === 'A' ? Array.from({ length: 24 }, (_, i) => i + 1) : part === 'B' ? [25, 26, 27, 28, 29, 30] : Array.from({ length: 12 }, (_, i) => i + 31) : part === 'A' ? Array.from({ length: 20 }, (_, i) => i + 1) : part === 'B' ? [1, 2, 3, 4, 5, 6] : Array.from({ length: 16 }, (_, i) => i + 7);
  const exportText = `${entry.title}\n\n${Object.entries(responses).map(([key, value]) => `${key}: ${value}`).join('\n')}`;
  return <section className="card material-answer" aria-label="Benchmark answers"><h3>3 · {writing ? 'Write your letter and review' : 'Record your answers and review'}</h3><PracticeTimer minutes={writing ? [5, 40] : listening ? [40] : [15, 45]} />
    {writing ? <><p>Use 5 minutes to read, then 40 minutes to write. Follow the task and recipient in the source.</p><label htmlFor="benchmark-letter">Your letter</label><textarea id="benchmark-letter" value={responses.letter ?? ''} onChange={e => update('letter', e.target.value)} /><p className="meta">{(responses.letter ?? '').trim().split(/\s+/).filter(Boolean).length} words · self-review, no automatic grade</p></> : <>
      <div className="study-skill-tabs" role="group" aria-label="Answer sheet part">{['A', 'B', 'C'].map(p => <button key={p} aria-pressed={part === p} onClick={() => setPart(p)}>Part {p}</button>)}</div>
      <p className="meta">Use the question numbers printed in Part {part}. {listening ? 'Show answer reveals the supplied printed key.' : 'Part B starts at 1; Part C continues at 7, as printed in this collection.'}</p>
      <div className="benchmark-answer-grid">{numbers.map(n => { const id = `${part}-${n}`; const key = entry.answers?.[String(n)]; return <div className="benchmark-answer-item" key={id}><label htmlFor={`benchmark-${id}`}>Question {n}</label><div className="jahshan-blank-controls">{part === 'A' ? <input id={`benchmark-${id}`} value={responses[id] ?? ''} onChange={e => update(id, e.target.value)} placeholder="Your answer" autoComplete="off" /> : <select id={`benchmark-${id}`} value={responses[id] ?? ''} onChange={e => update(id, e.target.value)}><option value="">Choose…</option>{(listening || part === 'B' ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D']).map(c => <option key={c}>{c}</option>)}</select>}{key && <button className="btn btn-secondary" aria-label={`${revealed[id] ? 'Hide' : 'Show'} answer for Question ${n}`} aria-expanded={!!revealed[id]} onClick={() => setRevealed({ ...revealed, [id]: !revealed[id] })}>{revealed[id] ? 'Hide' : 'Show'}</button>}</div>{revealed[id] && key && <p className="jahshan-inline-key"><strong>Printed answer:</strong> {key}</p>}</div>; })}</div>
      {(entry.keyPath || !!entry.keyPages?.length) && <div className="benchmark-key-review"><button className="btn btn-secondary" aria-expanded={review} onClick={() => setReview(!review)}>{review ? 'Hide printed key links' : 'Review printed answer key'}</button>{review && (entry.keyPath ? <a href={asset(entry.keyPath)} target="_blank" rel="noopener noreferrer">Open Test {entry.number} printed key ↗</a> : entry.keyPages?.map(p => <a key={p} href={`${asset(entry.assetPath)}#page=${p}`} target="_blank" rel="noopener noreferrer">Printed key · book page {p} ↗</a>))}</div>}
      {!listening && !entry.keyPages?.length && <p className="meta">No printed key page was identified for this reading test. Answers are saved for your own review.</p>}
    </>}
    <label htmlFor="benchmark-notes">Corrections and review notes</label><textarea id="benchmark-notes" className="material-notes" value={responses.notes ?? ''} onChange={e => update('notes', e.target.value)} /><p role={error ? 'alert' : 'status'} className="meta">{error ? 'Browser storage unavailable. Download your work before leaving.' : 'Saved in this browser for this test. Revealing a key keeps your response unchanged.'}</p><a className="btn btn-secondary" href={`data:text/plain;charset=utf-8,${encodeURIComponent(exportText)}`} download={`benchmark-${entry.id}.txt`}>Download my responses</a>
  </section>;
}
function BenchmarkSpeaking() {
  const { responses, update, error } = useResponses('speaking-pregnancy');
  return <><section className="card"><h2>1 · Speaking practice · Medicine</h2><p>Benchmark’s public role-play sample and original human examples. This is a practice sample; a full supplied Benchmark speaking test book has not been located.</p><a href={speakingSource} target="_blank" rel="noopener noreferrer">Open Benchmark’s complete role-play cards ↗</a></section>
    <section className="card"><h3>2 · Prepare the role-play</h3><h4>GP consultation · Unexpected pregnancy</h4><p className="meta">Concise paraphrase of the publisher’s public Medicine sample. Use the original cards for the full wording.</p><p>A 17-year-old patient suspects an unexpected pregnancy and is uncertain about her next steps.</p><ul><li>Ask about testing and estimated pregnancy duration.</li><li>Explore her concerns and explain confidentiality appropriately.</li><li>Discuss support, information and referral options without pressuring her decision.</li><li>Encourage support from someone she trusts and check her understanding.</li></ul><details><summary>Partner’s role</summary><p>Your home test was positive. You may be a few weeks pregnant, feel unprepared, and worry about your parents finding out. Ask for advice and respond to the doctor’s suggestions.</p></details><a href={speakingSource} target="_blank" rel="noopener noreferrer">Source: Benchmark speaking samples ↗</a><PracticeTimer minutes={[3, 5]} /><p className="meta">Prepare for 3 minutes, then choose 5 minutes for the role-play. Practise with a partner where possible.</p></section>
    <section className="card material-answer"><h3>3 · Record and review</h3><VoiceRecorder /><label htmlFor="benchmark-speaking-notes">Your transcript and review notes</label><textarea id="benchmark-speaking-notes" value={responses.notes ?? ''} onChange={e => update('notes', e.target.value)} /><p className="meta" role="status">{error ? 'Storage unavailable — copy your notes before leaving.' : 'Notes are saved in this browser. Download your recording before leaving.'}</p></section>
    <section className="card"><h3>Listen to Benchmark’s human role-play examples</h3><p>Use these examples after practising to review communication and phrasing.</p>{[{title:'Asthma',track:'628191435'},{title:'Heart attack',track:'628191432'},{title:'Immunisation',track:'628191426'}].map(sample => <details key={sample.track}><summary>{sample.title} · Medicine</summary><iframe title={`Benchmark ${sample.title} speaking example`} width="100%" height="166" loading="lazy" src={`https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/${sample.track}&auto_play=false`} allow="autoplay" /><a href={speakingSource} target="_blank" rel="noopener noreferrer">Open the publisher’s examples ↗</a></details>)}</section>
  </>;
}
export function BenchmarkPage({ itemId, onNavigate }: { itemId?: string; onNavigate: (section: NavSection, itemId?: string) => void }) {
  const selected = entries.find(e => e.id === itemId) ?? entries[0];
  const skill = itemId === 'speaking' ? 'speaking' : selected.skill;
  return <div className="page-section benchmark-page"><section className="card"><span className="hero-eyebrow">YOUR BENCHMARK COLLECTION</span><h2>Benchmark tests</h2><p>Choose a skill, choose a test, then work through the source and save your answers.</p><div className="study-skill-tabs" role="group" aria-label="Benchmark skill">{skills.map(s => <button key={s} aria-pressed={skill === s} onClick={() => onNavigate('benchmark', s === 'speaking' ? s : `${s}-1`)}>{title(s)}</button>)}</div>{skill !== 'speaking' && <label className="benchmark-test-select">Choose a {skill} test<select value={selected.id} onChange={e => onNavigate('benchmark', e.target.value)}>{entries.filter(e => e.skill === skill).map(e => <option key={e.id} value={e.id}>{e.title}{e.skill === 'listening' && !e.audio ? ' · paper only' : ''}</option>)}</select></label>}<p className="meta">Third-party study materials for OET preparation. These are not official OET exam papers.</p></section>
    {skill === 'speaking' ? <BenchmarkSpeaking /> : <div key={selected.id} className="benchmark-workspace"><section className="card"><h2>1 · {selected.title}</h2><p>Original book pages {selected.startPage}–{selected.endPage}{selected.skill === 'listening' ? ' · Parts A, B and C' : ''}</p></section><BenchmarkPaper entry={selected} /><BenchmarkAnswers entry={selected} /></div>}
  </div>;
}
