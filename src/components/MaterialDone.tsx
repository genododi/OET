import { useState } from 'react';
import { useMaterialCompletion } from '../lib/materialCompletion';
import './materialDone.css';

export function MaterialDone({ fileId, filename }: { fileId: string; filename: string }) {
  const { isDone, setDone } = useMaterialCompletion();
  const [error, setError] = useState(false);
  return <div className="material-done-control"><label><input type="checkbox" aria-label={`Done: ${filename}`} checked={isDone(fileId)} onChange={e => { try { setDone(fileId, e.target.checked); setError(false); } catch { setError(true); } }} /><span>Done</span></label>{error && <small role="alert">Could not save completion. Try again when storage is available.</small>}</div>;
}
export function CompletionFilter({ value, onChange, noun = 'files' }: { value: string; onChange: (value: string) => void; noun?: 'files' | 'tests' }) {
  return <label>Completion<select aria-label="Filter by completion" value={value} onChange={e => onChange(e.target.value)}><option value="all">All {noun}</option><option value="undone">Undone only</option><option value="done">Done only</option></select></label>;
}
