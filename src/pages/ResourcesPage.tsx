import { useMemo, useState } from 'react';
import type { OetSubtest, StudyResourceFormat } from '../types';
import { filterStudyResources, studyResources } from '../data/studyResources';

const subtests: Array<OetSubtest | 'general' | 'all'> = ['all', 'general', 'listening', 'reading', 'writing', 'speaking'];
const formats: Array<StudyResourceFormat | 'all'> = ['all', 'guide', 'sample-test', 'video', 'reference'];

export function ResourcesPage() {
  const [query, setQuery] = useState('');
  const [subtest, setSubtest] = useState<(typeof subtests)[number]>('all');
  const [format, setFormat] = useState<(typeof formats)[number]>('all');
  const [source, setSource] = useState<'all' | 'official' | 'community'>('all');
  const resources = useMemo(
    () => filterStudyResources(studyResources, { query, subtest, format, source }),
    [query, subtest, format, source],
  );

  return (
    <div className="page-section resources-page">
      <section className="card source-policy-banner">
        <div>
          <span className="hero-eyebrow">Curated and traceable</span>
          <h2>Medicine resource library</h2>
          <p>
            Official downloads can open inside the app. Community collections remain link-only
            unless redistribution permission is documented; archived files are never silently published.
          </p>
        </div>
        <span className="source-policy-shield" aria-hidden="true">✓</span>
      </section>

      <div className="search-bar">
        <input type="search" aria-label="Search resources" placeholder="Search resources…" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      <div className="resource-filter-row">
        <label>Sub-test<select value={subtest} onChange={(event) => setSubtest(event.target.value as (typeof subtests)[number])}>{subtests.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>Format<select value={format} onChange={(event) => setFormat(event.target.value as (typeof formats)[number])}>{formats.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>Source<select value={source} onChange={(event) => setSource(event.target.value as typeof source)}><option value="all">all</option><option value="official">official</option><option value="community">community</option></select></label>
      </div>

      <p className="meta">{resources.length} publication-eligible resources</p>
      <div className="resource-grid" data-testid="resource-grid">
        {resources.map((resource) => (
          <article key={resource.id} className="card resource-card">
            <div className="card-header-row">
              <span className={`subtest-badge ${resource.subtest === 'general' ? '' : `subtest-${resource.subtest}`}`}>{resource.subtest}</span>
              <span className="tag">{resource.format}</span>
            </div>
            <h3>{resource.title}</h3>
            <p>{resource.description}</p>
            <div className="resource-provenance">
              <strong>{resource.sourceLabel}</strong>
              <span>{resource.redistributionStatus === 'link-only' ? 'Link only' : 'Official public resource'}</span>
            </div>
            <div className="badge-row">{resource.tags.slice(0, 3).map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
            <a className="btn btn-primary btn-sm" href={resource.localPath ?? resource.sourceUrl} target="_blank" rel="noopener noreferrer">
              {resource.localPath ? 'Open resource' : 'Open source'}
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}
