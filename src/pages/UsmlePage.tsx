import { useEffect, useMemo, useState } from 'react';
import type { UsmleStep, UsmleDiscipline } from '../types/usmle';
import type { SessionConfig, SessionTask } from '../types/session';
import type { PrivateUsmleLibrary, UsmleImportStatus } from '../types/usmleLibrary';
import { UsmleBlockSetup } from '../components/UsmleBlockSetup';
import { SessionRunner } from '../components/SessionRunner';
import { UsmlePerformance } from '../components/UsmlePerformance';
import { UsmlePrivateLibrary } from '../components/UsmlePrivateLibrary';
import { buildUsmleBlockSession, buildUsmleCustomSession } from '../lib/usmleSessionBuilder';
import { usmleBankByStep } from '../data/usmleTaskBank';
import { usmleOfficialResources } from '../data/usmleCourses';
import { loadPrivateStudy, privateQuestionTask, savePrivateStudy } from '../lib/usmleLibrary';
import type { PrivateQuestionProgress } from '../lib/usmleLibrary';
import '../usmleStudy.css';

const EMPTY: PrivateUsmleLibrary = { version: 1, questions: [], resources: [], warnings: [], importedAt: null };
const STEPS = [{ step: 'step1' as const, label: 'Step 1', description: 'Mechanisms, basic sciences and application to clinical problems.' }, { step: 'step2' as const, label: 'Step 2 CK', description: 'Diagnosis, investigation, management and prevention.' }];

export function UsmlePage() {
  const [tab, setTab] = useState<'practice' | 'study' | 'review' | 'resources'>('practice');
  const [library, setLibrary] = useState(EMPTY), [status, setStatus] = useState<UsmleImportStatus | null>(null);
  const [error, setError] = useState(''), [progress, setProgress] = useState(loadPrivateStudy);
  const [selectedStep, setSelectedStep] = useState<UsmleStep | null>(null);
  const [source, setSource] = useState<'private' | 'builtin'>('private');
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  useEffect(() => {
    let active = true, previousState = '';
    const load = async () => {
      try { const value = await window.oetDesktop?.usmleLibrary?.(); if (active && value) setLibrary(value); }
      catch (cause) { if (active) setError(cause instanceof Error ? cause.message : 'The private library could not be loaded.'); }
    };
    void load();
    const timer = setInterval(() => {
      void window.oetDesktop?.usmleStatus?.().then(value => {
        if (!active) return;
        if (previousState !== 'complete' && value.state === 'complete') void load();
        previousState = value.state; setStatus(value);
      }).catch(() => {});
    }, 2000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  const privatePool = useMemo(() => library.questions.map(question => privateQuestionTask(question, progress[question.id])).filter((task): task is SessionTask => !!task), [library, progress]);
  const pool = source === 'private' && library.questions.length ? privatePool : Object.values(usmleBankByStep).flat();
  const unassigned = library.questions.filter(question => !question.step && !progress[question.id]?.step && !question.reviewOnly).length;
  const importFolder = async () => {
    setError('');
    try { const result = await window.oetDesktop?.importUsmleFolder?.(); if (result) setStatus(result); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Import failed.'); }
  };
  const update = (id: string, value: PrivateQuestionProgress) => {
    const next = { ...progress, [id]: value }; setProgress(next); savePrivateStudy(next);
  };
  const start = (step: UsmleStep, discipline: UsmleDiscipline | undefined, questionCount: number, timeMinutes: number, custom: boolean) => {
    try { setSessionConfig((custom ? buildUsmleCustomSession : buildUsmleBlockSession)({ step, discipline, questionCount, timeMinutes, pool })); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No questions match.'); }
  };
  if (sessionConfig) return <SessionRunner config={sessionConfig} onExit={() => { setSessionConfig(null); setSelectedStep(null); setProgress(loadPrivateStudy()); setTab('review'); }} />;
  return <div className="usmle-workspace">
    <section className="card usmle-workspace-hero"><div><p className="eyebrow">Medicine · Step 1 & Step 2 CK</p><h2>Your USMLE study workspace</h2><p>Study the source, practise a focused block, then revise what you missed.</p></div><div className="usmle-import-panel">{window.oetDesktop?.importUsmleFolder ? <button type="button" className="btn btn-secondary" disabled={status?.state === 'importing'} onClick={() => void importFolder()}>{status?.state === 'importing' ? 'Importing your files…' : 'Import / update my study folder'}</button> : <p>Open the Mac app to import private PDFs and Anki decks.</p>}<small>Private files stay on this Mac. No API key needed.</small></div></section>
    {error && <p role="alert">{error}</p>}
    {status && status.state !== 'idle' && <p role="status" className="usmle-quality-note">{status.message}</p>}
    {library.importedAt && <p className="meta">Private library: {library.questions.filter(question => !question.reviewOnly).length.toLocaleString()} questions · {library.questions.filter(question => question.reviewOnly).length} review-only cards · {library.resources.filter(resource => resource.kind === 'pdf').length} PDFs · Imported {new Date(library.importedAt).toLocaleString()}. {unassigned > 0 && `${unassigned.toLocaleString()} questions await your Step label.`}</p>}
    {!!library.warnings.length && <details className="usmle-quality-note"><summary>Source import notes ({library.warnings.length})</summary><ul>{library.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul></details>}
    <nav className="usmle-workspace-tabs" aria-label="USMLE preparation steps">{([{ id: 'study', label: '1 · Study files' }, { id: 'practice', label: '2 · Practise a block' }, { id: 'review', label: '3 · Review & revise' }, { id: 'resources', label: 'Official resources' }] as const).map(item => <button type="button" key={item.id} aria-current={tab === item.id ? 'page' : undefined} onClick={() => { setTab(item.id); setSelectedStep(null); }}>{item.label}</button>)}</nav>
    {tab === 'practice' && <>
      <section className="card"><label className="usmle-bank-choice">Question source<select value={source === 'private' && library.questions.length ? 'private' : 'builtin'} onChange={event => { setSource(event.target.value as 'private' | 'builtin'); setSelectedStep(null); }}><option value="private" disabled={!library.questions.length}>My private imported questions</option><option value="builtin">Built-in USMLE-style practice</option></select></label><p className="meta">Imported material keeps its source key and classification. Built-in questions are original practice exercises, not an official publisher bank.</p></section>
      {selectedStep ? <UsmleBlockSetup key={`${selectedStep}-${source}`} step={selectedStep} pool={pool} onStart={start} onBack={() => setSelectedStep(null)} /> : <div className="usmle-step-grid">{STEPS.map(item => <button type="button" key={item.step} className="card usmle-step-card" disabled={!pool.some(task => task.usmleStep === item.step)} onClick={() => setSelectedStep(item.step)}><p className="eyebrow">Choose your exam</p><h3>{item.label}</h3><p>{item.description}</p><strong>{pool.filter(task => task.usmleStep === item.step).length.toLocaleString()} available questions</strong><span>Build my practice block →</span></button>)}</div>}
      <p className="meta">2026 practice timing: up to 20 questions / 30 minutes. A full exam includes multiple blocks and breaks. <a href="https://www.usmle.org/exam-resources" target="_blank" rel="noreferrer">Official exam formats ↗</a></p>
      <details><summary>Step 3 practice</summary><button type="button" className="btn btn-secondary" onClick={() => { setSource('builtin'); setSelectedStep('step3'); }}>Open built-in Step 3 questions</button></details>
    </>}
    {(tab === 'study' || tab === 'review') && <>{tab === 'review' && <UsmlePerformance />}{library.questions.length ? <UsmlePrivateLibrary key={tab} library={library} progress={progress} onChange={update} reviewing={tab === 'review'} /> : <section className="card"><h3>Bring your study files</h3><p>Import a folder containing your own PDFs and supported Anki multiple-choice decks. Your source files stay unchanged. Imported questions, images and PDFs remain private and available offline.</p><p className="meta">Supported layouts: SBA MCQ (v2), and Blocks 01–21 source study cards in traditional collection.anki2 exports. Other layouts are reported for review rather than guessed.</p></section>}</>}
    {tab === 'resources' && <section className="card"><h3>Publisher and official exam resources</h3><p>These links open online. Saved private study files and imported practice work offline in the Mac app.</p><div className="usmle-resource-grid">{usmleOfficialResources.map(resource => <article key={resource.url}><p className="eyebrow">{resource.step}</p><h4><a href={resource.url} target="_blank" rel="noreferrer">{resource.name} ↗</a></h4><p>{resource.description}</p><small>{resource.access}</small></article>)}</div></section>}
  </div>;
}
