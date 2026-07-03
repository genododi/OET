import { useEffect, useMemo, useState } from 'react';
import { bookPdfs } from '../data/books';
import { getListeningAudioForBook, resolveAudioSrc } from '../data/listeningAudio';
import { PdfLibraryItem, PdfViewer } from '../components/PdfViewer';
import { AudioPlayer } from '../components/AudioPlayer';
import {
  matchesProfessionFilter,
  orderProfessions,
  sortByPreferredProfession,
} from '../lib/preferredProfession';

interface Props {
  initialItemId?: string;
  defaultProfession?: string;
  onItemChange?: (itemId?: string) => void;
}

export function BooksPage({ initialItemId, defaultProfession = 'Medicine', onItemChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(initialItemId ?? null);
  const [query, setQuery] = useState('');
  const [profession, setProfession] = useState(defaultProfession);

  const professions = useMemo(
    () =>
      orderProfessions(
        ['all', ...Array.from(new Set(bookPdfs.map((b) => b.profession)))],
        defaultProfession,
      ),
    [defaultProfession],
  );

  useEffect(() => {
    setSelectedId(initialItemId ?? null);
  }, [initialItemId]);

  const selected = bookPdfs.find((b) => b.id === selectedId) ?? null;
  const listeningTrack = selected ? getListeningAudioForBook(selected.id) : undefined;

  const openItem = (id: string) => {
    setSelectedId(id);
    onItemChange?.(id);
  };

  const closeItem = () => {
    setSelectedId(null);
    onItemChange?.(undefined);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = bookPdfs.filter((book) => {
      if (!matchesProfessionFilter(book.profession, profession)) return false;
      if (!q) return true;
      return [book.title, book.author, book.description, ...book.tags].join(' ').toLowerCase().includes(q);
    });
    return sortByPreferredProfession(items, defaultProfession);
  }, [query, profession, defaultProfession]);

  if (selected) {
    return (
      <div className="page-section">
        <button type="button" className="btn btn-ghost back-btn" onClick={closeItem}>
          ← Back to library
        </button>
        <PdfViewer
          src={selected.pdfPath}
          title={selected.title}
          description={selected.description}
          meta={`${selected.author} · ${selected.profession} · ${selected.pages} pages`}
          author={selected.author}
        />
        {listeningTrack && (
          <div className="book-audio-section">
            <h3>Listening audio</h3>
            <AudioPlayer
              src={resolveAudioSrc(listeningTrack)}
              externalUrl={listeningTrack.externalUrl ?? listeningTrack.cdnUrl}
              label={listeningTrack.label}
              note={listeningTrack.note}
              examMode={listeningTrack.id === 'sample-test-3'}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page-section">
      <p className="page-intro">
        Official OET preparation PDFs from oet.com — medicine-relevant guides sorted first. Listening
        sample tests include an audio player after <code>npm run import-audio</code> (Sample Tests 1–3
        plus Part B clip Q28). Mini Listening Test #1 links to oet.com — no public MP3 on the CDN.
      </p>

      <div className="search-bar">
        <input
          type="search"
          placeholder="Search books…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search book PDFs"
        />
      </div>

      <div className="filter-bar filter-bar-scroll">
        {professions.map((p) => (
          <button
            key={p}
            type="button"
            className={`filter-chip ${profession === p ? 'filter-chip-active' : ''}`}
            onClick={() => setProfession(p)}
          >
            {p === 'all' ? 'All professions' : p}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="empty-state">No books match your search.</p>
      ) : (
        <div className="pdf-library">
          {filtered.map((book) => (
            <PdfLibraryItem
              key={book.id}
              title={book.title}
              meta={`${book.author} · ${book.profession} · ${book.pages} pages${
                getListeningAudioForBook(book.id) ? ' · 🎧 audio' : ''
              }`}
              description={book.description}
              pdfPath={book.pdfPath}
              tags={book.tags}
              onOpen={() => openItem(book.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
