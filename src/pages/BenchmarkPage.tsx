import { useEffect, useState } from 'react';
import catalog from '../data/benchmarkCollection.json';
import { BenchmarkQuestionRows, type BenchmarkSheet } from '../components/BenchmarkQuestionRows';
import offline from '../data/benchmarkOffline.json';
import { RecordingTranscriptPlayer } from '../components/RecordingTranscriptPlayer';
import { VoiceRecorder } from './MaterialsPage';
import type { NavSection, OetSubtest } from '../types';
import './materials.css';
import '../components/jahshanListening.css';
import '../components/jahshanReading.css';
import './benchmark.css';

type Entry = { sourceSha256: string; id: string; skill: string; number: number; title: string; assetPath: string; startPage: number; endPage: number; textPath: string; keyPath?: string; keyPages?: number[]; answers?: Record<string, string>; audio?: { url: string; sourceUrl: string; sha256: string } | null };
type Page = { number: number; text: string; extraction?: string };
const entries: Entry[] = catalog.entries;
const skills: OetSubtest[] = ['listening', 'reading', 'writing', 'speaking'];
const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const asset = (s: string) => `${import.meta.env.BASE_URL}${s}`;
function readingParagraphs(text: string) {
  const paragraphs: string[] = [];
  let current: string[] = [];
  const flush = () => { if (current.length) paragraphs.push(current.join(' ')); current = []; };
  for (const sourceLine of text.split('\n')) {
    const line = sourceLine.trim();
    if (!line) { flush(); continue; }
    if (/^(?:TEST[- ]?\d|PART [ABC]\b|TEXT [A-D1-6]\b|Questions?\b)/i.test(line)) { flush(); paragraphs.push(line); continue; }
    if (/^(?:[a-d][).]\s|(?:[1-9]|1\d|2[0-2])[.)]?\s|[•–-])/i.test(line)) flush();
    current.push(line);
  }
  flush();
  return paragraphs;
}
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

    {pages && <div className="material-page-controls"><button className="btn btn-secondary" disabled={all || index === 0} onClick={() => setIndex(index - 1)}>Previous page</button><label htmlFor="benchmark-page">Paper page</label><select id="benchmark-page" disabled={all} value={index} onChange={e => setIndex(Number(e.target.value))}>{pages.map((p, i) => <option key={p.number} value={i}>Book page {p.number} · {i + 1} of {pages.length}</option>)}</select><button className="btn btn-secondary" disabled={all || index === pages.length - 1} onClick={() => setIndex(index + 1)}>Next page</button><label><input type="checkbox" checked={all} onChange={e => setAll(e.target.checked)} /> Show all pages</label></div>}
    {failed ? <p role="alert">The paper text could not load. Open the original above, or reload to try again.</p> : !pages ? <p role="status">Loading this paper…</p> : (all ? pages : [pages[index]]).map(p => <article className="material-text-page" key={p.number}><h4>Book page {p.number}</h4>{p.extraction === 'ocr' && <p className="meta">Recognised from a scan. Check the original for diagrams or uncertain text.</p>}<div className="material-readable-text">{p.text}</div></article>)}
  </section>;
}
function BenchmarkAnswers({ entry, part, onPart, sheet, failed }: { entry: Entry; part: string; onPart: (part: string) => void; sheet: BenchmarkSheet | null; failed: boolean }) {
  const { responses, update, error } = useResponses(entry.id);
  const [review, setReview] = useState(false);
  const writing = entry.skill === 'writing';
  const listening = entry.skill === 'listening';
  const exportText = `${entry.title}\n\n${Object.entries(responses).map(([key, value]) => `${key}: ${value}`).join('\n')}`;
  return <section className={`card material-answer ${listening ? 'jahshan-listening-worksheet' : 'reading-worksheet'}`} aria-label="Benchmark answers"><header className="jahshan-worksheet-heading"><div><h3>{listening ? '3 · Fill the blanks and check answers' : writing ? '3 · Write your letter and review' : '3 · Record your answers and review'}</h3>{!writing && <p>{listening ? 'Complete the notes as you listen, then review individual printed answers.' : 'Keep the full reading text beside your questions and answers.'}</p>}</div>{!writing && <span className="jahshan-part-badge">Part {part}</span>}</header><details className="benchmark-timer"><summary>Practice timer</summary><PracticeTimer minutes={writing ? [5, 40] : listening ? [40] : [15, 45]} /></details>
    {writing ? <><p>Use 5 minutes to read, then 40 minutes to write. Follow the task and recipient in the source.</p><label htmlFor="benchmark-letter">Your letter</label><textarea id="benchmark-letter" value={responses.letter ?? ''} onChange={e => update('letter', e.target.value)} /><p className="meta">{(responses.letter ?? '').trim().split(/\s+/).filter(Boolean).length} words · self-review, no automatic grade</p></> : <>
      <div className="study-skill-tabs" role="group" aria-label="Answer sheet part">{['A', 'B', 'C'].map(p => <button key={p} aria-pressed={part === p} onClick={() => onPart(p)}>Part {p}</button>)}</div>
      <p className="meta">Answer each question below. Your response stays beside its question. {listening ? 'Show answer reveals the supplied printed key.' : 'Part B uses 1–6 and Part C uses 7–22. Any numbering errors in the paper are noted beside the question.'}</p>
      <BenchmarkQuestionRows key={entry.id} entry={entry} part={part} sheet={sheet} failed={failed} responses={responses} onAnswer={update} />
      {(entry.keyPath || !!entry.keyPages?.length) && <div className="benchmark-key-review"><button className="btn btn-secondary" aria-expanded={review} onClick={() => setReview(!review)}>{review ? 'Hide printed key links' : 'Review printed answer key'}</button>{review && (entry.keyPath ? <a href={asset(entry.keyPath)} target="_blank" rel="noopener noreferrer">Open Test {entry.number} printed key ↗</a> : entry.keyPages?.map(p => <a key={p} href={`${asset(entry.assetPath)}#page=${p}`} target="_blank" rel="noopener noreferrer">Printed key · book page {p} ↗</a>))}</div>}
      {!listening && !entry.keyPages?.length && <p className="meta">No printed key page was identified for this reading test. Answers are saved for your own review.</p>}
    </>}
    <label htmlFor="benchmark-notes">Corrections and review notes</label><textarea id="benchmark-notes" className="material-notes" value={responses.notes ?? ''} onChange={e => update('notes', e.target.value)} /><p role={error ? 'alert' : 'status'} className="meta">{error ? 'Browser storage unavailable. Download your work before leaving.' : 'Saved in this browser for this test. Revealing a key keeps your response unchanged.'}</p><a className="btn btn-secondary" href={`data:text/plain;charset=utf-8,${encodeURIComponent(exportText)}`} download={`benchmark-${entry.id}.txt`}>Download my responses</a>
  </section>;
}
function BenchmarkWorkspace({ entry }: { entry: Entry }) {
  const [part, setPart] = useState('A');
  const [wide, setWide] = useState(false);
  const [sheet, setSheet] = useState<BenchmarkSheet | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (entry.skill === 'writing') return;
    const controller = new AbortController();
    fetch(asset(`benchmark/questions/${entry.id}.json`), { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => { if (data.testId !== entry.id || data.sourceSha256 !== entry.sourceSha256 || data.questions?.length !== 42 || !Array.isArray(data.notes) || !data.readingParts) throw new Error(); if (!controller.signal.aborted) setSheet(data); })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [entry]);
  const answers = <BenchmarkAnswers entry={entry} part={part} onPart={setPart} sheet={sheet} failed={failed} />;
  return <div className="benchmark-workspace">
    {entry.skill === 'listening' ? <>
      <section className="card benchmark-listening-player" aria-label="Benchmark recording">
        {entry.audio ? <RecordingTranscriptPlayer mimeType="audio/mpeg" audioUrl={entry.audio.url} track={{ id: entry.id, name: entry.title, sha256: entry.audio.sha256, url: entry.audio.sourceUrl }} transcriptPath={`benchmark/transcripts/${entry.id}.json`} heading="2 · Listen to the recording" description={entry.title} playbackNote="Original human recording · full test, Parts A–C. Use the worksheet below as you listen." /> : <><h3>2 · Listen to the recording</h3><p className="benchmark-notice">The supplied Drive folder has no recording for Test {entry.number}. You can review its paper and key here; audio practice is available in the other 18 tests.</p></>}
      </section>
      {answers}
      <details className="card benchmark-downloads"><summary>Optional books, downloads and offline listening</summary>
        <aside className="benchmark-offline" aria-label="Offline listening"><h3>Listen offline</h3><p>Download all 18 original recordings and transcripts. Extract the ZIP, then open <strong>START.html</strong> beside the audio folder. Tests 10 and 17 have no supplied recordings.</p><a className="btn btn-secondary" href={offline.url}>Download offline collection · {Math.round(offline.bytes / 1000000)} MB</a></aside>
        <a href={`${asset(entry.assetPath)}#page=${entry.startPage}`} target="_blank" rel="noopener noreferrer">Open original question paper · page {entry.startPage} ↗</a>
      </details>
    </> : entry.skill === 'reading' ? <div className={`reading-workbench${wide ? ' reading-workbench-wide' : ''}`}>
      <section className="card reading-paper"><h3>2 · Read the complete text</h3>
        <label>Reading passage part<select value={part} onChange={e => setPart(e.target.value)}>{['A', 'B', 'C'].map(p => <option key={p} value={p}>Part {p}</option>)}</select></label>
        <div className="reading-paper-actions"><button className="btn btn-secondary" onClick={() => setWide(!wide)}>{wide ? 'Show paper beside answers' : 'Expand paper'}</button><a className="btn btn-ghost" href={`${asset(entry.assetPath)}#page=${sheet?.readingParts[part]?.[0]?.number ?? entry.startPage}`} target="_blank" rel="noopener noreferrer">Open original paper ↗</a></div>
        <div key={part} className="reading-page-scroll" aria-label={`Complete reading text · Part ${part}`}>
          {failed ? <p role="alert">The reading text could not load. Open the original paper above.</p> : !sheet ? <p role="status">Loading complete reading text…</p> : sheet.readingParts[part]?.map(page => <article className="benchmark-reading-page" key={page.number}><h4>Book page {page.number}</h4><div className="material-readable-text">{readingParagraphs(page.text).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></article>)}
        </div>
        <p className="meta">Complete extracted text for Part {part}. Check the original PDF for diagrams and tables.</p>
      </section>{answers}
    </div> : <><BenchmarkPaper entry={entry} />{answers}</>}
  </div>;
}
function BenchmarkSpeaking() {
  const { responses, update, error } = useResponses('speaking-pregnancy');
  return <><section className="card"><h2>Speaking practice · Medicine</h2><p>Benchmark’s public role-play sample and original human examples. This is a practice sample; a full supplied Benchmark speaking test book has not been located.</p><a href={speakingSource} target="_blank" rel="noopener noreferrer">Open Benchmark’s complete role-play cards ↗</a></section>
    <section className="card"><h3>2 · Prepare the role-play</h3><h4>GP consultation · Unexpected pregnancy</h4><p className="meta">Concise paraphrase of the publisher’s public Medicine sample. Use the original cards for the full wording.</p><p>A 17-year-old patient suspects an unexpected pregnancy and is uncertain about her next steps.</p><ul><li>Ask about testing and estimated pregnancy duration.</li><li>Explore her concerns and explain confidentiality appropriately.</li><li>Discuss support, information and referral options without pressuring her decision.</li><li>Encourage support from someone she trusts and check her understanding.</li></ul><details><summary>Partner’s role</summary><p>Your home test was positive. You may be a few weeks pregnant, feel unprepared, and worry about your parents finding out. Ask for advice and respond to the doctor’s suggestions.</p></details><a href={speakingSource} target="_blank" rel="noopener noreferrer">Source: Benchmark speaking samples ↗</a><PracticeTimer minutes={[3, 5]} /><p className="meta">Prepare for 3 minutes, then choose 5 minutes for the role-play. Practise with a partner where possible.</p></section>
    <section className="card material-answer"><h3>3 · Record and review</h3><VoiceRecorder /><label htmlFor="benchmark-speaking-notes">Your transcript and review notes</label><textarea id="benchmark-speaking-notes" value={responses.notes ?? ''} onChange={e => update('notes', e.target.value)} /><p className="meta" role="status">{error ? 'Storage unavailable — copy your notes before leaving.' : 'Notes are saved in this browser. Download your recording before leaving.'}</p></section>
    <section className="card"><h3>Listen to Benchmark’s human role-play examples</h3><p>Use these examples after practising to review communication and phrasing.</p>{[{title:'Asthma',track:'628191435'},{title:'Heart attack',track:'628191432'},{title:'Immunisation',track:'628191426'}].map(sample => <details key={sample.track}><summary>{sample.title} · Medicine</summary><iframe title={`Benchmark ${sample.title} speaking example`} width="100%" height="166" loading="lazy" src={`https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/${sample.track}&auto_play=false`} allow="autoplay" /><a href={speakingSource} target="_blank" rel="noopener noreferrer">Open the publisher’s examples ↗</a></details>)}</section>
  </>;
}
export function BenchmarkPage({ itemId, onNavigate }: { itemId?: string; onNavigate: (section: NavSection, itemId?: string) => void }) {
  const selected = entries.find(e => e.id === itemId) ?? entries[0];
  const skill = itemId === 'speaking' ? 'speaking' : selected.skill;
  return <div className="page-section benchmark-page"><section className="card"><span className="hero-eyebrow">YOUR BENCHMARK COLLECTION</span><h2>Books and original listening tracks, together</h2><p>Reading, Listening, Writing and Speaking practice. Choose a test, work through the numbered steps, then review your answers.</p><p className="meta">Third-party study materials for OET preparation. These are not official OET exam papers.</p></section><section className="card"><h3>1 · Choose your practice</h3><div className="study-skill-tabs" role="group" aria-label="Benchmark skill">{skills.map(s => <button key={s} aria-pressed={skill === s} onClick={() => onNavigate('benchmark', s === 'speaking' ? s : `${s}-1`)}>{title(s)} collection</button>)}</div>{skill !== 'speaking' && <label className="benchmark-test-select">Choose a {skill} test<select value={selected.id} onChange={e => onNavigate('benchmark', e.target.value)}>{entries.filter(e => e.skill === skill).map(e => <option key={e.id} value={e.id}>{e.title}{e.skill === 'listening' && !e.audio ? ' · paper only' : ''}</option>)}</select></label>}{skill !== 'speaking' && <div className="benchmark-test-navigation"><button className="btn btn-secondary" disabled={selected.number === 1} onClick={() => onNavigate('benchmark', `${skill}-${selected.number - 1}`)}>Previous test</button><button className="btn btn-secondary" disabled={!entries.some(e => e.id === `${skill}-${selected.number + 1}`)} onClick={() => onNavigate('benchmark', `${skill}-${selected.number + 1}`)}>Next test</button><span className="meta">{selected.title} · {skill === 'writing' ? 'Case notes and letter' : 'Parts A, B and C'}</span></div>}</section>
    {skill === 'speaking' ? <BenchmarkSpeaking /> : <BenchmarkWorkspace key={selected.id} entry={selected} />}
  </div>;
}
