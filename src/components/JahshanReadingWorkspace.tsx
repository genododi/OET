import { useState } from 'react';
import collection from '../data/jahshanCollection.json';
import './jahshanReading.css';

type Part = 'A' | 'B' | 'C';
type Draft = { A: string; B: string; C: string; corrections: string; score: string; reviewed: boolean };
const emptyDraft = (): Draft => ({ A: '', B: '', C: '', corrections: '', score: '', reviewed: false });
const key = 'oet-jahshan-reading-workspace-v1';
const tests = collection.readingTests;
const book = collection.files.find(file => file.name.startsWith('Reading Jahshan'))!;
function readSaved(): { selected: number; drafts: Record<number, Draft> } {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null');
    const drafts: Record<number, Draft> = {};
    for (const test of tests) {
      const value = saved?.drafts?.[test.number];
      if (!value) continue;
      const draft = emptyDraft();
      for (const field of ['A', 'B', 'C', 'corrections', 'score'] as const) if (typeof value[field] === 'string') draft[field] = value[field];
      draft.reviewed = value.reviewed === true; drafts[test.number] = draft;
    }
    return { selected: tests.some(test => test.number === saved?.selected) ? saved.selected : 3, drafts };
  } catch { return { selected: 3, drafts: {} }; }
}
const method: Record<Part, { title: string; text: string }> = {
  A: { title: 'Find information quickly', text: 'Skim the four texts to identify their purpose. Match the question’s key detail to a text, then scan for the precise word or phrase. Keep the wording and numbering required by the paper. The full exam allows 15 minutes for Part A.' },
  B: { title: 'Read for purpose and detail', text: 'Read the question before the short workplace text. Identify who the instruction is for and what they must do. Reject options that change a condition, duty or exception. Parts B and C share 45 minutes in the full exam.' },
  C: { title: 'Find the writer’s meaning', text: 'Locate the relevant paragraph. Read around the evidence to identify the writer’s attitude, inference or purpose. Choose the closest meaning, not merely a repeated word. Keep enough of the shared 45 minutes for both longer texts.' },
};
export function JahshanReadingWorkspace({ bookUrl }: { bookUrl?: string }) {
  const [saved, setSaved] = useState(readSaved);
  const [filter, setFilter] = useState('All sources');
  const [part, setPart] = useState<Part>('A');
  const [view, setView] = useState<'questions' | 'answers' | 'index'>('questions');
  const [pageOverride, setPageOverride] = useState<number | null>(null);
  const [wide, setWide] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [legacy] = useState(() => { try { return localStorage.getItem('oet-jahshan-notes-reading-book') ?? ''; } catch { return ''; } });
  const test = tests.find(test => test.number === saved.selected)!;
  const draft = saved.drafts[test.number] ?? emptyDraft();
  const visibleTests = tests.filter(test => filter === 'All sources' || test.publisher === filter);
  const page = pageOverride ?? (view === 'index' ? 2 : view === 'answers' ? test.answerPage : test.questionPage);
  const persist = (next: typeof saved) => {
    setSaved(next);
    try { localStorage.setItem(key, JSON.stringify(next)); setSaveError(false); } catch { setSaveError(true); }
  };
  const selectTest = (number: number) => { persist({ ...saved, selected: number }); setView('questions'); setPageOverride(null); setPart('A'); };
  const update = (patch: Partial<Draft>) => persist({ ...saved, drafts: { ...saved.drafts, [test.number]: { ...draft, ...patch } } });
  const navigatePaper = (next: typeof view) => { setView(next); setPageOverride(null); };
  const exportText = `${test.title}\nQuestions: page ${test.questionPage}; answers: page ${test.answerPage}\n\nPart A\n${draft.A}\n\nPart B\n${draft.B}\n\nPart C\n${draft.C}\n\nCorrections\n${draft.corrections}\n\nSelf-marked: ${draft.score || 'not entered'}${test.questionCount ? ` / ${test.questionCount}` : ''}\nReviewed: ${draft.reviewed ? 'yes' : 'no'}\n`;
  return <section className="jahshan-reading" aria-label="Reading practice workspace">
    <section className="card">
      <h3>Choose a Reading test</h3>
      <p>Start with Sample Test 1, work through the paper, then use its answer key to review. Your answers and corrections are saved separately for each entry.</p>
      <p className="meta">{tests.length} entries · {Object.values(saved.drafts).filter(draft => draft.reviewed).length} reviewed · Source index checked {collection.readingIndex.verifiedAt}</p>
      <div className="reading-selectors"><label>Filter reading source<select value={filter} onChange={event => { const value = event.target.value; setFilter(value); if (value !== 'All sources' && test.publisher !== value) selectTest(tests.find(item => item.publisher === value)!.number); }}><option>All sources</option>{[...new Set(tests.map(test => test.publisher))].map(source => <option key={source}>{source}</option>)}</select></label>
      <label>Reading test<select value={test.number} onChange={event => selectTest(Number(event.target.value))}>{visibleTests.map(test => <option value={test.number} key={test.number}>{test.title}{saved.drafts[test.number]?.reviewed ? ' · reviewed' : ''}</option>)}</select></label></div>
      <p><strong>{test.title}</strong> · Questions pp. {test.questionPage}–{test.answerPage - 1} · Key pp. {test.answerPage}–{test.lastPage}</p>
      {test.kind !== 'paper' && <p className="reading-notice">{test.kind === 'strategies' ? 'Strategies and practice exercises: use this for learning; it is not one standard 42-question mock.' : 'The collection lists this paper as 34 questions. It is shorter than a full 42-question OET Reading test.'}</p>}
      <div className="study-source-links"><button className="btn btn-secondary" disabled={visibleTests[0].number === test.number} onClick={() => selectTest(visibleTests[visibleTests.findIndex(item => item.number === test.number) - 1].number)}>Previous test</button><button className="btn btn-secondary" disabled={visibleTests.at(-1)!.number === test.number} onClick={() => selectTest(visibleTests[visibleTests.findIndex(item => item.number === test.number) + 1].number)}>Next test</button><a href="#practice/reading">Use a timed official Reading paper →</a></div>
    </section>
    {saveError && <p role="alert">Your browser could not save these answers. Download them before leaving.</p>}
    <div className={`reading-workbench${wide ? ' reading-workbench-wide' : ''}`}>
      <section className="card reading-paper"><h3>3 · Read the paper</h3>
        <div className="reading-paper-actions"><button className="btn btn-secondary" aria-pressed={view === 'questions'} onClick={() => navigatePaper('questions')}>Question pages</button><button className="btn btn-secondary" aria-pressed={view === 'answers'} onClick={() => navigatePaper('answers')}>Review answer key</button><button className="btn btn-ghost" aria-pressed={view === 'index'} onClick={() => navigatePaper('index')}>Book index</button><button className="btn btn-ghost" onClick={() => setWide(value => !value)}>{wide ? 'Show paper beside answers' : 'Expand paper'}</button></div>
        <p className="meta">{view === 'answers' ? 'Review mode: compare your attempt with the printed key.' : 'Study mode: the original book remains available. This workspace is not a locked exam.'}</p>
        <label>PDF page<input type="number" min={1} max={collection.readingIndex.pageCount} value={page} onChange={event => { const value = Number(event.target.value); if (Number.isInteger(value) && value >= 1 && value <= collection.readingIndex.pageCount) setPageOverride(value); }} /></label>
        {bookUrl ? <><p><a href={`${bookUrl}#page=${page}`} target="_blank" rel="noopener noreferrer">Open Reading PDF at page {page} ↗</a></p><iframe key={`${bookUrl}-${page}`} src={`${bookUrl}#page=${page}`} title="Jahshan reading collection" /><p className="meta">If your PDF viewer does not jump to the page, enter page {page} in its toolbar or open the PDF separately.</p></> : <p>Select the Reading PDF in step 1 to see it beside your answers. You can prepare your notes now, or <a href={book.url} target="_blank" rel="noopener noreferrer">open the source in Drive ↗</a>.</p>}
      </section>
      <section className="card reading-worksheet"><h3>4 · Answer and review</h3><div className="study-skill-tabs" role="group" aria-label="Reading answer part">{(['A', 'B', 'C'] as const).map(item => <button key={item} aria-pressed={part === item} onClick={() => setPart(item)}>Part {item}</button>)}</div>
        <details><summary>{method[part].title}</summary><p>{method[part].text}</p><a href={`#walkthrough/reading-${part.toLowerCase()}`}>Open the worked Part {part} walkthrough →</a></details>
        <label htmlFor="jahshan-reading-answers">Part {part} answers</label><textarea id="jahshan-reading-answers" rows={10} value={draft[part]} placeholder="Use the question numbers from the book, one answer per line." onChange={event => update({ [part]: event.target.value })} />
        <p className="meta">Copy the numbering printed in this paper. Your other parts stay saved when you switch tabs.</p>
        <label htmlFor="jahshan-reading-corrections">Evidence, corrections and next steps</label><textarea id="jahshan-reading-corrections" rows={5} value={draft.corrections} onChange={event => update({ corrections: event.target.value })} />
        {test.questionCount && <label>My self-marked result (out of {test.questionCount})<input type="number" min={0} max={test.questionCount} value={draft.score} onChange={event => { const value = event.target.value; if (value === '' || (Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= test.questionCount!)) update({ score: value }); }} /></label>}
        <p><label><input type="checkbox" checked={draft.reviewed} onChange={event => update({ reviewed: event.target.checked })} /> I compared my answers with the key and reviewed my mistakes</label></p>
        <p className="meta">{saveError ? 'Not saved — download below.' : 'Saved in this browser.'} Self-marking is a practice record, not an official OET grade.</p>
        <a className="btn btn-secondary" href={`data:text/plain;charset=utf-8,${encodeURIComponent(exportText)}`} download={`jahshan-reading-${test.number}-answers.txt`}>Download this test’s answers</a>
      </section>
    </div>
    {legacy && <details className="card"><summary>My earlier general Reading notes</summary><pre className="official-response-review">{legacy}</pre></details>}
  </section>;
}
