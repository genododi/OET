import { useEffect, useRef, useState } from 'react';
import catalog from '../data/desktopMaterials.generated.json';
import type { NavSection, OetSubtest } from '../types';
import './materials.css';

type Material = (typeof catalog.files)[number];
type SavedPractice = { response: string; notes: string; completed: boolean; checks: string[] };
const skills: OetSubtest[] = ['listening', 'reading', 'writing', 'speaking'];
const blank: SavedPractice = { response: '', notes: '', completed: false, checks: [] };
const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const url = (path: string) => `${import.meta.env.BASE_URL}${path}`;
const size = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const guidance: Record<OetSubtest, string> = {
  writing: 'Choose a task or page in the source. Identify the reader, purpose and relevant case notes, then write your letter. Use the original task instructions when they differ from your practice settings.',
  reading: 'Choose a passage and its questions in the document. Record numbered answers, then compare them with the source answer key if one is supplied. Use your notes to record evidence for each correction.',
  listening: 'These supplied materials contain listening papers and vocabulary, but no audio recordings. Use a matching recording you already have, or open the existing audio tests. Paper-only work is vocabulary or transcript study, not a scored listening test.',
  speaking: 'Choose a role-play or teaching point in the source. Prepare, then record your response and listen back. You can also type a transcript. Recordings stay in this session until downloaded.',
};
const checklists: Record<OetSubtest, string[]> = {
  writing: ['Purpose is clear at the start', 'Relevant case notes are accurate', 'Content is concise and appropriate to the reader', 'Paragraphs and letter format are clear', 'Grammar, vocabulary and spelling checked'],
  reading: ['All selected questions attempted', 'Evidence located in the source', 'Answers compared with an available key', 'Errors and next steps recorded'],
  listening: ['Matched paper and recording, or labelled this as vocabulary study', 'Key words and spellings checked', 'Answers compared with an available key', 'Missed details recorded for review'],
  speaking: ['Established the patient’s concerns', 'Used clear, patient-friendly language', 'Acknowledged feelings and checked understanding', 'Explained the next steps', 'Listened back or reviewed my transcript'],
};

function readSaved(key: string): SavedPractice {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    if (!value || typeof value.response !== 'string' || typeof value.notes !== 'string') return { ...blank };
    return { response: value.response, notes: value.notes, completed: value.completed === true, checks: Array.isArray(value.checks) ? value.checks.filter((v: unknown) => typeof v === 'string') : [] };
  } catch { return { ...blank }; }
}

function download(blob: Blob, name: string) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

function VoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [audio, setAudio] = useState('');
  const [audioExtension, setAudioExtension] = useState('webm');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audioRef = useRef('');
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (recorder.current?.state === 'recording') recorder.current.stop();
      stream.current?.getTracks().forEach(track => track.stop());
      if (audioRef.current) URL.revokeObjectURL(audioRef.current);
    };
  }, []);
  const start = async () => {
    setError(''); setPending(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('Recording is unavailable here. Type your transcript below instead.');
      const acquired = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) { acquired.getTracks().forEach(track => track.stop()); return; }
      stream.current = acquired;
      const next = new MediaRecorder(acquired);
      recorder.current = next;
      const chunks: BlobPart[] = [];
      next.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      next.onstop = () => {
        acquired.getTracks().forEach(track => track.stop());
        if (!mounted.current) return;
        if (audioRef.current) URL.revokeObjectURL(audioRef.current);
        audioRef.current = URL.createObjectURL(new Blob(chunks, { type: next.mimeType }));
        setAudio(audioRef.current); setAudioExtension(next.mimeType.includes('mp4') ? 'm4a' : next.mimeType.includes('ogg') ? 'ogg' : 'webm'); setRecording(false);
      };
      next.onerror = () => { acquired.getTracks().forEach(track => track.stop()); if (mounted.current) { setError('Recording failed. Please try again or use the transcript field.'); setRecording(false); } };
      next.start(); setRecording(true);
    } catch (err) {
      stream.current?.getTracks().forEach(track => track.stop());
      if (mounted.current) setError(err instanceof Error ? err.message : 'Microphone access failed. You can type your transcript instead.');
    } finally { if (mounted.current) setPending(false); }
  };
  return <div className="material-recorder">
    <button className="btn btn-secondary" disabled={pending} onClick={() => recording ? recorder.current?.stop() : void start()}>{pending ? 'Waiting for microphone…' : recording ? 'Stop recording' : 'Record speaking response'}</button>
    {recording && <span role="status">Recording…</span>}
    {error && <p role="alert">{error}</p>}
    {audio && <><audio controls src={audio} /><a href={audio} download={`oet-speaking.${audioExtension}`}>Download recording before leaving</a></>}
  </div>;
}

function PracticeWorkspace({ file, skill, onNavigate }: { file: Material; skill: OetSubtest; onNavigate: (section: NavSection, itemId?: string) => void }) {
  const storageKey = `oet-supplied-v1:${file.id}:${skill}`;
  const [saved, setSaved] = useState(() => readSaved(storageKey));
  const [saveError, setSaveError] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [textError, setTextError] = useState(false);
  const [view, setView] = useState(['pdf', 'jpg', 'jpeg', 'png'].includes(file.format) ? 'original' : 'text');
  const [duration, setDuration] = useState(skill === 'writing' ? 40 : skill === 'speaking' ? 5 : 15);
  const [remaining, setRemaining] = useState(duration * 60);
  const [deadline, setDeadline] = useState<number | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(url(file.textPath), { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error('Unable to load text');
      return response.json();
    }).then((data: { text: string }) => setText(data.text)).catch(err => { if (err.name !== 'AbortError') setTextError(true); });
    return () => controller.abort();
  }, [file.textPath]);
  useEffect(() => {
    if (!deadline) return;
    const timer = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (!left) setDeadline(null);
    }, 250);
    return () => clearInterval(timer);
  }, [deadline]);
  const update = (changes: Partial<SavedPractice>) => {
    const next = { ...saved, ...changes }; setSaved(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setSaveError(false); } catch { setSaveError(true); }
  };
  const wordCount = saved.response.trim().split(/\s+/).filter(Boolean).length;
  const exportDraft = () => download(new Blob([`${title(skill)} practice\nSource: ${file.relativePath}\n\n${saved.response}\n\nReview notes\n${saved.notes}\n\nSelf-review\n${saved.checks.join('\n')}`], { type: 'text/plain;charset=utf-8' }), `${file.filename.replace(/\.[^.]+$/, '')}-${skill}-practice.txt`);
  return <section className="material-workspace" aria-label="Source practice workspace">
    <header className="card material-workspace-header">
      <div><span className="hero-eyebrow">{file.collection} collection · {title(skill)} practice</span><h2>{file.filename}</h2><p>{file.relativePath}</p></div>
      <a className="btn btn-secondary" href={url(file.assetPath)} download={file.format === 'html' ? `${file.filename}.txt` : file.filename}>Download original · {size(file.bytes)}</a>
    </header>
    <p className="material-guidance">{guidance[skill]}</p>
    {skill === 'listening' && <button className="btn btn-secondary" onClick={() => onNavigate('mock')}>Open existing audio tests</button>}
    <div className="material-workspace-grid">
      <section className="card material-source" aria-label="Source document">
        <div className="material-toolbar"><h3>Source document</h3><div className="material-tabs">
          {(file.format === 'pdf' || ['jpg', 'jpeg', 'png'].includes(file.format)) && <button aria-pressed={view === 'original'} onClick={() => setView('original')}>Original</button>}
          <button aria-pressed={view === 'text'} onClick={() => setView('text')}>Text</button>
        </div></div>
        {view === 'original' && file.format === 'pdf' ? <><iframe title={`${file.filename} document`} src={url(file.assetPath)} /><a target="_blank" rel="noopener noreferrer" href={url(file.assetPath)}>Open PDF in a new tab</a></> : view === 'original' && ['jpg', 'jpeg', 'png'].includes(file.format) ? <img src={url(file.assetPath)} alt={file.filename} /> : textError ? <p role="alert">Text could not be loaded. Download the original or reopen this task to retry.</p> : text === null ? <p role="status">Loading source text…</p> : file.hasText ? <pre>{text}</pre> : <p>This file has no extractable text. Use the original PDF or image, or download the file to open in its app. Anki decks open in Anki.</p>}
        <small>Source text is reproduced as supplied and may contain older instructions or errors. Use it for language practice.</small>
      </section>
      <section className="card material-answer" aria-label="Your practice response">
        <div className="material-timer">
          <label>Practice timer<select value={duration} disabled={deadline !== null} onChange={e => { const minutes = Number(e.target.value); setDuration(minutes); setRemaining(minutes * 60); }}>{[3, 5, 15, 40, 45, 60].map(minutes => <option key={minutes} value={minutes}>{minutes} minutes</option>)}</select></label>
          <strong aria-label="Time remaining">{String(Math.floor(remaining / 60)).padStart(2, '0')}:{String(remaining % 60).padStart(2, '0')}</strong>
          <button className="btn btn-secondary btn-sm" disabled={!remaining} onClick={() => setDeadline(deadline ? null : Date.now() + remaining * 1000)}>{deadline ? 'Pause timer' : 'Start timer'}</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setDeadline(null); setRemaining(duration * 60); }}>Reset timer</button>
        </div>
        {remaining === 0 && <p role="status">Practice time is up. Your response remains editable and saved.</p>}
        {skill === 'speaking' && <VoiceRecorder />}
        <label className="material-response-label" htmlFor="material-response">{skill === 'writing' ? 'Your letter' : skill === 'speaking' ? 'Your transcript or speaking notes' : 'Your numbered answers'}</label>
        <textarea id="material-response" placeholder={skill === 'writing' ? 'Write your letter here…' : 'Choose the page or task, then record your answers here…'} value={saved.response} onChange={e => update({ response: e.target.value, completed: false })} />
        <div className="material-answer-meta"><span>{wordCount} words</span><span role="status">{saveError ? 'Browser storage unavailable — download your work' : 'Saved on this browser'}</span></div>
        <label htmlFor="material-notes">Page / task, corrections and next steps</label>
        <textarea id="material-notes" className="material-notes" value={saved.notes} onChange={e => update({ notes: e.target.value })} placeholder="e.g. Page 12, Task 2. What will you improve next time?" />
        <fieldset><legend>Self-review</legend>{checklists[skill].map(check => <label key={check}><input type="checkbox" checked={saved.checks.includes(check)} onChange={e => update({ checks: e.target.checked ? [...saved.checks, check] : saved.checks.filter(item => item !== check) })} />{check}</label>)}</fieldset>
        <div className="material-actions"><button className="btn btn-primary" disabled={!saved.response.trim()} onClick={() => update({ completed: !saved.completed })}>{saved.completed ? 'Reviewed ✓ — reopen' : 'Mark as reviewed'}</button><button className="btn btn-secondary" onClick={exportDraft}>Download my work</button></div>
        <p className="meta">Self-directed source practice. No automatic answer key or official OET score is assigned. Drafts are saved per file and skill on this browser.</p>
      </section>
    </div>
  </section>;
}

export function MaterialsPage({ itemId, onNavigate }: { itemId?: string; onNavigate: (section: NavSection, itemId?: string) => void }) {
  const [query, setQuery] = useState('');
  const [collection, setCollection] = useState('all');
  const [skillFilter, setSkillFilter] = useState('all');
  const [format, setFormat] = useState('all');
  const [skill, setSkill] = useState<OetSubtest>(() => (catalog.files.find(file => file.id === itemId)?.skills[0] as OetSubtest) || 'writing');
  const [limit, setLimit] = useState(18);
  const selected = catalog.files.find(file => file.id === itemId);
  const filtered = catalog.files.filter(file => {
    const q = query.toLocaleLowerCase().trim();
    return (collection === 'all' || file.collection === collection) && (skillFilter === 'all' || file.skills.includes(skillFilter)) && (format === 'all' || file.format === format) && (!q || `${file.filename} ${file.relativePath} ${file.excerpt}`.toLocaleLowerCase().includes(q));
  });
  const open = (file: Material) => { setSkill((file.skills[0] as OetSubtest) || 'writing'); onNavigate('materials', file.id); };
  return <div className="page-section materials-page">
    <section className="card materials-hero">
      <div><span className="hero-eyebrow">Your files. Your daily practice.</span><h2>OET & AMR study collection</h2><p>Read the original materials and practise all four skills in one workspace. Your AMR writing collection comes first.</p><div className="material-stats"><span><strong>{catalog.fileCount}</strong> supplied files</span><span><strong>{catalog.amrCount}</strong> AMR files</span><span><strong>4</strong> practice modes</span></div></div>
      <div className="materials-hero-mark" aria-hidden="true">OET<span>STUDY / PRACTISE / REVIEW</span></div>
    </section>
    {selected ? <>
      <button className="btn btn-ghost" onClick={() => onNavigate('materials')}>← Back to all supplied files</button>
      <div className="material-skill-tabs" role="group" aria-label="Practice skill">{skills.map(item => <button key={item} aria-pressed={skill === item} onClick={() => setSkill(item)}>{title(item)}</button>)}</div>
      <PracticeWorkspace key={`${selected.id}:${skill}`} file={selected} skill={skill} onNavigate={onNavigate} />
    </> : <>
      {itemId && <p role="alert">That source was not found. Choose a file below.</p>}
      <div className="material-skill-tabs" role="group" aria-label="Filter materials by skill"><button aria-pressed={skillFilter === 'all'} onClick={() => { setSkillFilter('all'); setLimit(18); }}>All materials</button>{skills.map(item => <button key={item} aria-pressed={skillFilter === item} onClick={() => { setSkillFilter(item); setLimit(18); }}>{title(item)} <span>{catalog.files.filter(file => file.skills.includes(item)).length}</span></button>)}</div>
      <div className="material-filters"><label>Search your files<input type="search" placeholder="Find a task, topic or filename…" value={query} onChange={e => { setQuery(e.target.value); setLimit(18); }} /></label><label>Collection<select value={collection} onChange={e => { setCollection(e.target.value); setLimit(18); }}><option value="all">OET + AMR</option><option value="AMR">AMR only · 35 files</option><option value="OET">OET folder</option></select></label><label>File type<select value={format} onChange={e => { setFormat(e.target.value); setLimit(18); }}><option value="all">All file types</option>{[...new Set(catalog.files.map(file => file.format))].sort().map(item => <option key={item} value={item}>{item.toUpperCase()}</option>)}</select></label></div>
      <p className="meta">{filtered.length} files · Originals available on any device · Duplicate filenames retained</p>
      <div className="material-grid">{filtered.slice(0, limit).map(file => <article className="card material-card" key={file.id}>
        <div className="card-header-row"><span className={`tag ${file.collection === 'AMR' ? 'tag-available' : ''}`}>{file.collection} collection</span><span className="tag">{file.format.toUpperCase()}</span></div>
        <h3>{file.filename}</h3><p>{file.excerpt || 'Open the original document to study this material.'}</p>
        <div className="badge-row">{file.skills.length ? file.skills.map(item => <span key={item} className={`subtest-badge subtest-${item}`}>{item}</span>) : <span className="tag">Unclassified source</span>}{file.duplicateOf && <span className="tag">Duplicate copy</span>}</div>
        <div className="material-card-footer"><button className="btn btn-primary btn-sm" onClick={() => open(file)}>Open & practise →</button><span>{size(file.bytes)}</span></div>
      </article>)}</div>
      {!filtered.length && <div className="card"><h3>No matching files</h3><p>Try another search or choose a different collection.</p></div>}
      {filtered.length > limit && <button className="btn btn-secondary" onClick={() => setLimit(limit + 18)}>Show more files ({filtered.length - limit} remaining)</button>}
      <p className="material-library-note">All {catalog.fileCount} supplied paths are included; exact duplicates share {catalog.uniqueFileCount} stored originals. Scanned pages may not have searchable text. Anki decks and other non-previewable files are available to download. Materials retain their original authorship; inclusion does not grant a reuse licence.</p>
    </>}
  </div>;
}
