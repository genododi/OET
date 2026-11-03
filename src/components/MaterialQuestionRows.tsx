import { useRef, useState } from 'react';
import { ReadingEvidenceLocate } from './ReadingEvidence';
import { MaterialSourceText } from './MaterialSourceText';
import { materialOriginal, materialUrl, type MaterialDocument, type MaterialUnit } from '../lib/materialPractice';
import type { OetSubtest } from '../types';

function read(key: string): Record<string, string> {
  try { return Object.fromEntries(Object.entries(JSON.parse(localStorage.getItem(key) || '{}')).filter((pair): pair is [string, string] => typeof pair[1] === 'string')); } catch { return {}; }
}

/** Uses the same printed-paper flow and adjacent controls as the curated collections. */
export function MaterialQuestionRows({ unit, source, skill, onAnswers }: { unit: MaterialUnit; source: MaterialDocument; skill: OetSubtest; onAnswers: (value: string) => void }) {
  const storageKey = `oet-material-answers-v1:${source.sha256}:${skill}:${unit.id}`;
  const [responses, setResponses] = useState(() => read(storageKey));
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [error, setError] = useState(false);
  const root = useRef<HTMLElement>(null);
  const questions = unit.questions;
  const revealable = questions.filter(q => q.answer);
  const all = revealable.length > 0 && revealable.every(q => revealed[String(q.number)]);
  const answered = questions.filter(q => responses[String(q.number)]?.trim()).length;
  const pages = [...new Set(questions.map(q => q.sourcePage))];
  const focus = (number: number) => {
    const field = root.current?.querySelector<HTMLElement>(`[data-answer-number="${number}"]`);
    field?.focus({ preventScroll: true }); field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const answer = (number: number, value: string) => {
    const next = { ...responses, [String(number)]: value }; setResponses(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setError(false); } catch { setError(true); }
    onAnswers(questions.map(q => `${q.number}. ${next[String(q.number)] ?? ''}`).join('\n'));
  };
  return <section ref={root} className={`card material-questions ${skill === 'listening' ? 'jahshan-listening-worksheet' : 'reading-worksheet'}`} aria-label="Questions and answers for the selected task">
    <header className="jahshan-worksheet-heading"><div><h3>{skill === 'listening' ? '3 · Fill the blanks and check answers' : '3 · Record your answers and review'}</h3><p>{skill === 'listening' ? 'Complete each gap as you listen, then compare with its supplied printed key.' : 'Read the complete text beside these questions. Your answer and printed key stay with the question.'}</p></div>{unit.part && <span className="jahshan-part-badge">Part {unit.part}</span>}</header>
    <div className="jahshan-worksheet-toolbar"><div className="jahshan-answer-progress"><strong>{answered} of {questions.length} answered</strong><progress aria-label="Questions answered" value={answered} max={questions.length} /></div><button className="btn btn-secondary" disabled={answered === questions.length} onClick={() => { const next = questions.find(q => !responses[String(q.number)]?.trim()); if (next) focus(next.number); }}>Next unanswered ↓</button>{revealable.length > 0 && <button className="btn btn-secondary" aria-pressed={all} onClick={() => setRevealed(current => ({ ...current, ...Object.fromEntries(revealable.map(q => [String(q.number), !all])) }))}>{all ? 'Hide all' : 'Reveal all'}</button>}</div>
    {pages.length > 1 && <nav className="jahshan-question-jumps" aria-label="Jump to question group">{pages.map(page => <button key={page} onClick={() => focus(questions.find(q => q.sourcePage === page)!.number)}>Page {page}</button>)}</nav>}
    <div className={skill === 'reading' ? 'reading-question-scroll' : 'jahshan-worksheet-pages'}>{pages.map(page => <section className="jahshan-question-paper" key={page}>
      <header className="jahshan-paper-heading"><h4>{unit.part ? `Part ${unit.part} · ` : ''}Questions {questions.filter(q => q.sourcePage === page).map(q => q.number).join(', ')}</h4><span className="meta">Source page {page}</span></header>
      <div className="jahshan-choice-flow">{questions.filter(q => q.sourcePage === page).map(question => {
        const id = `material-q-${unit.id}-${question.number}`, key = question.answer, visible = !!revealed[String(question.number)];
        const blank = !question.choices.length && question.kind === 'blank' ? /_{2,}|\.{3,}|…+/.exec(question.prompt) : null;
        const field = question.choices.length ? <select id={id} data-answer-number={question.number} value={responses[String(question.number)] ?? ''} aria-describedby={`${id}-prompt`} onChange={event => answer(question.number, event.target.value)}><option value="">Choose…</option>{question.choices.map(choice => <option key={choice}>{choice}</option>)}{responses[String(question.number)] && !question.choices.includes(responses[String(question.number)]) && <option>{responses[String(question.number)]}</option>}</select> : <input id={id} data-answer-number={question.number} autoComplete="off" aria-describedby={`${id}-prompt`} placeholder="Your answer" value={responses[String(question.number)] ?? ''} onChange={event => answer(question.number, event.target.value)} />;
        const reveal = key && <button className="btn btn-secondary" aria-label={`${visible ? 'Hide' : 'Show'} answer for Question ${question.number}`} aria-expanded={visible} aria-controls={`${id}-answer`} onClick={() => setRevealed(current => ({ ...current, [String(question.number)]: !visible }))}>{visible ? 'Hide answer' : 'Show answer'}</button>;
        return <article className="jahshan-blank material-paper-question" key={question.number} aria-label={`Question ${question.number}`}>
          <label htmlFor={id}>Question {question.number}</label>
          {blank ? <div className="jahshan-question-text material-inline-prompt" id={`${id}-prompt`}><span>{question.prompt.slice(0, blank.index)}</span><span className="jahshan-blank-controls material-inline-controls">{field}{reveal}</span><span>{question.prompt.slice(blank.index + blank[0].length)}</span></div> : <><div id={`${id}-prompt`} className="jahshan-question-text">{question.prompt}</div><div className="jahshan-blank-controls">{field}{reveal}</div></>}
          {!key && <p className="meta">No matched printed answer was supplied for this question.</p>}
          {visible && key && <div id={`${id}-answer`} className="jahshan-inline-key reading-revealed">{key.text ? <><strong>Printed answer:</strong> {key.text}</> : <><strong>Printed key · Question {question.number}</strong><p>Find this question number on the original key below. A text answer has not been verified.</p>{key.source.textPath && <MaterialSourceText id={`${id}-key`} filename={key.source.filename} format={key.source.format} textPath={key.source.textPath} assetPath={key.source.sha256 ? materialOriginal(key.source as MaterialDocument) : materialUrl(key.source.assetPath)} pageNumbers={[key.page]} defaultAll heading="Printed answer page" />}</>}<a href={`${key.source.sha256 ? materialOriginal(key.source as MaterialDocument) : materialUrl(key.source.assetPath)}#page=${key.page}`} target="_blank" rel="noopener noreferrer">Check the original answer key · page {key.page} ↗</a></div>}
          {skill === 'reading' && <ReadingEvidenceLocate id={String(question.number)} />}
          <a className="reading-source-page" href={`${materialOriginal(source)}#page=${question.sourcePage}`} target="_blank" rel="noopener noreferrer">Original question · page {question.sourcePage} ↗</a>
        </article>;
      })}</div>
    </section>)}</div>
    <p className="meta">Printed numbering and supplied wording retained. Revealing an answer never replaces your attempt.</p>{error && <p role="alert">Storage is unavailable. Copy your answers before leaving.</p>}
  </section>;
}
