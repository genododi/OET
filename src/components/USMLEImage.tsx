interface Props {
  src: string;
  caption?: string;
  alt?: string;
}

export function USMLEImage({ src, caption, alt }: Props) {
  return (
    <figure className="usmle-image-figure">
      <img src={src} alt={alt ?? caption ?? 'Clinical image'} className="usmle-vignette-image" />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
