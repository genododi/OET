import { useEffect, useId, useState } from 'react';
import type { ReactNode } from 'react';
import { RecognisedSourceText } from './RecognisedSourceText';
import { StructuredSourceText } from './StructuredSourceText';
import { validSourceBlocks } from '../lib/sourceBlocks';
import { sourceImageFormats, sourceHasColumns, validSourceLayout } from '../lib/sourceTextLayout';
import type { MaterialTextRange } from '../lib/materialPractice';
interface SourcePage { number: number; text: string; extraction?: string; layout?: unknown; display?: { text: string; layout: unknown }; previewPath?: string; needsReview?: boolean; blocks?: unknown; questionExtractionBlocked?: boolean }
interface Props { id: string; filename: string; format: string; textPath: string; assetPath: string; children?: ReactNode; pageNumbers?: number[]; ranges?: MaterialTextRange[]; heading?: string; defaultAll?: boolean }
const url = (path: string) => /^https?:\/\//.test(path) ? path : `${import.meta.env.BASE_URL}${path}`;
export function MaterialSourceText({ id, filename, format, textPath, assetPath, children, pageNumbers, ranges, heading, defaultAll = false }: Props) {
  const pageControl=useId();
  const storageKey = `oet-material-page-v1:${id}`;
  const [storedPages, setPages] = useState<SourcePage[] | null>(null);
  const [loadedPath, setLoadedPath] = useState('');
  const sourcePages = loadedPath === textPath ? storedPages : null;
  const [zoom,setZoom] = useState(false);
  const [pageLayout, setPageLayout] = useState(false);
  const image = sourceImageFormats.includes(format.toLowerCase());
  const slide = ['ppt','pptx'].includes(format.toLowerCase());
  const [error, setError] = useState(false);
  const [notice, setNotice] = useState('');
  const [all, setAll] = useState(defaultAll);
  const [page, setPage] = useState(() => { try { const value = Number(localStorage.getItem(storageKey)); return Number.isInteger(value) && value > 0 ? value : 1; } catch { return 1; } });
  useEffect(() => {
    const controller = new AbortController();
    fetch(url(textPath), { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error('Unable to load text');
      return response.json();
    }).then((data: SourcePage & { pages?: SourcePage[]; notice?: string }) => {
      if (controller.signal.aborted) return;
      if (typeof data.text !== 'string') throw new Error('Invalid source text');
      const validPages = Array.isArray(data.pages) && data.pages.length && data.pages.every((entry, index) => entry.number === index + 1 && typeof entry.text === 'string');
      setLoadedPath(textPath); setError(false); setNotice(typeof data.notice === 'string' ? data.notice : ''); setPageLayout((data.pages ?? [data]).some(entry => sourceHasColumns(entry.display?.layout ?? entry.layout)));
      setPages(validPages ? data.pages! : [{ number: 1, text: data.text, extraction: data.extraction ?? 'text', layout: data.layout, display: data.display, previewPath: data.previewPath, needsReview: data.needsReview }]);
    }).catch(() => { if (!controller.signal.aborted) { setLoadedPath(textPath); setError(true); } });
    return () => controller.abort();
  }, [textPath, image]);
  const pages = sourcePages ? (pageNumbers ? sourcePages.filter(item => pageNumbers.includes(item.number)) : sourcePages).map(item=>{const range=ranges?.find(range=>range.page===item.number);return range && (range.start > 0 || range.end < item.text.length) ? {...item,text:item.text.slice(range.start,range.end),layout:undefined,display:undefined,blocks:undefined} : item;}) : null;
  const currentIndex = Math.max(0, pages?.findIndex(item => item.number === page) ?? 0);
  const current = pages?.[currentIndex]?.number ?? 1;
  const changePage = (next: number) => { setPage(next); try { localStorage.setItem(storageKey, String(next)); } catch { /* Source remains usable without storage. */ } };
  const original = `${url(assetPath)}${format === 'pdf' ? `#page=${current}` : ''}`;
  const visible = pages ? all ? pages : pages[currentIndex] ? [pages[currentIndex]] : [] : [];
  const downloadText = () => {
    if (!sourcePages) return;
    const href = URL.createObjectURL(new Blob([sourcePages.map(page => page.text).join('\n\n')], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = href; link.download = filename.replace(/\.[^.]+$/, '') + '.txt'; link.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  };
  return <section className={`card material-source${zoom ? ' material-source-zoom' : ''}`} aria-label="Source document">
    <div className="material-toolbar"><h3>{heading ?? (children ? '2 · Listen and read the source text' : '2 · Read the source text')}</h3><a href={original} target="_blank" rel="noopener noreferrer">Open original{format === 'pdf' ? ` · page ${current}` : ''} ↗</a></div>
    {children}
    {['json','html','htm','txt'].includes(format.toLowerCase()) && sourcePages && <button type="button" className="btn btn-secondary" onClick={downloadText}>Download readable TXT</button>}
    {notice && loadedPath === textPath && <p className="source-document-notice" role="status">{notice}</p>}
    {pages && pages.length > 1 && <div className="material-page-controls" role="group" aria-label="Source pages">
      <button className="btn btn-secondary" disabled={all || currentIndex === 0} onClick={() => changePage(pages[currentIndex - 1].number)}>Previous {slide ? 'slide' : 'page'}</button>
      <div className="material-page-select"><label htmlFor={pageControl}>Source {slide ? 'slide' : 'page'}</label><select id={pageControl} value={current} disabled={all} onChange={event => changePage(Number(event.target.value))}>{pages.map(entry => <option key={entry.number} value={entry.number}>{slide ? 'Slide' : 'Page'} {entry.number} of {pages.length}</option>)}</select></div>
      <button className="btn btn-secondary" disabled={all || currentIndex === pages.length - 1} onClick={() => changePage(pages[currentIndex + 1].number)}>Next {slide ? 'slide' : 'page'}</button>
      <label><input type="checkbox" checked={all} onChange={event => setAll(event.target.checked)} /> Show all {slide ? 'slides' : 'pages'}</label>
    </div>}
    {visible.some(entry => validSourceLayout(entry.display?.layout ?? entry.layout, entry.display?.text ?? entry.text)) && <div className="material-text-view-controls" role="group" aria-label="Text display"><button type="button" aria-pressed={!pageLayout} onClick={() => setPageLayout(false)}>Readable text</button><button type="button" aria-pressed={pageLayout} onClick={() => setPageLayout(true)}>Match page layout</button><button type="button" aria-pressed={zoom} onClick={() => setZoom(!zoom)}>{zoom ? 'Fit text to pane' : 'Enlarge text'}</button><span className="meta">Page layout preserves columns and tables. Readable text follows the source blocks. Underlined text needs checking against the original.</span></div>}
    {error && loadedPath === textPath ? <p role="alert">Text could not be loaded. Open or download the original, or reopen this task to retry.</p> : !pages ? <p role="status">Loading source text…</p> : visible.map(entry => <article className="material-text-page" key={entry.number} aria-label={`Source page ${entry.number}`}>
      {pages.length > 1 && <h4>{slide ? 'Slide' : 'Page'} {entry.number}</h4>}
      {entry.extraction === 'ocr' && <p className="meta">{entry.needsReview ? 'Handwritten or difficult text: this automatic transcription needs checking against the original image, especially names, numbers and medical terms.' : 'Text recognised from the scanned page. Check the original for diagrams, tables or uncertain wording.'}</p>}
      {entry.questionExtractionBlocked ? <details><summary>Show unverified extracted text</summary><RecognisedSourceText text={entry.text} /></details> : validSourceBlocks(entry.blocks) ? <StructuredSourceText blocks={entry.blocks} /> : entry.text.trim() ? <RecognisedSourceText text={entry.display && validSourceLayout(entry.display.layout, entry.display.text) ? entry.display.text : entry.text} layout={entry.display?.layout ?? entry.layout} pageLayout={pageLayout} /> : !notice && <p>Text recognition is pending or found no readable words on this page. <a href={`${url(assetPath)}${format === 'pdf' ? `#page=${entry.number}` : ''}`} target="_blank" rel="noopener noreferrer">Open the original page ↗</a></p>}
      {slide && entry.previewPath && <details><summary>View original slide image</summary><img className="material-original-image" src={url(entry.previewPath)} alt={`Original slide ${entry.number}: ${filename}`} loading="lazy" /></details>}
    </article>)}
    {image && <details open={visible.every(entry => !entry.text.trim())}><summary>View original image</summary><img className="material-original-image" src={url(visible[0]?.previewPath ?? assetPath)} alt={`Original source: ${filename}`} loading="lazy" /></details>}
    <small>Full source text, with the supplied wording. Your response and review are saved separately below.</small>
  </section>;
}
