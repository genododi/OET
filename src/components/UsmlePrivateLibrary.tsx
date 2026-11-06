import { useState } from 'react';
import { MaterialDone, CompletionFilter } from './MaterialDone';
import { useMaterialCompletion } from '../lib/materialCompletion';
import type { PrivateUsmleLibrary, PrivateUsmleQuestion } from '../types/usmleLibrary';
import type { PrivateStudyProgress, PrivateQuestionProgress } from '../lib/usmleLibrary';
import type { UsmleStep } from '../types/usmle';
import { UsmleSourceImages } from './UsmleSourceImages';
import { newestUsmleFirst, privateUsmleUrl } from '../lib/usmleLibrary';

export function UsmlePrivateLibrary({ library, progress, onChange, reviewing = false }: {
  library: PrivateUsmleLibrary; progress: PrivateStudyProgress; onChange: (id: string, value: PrivateQuestionProgress) => void; reviewing?: boolean;
}) {
  const [step, setStep] = useState(''), [subject, setSubject] = useState(''), [search, setSearch] = useState('');
  const [year, setYear] = useState('');
  const [source, setSource] = useState('');
  const [sourceCompletion, setSourceCompletion] = useState('all');
  const { isDone } = useMaterialCompletion();
  const years = [...new Set(library.questions.flatMap(q => q.productionYear ? [q.productionYear] : []))].sort((a,b) => b-a);
  const [reviewFilter, setReviewFilter] = useState(reviewing ? 'needs-review' : 'all');
  const [selected, setSelected] = useState<string | null>(null), [page, setPage] = useState(0);
  const subjects = [...new Set(library.questions.map(question => question.subject).filter(Boolean))].sort() as string[];
  const sources = [...new Map([...library.resources.map(resource => [resource.id, resource.name] as const), ...library.questions.map(question => [question.sourceId, question.sourceName] as const)]).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const selectedSource = library.resources.find(resource => resource.id === source || resource.sha256 === source);
  const filtered = newestUsmleFirst(library.questions).filter(question => {
    const saved = progress[question.id] ?? {}, effectiveStep = saved.step ?? question.step;
    return (!source || question.sourceId === source) && (!year || (year === 'unknown' ? !question.productionYear : question.productionYear === Number(year))) && (!step || (step === 'unassigned' ? !effectiveStep : effectiveStep === step)) && (!subject || question.subject === subject)
      && (!search || `${question.prompt} ${question.sourceName} ${question.block ?? ''} ${question.number ?? ''}`.toLowerCase().includes(search.toLowerCase()))
      && (reviewFilter === 'all' || reviewFilter === 'unseen' && !(saved.reviewed ?? saved.revealed) || reviewFilter === 'flagged' && saved.flagged || reviewFilter === 'needs-review' && (saved.flagged || (saved.reviewed ?? saved.revealed) && saved.answer !== question.key));
  });
  const safePage = Math.min(page, Math.max(0, Math.ceil(filtered.length / 15) - 1));
  const visible = filtered.slice(safePage * 15, safePage * 15 + 15);
  const question = filtered.find(item => item.id === selected) ?? visible[0];
  const reset = () => { setPage(0); setSelected(null); };
  return <section className="usmle-private-library">
    <div className="card usmle-library-filters"><h3>{reviewing ? 'Review mistakes and flagged questions' : 'Your question library'}</h3>
      <div className="usmle-filter-grid">
        <label>Step<select value={step} onChange={event => { setStep(event.target.value); reset(); }}><option value="">All steps</option><option value="step1">Step 1</option><option value="step2">Step 2 CK</option><option value="unassigned">Step unassigned</option></select></label>
        <label>Production year / edition<select value={year} onChange={event => { setYear(event.target.value); reset(); }}><option value="">All years · newest first</option>{years.map(value => <option key={value} value={value}>{value}</option>)}<option value="unknown">Year not stated</option></select></label>
        <label>Subject<select value={subject} onChange={event => { setSubject(event.target.value); reset(); }}><option value="">All subjects</option>{subjects.map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Question bank / source<select value={source} onChange={event => { setSource(event.target.value); reset(); }}><option value="">All sources</option>{sources.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label>Review status<select value={reviewFilter} onChange={event => { setReviewFilter(event.target.value); reset(); }}><option value="all">All questions</option><option value="unseen">Not reviewed</option><option value="needs-review">Incorrect or flagged</option><option value="flagged">Flagged</option></select></label>
        <label>Find a question<input type="search" value={search} placeholder="Topic, block or source file" onChange={event => { setSearch(event.target.value); reset(); }} /></label>
      </div><p className="meta">{filtered.length} questions match · newest source-labelled edition first. Source deck Step/subject labels may be inferred; you can change a question’s Step for your own profile.</p>
    </div>
    {selectedSource?.asset && <section className="card usmle-selected-source"><h3>{selectedSource.name}</h3><p>{selectedSource.pageCount ? `${selectedSource.pageCount} original pages · ` : ''}{selectedSource.sourceGroup === 'GENODODI Telegram folder' ? 'Shared Telegram block' : selectedSource.publicSharing ? 'Shared study source' : 'Local source PDF'}</p><a className="btn btn-secondary" href={privateUsmleUrl(selectedSource.asset)} target="_blank" rel="noreferrer">Open complete original PDF ↗</a>{selectedSource.questionBoundaryReview && <p className="usmle-quality-note">The complete original is ready. Its recognised question boundaries need review, so uncertain question/explanation pairings are withheld.</p>}</section>}
    <div className="usmle-library-columns"><aside className="card usmle-question-list" aria-label="Matching questions">
      {!visible.length && <p>No structured questions match. Use the selected original PDF above, or change the filters.</p>}
      {visible.map(item => <button type="button" key={item.id} className={item.id === question?.id ? 'selected' : ''} onClick={() => setSelected(item.id)}><strong>Block {item.block ?? '—'} · Q{item.number ?? '—'} {progress[item.id]?.flagged ? '★' : ''}</strong><span>{item.prompt.slice(0, 125) || 'Source review card'}</span><small>{item.productionYear ?? 'Year not stated'} · {item.subject ?? 'Subject unassigned'}{item.reviewOnly ? ' · Review only' : ''}</small></button>)}
      <div className="usmle-pagination"><button className="btn btn-secondary btn-sm" disabled={safePage === 0} onClick={() => { setPage(safePage - 1); setSelected(null); }}>Previous</button><span>{safePage + 1} / {Math.max(1, Math.ceil(filtered.length / 15))}</span><button className="btn btn-secondary btn-sm" disabled={(safePage + 1) * 15 >= filtered.length} onClick={() => { setPage(safePage + 1); setSelected(null); }}>Next</button></div>
    </aside>{question && <Question key={question.id} question={question} saved={progress[question.id] ?? {}} onChange={value => onChange(question.id, value)} />}</div>
    {!reviewing && <section className="card usmle-document-list"><h3>Your source PDFs</h3><p className="meta">Shared original PDFs are publicly downloadable from GitHub and saved on the Mac for offline use. Each scan retains its source pages and worked explanations.</p><CompletionFilter value={sourceCompletion} onChange={setSourceCompletion} />{newestUsmleFirst(library.resources.filter(resource => resource.kind === 'pdf' && resource.asset && (!source || resource.sha256 === source) && (sourceCompletion === 'undone' ? !isDone(resource.sha256) : sourceCompletion === 'done' ? isDone(resource.sha256) : true))).map(resource => <div className="material-completion-toolbar" key={resource.id}><a href={privateUsmleUrl(resource.asset!)} target="_blank" rel="noreferrer">{resource.name} <small>{resource.productionYear ?? 'Year not stated'}{resource.publicSharing ? ' · Shared study source' : ' · Local import'}</small> <span>Open PDF ↗</span></a><MaterialDone fileId={resource.sha256} filename={resource.name} /></div>)}</section>}
  </section>;
}

function Question({ question, saved, onChange }: { question: PrivateUsmleQuestion; saved: PrivateQuestionProgress; onChange: (value: PrivateQuestionProgress) => void }) {
  const update = (change: PrivateQuestionProgress) => onChange({ ...saved, ...change });
  return <article className="card usmle-study-question" aria-label="Selected study question">
    <header><p className="eyebrow">{saved.step ?? question.step ?? 'Step unassigned'} · {question.subject ?? 'Subject unassigned'}</p><h3>Block {question.block ?? '—'} · Question {question.number ?? '—'}</h3><button type="button" className="btn btn-secondary btn-sm" aria-pressed={!!saved.flagged} onClick={() => update({ flagged: !saved.flagged })}>{saved.flagged ? '★ Flagged' : '☆ Flag for review'}</button></header>
    <p className="meta">{question.sourceName} · {question.classification} · {question.productionYear ? `Source-labelled edition: ${question.productionYear}` : 'Production year not stated'}</p>{!!question.yearEvidence?.length && <details className="usmle-year-evidence"><summary>Year provenance</summary><ul>{question.yearEvidence.map(item => <li key={item}>{item}</li>)}</ul><p>Edition labels come from the supplied filename or explicit source tag. They are not independently verified publication dates. Download and import dates are never used as production years.</p></details>}
    {question.sourceOrigin && <p className="usmle-quality-note" role="note">{question.sourceOrigin === 'generated' ? 'Generated practice from the source publisher' : 'Source-authored practice'} · These are practice exercises, not official USMLE exam items. {question.sourceAttribution} · {question.sourceLicense}. {question.sourceUrl?.startsWith('https://') && <a href={question.sourceUrl} target="_blank" rel="noreferrer">Original source and licence ↗</a>}</p>}
    <label className="usmle-step-assignment">My Step label<select value={saved.step ?? question.step ?? ''} onChange={event => update({ step: event.target.value ? event.target.value as UsmleStep : undefined })}><option value="">Use source label / unassigned</option><option value="step1">Step 1</option><option value="step2">Step 2 CK</option></select></label>
    {question.reviewOnly && <p role="note" className="usmle-quality-note">Review-only source card. A complete question or explicit letter key is missing, so this card is excluded from scored blocks. You can still choose an answer, reveal the source explanation and record your revision notes.</p>}
    <div className="usmle-readable-text">{question.prompt || 'Read the question source images below.'}</div>
    <UsmleSourceImages images={question.questionImages} label="Clinical exhibits and original question" />
    {question.originalAsset && <p><a href={`${privateUsmleUrl(question.originalAsset)}#page=${question.questionPages?.[0] ?? 1}`} target="_blank" rel="noreferrer">Open complete original block PDF ↗</a></p>}
    <fieldset className="usmle-study-options"><legend>Choose your answer</legend>{question.options.map(option => <label key={option.id} className={saved.revealed && question.key && option.correct ? 'correct' : saved.revealed && question.key && saved.answer === option.id ? 'incorrect' : ''}><input type="radio" name={question.id} value={option.id} checked={saved.answer === option.id} disabled={!!saved.revealed} onChange={() => update({ answer: option.id })} /><span><strong>{option.id}.</strong> {option.label}</span></label>)}</fieldset>
    <div className="usmle-actions"><button type="button" className="btn btn-primary" aria-expanded={!!saved.revealed} onClick={() => update({ revealed: !saved.revealed, reviewed: true })}>{saved.revealed ? 'Hide answer' : 'Reveal answer and explanation'}</button>{saved.revealed && <button type="button" className="btn btn-secondary" onClick={() => update({ answer: undefined, revealed: false, reviewed: false })}>Try again</button>}</div>
    {saved.revealed && <section className="usmle-answer-box" aria-label="Printed answer and explanation"><h4>{question.key ? `${question.sourceKeyReference ? 'Source-matched answer' : question.sourceOrigin ? 'Source answer' : 'Printed key'}: ${question.key}` : 'Original answer source'}</h4>{saved.answer && <p>{question.key ? (saved.answer === question.key ? 'Your answer is correct.' : `Your answer: ${saved.answer}. Review the source explanation.`) : `Your selection: ${saved.answer}. No confirmed letter key is supplied; review the original worked explanation.`}</p>}<div className="usmle-readable-text">{question.explanation || 'A readable explanation was not supplied. Review the original answer images.'}</div>{question.answerProvenance && <p className="meta">{question.answerProvenance}</p>}{question.originalAsset && !!question.answerPages?.length && <p><a href={`${privateUsmleUrl(question.originalAsset)}#page=${question.answerPages[0]}`} target="_blank" rel="noreferrer">Original worked explanation · page {question.answerPages[0]} ↗</a></p>}<UsmleSourceImages images={question.answerImages} label="Original answer pages" />{question.sourceNote && <p className="meta usmle-readable-text">{question.sourceNote}</p>}</section>}
    <label className="usmle-review-note">My revision notes<textarea rows={3} value={saved.note ?? ''} onChange={event => update({ note: event.target.value })} placeholder="Why I missed it, key clue, next review…" /></label>
  </article>;
}
