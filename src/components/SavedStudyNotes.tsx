import { useState } from 'react';

export function SavedStudyNotes({ storageKey, label, placeholder = 'Write your notes here…', rows = 8 }: { storageKey: string; label: string; placeholder?: string; rows?: number }) {
  const [value, setValue] = useState(() => {
    try { return localStorage.getItem(storageKey) || ''; } catch { return ''; }
  });
  const [error, setError] = useState(false);
  return <div className="study-draft">
    <label htmlFor={storageKey}>{label}</label>
    <textarea id={storageKey} rows={rows} value={value} placeholder={placeholder} onChange={e => {
      setValue(e.target.value);
      try { localStorage.setItem(storageKey, e.target.value); setError(false); } catch { setError(true); }
    }} />
    <small role="status">{error ? 'Storage unavailable. Copy or download your work before leaving.' : 'Saved on this browser.'}</small>
    <a className="btn btn-secondary btn-sm" href={`data:text/plain;charset=utf-8,${encodeURIComponent(value)}`} download={`${storageKey}.txt`}>Download my notes</a>
  </div>;
}
