import { useEffect, useMemo, useState } from 'react';
import { experiencePdfs } from '../data/experiencePdfs';
import { PdfLibraryItem, PdfViewer } from '../components/PdfViewer';

interface Props {
  initialItemId?: string;
  onItemChange?: (itemId?: string) => void;
}

export function ExperiencePdfsPage({ initialItemId, onItemChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(initialItemId ?? null);
  const [query, setQuery] = useState('');
  const [profession, setProfession] = useState('all');

  const professions = useMemo(
    () => ['all', ...Array.from(new Set(experiencePdfs.map((p) => p.profession))).sort()],
    [],
  );

  useEffect(() => {
    setSelectedId(initialItemId ?? null);
  }, [initialItemId]);

  const selected = experiencePdfs.find((p) => p.id === selectedId) ?? null;

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
    return experiencePdfs.filter((pdf) => {
      if (profession !== 'all' && pdf.profession !== profession) return false;
      if (!q) return true;
      return [pdf.title, pdf.author, pdf.description, pdf.source, pdf.profession]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [query, profession]);

  if (selected) {
    return (
      <div className="page-section">
        <button type="button" className="btn btn-ghost back-btn" onClick={closeItem}>
          ← Back to experiences
        </button>
        <PdfViewer
          src={selected.pdfPath}
          title={selected.title}
          description={selected.description}
          meta={`${selected.author} · ${selected.profession} · ${selected.examDate}`}
          author={selected.author}
          source={selected.source}
        />
      </div>
    );
  }

  return (
    <div className="page-section">
      <p className="page-intro">
        Detailed exam experience write-ups compiled from Telegram study group debriefs. Each PDF
        includes summary, takeaways, and sub-test recalls. Regenerate with <code>npm run import-pdfs</code>.
      </p>

      <div className="search-bar">
        <input
          type="search"
          placeholder="Search experience PDFs…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search experience PDFs"
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
        <p className="empty-state">No experience PDFs match your search.</p>
      ) : (
        <div className="pdf-library">
          {filtered.map((pdf) => (
            <PdfLibraryItem
              key={pdf.id}
              title={pdf.title}
              meta={`${pdf.author} · ${pdf.profession} · ${pdf.examDate}`}
              description={`${pdf.description} (Source: ${pdf.source})`}
              pdfPath={pdf.pdfPath}
              onOpen={() => openItem(pdf.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
