import { useState } from 'react';
import answerKeys from '../data/jahshanListeningAnswers.json';
import printedQuestions from '../data/jahshanListeningQuestions.json';
type ContentNode = { text: string; sourcePage: number; questionId?: string };
type Question = (typeof answerKeys.worksheets)[number]['parts'][number]['questions'][number];
import './jahshanListening.css';

interface Props { trackId: string; bookUrl?: string; onOpenKey: (page: number) => void }
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
function TrackWorksheet({ trackId, bookUrl, onOpenKey }: Props) {
  const sheet = answerKeys.worksheets.find(item => item.trackId === trackId);
  const storageKey = `oet-jahshan-listening-blanks-v1-${trackId}`;
  const [part, setPart] = useState(sheet?.parts[0].part ?? 'A');
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
  const renderQuestion = (question: Question, inline = false, prompt = '') => {
        const label = `${question.extract ? `Extract ${question.extract} · ` : ''}Question ${question.number}`;
        const id = `jahshan-blank-${question.id}`;
        return <div className={`jahshan-blank ${inline ? 'jahshan-inline-blank' : ''}`} key={question.id}>
          <label htmlFor={id}>{label}</label>
          {prompt && <p className="jahshan-question-text" id={`${id}-prompt`}>{prompt}</p>}
          <div className="jahshan-blank-controls">
            {part === 'A' ? <input aria-describedby={prompt ? `${id}-prompt` : undefined} id={id} value={responses[question.id] ?? ''} onChange={event => update(question.id, event.target.value)} autoComplete="off" placeholder="Your answer" /> : <select aria-describedby={prompt ? `${id}-prompt` : undefined} id={id} value={responses[question.id] ?? ''} onChange={event => update(question.id, event.target.value)}><option value="">Choose…</option>{['A', 'B', 'C'].map(choice => <option key={choice}>{choice}</option>)}</select>}
            <button className="btn btn-secondary" aria-label={`${revealed[question.id] ? 'Hide' : 'Show'} answer for ${label}`} aria-expanded={Boolean(revealed[question.id])} aria-controls={`${id}-key`} onClick={() => setRevealed(previous => ({ ...previous, [question.id]: !previous[question.id] }))}>{revealed[question.id] ? 'Hide answer' : 'Show answer'}</button>
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
  const rows: { questionId?: string; text: string }[] = [];
  for (const node of content) {
    if (node.questionId) rows.push({ questionId: node.questionId, text: '' });
    else {
      const introStart = node.text.search(/(?:^|\n)(?:Now look at extract two|Extract 2[:.]|E2 Language Listening Part C|C\d+\.2|Part C\.2)/i);
      if (rows.length && introStart < 0) rows[rows.length - 1].text += node.text + '\n';
      else if (rows.length && introStart >= 0) {
        rows[rows.length - 1].text += node.text.slice(0, introStart);
        rows.push({ text: node.text.slice(introStart) });
      } else rows.push({ text: node.text });
    }
  }
  return <section className="card jahshan-listening-worksheet" aria-label="Listening answer worksheet">
    <h3>3 · Fill the blanks and check answers</h3>
    <p>Part {part} · Matched to the selected recording. Use the same question and extract numbers as the paper.</p>
    {sheet.parts.length > 1 && <div className="study-skill-tabs" role="group" aria-label="Listening worksheet part">{sheet.parts.map(section => <button key={section.part} aria-pressed={section.part === part} onClick={() => { setPart(section.part); setRevealed({}); }}>Part {section.part}</button>)}</div>}
    <p className="meta">Try each answer, then reveal its printed key. Revealing an answer keeps your own response unchanged. This help is for study practice.</p>
    <p className="meta">Printed questions · Listening book pages {sourcePages.join(', ')}{printed?.ocr ? ' · Text extracted from scanned pages' : ''}</p>
    <div className={`jahshan-question-paper ${printed?.inline ? 'jahshan-notes-flow' : ''}`}>
      {printed ? printed.inline ? content.map((node, index) => {
        const question = section.questions.find(question => question.id === node.questionId);
        return question ? renderQuestion(question, true) : <span className="jahshan-paper-text" key={`text-${index}`}>{node.text}{' '}</span>;
      }) : rows.map((row, index) => {
        const question = section.questions.find(question => question.id === row.questionId);
        return question ? renderQuestion(question, false, row.text.trim()) : <p className="jahshan-question-text" key={`intro-${index}`}>{row.text}</p>;
      }) : section.questions.map(question => renderQuestion(question))}
    </div>
    <p className="meta" role={saveError ? 'alert' : undefined}>{saveError ? 'Your browser could not save these answers. Download them before leaving.' : 'Your responses are saved for this recording in this browser. Answers are hidden again when you change recordings.'}</p>
    <a className="btn btn-secondary" href={`data:text/plain;charset=utf-8,${encodeURIComponent(exportText)}`} download={`jahshan-listening-${sheet.setNumber}-${trackId}-responses.txt`}>Download my responses</a>
  </section>;
}
