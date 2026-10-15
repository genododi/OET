import { useRef, useState } from 'react';
import answerKeys from '../data/jahshanListeningAnswers.json';
import printedQuestions from '../data/jahshanListeningQuestions.json';
type ContentNode = { text: string; sourcePage: number; questionId?: string };
type Question = (typeof answerKeys.worksheets)[number]['parts'][number]['questions'][number];
import './jahshanListening.css';

interface Props { trackId: string; bookUrl?: string; onOpenKey: (page: number) => void; onPartChange?: (part: 'A' | 'B' | 'C') => void }
function readResponses(key: string): Record<string, string> {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? '{}');
    return Object.fromEntries(Object.entries(value ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
  } catch { return {}; }
}

// A track change remounts this form: reveals never leak into the next recording.
export function JahshanListeningWorksheet(props: Props) {
  return <TrackWorksheet key={props.trackId} {...props} />;
}
function TrackWorksheet({ trackId, bookUrl, onOpenKey, onPartChange }: Props) {
  const worksheetRef = useRef<HTMLElement>(null);
  const sheet = answerKeys.worksheets.find(item => item.trackId === trackId);
  const storageKey = `oet-jahshan-listening-blanks-v1-${trackId}`;
  const [part, setPart] = useState<'A' | 'B' | 'C'>((sheet?.parts[0].part as 'A' | 'B' | 'C' | undefined) ?? 'A');
  const [responses, setResponses] = useState(() => readResponses(storageKey));
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [saveError, setSaveError] = useState(false);
  const section = sheet?.parts.find(item => item.part === part);
  const printed = printedQuestions.worksheets.find(item => item.trackId === trackId)?.parts.find(item => item.part === part);
  const content: ContentNode[] = printed?.content ?? [];
  const sourcePages = [...new Set(content.map(node => node.sourcePage))];
  if (!sheet || !section) return <section className="card"><p>A matched answer worksheet is not available for this recording.</p></section>;
  const update = (id: string, value: string) => {
    const next = { ...responses, [id]: value }; setResponses(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setSaveError(false); } catch { setSaveError(true); }
  };
  const exportText = sheet.parts.map(section => `Part ${section.part}\n${section.questions.map(question => `${question.extract ? `Extract ${question.extract}, ` : ''}${question.number}. ${responses[question.id] ?? ''}`).join('\n')}`).join('\n\n');
  const answered = section.questions.filter(question => responses[question.id]?.trim()).length;
  const allRevealed = section.questions.every(question => revealed[question.id]);
  const revealAll = () => setRevealed(Object.fromEntries(section.questions.map(question => [question.id, !allRevealed])));
  const focusNextUnanswered = () => {
    const next = section.questions.find(question => !responses[question.id]?.trim());
    if (!next) return;
    const input = worksheetRef.current?.querySelector<HTMLElement>(`#jahshan-blank-${next.id}`);
    input?.focus({ preventScroll: true });
    input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const renderQuestion = (question: Question, inline = false, prompt = '') => {
        const label = `${question.extract ? `Extract ${question.extract} · ` : ''}Question ${question.number}`;
        const id = `jahshan-blank-${question.id}`;
        return <div className={`jahshan-blank ${inline ? 'jahshan-inline-blank' : ''}`} key={question.id}>
          <label className={inline ? 'jahshan-visually-hidden' : undefined} htmlFor={id}>{label}</label>
          {inline && <span className="jahshan-blank-number" aria-hidden="true">{question.number}</span>}
          {prompt && <p className="jahshan-question-text" id={`${id}-prompt`}>{prompt}</p>}
          <div className="jahshan-blank-controls">
            {part === 'A' ? <input aria-describedby={prompt ? `${id}-prompt` : undefined} id={id} value={responses[question.id] ?? ''} onChange={event => update(question.id, event.target.value)} autoComplete="off" placeholder="Your answer" /> : <select aria-describedby={prompt ? `${id}-prompt` : undefined} id={id} value={responses[question.id] ?? ''} onChange={event => update(question.id, event.target.value)}><option value="">Choose…</option>{['A', 'B', 'C'].map(choice => <option key={choice}>{choice}</option>)}</select>}
            <button className="btn btn-secondary" aria-label={`${revealed[question.id] ? 'Hide' : 'Show'} answer for ${label}`} aria-expanded={Boolean(revealed[question.id])} aria-controls={`${id}-key`} onClick={() => setRevealed(previous => ({ ...previous, [question.id]: !previous[question.id] }))}>{inline ? revealed[question.id] ? 'Hide' : 'Show' : revealed[question.id] ? 'Hide answer' : 'Show answer'}</button>
          </div>
          {revealed[question.id] && <div id={`${id}-key`} className="jahshan-inline-key">
            <p><strong>{question.answer ? 'Printed answer: ' : 'Answer unavailable: '}</strong><span>{question.answer ?? 'The supplied key does not provide an answer for this blank.'}</span></p>
            {question.note && <p className="meta">{question.note}</p>}
            <button className="btn btn-ghost" onClick={() => onOpenKey(question.keyPage)}>View printed key · page {question.keyPage}</button>
            {bookUrl && <a href={`${bookUrl}#page=${question.keyPage}`} target="_blank" rel="noopener noreferrer">Open key separately ↗</a>}
          </div>}
        </div>;
  };
  // MCQ wording and all three options stay immediately above their response.
  // Part A retains the full notes, with a field inserted at each printed gap.
  const rows: { questionId?: string; text: string; sourcePage: number }[] = [];
  for (const node of content) {
    if (node.questionId) rows.push({ questionId: node.questionId, text: '', sourcePage: node.sourcePage });
    else {
      const introStart = node.text.search(/(?:^|\n)(?:Now look at extract two|Extract 2[:.]|E2 Language Listening Part C|C\d+\.2|Part C\.2)/i);
      if (rows.length && introStart < 0) rows[rows.length - 1].text += node.text + '\n';
      else if (rows.length && introStart >= 0) {
        rows[rows.length - 1].text += node.text.slice(0, introStart);
        rows.push({ text: node.text.slice(introStart), sourcePage: node.sourcePage });
      } else rows.push({ text: node.text, sourcePage: node.sourcePage });
    }
  }
  const blocks = sourcePages.map(page => {
    const nodes = (printed?.inline ? content : rows).filter(node => node.sourcePage === page);
    const questions = section.questions.filter(question => nodes.some(node => node.questionId === question.id));
    const rangeLabel = (items: Question[]) => {
      const first = items[0];
      const last = items[items.length - 1];
      return first ? `Question${items.length > 1 ? 's' : ''} ${first.number}${last !== first ? `–${last.number}` : ''}` : 'Instructions';
    };
    const extracts = [...new Set(questions.map(question => question.extract).filter(Boolean))];
    const title = extracts.length > 1
      ? extracts.map(extract => `Extract ${extract} · ${rangeLabel(questions.filter(question => question.extract === extract))}`).join(' / ')
      : rangeLabel(questions);
    return { page, nodes, title, extracts };
  }).filter(block => block.nodes.length > 0);
  return <section ref={worksheetRef} className="card jahshan-listening-worksheet" aria-label="Listening answer worksheet">
    <header className="jahshan-worksheet-heading">
      <div><h3>3 · Fill the blanks and check answers</h3>
        <p>Part {part} · {part === 'A' ? 'Complete the notes as you listen.' : 'Read each question and choose A, B or C.'} Reveal answers individually or together.</p></div>
      <span className="jahshan-part-badge">Part {part}</span>
    </header>
    {sheet.parts.length > 1 && <div className="study-skill-tabs" role="group" aria-label="Listening worksheet part">{sheet.parts.map(section => <button key={section.part} aria-pressed={section.part === part} onClick={() => { const nextPart = section.part as 'A' | 'B' | 'C'; setPart(nextPart); onPartChange?.(nextPart); setRevealed({}); }}>Part {section.part}</button>)}</div>}
    <div className="jahshan-worksheet-toolbar">
      <div className="jahshan-answer-progress"><strong>{answered} of {section.questions.length} answered</strong><progress aria-label="Questions answered" value={answered} max={section.questions.length} /></div>
      <button className="btn btn-secondary" disabled={answered === section.questions.length} onClick={focusNextUnanswered}>Next unanswered ↓</button>
      <button className="btn btn-secondary" aria-pressed={allRevealed} onClick={revealAll}>{allRevealed ? 'Hide all' : 'Reveal all'}</button>
    </div>
    {blocks.length > 1 && <nav className="jahshan-question-jumps" aria-label="Jump to listening questions">
      {blocks.map(block => <button key={block.page} onClick={() => {
        const target = worksheetRef.current?.querySelector<HTMLElement>(`#jahshan-question-page-${part}-${block.page}`);
        target?.focus({ preventScroll: true }); target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }}>{block.extracts.length === 1 ? `Extract ${block.extracts[0]} · ` : ''}{block.title}</button>)}
    </nav>}
    <div className="jahshan-worksheet-pages">
      {printed ? blocks.map(block => <section className="jahshan-question-paper" key={block.page} aria-labelledby={`jahshan-question-page-${part}-${block.page}`}>
        <header className="jahshan-paper-heading">
          <h4 tabIndex={-1} id={`jahshan-question-page-${part}-${block.page}`}>{block.extracts.length === 1 && <span>Extract {block.extracts[0]}</span>}{block.title}</h4>
          <span className="meta">Book page {block.page}</span>
        </header>
        <div className={printed.inline ? 'jahshan-notes-flow' : 'jahshan-choice-flow'}>
          {block.nodes.map((node, index) => {
            const question = section.questions.find(question => question.id === node.questionId);
            return question ? renderQuestion(question, printed.inline, printed.inline ? '' : node.text.trim())
              : printed.inline ? <span className="jahshan-paper-text" key={`text-${index}`}>{node.text}{' '}</span>
                : <p className="jahshan-question-text jahshan-question-instructions" key={`intro-${index}`}>{node.text}</p>;
          })}
        </div>
      </section>) : <div className="jahshan-question-paper">{section.questions.map(question => renderQuestion(question))}</div>}
    </div>
    <footer className="jahshan-worksheet-footer">
      <div><p className="meta" role={saveError ? 'alert' : undefined}>{saveError ? 'Your browser could not save these answers. Download them before leaving.' : 'Saved in this browser for this recording.'}</p>
        <p className="meta">Revealing a key keeps your answer unchanged. Keys are hidden again when you change recordings.</p>
        {printed?.ocr && <p className="meta">Questions extracted from scanned pages. Refer to the original if any text is unclear.</p>}
      </div>
      <a className="btn btn-secondary" href={`data:text/plain;charset=utf-8,${encodeURIComponent(exportText)}`} download={`jahshan-listening-${sheet.setNumber}-${trackId}-responses.txt`}>Download my responses</a>
    </footer>
  </section>;
}
