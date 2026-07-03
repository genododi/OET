import { useEffect, useMemo, useState } from 'react';
import { AshganLibraryPanel } from './AshganLibraryPanel';
import {
  ashganGuideEntries,
  ashganGuideMeta,
  ashganRelatedTelegram,
} from '../data/ashganGuide';
import type { OetSubtest } from '../types';
import { SubtestBadge } from './SubtestBadge';

const subtestFilters: Array<OetSubtest | 'general' | 'all'> = [
  'all',
  'general',
  'listening',
  'reading',
  'writing',
  'speaking',
];

interface Props {
  /** Scroll into view when navigating from Home (#guide/ashgan). */
  focus?: boolean;
}

export function AshganGuideSection({ focus }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof subtestFilters)[number]>('all');

  useEffect(() => {
    if (focus) {
      const el = document.getElementById('ashgan-guide') ?? document.getElementById('ashgan-library');
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [focus]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ashganGuideEntries.filter((entry) => {
      if (filter !== 'all' && entry.subtest !== filter) return false;
      if (!q) return true;
      return [entry.title, entry.body, entry.sourceLabel].join(' ').toLowerCase().includes(q);
    });
  }, [query, filter]);

  return (
    <section id="ashgan-guide" className="card ashgan-guide-section">
      <div className="ashgan-guide-header">
        <div>
          <span className="guide-category">Telegram · Instructor guide</span>
          <h2>Dr. Ashgan&apos;s Telegram Guide</h2>
          <p className="meta ashgan-scope-note">{ashganGuideMeta.scopeNote}</p>
          <p className="ashgan-primary-link">
            <strong>{ashganGuideMeta.groupName}</strong>
            {' · '}
            <a
              href={ashganGuideMeta.telegramInviteUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Join on Telegram
            </a>
          </p>
        </div>
        <span className="tag tag-telegram">Telegram</span>
      </div>

      <div className="ashgan-import-status">
        <strong>Import status:</strong>{' '}
        {ashganGuideEntries.length === 0
          ? `Private group found — join ${ashganGuideMeta.groupName}, then export the chat to import.`
          : `${ashganGuideEntries.length} guide note(s) attributed to Dr. Ashgan.`}
        <span className="meta"> Last checked {ashganGuideMeta.investigatedAt}.</span>
      </div>

      <div className="search-bar">
        <input
          type="search"
          placeholder="Search Dr. Ashgan guide…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search Dr. Ashgan Telegram guide"
        />
      </div>

      <div className="filter-bar">
        {subtestFilters.map((f) => (
          <button
            key={f}
            type="button"
            className={`filter-chip ${filter === f ? 'filter-chip-active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="ashgan-empty">
          <p className="empty-state">
            {ashganGuideEntries.length === 0
              ? `Join ${ashganGuideMeta.groupName} via Telegram, export the chat, and run the import command below.`
              : 'No entries match your search.'}
          </p>
          <details className="ashgan-blockers" open={ashganGuideEntries.length === 0}>
            <summary>Import {ashganGuideMeta.groupName}</summary>
            <p className="meta">
              Invite link:{' '}
              <a
                href={ashganGuideMeta.telegramInviteUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {ashganGuideMeta.telegramInviteUrl}
              </a>
            </p>
            <ul>
              {ashganGuideMeta.blockers.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <ol className="ashgan-import-steps">
              <li>
                Join{' '}
                <a
                  href={ashganGuideMeta.telegramInviteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {ashganGuideMeta.groupName}
                </a>{' '}
                in Telegram.
              </li>
              <li>
                Telegram Desktop → <strong>Settings → Advanced → Export Telegram data</strong> →
                select <strong>{ashganGuideMeta.groupName}</strong> → <strong>JSON</strong>.
              </li>
              <li>
                Run:{' '}
                <code>
                  npm run import-ashgan -- --export-json /path/to/result.json --download --write-ts
                </code>
              </li>
              <li>Posts from senders named “Ashgan” appear under Dr. Ashgan; others are Adjacent.</li>
            </ol>
          </details>
        </div>
      ) : (
        <ul className="ashgan-entry-list">
          {filtered.map((entry) => (
            <li key={entry.id} className="ashgan-entry card">
              <div className="ashgan-entry-head">
                <SubtestBadge subtest={entry.subtest} />
                <h3>{entry.title}</h3>
              </div>
              <p>{entry.body}</p>
              <p className="ashgan-source">
                Source:{' '}
                {entry.sourceUrl ? (
                  <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer">
                    {entry.sourceLabel}
                  </a>
                ) : (
                  <span>{entry.sourceLabel}</span>
                )}
                {entry.publishedAt ? <span className="meta"> · {entry.publishedAt}</span> : null}
              </p>
            </li>
          ))}
        </ul>
      )}

      <AshganLibraryPanel />

      <div className="ashgan-related">
        <h3>Related Telegram links (medicine OET)</h3>
        <p className="meta">
          These are verified public or app-only links from the investigation — not attributed to
          Dr. Ashgan unless she confirms admin ownership.
        </p>
        <ul className="ashgan-link-list">
          {ashganRelatedTelegram.map((link) => (
            <li key={link.handle}>
              <a href={link.url} target="_blank" rel="noopener noreferrer">
                {link.handle}
              </a>
              <span className="meta"> — {link.label}</span>
              <span className={`tag tag-vis-${link.visibility}`}>{link.visibility}</span>
              <p className="meta">{link.note}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
