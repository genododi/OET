import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
interface SourcePage { number: number; text: string; extraction?: string }
interface Props { id: string; filename: string; format: string; textPath: string; assetPath: string; children?: ReactNode }
const url = (path: string) => `${import.meta.env.BASE_URL}${path}`;
export function MaterialSourceText({ id, filename, format, textPath, assetPath, children }: Props) {
  const storageKey = `oet-material-page-v1:${id}`;
  const [pages, setPages] = useState<SourcePage[] | null>(null);
  const [error, setError] = useState(false);
  const [all, setAll] = useState(false);
  const [page, setPage] = useState(() => { try { const value = Number(localStorage.getItem(storageKey)); return Number.isInteger(value) && value > 0 ? value : 1; } catch { return 1; } });
  useEffect(() => {
    const controller = new AbortController();
    fetch(url(textPath), { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error('Unable to load text');
      return response.json();
    }).then((data: { text: string; pages?: SourcePage[] }) => {
      if (controller.signal.aborted) return;
      if (typeof data.text !== 'string') throw new Error('Invalid source text');
      const validPages = Array.isArray(data.pages) && data.pages.length && data.pages.every((entry, index) => entry.number === index + 1 && typeof entry.text === 'string');
      setPages(validPages ? data.pages! : [{ number: 1, text: data.text, extraction: 'text' }]);
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [textPath]);
  const current = Math.min(Math.max(1, page), pages?.length || 1);
  const changePage = (next: number) => { setPage(next); try { localStorage.setItem(storageKey, String(next)); } catch { /* Source remains usable without storage. */ } };
  const original = `${url(assetPath)}${format === 'pdf' ? `#page=${current}` : ''}`;
  const visible = pages ? all ? pages : [pages[current - 1]] : [];
  return <section className="card material-source" aria-label="Source document">
    <div className="material-toolbar"><h3>{children ? '2 · Listen and read the source text' : '2 · Read the source text'}</h3><a href={original} target="_blank" rel="noopener noreferrer">Open original{format === 'pdf' ? ` · page ${current}` : ''} ↗</a></div>
    {children}
    {pages && pages.length > 1 && <div className="material-page-controls" role="group" aria-label="Source pages">
      <button className="btn btn-secondary" disabled={all || current === 1} onClick={() => changePage(current - 1)}>Previous page</button>
      <div className="material-page-select"><label htmlFor="material-source-page">Source page</label><select id="material-source-page" value={current} disabled={all} onChange={event => changePage(Number(event.target.value))}>{pages.map(entry => <option key={entry.number} value={entry.number}>Page {entry.number} of {pages.length}</option>)}</select></div>
      <button className="btn btn-secondary" disabled={all || current === pages.length} onClick={() => changePage(current + 1)}>Next page</button>
      <label><input type="checkbox" checked={all} onChange={event => setAll(event.target.checked)} /> Show all pages</label>
    </div>}
    {error ? <p role="alert">Text could not be loaded. Open or download the original, or reopen this task to retry.</p> : !pages ? <p role="status">Loading source text…</p> : visible.map(entry => <article className="material-text-page" key={entry.number} aria-label={`Source page ${entry.number}`}>
      {pages.length > 1 && <h4>Page {entry.number}</h4>}
      {entry.extraction === 'ocr' && <p className="meta">Text recognised from the scanned page. Check the original for diagrams, tables or uncertain wording.</p>}
      {entry.text.trim() ? <div className="material-readable-text">{entry.text}</div> : <p>This page has no readable text. <a href={`${url(assetPath)}${format === 'pdf' ? `#page=${entry.number}` : ''}`} target="_blank" rel="noopener noreferrer">Open the original page ↗</a></p>}
    </article>)}
    {['jpg', 'jpeg', 'png'].includes(format) && <details><summary>View original image</summary><img src={url(assetPath)} alt={filename} /></details>}
    <small>Full source text, with the supplied wording. Your response and review are saved separately below.</small>
  </section>;
}
