import { CompletedTestReview } from './CompletedTestReview';
import { useId, useState } from 'react';
import { CompletionFilter, MaterialDone } from './MaterialDone';
import { useMaterialCompletion } from '../lib/materialCompletion';
import './collectionTestPicker.css';

type Test = { id: string; title: string; note?: string; noteSeparator?: string };

// Test IDs are independent of the source book: many tests share one PDF.
export function CollectionTestPicker({ collectionId, collectionName, tests, selectedId, label, onSelect }: {
  collectionId: string; collectionName: string; tests: Test[]; selectedId: string;
  label: string; onSelect: (id: string) => void;
}) {
  const id = useId();
  const filterKey = `oet-collection-completion-filter-v1:${collectionId}`;
  const [filter, setFilter] = useState(() => {
    try { const saved = localStorage.getItem(filterKey); return saved === 'done' || saved === 'undone' ? saved : 'all'; } catch { return 'all'; }
  });
  const changeFilter = (value: string) => {
    setFilter(value);
    try { localStorage.setItem(filterKey, value); } catch { /* Filtering still works for this session. */ }
  };
  const { isDone } = useMaterialCompletion();
  const completionId = (test: Test) => `collection-test:${collectionId}:${test.id}`;
  const selected = tests.find(test => test.id === selectedId)!;
  const visible = tests.filter(test => filter === 'all' || isDone(completionId(test)) === (filter === 'done'));
  const selectedIndex = tests.indexOf(selected);
  const previous = visible.filter(test => tests.indexOf(test) < selectedIndex).at(-1);
  const next = visible.find(test => tests.indexOf(test) > selectedIndex);
  const selectedHidden = !visible.includes(selected);
  const option = (test: Test) => <option key={test.id} value={test.id}>{test.title}{test.note ? `${test.noteSeparator ?? ' · '}${test.note}` : ''}{isDone(completionId(test)) ? ' · Done' : ''}</option>;
  return <div className="collection-test-picker">
    <div className="collection-test-controls">
      <label htmlFor={id}>{label}<select id={id} value={selectedId} onChange={event => onSelect(event.target.value)}>
        {selectedHidden && <optgroup label="Current open test">{option(selected)}</optgroup>}
        {visible.map(option)}
      </select></label>
      <CompletionFilter value={filter} onChange={changeFilter} noun="tests" />
      <MaterialDone key={completionId(selected)} fileId={completionId(selected)} filename={`${collectionName} · ${selected.title}`} />
    </div>
    <CompletedTestReview completionId={completionId(selected)} />
    <p className="meta" aria-live="polite">{tests.filter(test => isDone(completionId(test))).length} of {tests.length} tests done · Saved for this profile.</p>
    {selectedHidden && <p className="meta">{visible.length ? 'This test does not match the completion filter.' : 'No tests match the completion filter.'} Your current test stays open so you can keep working. Choose another test or change the filter.</p>}
    {tests.length > 1 && <div className="study-source-links">
      <button className="btn btn-secondary" disabled={!previous} onClick={() => previous && onSelect(previous.id)}>Previous test</button>
      <button className="btn btn-secondary" disabled={!next} onClick={() => next && onSelect(next.id)}>Next test</button>
    </div>}
  </div>;
}
