import { useMemo, useState } from 'react';
import type { OetSubtest, StudyResourceFormat } from '../types';
import { filterStudyResources, studyResources } from '../data/studyResources';
import localSourceFiles from '../data/googleDriveFolderLibrary.generated.json';
import localSourceSummary from '../data/googleDriveFolderCatalog.generated.json';
import { ListPagination } from '../components/ListPagination';
import { usePagination } from '../hooks/usePagination';

const subtests: Array<OetSubtest | 'general' | 'all'> = ['all', 'general', 'listening', 'reading', 'writing', 'speaking'];
const formats: Array<StudyResourceFormat | 'all'> = ['all', 'guide', 'sample-test', 'video', 'reference'];

export function ResourcesPage() {
  const [libraryView, setLibraryView] = useState<'published' | 'private'>('published');
  const [query, setQuery] = useState('');
  const [subtest, setSubtest] = useState<(typeof subtests)[number]>('all');
  const [format, setFormat] = useState<(typeof formats)[number]>('all');
  const [source, setSource] = useState<'all' | 'official' | 'community'>('all');
  const resources = useMemo(
    () => filterStudyResources(studyResources, { query, subtest, format, source }),
    [query, subtest, format, source],
  );
  const privateFiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return localSourceFiles.filter((file) => {
      if (subtest !== 'all' && file.subtest !== subtest) return false;
      if (!q) return true;
      return [file.filename, file.relativePath, file.subtest, file.format, file.mimeType]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [query, subtest]);
  const privatePagination = usePagination(privateFiles);

  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
    if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

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

      <section className="source-vault-overview" aria-label="Local source folder status">
        <div className="source-vault-copy">
          <span className="source-vault-pulse" aria-hidden="true" />
          <div>
            <span className="section-kicker">GENODODI source vault</span>
            <h3>Every local Google Drive file is indexed</h3>
            <p>
              {localSourceSummary.sourceFiles.toLocaleString()} study files ·{' '}
              {formatBytes(localSourceSummary.totalSourceBytes)} ·{' '}
              {localSourceSummary.archiveMatchedFiles.toLocaleString()} archive matches
            </p>
          </div>
        </div>
        <div className="source-vault-stats">
          {(['listening', 'reading', 'writing', 'speaking'] as const).map((item) => (
            <button key={item} type="button" onClick={() => { setLibraryView('private'); setSubtest(item); }}>
              <strong>{localSourceSummary.bySubtest[item].toLocaleString()}</strong>
              <span>{item}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="library-view-switch" role="group" aria-label="Resource library view">
        <button type="button" className={libraryView === 'published' ? 'active' : ''} onClick={() => setLibraryView('published')}>
          Published resources ({studyResources.length})
        </button>
        <button type="button" className={libraryView === 'private' ? 'active' : ''} onClick={() => setLibraryView('private')}>
          Private source index ({localSourceSummary.sourceFiles.toLocaleString()})
        </button>
      </div>

      <div className="search-bar">
        <input type="search" aria-label={libraryView === 'private' ? 'Search private source index' : 'Search resources'} placeholder={libraryView === 'private' ? 'Search every indexed filename…' : 'Search resources…'} value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      <div className="resource-filter-row">
        <label>Sub-test<select value={subtest} onChange={(event) => setSubtest(event.target.value as (typeof subtests)[number])}>{subtests.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        {libraryView === 'published' && <label>Format<select value={format} onChange={(event) => setFormat(event.target.value as (typeof formats)[number])}>{formats.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>}
        {libraryView === 'published' && <label>Source<select value={source} onChange={(event) => setSource(event.target.value as typeof source)}><option value="all">all</option><option value="official">official</option><option value="community">community</option></select></label>}
      </div>

      {libraryView === 'published' ? (
        <>
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
        </>
      ) : (
        <>
          <div className="private-vault-note">
            <strong>{privateFiles.length.toLocaleString()} indexed private files</strong>
            <span>Checksummed from the mounted source folder. Raw third-party bytes are not exposed by the public site.</span>
          </div>
          <ListPagination {...privatePagination} onPageChange={privatePagination.setPage} />
          <div className="private-source-grid" data-testid="private-source-grid">
            {privatePagination.pageItems.map((file) => (
              <article key={file.id} className="card private-source-card">
                <div className="card-header-row">
                  <span className={`subtest-badge ${file.subtest === 'general' ? '' : `subtest-${file.subtest}`}`}>{file.subtest}</span>
                  <span className="tag">{file.format}</span>
                </div>
                <h3 title={file.filename}>{file.filename}</h3>
                <p className="private-source-path">{file.relativePath}</p>
                <div className="private-source-meta">
                  <span>{formatBytes(file.bytes)}</span>
                  <span>{file.archiveMatched ? 'Archive matched' : 'Direct folder record'}</span>
                </div>
                <code>SHA-256 {file.sha256.slice(0, 16)}…</code>
              </article>
            ))}
          </div>
          <ListPagination {...privatePagination} onPageChange={privatePagination.setPage} />
        </>
      )}
    </div>
  );
}
