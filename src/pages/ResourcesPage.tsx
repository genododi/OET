import { useMemo, useState } from 'react';
import type { NavSection, OetSubtest, StudyResourceFormat } from '../types';
import { filterStudyResources, studyResources } from '../data/studyResources';
import localSourceFiles from '../data/googleDriveFolderLibrary.generated.json';
import localSourceSummary from '../data/googleDriveFolderCatalog.generated.json';
import { ListPagination } from '../components/ListPagination';
import { usePagination } from '../hooks/usePagination';
import { localSourceFileUrl } from '../lib/localSourceGateway';

const subtests: Array<OetSubtest | 'general' | 'all'> = ['all', 'general', 'listening', 'reading', 'writing', 'speaking'];
const formats: Array<StudyResourceFormat | 'all'> = ['all', 'guide', 'sample-test', 'video', 'reference'];

interface Props {
  onNavigate?: (section: NavSection, itemId?: string) => void;
}

export function ResourcesPage({ onNavigate }: Props) {
  const [libraryView, setLibraryView] = useState<'published' | 'private'>('published');
  const [query, setQuery] = useState('');
  const [subtest, setSubtest] = useState<(typeof subtests)[number]>('all');
  const [format, setFormat] = useState<(typeof formats)[number]>('all');
  const [source, setSource] = useState<'all' | 'official' | 'community'>('all');
  const [privateFormat, setPrivateFormat] = useState('all');
  const [learningRole, setLearningRole] = useState('all');
  const [integrationStatus, setIntegrationStatus] = useState('all');
  const resources = useMemo(
    () => filterStudyResources(studyResources, { query, subtest, format, source }),
    [query, subtest, format, source],
  );
  const privateFiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return localSourceFiles.filter((file) => {
      if (subtest !== 'all' && file.subtest !== subtest) return false;
      if (privateFormat !== 'all' && file.format !== privateFormat) return false;
      if (learningRole !== 'all' && file.learningRole !== learningRole) return false;
      if (integrationStatus !== 'all' && file.integrationStatus !== integrationStatus) return false;
      if (!q) return true;
      return [file.filename, file.relativePath, file.subtest, file.format, file.mimeType]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [integrationStatus, learningRole, privateFormat, query, subtest]);
  const privatePagination = usePagination(privateFiles);
  const privateFormats = useMemo(
    () => ['all', ...new Set(localSourceFiles.map((file) => file.format).sort())],
    [],
  );
  const learningRoles = useMemo(
    () => ['all', ...new Set(localSourceFiles.map((file) => file.learningRole).sort())],
    [],
  );
  const integrationStatuses = useMemo(
    () => ['all', ...new Set(localSourceFiles.map((file) => file.integrationStatus).sort())],
    [],
  );

  const humanize = (value: string) => value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

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
            Every mounted source file now feeds a traceable learning map for tests, mocks and practice.
            Only official or permission-cleared bytes are published; restricted source material stays private.
          </p>
        </div>
        <span className="source-policy-shield" aria-hidden="true">✓</span>
      </section>

      <section className="source-learning-pipeline" aria-labelledby="source-learning-heading">
        <div className="section-heading-row">
          <div>
            <span className="section-kicker">Source-to-practice engine</span>
            <h3 id="source-learning-heading">Every file accounted for, every safe file mapped</h3>
          </div>
          <span className="tag tag-available">Daily refresh active</span>
        </div>
        <div className="source-pipeline-grid">
          <article><span>01</span><strong>{localSourceSummary.sourceFiles.toLocaleString()}</strong><small>Files indexed + checksummed</small></article>
          <article><span>02</span><strong>{localSourceSummary.practiceBlueprintFiles.toLocaleString()}</strong><small>Practice blueprint sources</small></article>
          <article><span>03</span><strong>{(localSourceSummary.restrictedPrivateFiles + localSourceSummary.unsafeRecordedFiles).toLocaleString()}</strong><small>Restricted or unsafe, private</small></article>
          <article><span>04</span><strong>{localSourceSummary.verifiedRealTestFiles.toLocaleString()}</strong><small>Records in verified real tests</small></article>
        </div>
        <div className="source-route-grid">
          {(['listening', 'reading', 'writing', 'speaking'] as const).map((item) => (
            <button key={item} type="button" onClick={() => onNavigate?.('practice', item)}>
              <span className={`source-route-icon source-route-${item}`} aria-hidden="true">{item.charAt(0).toUpperCase()}</span>
              <span><strong>{humanize(item)}</strong><small>{localSourceSummary.byLearningRoute[item].toLocaleString()} mapped source records</small></span>
              <span aria-hidden="true">→</span>
            </button>
          ))}
        </div>
        <p className="source-github-note">
          {localSourceSummary.overGithubBlobLimitFiles.toLocaleString()} files exceed GitHub's 100 MiB Git-blob limit. Their checksums and learning routes are included here, while the raw private bytes remain on GENODODI.
        </p>
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
        {libraryView === 'private' && <label>Format<select aria-label="Private source format" value={privateFormat} onChange={(event) => setPrivateFormat(event.target.value)}>{privateFormats.map((item) => <option key={item} value={item}>{humanize(item)}</option>)}</select></label>}
        {libraryView === 'private' && <label>Learning role<select aria-label="Private learning role" value={learningRole} onChange={(event) => setLearningRole(event.target.value)}>{learningRoles.map((item) => <option key={item} value={item}>{humanize(item)}</option>)}</select></label>}
        {libraryView === 'private' && <label>Integration<select aria-label="Private integration status" value={integrationStatus} onChange={(event) => setIntegrationStatus(event.target.value)}>{integrationStatuses.map((item) => <option key={item} value={item}>{humanize(item)}</option>)}</select></label>}
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
            <span>Open files through the read-only local gateway when GENODODI is mounted. Private bytes stay on this Mac and are never uploaded by the public site.</span>
          </div>
          <ListPagination {...privatePagination} onPageChange={privatePagination.setPage} />
          <div className="private-source-grid" data-testid="private-source-grid">
            {privatePagination.pageItems.map((file) => (
              <article key={file.id} className="card private-source-card">
                <div className="card-header-row">
                  <span className={`subtest-badge subtest-${file.learningRoute}`}>{file.learningRoute}</span>
                  <span className="tag">{file.format}</span>
                </div>
                <h3 title={file.filename}>{file.filename}</h3>
                <p className="private-source-path">{file.relativePath}</p>
                <div className="source-file-flags">
                  <span>{humanize(file.learningRole)}</span>
                  <span className={`source-status source-status-${file.integrationStatus}`}>{humanize(file.integrationStatus)}</span>
                  {file.githubBlobStatus === 'requires-lfs' && <span className="source-status source-status-large">Over 100 MiB</span>}
                </div>
                <div className="private-source-meta">
                  <span>{formatBytes(file.bytes)}</span>
                  <span>{file.archiveMatched ? 'Archive matched' : 'Direct folder record'}</span>
                </div>
                <code>SHA-256 {file.sha256.slice(0, 16)}…</code>
                <a
                  className="btn btn-primary btn-sm private-source-open"
                  href={localSourceFileUrl(file.relativePath)}
                  title="Requires the GENODODI drive and OET local source gateway on this Mac"
                >
                  Open local file
                </a>
              </article>
            ))}
          </div>
          <ListPagination {...privatePagination} onPageChange={privatePagination.setPage} />
        </>
      )}
    </div>
  );
}
