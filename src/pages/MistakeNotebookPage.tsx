import { useMemo, useState } from 'react';
import type { NavSection, OetSubtest } from '../types';
import type { SessionConfig } from '../types/session';
import { useProgress } from '../hooks/useProgress';
import { useStudyClock } from '../hooks/useStudyClock';
import { buildReviewSession } from '../lib/sessionBuilder';
import { buildMistakeNotebook, MISTAKE_REASONS, readMistakeReflections, saveMistakeReflection, type MistakeNotebookEntry, type MistakeReason } from '../lib/mistakeNotebook';
import { SubtestBadge } from '../components/SubtestBadge';
import { SessionRunner } from '../components/SessionRunner';

function MistakeCard({ entry, onReview }: { entry: MistakeNotebookEntry; onReview: () => void }) {
  const [saved] = useState(() => readMistakeReflections()[entry.canonicalId]);
  const [reason, setReason] = useState<MistakeReason | ''>(saved?.reason ?? '');
  const [rule, setRule] = useState(saved?.rule ?? '');
  const [message, setMessage] = useState('');
  const save = () => {
    try {
      saveMistakeReflection(entry.canonicalId, { reason, rule: rule.trim(), updatedAt: new Date().toISOString() });
      setMessage('Reflection saved on this device.');
    } catch { setMessage('Could not save: browser storage is unavailable or full. Keep a copy of your rule.'); }
  };
  const expected = entry.latestReview?.expectedResponse ?? entry.task.options?.find((option) => option.correct)?.label;
  return (
    <article className="card mistake-card">
      <div className="mistake-card-header">
        <SubtestBadge subtest={entry.subtest} small />
        <span className={entry.dueForReview ? 'mistake-status due' : 'mistake-status'}>
          {entry.dueForReview ? 'Due now' : `Next recall: ${new Date(entry.nextReviewAt!).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}`}
        </span>
      </div>
      <h3>{entry.task.title}</h3>
      <p className="meta">{entry.mistakeCount} missed attempt{entry.mistakeCount === 1 ? '' : 's'} · {entry.consecutivePasses} consecutive correction{entry.consecutivePasses === 1 ? '' : 's'} · Last practised {new Date(entry.lastSeenAt).toLocaleDateString()}</p>
      <p className="mistake-feedback">{entry.latestReview?.summary ?? 'Retrieve the evidence, then explain your correction.'}</p>
      <details className="mistake-evidence">
        <summary>Inspect the task & answer evidence</summary>
        <p className="notebook-preserve-lines">{entry.task.prompt ?? entry.task.instructions}</p>
        {entry.latestReview?.response && <div><strong>Your last response</strong><p className="notebook-preserve-lines">{entry.latestReview.response}</p></div>}
        {expected && <p><strong>Expected answer:</strong> {expected}</p>}
        {entry.task.readingPassage && <p className="notebook-preserve-lines">{entry.task.readingPassage}</p>}
        {entry.task.audioTranscript && <p className="notebook-preserve-lines"><strong>Audio evidence:</strong> {entry.task.audioTranscript}</p>}
        {(entry.task.modelAnswer || entry.task.sampleAnswer) && <div><strong>Model response</strong><p className="notebook-preserve-lines">{entry.task.modelAnswer ?? entry.task.sampleAnswer}</p></div>}
        {entry.task.perfectAnswerTips && <ul>{entry.task.perfectAnswerTips.map((tip) => <li key={tip}>{tip}</li>)}</ul>}
      </details>
      <div className="mistake-reflection">
        <label htmlFor={`${entry.canonicalId}-reason`}>Why did I miss it?</label>
        <select id={`${entry.canonicalId}-reason`} value={reason} onChange={(event) => { setReason(event.target.value as MistakeReason | ''); setMessage('Unsaved changes'); }}>
          <option value="">Choose a reason</option>
          {MISTAKE_REASONS.map((value) => <option key={value}>{value}</option>)}
        </select>
        <label htmlFor={`${entry.canonicalId}-rule`}>My rule for next time</label>
        <textarea id={`${entry.canonicalId}-rule`} value={rule} maxLength={2000} rows={3} placeholder="When I see or hear…, I will… because the evidence is…" onChange={(event) => { setRule(event.target.value); setMessage('Unsaved changes'); }} />
        <div className="mistake-card-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={save}>Save reflection</button>
          {entry.dueForReview && <button type="button" className="btn btn-primary btn-sm" onClick={onReview}>Retry this task</button>}
        </div>
        <p className="meta" role="status">{message}</p>
      </div>
    </article>
  );
}

export function MistakeNotebookPage({ onNavigate }: { onNavigate: (section: NavSection, itemId?: string) => void }) {
  const { completed } = useProgress();
  const now = useStudyClock();
  const entries = useMemo(() => buildMistakeNotebook(completed, now.getTime()), [completed, now]);
  const [status, setStatus] = useState('all');
  const [subtest, setSubtest] = useState('all');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(12);
  const [session, setSession] = useState<SessionConfig | null>(null);
  const [notice, setNotice] = useState('');
  const visible = entries.filter((entry) =>
    (subtest === 'all' || subtest === entry.subtest) &&
    (status === 'all' || (status === 'due' ? entry.dueForReview : !entry.dueForReview)) &&
    `${entry.task.title} ${entry.latestReview?.summary ?? ''}`.toLowerCase().includes(search.toLowerCase().trim()),
  );
  const due = entries.filter((entry) => entry.dueForReview).length;
  const visibleDue = visible.filter((entry) => entry.dueForReview);
  const startReview = (taskIds: string[]) => {
    const config = buildReviewSession({ completed, taskIds });
    if (config) setSession(config);
    else setNotice('No tasks in this selection are due. Your next recall date is shown on each card.');
  };
  if (session) return <SessionRunner config={session} onExit={() => setSession(null)} />;
  return (
    <div className="mistake-notebook">
      <section className="card notebook-intro">
        <span className="section-kicker">Turn feedback into a habit</span>
        <h2>Your practice mistake notebook</h2>
        <p>Understand the error, write a rule, then retrieve the answer without peeking. Your practice-bank mistakes and corrections collect here automatically.</p>
        <div className="notebook-stats">
          <div><strong>{entries.length}</strong><span>tasks to learn from</span></div>
          <div><strong>{due}</strong><span>due for recall</span></div>
          <div><strong>{entries.length - due}</strong><span>scheduled for later</span></div>
        </div>
        <p className="meta">A missed retry is due immediately. Successful corrections return after 1, 3, 7, then 14 days. Saving a note does not mark a task correct.</p>
      </section>
      {entries.length === 0 ? (
        <section className="card notebook-empty">
          <h3>A clean page. A useful next step.</h3>
          <p>Complete a scored practice session. Any missed practice-bank tasks will appear here with feedback and a place to capture what you learned.</p>
          <button type="button" className="btn btn-primary" onClick={() => onNavigate('practice')}>Find a practice session</button>
        </section>
      ) : <>
        <div className="notebook-toolbar">
          <label>Search mistakes<input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setLimit(12); }} placeholder="Task or feedback…" /></label>
          <label>Skill<select value={subtest} onChange={(event) => { setSubtest(event.target.value); setLimit(12); }}><option value="all">All four skills</option>{(['listening', 'reading', 'writing', 'speaking'] as OetSubtest[]).map((skill) => <option key={skill} value={skill}>{skill[0].toUpperCase() + skill.slice(1)}</option>)}</select></label>
          <label>Review status<select value={status} onChange={(event) => { setStatus(event.target.value); setLimit(12); }}><option value="all">All mistakes</option><option value="due">Due now</option><option value="scheduled">Scheduled</option></select></label>
          <button type="button" className="btn btn-primary" disabled={visibleDue.length === 0} onClick={() => startReview(visibleDue.map((entry) => entry.canonicalId))}>Review due selection ({visibleDue.length})</button>
        </div>
        <p className="meta" role="status">{notice || `${visible.length} matching task${visible.length === 1 ? '' : 's'} · Review sets contain up to 8 tasks.`}</p>
        {visible.length === 0 && <div className="card notebook-empty"><h3>No mistakes match these filters</h3><button className="btn btn-secondary" type="button" onClick={() => { setSearch(''); setStatus('all'); setSubtest('all'); }}>Clear filters</button></div>}
        <div className="notebook-grid">{visible.slice(0, limit).map((entry) => <MistakeCard key={entry.canonicalId} entry={entry} onReview={() => startReview([entry.canonicalId])} />)}</div>
        {visible.length > limit && <button className="btn btn-secondary" type="button" onClick={() => setLimit(limit + 12)}>Show more mistakes</button>}
      </>}
    </div>
  );
}
