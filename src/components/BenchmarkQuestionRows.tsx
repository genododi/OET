import { useRef, useState } from 'react';

export type BenchmarkQuestion = { part: string; number: number; prompt: string; group: string; sourcePage: number; numberingNote?: string; sourceNote?: string; choices?: string[] };
export type BenchmarkSheet = { testId: string; sourceSha256: string; questions: BenchmarkQuestion[]; notes: { group: string; content: { text?: string; number?: number }[] }[]; readingParts: Record<string, { number: number; text: string }[]> };
type Props = {
  entry: { id: string; skill: string; assetPath: string; answers?: Record<string, string> };
  part: string;
  sheet: BenchmarkSheet | null;
  failed: boolean;
  responses: Record<string, string>;
  onAnswer: (id: string, value: string) => void;
};

export function BenchmarkQuestionRows(props: Props) {
  return <QuestionList key={`${props.entry.id}-${props.part}`} {...props} />;
}
function QuestionList({ entry, part, sheet, failed, responses, onAnswer }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  if (failed) return <p role="alert">The questions could not load. Reload to try again, or use the original paper. Your saved answers are unchanged.</p>;
  if (!sheet) return <p role="status">Loading questions and answer fields…</p>;
  const listening = entry.skill === 'listening';
  const visible = sheet.questions.filter(question => question.part === part);
  const answered = visible.filter(q => responses[`${part}-${q.number}`]?.trim()).length;
  const revealable = visible.filter(q => listening && entry.answers?.[String(q.number)]);
  const allRevealed = revealable.length > 0 && revealable.every(q => revealed[`${part}-${q.number}`]);
  const revealAll = () => setRevealed(current => ({ ...current, ...Object.fromEntries(revealable.map(q => [`${part}-${q.number}`, !allRevealed])) }));
  const groups = [...new Set(visible.map(q => q.group))];
  const focus = (element: HTMLElement | null | undefined) => { element?.focus({ preventScroll: true }); element?.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
  const controls = (question: BenchmarkQuestion, inline = false) => {
    const n = question.number, id = `${part}-${n}`, inputId = `benchmark-${id}`;
    const answer = listening ? entry.answers?.[String(n)] : undefined;
    return <div className={inline ? 'jahshan-blank jahshan-inline-blank' : 'benchmark-question-answer'}>
      {inline && <><label className="jahshan-visually-hidden" htmlFor={inputId}>Question {n}</label><span className="jahshan-blank-number" aria-hidden="true">{n}</span></>}
      <div className="jahshan-blank-controls">
        {part === 'A' ? <input id={inputId} aria-describedby={`${inputId}-prompt`} value={responses[id] ?? ''} onChange={e => onAnswer(id, e.target.value)} placeholder="Your answer" autoComplete="off" /> : <select id={inputId} aria-describedby={`${inputId}-prompt`} value={responses[id] ?? ''} onChange={e => onAnswer(id, e.target.value)}><option value="">Choose…</option>{question.choices?.map(choice => <option key={choice}>{choice}</option>)}{responses[id] && !question.choices?.includes(responses[id]) && <option value={responses[id]}>Saved answer: {responses[id]}</option>}</select>}
        {answer && <button className="btn btn-secondary" aria-label={`${revealed[id] ? 'Hide' : 'Show'} answer for Question ${n}`} aria-expanded={!!revealed[id]} aria-controls={`${inputId}-key`} onClick={() => setRevealed(current => ({ ...current, [id]: !current[id] }))}>{inline ? revealed[id] ? 'Hide' : 'Show' : revealed[id] ? 'Hide answer' : 'Show answer'}</button>}
      </div>
      {revealed[id] && answer && <div id={`${inputId}-key`} className="jahshan-inline-key"><strong>Printed answer:</strong> {answer}</div>}
    </div>;
  };
  return <div ref={root} className="benchmark-question-list">
    <div className="jahshan-worksheet-toolbar"><div className="jahshan-answer-progress"><strong>{answered} of {visible.length} answered</strong><progress aria-label="Questions answered" value={answered} max={visible.length} /></div><button className="btn btn-secondary" disabled={answered === visible.length} onClick={() => { const next = visible.find(q => !responses[`${part}-${q.number}`]?.trim()); if (next) focus(root.current?.querySelector(`#benchmark-${part}-${next.number}`)); }}>Next unanswered ↓</button>{revealable.length > 0 && <button className="btn btn-secondary" aria-pressed={allRevealed} onClick={revealAll}>{allRevealed ? 'Hide all' : 'Reveal all'}</button>}</div>
    <nav className="jahshan-question-jumps" aria-label="Jump to question group">{groups.map((group, index) => <button key={group} onClick={() => focus(root.current?.querySelector(`#benchmark-group-${part}-${index}`))}>{group}</button>)}</nav>
    <div className={listening ? 'jahshan-worksheet-pages' : 'reading-question-scroll'}>
      {groups.map((group, index) => <section className="jahshan-question-paper" key={group}>
        <header className="jahshan-paper-heading"><h4 tabIndex={-1} id={`benchmark-group-${part}-${index}`}>{group}</h4><span className="meta">Part {part}</span></header>
        {listening && part === 'A' ? <div className="jahshan-notes-flow">{sheet.notes.find(note => note.group === group)?.content.map((node, i) => {
          const question = visible.find(q => q.number === node.number);
          return question ? <div className="benchmark-inline-question" key={`q-${question.number}`} role="group" aria-label={`Part A · Question ${question.number}`}><span className="jahshan-visually-hidden" id={`benchmark-A-${question.number}-prompt`}>{question.prompt}</span>{controls(question, true)}</div> : <span key={`text-${i}`} className="jahshan-paper-text">{node.text}{' '}</span>;
        })}</div> : <div className="jahshan-choice-flow">{visible.filter(q => q.group === group).map(question => <article className="jahshan-blank benchmark-question-row" key={question.number} aria-label={`Part ${part} · Question ${question.number}`}>
          <label htmlFor={`benchmark-${part}-${question.number}`}>Question {question.number}</label>
          <div id={`benchmark-${part}-${question.number}-prompt`} className="jahshan-question-text">{question.prompt}</div>
          {question.sourceNote && <p className="meta">{question.sourceNote}</p>}{question.numberingNote && <p className="meta">{question.numberingNote}</p>}
          {controls(question)}
          <a className="benchmark-question-source" href={`${import.meta.env.BASE_URL}${entry.assetPath}#page=${question.sourcePage}`} target="_blank" rel="noopener noreferrer">Original question · page {question.sourcePage} ↗</a>
        </article>)}</div>}
      </section>)}
    </div>
  </div>;
}
