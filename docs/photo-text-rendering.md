# Text from photographs and scanned pages

The local recogniser retains paragraph boundaries, page dimensions, text positions,
word positions and recognition confidence. A temporary OCR copy can have thin,
long intersecting table rules removed so they do not hide short cell labels; the
recognised text keeps the original coordinates. If the primary recogniser finds no words, an available macOS Vision pass can
recover handwriting or difficult text. Such transcriptions are explicitly labelled
for review and are not promoted to automatic exam questions or answer keys.

It does not replace the original image
or silently correct medical wording, doses, dates or answer keys. Uncertain words
are marked so the learner can compare them with the original.

The shared source reader covers imported OET/AMR sources and the Benchmark papers
that use the same reader. Readable text reflows wrapped prose conservatively, while
preserving question numbering, answer blanks, lists, short case-note lines and
spaced table rows. Match page layout uses selectable SVG text to retain columns,
forms and table cell positions. Photos with separated columns use that layout by
default. A selected question range cannot enable the full-page layout.

JPEG, PNG, WebP, HEIC/HEIF, TIFF, BMP, GIF and AVIF originals are recognised locally
when the installed image decoder supports them. Non-browser formats receive a PNG
preview. Animated or multipage image files currently use the decoder's first frame;
PDFs retain individually numbered pages. The original remains available throughout.
An image with no recognised wording opens its original view rather than a blank
reader. Recognition cannot recover detail that is absent or illegible in a photo.

The versioned page cache allows existing photo text to be upgraded once without
repeatedly processing the whole library. The normal daily pipeline prioritises
unprocessed photo layouts, publishes their matched text and rebuilds the Mac app.
The `--images-only` option limits a recognition run to photographs; `--cached-only`
imports existing versioned OCR cache entries without new recognition. Neither option
changes external originals. Layout is derived from local Tesseract TSV output or
macOS Vision bounding boxes; no AI service or API key is involved.
