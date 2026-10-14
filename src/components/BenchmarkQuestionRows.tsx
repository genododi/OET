import { useEffect, useState } from 'react';

type Question = { part: string; number: number; prompt: string; group: string; sourcePage: number; numberingNote?: string; sourceNote?: string; choices?: string[] };
type Props = {
  entry: { id: string; skill: string; sourceSha256: string; assetPath: string; answers?: Record<string, string> };
  part: string;
  responses: Record<string, string>;
  onAnswer: (id: string, value: string) => void;
};

export function BenchmarkQuestionRows({ entry, part, responses, onAnswer }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [failed, setFailed] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}benchmark/questions/${entry.id}.json`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => {
        if (data.testId !== entry.id || data.sourceSha256 !== entry.sourceSha256 || !Array.isArray(data.questions) || data.questions.length !== 42) throw new Error();
        if (!controller.signal.aborted) setQuestions(data.questions);
      })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [entry.id, entry.sourceSha256]);
  if (failed) return <p role="alert">The questions could not load. Reload to try again, or use the original paper. Your saved answers are unchanged.</p>;
  if (!questions.length) return <p role="status">Loading questions and answer fields…</p>;
  const listening = entry.skill === 'listening';
  const visible = questions.filter(question => question.part === part);
  return <div className="benchmark-question-list">{visible.map((question, index) => {
    const n = question.number;
    const id = `${part}-${n}`;
    const inputId = `benchmark-${id}`;
    const answer = listening ? entry.answers?.[String(n)] : undefined;
    return <div key={id}>
      {(index === 0 || visible[index - 1].group !== question.group) && <h4 className="benchmark-question-group">{question.group}</h4>}
      <article className="benchmark-question-row" aria-label={`Part ${part} · Question ${n}`}>
        <div className="benchmark-question-copy">
          <label htmlFor={inputId}>Question {n}</label>
          <div id={`${inputId}-prompt`} className="benchmark-question-prompt">{question.prompt}</div>
          {question.sourceNote && <p className="meta">{question.sourceNote}</p>}
          {question.numberingNote && <p className="meta">{question.numberingNote}</p>}
          <a className="benchmark-question-source" href={`${import.meta.env.BASE_URL}${entry.assetPath}#page=${question.sourcePage}`} target="_blank" rel="noopener noreferrer">Original question · page {question.sourcePage} ↗</a>
        </div>
        <div className="benchmark-question-answer">
          <span className="meta">Your answer</span>
          <div className="jahshan-blank-controls">
            {part === 'A' ? <input id={inputId} aria-describedby={`${inputId}-prompt`} value={responses[id] ?? ''} onChange={e => onAnswer(id, e.target.value)} placeholder="Type your answer" autoComplete="off" /> : <select id={inputId} aria-describedby={`${inputId}-prompt`} value={responses[id] ?? ''} onChange={e => onAnswer(id, e.target.value)}><option value="">Choose…</option>{(question.choices ?? []).map(choice => <option key={choice}>{choice}</option>)}{responses[id] && !question.choices?.includes(responses[id]) && <option value={responses[id]}>Saved answer: {responses[id]}</option>}</select>}
            {answer && <button className="btn btn-secondary" aria-label={`${revealed[id] ? 'Hide' : 'Show'} answer for Question ${n}`} aria-expanded={!!revealed[id]} aria-controls={`${inputId}-key`} onClick={() => setRevealed(current => ({ ...current, [id]: !current[id] }))}>{revealed[id] ? 'Hide answer' : 'Show answer'}</button>}
          </div>
          {revealed[id] && answer && <p id={`${inputId}-key`} className="jahshan-inline-key"><strong>Printed answer:</strong> {answer}</p>}
        </div>
      </article>
    </div>;
  })}</div>;
}
