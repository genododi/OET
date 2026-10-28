import { useEffect, useState } from 'react';
import { AppIcon } from '../components/AppIcon';
import { filterRecentMaterials, readRecentMaterials, type RecentMaterial } from '../lib/recentMaterials';
import type { NavSection } from '../types';
import './recentMaterials.css';

const skillName = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const date = (value: string) => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const size = (bytes: number) => bytes < 1048576 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
export function RecentMaterialsPage({ onNavigate }: { onNavigate: (section: NavSection, itemId?: string) => void }) {
  const [files, setFiles] = useState<RecentMaterial[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState(''), [origin, setOrigin] = useState('all'), [skill, setSkill] = useState('all'), [format, setFormat] = useState('all');
  const [limit, setLimit] = useState(30);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${import.meta.env.BASE_URL}recent-materials.json`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw Error();
      const next = readRecentMaterials(await response.json());
      if (!controller.signal.aborted) { setFiles(next); setState('ready'); }
    }).catch(() => { if (!controller.signal.aborted) setState('error'); });
    return () => controller.abort();
  }, [attempt]);
  const filtered = filterRecentMaterials(files, query, origin, skill, format);
  const reset = () => { setQuery(''); setOrigin('all'); setSkill('all'); setFormat('all'); setLimit(30); };
  const formats = [...new Set(files.map(file => file.format))].sort();
  return <div className="page-section recent-materials-page">
    <section className="card recent-materials-intro"><span className="hero-eyebrow">New in your library</span><h2>Your latest study files</h2><p>New PDFs, recordings, photos and other materials, newest first. Open any file to study with its available text, questions and recordings.</p><p className="meta">Dates show when an original first entered this library. Text recognition and transcript improvements keep the original date. Exact duplicates appear once, with all known sources.</p></section>
    {state === 'loading' && <p role="status">Loading recently added files…</p>}
    {state === 'error' && <section className="card" role="alert"><p>The recently added list is unavailable. Your study files remain in My OET & AMR Files.</p><button className="btn btn-secondary" onClick={() => { setState('loading'); setAttempt(value => value + 1); }}>Try again</button><button className="btn btn-ghost" onClick={() => onNavigate('materials')}>Open all study files</button></section>}
    {state === 'ready' && <>
      <section className="card recent-materials-filters" aria-label="Filter recently added files">
        <label className="recent-search">Search files<input type="search" value={query} placeholder="File name, group or collection…" onChange={e => { setQuery(e.target.value); setLimit(30); }} /></label>
        <label>Source<select value={origin} onChange={e => { setOrigin(e.target.value); setLimit(30); }}><option value="all">All sources</option><option value="telegram">Telegram</option><option value="local">Local resources</option><option value="drive">Google Drive</option><option value="collection">Study collections</option></select></label>
        <label>Skill<select value={skill} onChange={e => { setSkill(e.target.value); setLimit(30); }}><option value="all">All skills</option>{['listening', 'reading', 'writing', 'speaking'].map(value => <option key={value} value={value}>{skillName(value)}</option>)}</select></label>
        <label>File type<select value={format} onChange={e => { setFormat(e.target.value); setLimit(30); }}><option value="all">All file types</option>{formats.map(value => <option key={value} value={value}>{value.toUpperCase()}</option>)}</select></label>
      </section>
      <p className="meta" role="status">{filtered.length} {filtered.length === 1 ? 'file' : 'files'} · Newest additions first</p>
      <ul className="recent-materials-list" aria-label="Recently added study files">{filtered.slice(0, limit).map(file => <li className="card recent-material" key={file.sha256}>
        <div className="recent-file-icon" aria-hidden="true"><AppIcon name={['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac'].includes(file.format) ? 'headphones' : 'book'} /></div>
        <div className="recent-file-details"><div className="recent-file-meta"><span>{file.format.toUpperCase()} · {size(file.bytes)}</span><time dateTime={file.addedAt}>Added {date(file.addedAt)}</time></div><h3>{file.filename}</h3><div className="recent-file-sources">{file.sources.map(source => <span key={`${source.kind}:${source.label}`}>{source.label}</span>)}</div><p className="meta">{file.collection} · {file.skills.map(skillName).join(' / ')}</p></div>
        <button className="btn btn-secondary" aria-label={`Open ${file.filename}`} onClick={() => onNavigate('materials', file.id)}>Open file →</button>
      </li>)}</ul>
      {!filtered.length && <section className="card"><h3>{files.length ? 'No matching files' : 'No additions yet'}</h3><p>{files.length ? 'Try another file name, source or skill.' : 'New study files will appear after the next verified library import.'}</p>{files.length > 0 && <button className="btn btn-secondary" onClick={reset}>Clear filters</button>}</section>}
      {filtered.length > limit && <button className="btn btn-secondary" onClick={() => setLimit(value => value + 30)}>Show 30 more files</button>}
    </>}
  </div>;
}
