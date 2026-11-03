import { privateUsmleUrl } from '../lib/usmleLibrary';

export function UsmleSourceImages({ images, label }: { images?: string[]; label: string }) {
  if (!images?.length) return null;
  return <details className="usmle-source-images">
    <summary>{label} · {images.length} image{images.length === 1 ? '' : 's'}</summary>
    <p className="meta">Inspect the source for clinical images, tables and any extraction errors.</p>
    {images.map((asset, index) => <figure key={asset}>
      <a href={privateUsmleUrl(asset)} target="_blank" rel="noreferrer"><img src={privateUsmleUrl(asset)} loading="lazy" alt={`${label}, image ${index + 1}`} /></a>
      <figcaption>Image {index + 1} · Open full size</figcaption>
    </figure>)}
  </details>;
}
