import { useState } from 'react';
import source from '../data/jahshanReadingQuestions.json';

type Props = { testNumber: number; part: 'A' | 'B' | 'C'; responses: Record<string, string>; onAnswer: (id: string, answer: string) => void; onPage: (page: number, answerKey: boolean) => void };
export function JahshanReadingQuestions(props: Props) {
  return <QuestionList key={`${props.testNumber}-${props.part}`} {...props} />;
}
function QuestionList({ testNumber, part, responses, onAnswer, onPage }: Props) {
  const sections = source.tests.find(test => test.number === testNumber)!.sections.filter(section => section.part === part);
  const [sectionId, setSectionId] = useState(sections[0].id);
  const [text, setText] = useState('All questions');
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const section = sections.find(section => section.id === sectionId)!;
  const questions = section.questions;
  const visible = questions.filter(q => text === 'All questions' || (part === 'A' ? text === 'Other questions' ? !q.sourceText : q.sourceText === text.slice(-1) : q.group === text));
  const other = questions.filter(q => !q.sourceText).length;
  const filters = part === 'A' ? ['All questions', ...['A', 'B', 'C', 'D'].filter(letter => questions.some(q => q.sourceText === letter)).map(letter => `Text ${letter}`), ...(other ? ['Other questions'] : [])] : part === 'C' && questions.some(q => q.group) ? ['All questions', 'Text 1', 'Text 2'] : [];
  const chooseText = (value: string) => {
    setText(value);
    const first = questions.find(q => part === 'A' ? q.sourceText === value.slice(-1) : q.group === value);
    if (first) onPage(first.sourceTextPage ?? first.sourcePage, false);
  };
  return <div className="reading-question-list">
    {sections.length > 1 && <label>Exercise group<select value={sectionId} onChange={event => { setSectionId(event.target.value); setText('All questions'); setRevealed({}); }}>{sections.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}
    {filters.length > 0 && <div className="reading-text-filter" role="group" aria-label="Filter questions by text">{filters.map(value => <button key={value} className="btn btn-secondary" aria-pressed={text === value} onClick={() => chooseText(value)}>{value}</button>)}</div>}
    <p className="meta">{visible.length} questions shown · {questions.filter(q => responses[q.id]?.trim()).length} of {questions.length} answered. Type only your answer; the question numbers are already provided.</p>
    {part === 'A' && <p className="meta">Text filters are study hints and can reveal matching-question answers. “All questions” preserves paper order.{other > 0 && ' “Other questions” contains items whose text link is not confirmed; these remain in All questions.'}</p>}
    <div className="reading-question-scroll">{visible.map((q, index) => {
      const name = `Part ${part}${q.group ? ` · ${q.group}` : ''} · Question ${q.number}`;
      const id = `reading-${testNumber}-${q.id}`;
      return <article className="reading-question" key={q.id}>
        {q.imagePage && (index === 0 || visible[index - 1].imagePage !== q.imagePage) && <figure className="reading-source-image"><img src={`${import.meta.env.BASE_URL}jahshan-reading-pages/${q.imagePage}.webp`} alt={`Original printed questions on Reading page ${q.imagePage}`} loading="lazy" /><figcaption>Original question page {q.imagePage} · Answer fields follow below.</figcaption><a href={`${import.meta.env.BASE_URL}jahshan-reading-pages/${q.imagePage}.webp`} target="_blank" rel="noopener noreferrer">Enlarge question page ↗</a></figure>}
        <label htmlFor={id}><strong>{name}</strong></label>
        {q.imagePage ? <p id={`${id}-prompt`} className="meta">Use question {q.number} on the printed page above.</p> : <p className="reading-prompt" id={`${id}-prompt`}>{q.prompt}</p>}
        <div className="reading-answer-row">{q.kind === 'choice' ? <select id={id} aria-describedby={`${id}-prompt`} value={responses[q.id] ?? ''} onChange={event => onAnswer(q.id, event.target.value)}><option value="">Choose…</option>{(part === 'B' ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D']).map(letter => <option key={letter}>{letter}</option>)}</select> : <input id={id} aria-describedby={`${id}-prompt`} value={responses[q.id] ?? ''} placeholder="Type your answer" autoComplete="off" onChange={event => onAnswer(q.id, event.target.value)} />}
        <button className="btn btn-secondary" aria-expanded={Boolean(revealed[q.id])} aria-controls={`${id}-answer`} aria-label={`${revealed[q.id] ? 'Hide' : 'Show'} answer for ${name}`} onClick={() => setRevealed({ ...revealed, [q.id]: !revealed[q.id] })}>{revealed[q.id] ? 'Hide answer' : 'Show answer'}</button></div>
        {revealed[q.id] && <div className="reading-revealed" id={`${id}-answer`}><strong>{q.answer ?? 'No answer is printed for this question in the supplied key.'}</strong><p className="meta">Printed collection key · page {q.keyPage}. Original wording is retained.</p><button className="btn btn-ghost" onClick={() => onPage(q.keyPage, true)}>View printed key · page {q.keyPage}</button></div>}
        <button className="btn btn-ghost reading-source-page" onClick={() => onPage(q.sourcePage, false)}>Question page {q.sourcePage}</button>
      </article>;
    })}</div>
    <p className="meta">Extracted from your Reading collection. Use the question-page link to check the original layout or unclear scan text.</p>
  </div>;
}
