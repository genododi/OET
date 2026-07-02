import { usePdfAvailable } from '../hooks/usePdfAvailable';

interface PdfViewerProps {
  src: string;
  title: string;
  description?: string;
  meta?: string;
  author?: string;
  source?: string;
}

export function PdfViewer({
  src,
  title,
  description,
  meta,
  author,
  source,
}: PdfViewerProps) {
  const status = usePdfAvailable(src);

  return (
    <div className="pdf-viewer">
      <div className="pdf-toolbar">
        <span className="pdf-title">{title}</span>
        <div className="pdf-toolbar-actions">
          {status === 'available' && (
            <a href={src} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
              Open in new tab ↗
            </a>
          )}
          {status === 'missing' && (
            <span className="tag tag-missing">PDF not uploaded</span>
          )}
        </div>
      </div>

      <div className="pdf-frame-wrap">
        {status === 'checking' && (
          <div className="pdf-fallback">
            <p>Checking for PDF file…</p>
          </div>
        )}

        {status === 'available' && (
          <iframe src={src} title={title} className="pdf-object" />
        )}

        {status === 'missing' && (
          <DocumentPreview
            title={title}
            description={description}
            meta={meta}
            author={author}
            source={source}
            pdfPath={src}
          />
        )}
      </div>
    </div>
  );
}

function DocumentPreview({
  title,
  description,
  meta,
  author,
  source,
  pdfPath,
}: Omit<PdfViewerProps, 'src'> & { pdfPath: string }) {
  return (
    <div className="pdf-preview-doc">
      <div className="pdf-preview-header">
        <span className="pdf-preview-icon" aria-hidden="true">
          📄
        </span>
        <div>
          <h3>{title}</h3>
          {meta && <p className="meta">{meta}</p>}
        </div>
      </div>

      {author && (
        <p>
          <strong>Author:</strong> {author}
        </p>
      )}
      {source && (
        <p>
          <strong>Source:</strong> {source}
        </p>
      )}
      {description && <p className="pdf-preview-body">{description}</p>}

      <div className="pdf-preview-notice card">
        <h4>How to enable the PDF viewer</h4>
        <p>
          Place your PDF file at <code>{pdfPath}</code> in the project&apos;s{' '}
          <code>public</code> folder, then refresh this page.
        </p>
        <ol>
          <li>
            Copy the file to{' '}
            <code>
              public{pdfPath}
            </code>
          </li>
          <li>Keep the filename exactly as listed in the data file</li>
          <li>Reload — the app will detect the file automatically</li>
        </ol>
      </div>
    </div>
  );
}

interface PdfLibraryItemProps {
  title: string;
  meta: string;
  description: string;
  pdfPath: string;
  tags?: string[];
  onOpen: () => void;
}

export function PdfLibraryItem({
  title,
  meta,
  description,
  pdfPath,
  tags,
  onOpen,
}: PdfLibraryItemProps) {
  const status = usePdfAvailable(pdfPath);

  return (
    <article className="card pdf-card">
      <div className="pdf-card-icon" aria-hidden="true">
        📄
      </div>
      <div className="pdf-card-body">
        <div className="card-header-row">
          <h3>{title}</h3>
          {status === 'available' && <span className="tag tag-available">Ready</span>}
          {status === 'missing' && <span className="tag tag-missing">Preview only</span>}
        </div>
        <p className="meta">{meta}</p>
        <p className="description">{description}</p>
        {tags && tags.length > 0 && (
          <div className="tag-row">
            {tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <button type="button" className="btn btn-primary" onClick={onOpen}>
        {status === 'available' ? 'View PDF' : 'Read preview'}
      </button>
    </article>
  );
}
