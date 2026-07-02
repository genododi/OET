import { useMemo, useState } from 'react';
import { AudioPlayer } from './AudioPlayer';
import { PdfViewer } from './PdfViewer';
import {
  ashganLibraryImportedAt,
  ashganLibraryItems,
  ashganLibrarySourceHandles,
} from '../data/ashganLibrary';
import type { AshganAssetKind, OetSubtest } from '../types';
import { SubtestBadge } from './SubtestBadge';

const kindFilters: Array<AshganAssetKind | 'all'> = [
  'all',
  'note',
  'pdf',
  'audio',
  'image',
  'video',
];

const subtestFilters: Array<OetSubtest | 'general' | 'all'> = [
  'all',
  'general',
  'listening',
  'reading',
  'writing',
  'speaking',
];

export function AshganLibraryPanel() {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<(typeof kindFilters)[number]>('all');
  const [subtest, setSubtest] = useState<(typeof subtestFilters)[number]>('all');
  const [ashganOnly, setAshganOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ashganLibraryItems.filter((item) => {
      if (ashganOnly && !item.attributedToAshgan) return false;
      if (kind !== 'all' && item.kind !== kind) return false;
      if (subtest !== 'all' && item.subtest !== subtest) return false;
      if (!q) return true;
      return [item.title, item.body, item.sourceHandle, item.sourceLabel]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [query, kind, subtest, ashganOnly]);

  const selected = ashganLibraryItems.find((i) => i.id === selectedId) ?? null;

  if (selected?.kind === 'pdf' && selected.mediaPath) {
    return (
      <div className="ashgan-library-viewer">
        <button
          type="button"
          className="btn btn-ghost back-btn"
          onClick={() => setSelectedId(null)}
        >
          ← Back to library
        </button>
        <PdfViewer
          src={selected.mediaPath}
          title={selected.title}
          description={selected.body}
          source={selected.sourceLabel}
        />
      </div>
    );
  }

  return (
    <section id="ashgan-library" className="card ashgan-library-section">
      <div className="ashgan-guide-header">
        <div>
          <span className="guide-category">Telegram · Imported files</span>
          <h2>Dr. Ashgan library</h2>
          <p className="meta">
            Notes, PDFs, audio, and images from public OET Telegram channels or your Desktop
            export. Items marked <strong>Dr. Ashgan</strong> match her name in the export/sender
            field only.
          </p>
        </div>
      </div>

      <p className="ashgan-import-status">
        <strong>{ashganLibraryItems.length}</strong> imported item(s)
        {ashganLibraryImportedAt ? (
          <span className="meta"> · last import {ashganLibraryImportedAt}</span>
        ) : null}
        {ashganLibrarySourceHandles.length > 0 ? (
          <span className="meta">
            {' '}
            · handles: {ashganLibrarySourceHandles.join(', ')}
          </span>
        ) : null}
      </p>

      <div className="search-bar">
        <input
          type="search"
          placeholder="Search library…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search Ashgan library"
        />
      </div>

      <div className="filter-bar">
        {kindFilters.map((k) => (
          <button
            key={k}
            type="button"
            className={`filter-chip ${kind === k ? 'filter-chip-active' : ''}`}
            onClick={() => setKind(k)}
          >
            {k === 'all' ? 'All types' : k}
          </button>
        ))}
      </div>

      <div className="filter-bar">
        {subtestFilters.map((f) => (
          <button
            key={f}
            type="button"
            className={`filter-chip ${subtest === f ? 'filter-chip-active' : ''}`}
            onClick={() => setSubtest(f)}
          >
            {f === 'all' ? 'All subtests' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={ashganOnly}
            onChange={(e) => setAshganOnly(e.target.checked)}
          />
          Dr. Ashgan only
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="empty-state">
          No imported files yet. Run{' '}
          <code>npm run import-ashgan -- --default-handles --download --write-ts</code> for public
          channels, or export the private group from Telegram Desktop and pass{' '}
          <code>--export-json</code>.
        </p>
      ) : (
        <ul className="ashgan-library-list">
          {filtered.map((item) => (
            <li key={item.id} className="ashgan-library-item card">
              <div className="ashgan-entry-head">
                <span className={`tag tag-kind-${item.kind}`}>{item.kind}</span>
                <SubtestBadge subtest={item.subtest} />
                {item.attributedToAshgan ? (
                  <span className="tag tag-ashgan">Dr. Ashgan</span>
                ) : (
                  <span className="tag tag-adjacent">Adjacent</span>
                )}
                <h3>{item.title}</h3>
              </div>
              {item.body ? (
                <p className="meta ashgan-library-snippet">
                  {item.body.length > 280 ? `${item.body.slice(0, 280)}…` : item.body}
                </p>
              ) : null}
              <p className="ashgan-source">
                {item.sourceHandle}
                {item.sourceUrl ? (
                  <>
                    {' · '}
                    <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                      Open post
                    </a>
                  </>
                ) : null}
                {item.publishedAt ? <span className="meta"> · {item.publishedAt}</span> : null}
              </p>

              {item.kind === 'pdf' && item.mediaPath ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedId(item.id)}
                >
                  View PDF
                </button>
              ) : null}

              {item.kind === 'audio' && (item.mediaPath || item.externalUrl) ? (
                <AudioPlayer
                  src={item.mediaPath}
                  externalUrl={item.externalUrl}
                  label={item.title}
                  note={item.sourceHandle}
                />
              ) : null}

              {item.kind === 'image' && item.mediaPath ? (
                <figure className="ashgan-image-preview">
                  <img src={item.mediaPath} alt={item.title} loading="lazy" />
                </figure>
              ) : null}

              {item.kind === 'image' && !item.mediaPath && item.externalUrl ? (
                <a
                  href={item.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm"
                >
                  Open image (CDN) →
                </a>
              ) : null}

              {item.kind === 'note' ? (
                <>
                  {item.body ? <p className="ashgan-note-body">{item.body}</p> : null}
                  {item.mediaPath ? (
                    <a
                      href={item.mediaPath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-btn"
                    >
                      Download note file →
                    </a>
                  ) : null}
                </>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <details className="ashgan-import-help">
        <summary>How to import OET Victory with Dr Ashgan (private group)</summary>
        <ol>
          <li>
            Join{' '}
            <a href="https://t.me/+VFLW7jSfihO61Mys" target="_blank" rel="noopener noreferrer">
              OET Victory with Dr Ashgan
            </a>{' '}
            in Telegram.
          </li>
          <li>
            Settings → Advanced → Export Telegram data → select &quot;OET Victory with Dr
            Ashgan&quot; → JSON.
          </li>
          <li>
            Run:{' '}
            <code>
              npm run import-ashgan -- --export-json /path/to/result.json --download --write-ts
            </code>
          </li>
          <li>
            Posts from senders containing &quot;Ashgan&quot; are tagged Dr. Ashgan; use{' '}
            <code>--attribute-all</code> only if you are sure the export is her channel only.
          </li>
        </ol>
      </details>
    </section>
  );
}
