import { useEffect, useRef, useState } from 'react';
import pageData from '../data/jahshanReadingPages.json';
import collection from '../data/jahshanCollection.json';

const dimensions: Record<string, { width: number; height: number }> = pageData.dimensions;

type Props = { testNumber: number; part: 'A' | 'B' | 'C'; view: 'questions' | 'answers' | 'index'; selectedPage: number | null };
export function JahshanReadingPaper({ testNumber, part, view, selectedPage }: Props) {
  const pane = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(false);
  const entry = collection.readingTests.find(test => test.number === testNumber)!;
  const source = pageData.tests.find(test => test.number === testNumber)!;
  const partPages = source.parts;
  // A source-page link may point to another part. Keep its entire part available.
  const displayedPart = selectedPage === null ? part : (['A', 'B', 'C'] as const).find(value => partPages[value].includes(selectedPage)) ?? part;
  const pages = view === 'index' ? [2] : view === 'answers'
    ? Array.from({ length: entry.lastPage - entry.answerPage + 1 }, (_, i) => entry.answerPage + i)
    : partPages[displayedPart];
  const targetPage = selectedPage !== null && pages.includes(selectedPage) ? selectedPage : view === 'questions' && displayedPart === 'A' ? source.firstTextPage : pages[0];
  useEffect(() => {
    const container = pane.current;
    const target = container?.querySelector<HTMLElement>(`[data-paper-page="${targetPage}"]`);
    if (container && target) container.scrollTop += target.getBoundingClientRect().top - container.getBoundingClientRect().top - container.clientTop;
  }, [testNumber, displayedPart, view, targetPage, zoom]);
  return <section className="reading-complete-paper" aria-label="Complete Reading text">
    <h4>{view === 'index' ? 'Collection index' : view === 'answers' ? 'Printed answer pages' : `Part ${displayedPart} · Complete reading text`}</h4>
    <p>All original pages for {view === 'questions' ? `Part ${displayedPart}` : view === 'answers' ? 'this answer key' : 'the index'} are shown below. Scroll to read every passage, table and diagram.</p>
    <div className="reading-paper-actions"><span className="meta">Pages {pages[0]}{pages.length > 1 ? `–${pages.at(-1)}` : ''} · {pages.length} {pages.length === 1 ? 'page' : 'pages'}</span><button className="btn btn-secondary" aria-pressed={zoom} onClick={() => setZoom(value => !value)}>{zoom ? 'Fit pages to width' : 'Enlarge text'}</button></div>
    <div ref={pane} className={`reading-page-scroll${zoom ? ' reading-page-zoom' : ''}`} tabIndex={0} role="region" aria-label="Original Reading pages">
      {pages.map((page, index) => <figure key={page} data-paper-page={page} className="reading-full-page">
        <figcaption>Reading collection · Page {page} <a href={`${import.meta.env.BASE_URL}jahshan-reading-pages/${page}.webp`} target="_blank" rel="noopener noreferrer">Open full-size page ↗</a></figcaption>
        <img src={`${import.meta.env.BASE_URL}jahshan-reading-pages/${page}.webp`} alt={`Complete original Reading page ${page}`} loading={index === 0 || page === targetPage ? 'eager' : 'lazy'} width={dimensions[page].width} height={dimensions[page].height} />
      </figure>)}
    </div>
  </section>;
}
