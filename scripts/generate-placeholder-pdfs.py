#!/usr/bin/env python3
"""Generate minimal placeholder PDFs for all catalogued paths."""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"

PATHS = [
    "/pdfs/books/oet-official-sample-tests.pdf",
    "/pdfs/books/oet-nursing-writing-guide.pdf",
    "/pdfs/books/oet-medicine-speaking-cards.pdf",
    "/pdfs/books/oet-listening-workbook.pdf",
    "/pdfs/books/oet-reading-strategies.pdf",
    "/pdfs/books/oet-medical-vocabulary.pdf",
    "/pdfs/books/oet-pharmacy-writing-speaking.pdf",
    "/pdfs/books/oet-physio-pack.pdf",
    "/pdfs/books/oet-dentistry-pack.pdf",
    "/pdfs/books/oet-writing-criteria-examples.pdf",
    "/pdfs/books/oet-speaking-roleplay-bundle.pdf",
    "/pdfs/books/oet-grammar-healthcare.pdf",
    "/pdfs/books/oet-mock-collection-1-5.pdf",
    "/pdfs/books/oet-telegram-tips-compilation.pdf",
    "/pdfs/books/oet-radiography-pack.pdf",
    "/pdfs/experiences/nursing-cbt-london-mar2025.pdf",
    "/pdfs/experiences/medicine-paper-mumbai-jan2025.pdf",
    "/pdfs/experiences/pharmacy-dubai-nov2024.pdf",
    "/pdfs/experiences/physio-speaking-retake-dec2024.pdf",
    "/pdfs/experiences/nursing-6week-plan-debrief.pdf",
    "/pdfs/experiences/topic-frequency-report-2024-2025.pdf",
    "/pdfs/experiences/medicine-writing-retake-apr2025.pdf",
    "/pdfs/experiences/nursing-oet-at-home-feb2025.pdf",
    "/pdfs/experiences/pharmacy-cairo-dec2024.pdf",
    "/pdfs/experiences/dentistry-writing-pitfalls-oct2024.pdf",
    "/pdfs/experiences/radiography-manila-aug2024.pdf",
    "/pdfs/experiences/speaking-interruption-strategies-jul2024.pdf",
    "/pdfs/experiences/nursing-toronto-may2024.pdf",
    "/pdfs/experiences/physio-speaking-workbook-dec2024.pdf",
    "/pdfs/experiences/exam-day-logistics-guide.pdf",
]


def pdf_bytes(title: str) -> bytes:
    safe = title.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    if len(safe) > 80:
        safe = safe[:77] + "..."
    stream = f"BT /F1 14 Tf 50 750 Td ({safe}) Tj 0 -20 Td (OET Study Partner placeholder) Tj ET"
    stream_bytes = stream.encode("latin-1", errors="replace")

    objects = []
    objects.append(b"1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n")
    objects.append(b"2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n")
    objects.append(
        b"3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>endobj\n"
    )
    objects.append(b"4 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n")
    objects.append(
        f"5 0 obj<< /Length {len(stream_bytes)} >>stream\n".encode()
        + stream_bytes
        + b"\nendstream endobj\n"
    )

    body = b"".join(objects)
    header = b"%PDF-1.4\n"
    offsets = [0]
    pos = len(header)
    for obj in objects:
        offsets.append(pos)
        pos += len(obj)

    xref_pos = pos
    xref = [b"xref\n", f"0 {len(offsets)}\n".encode(), b"0000000000 65535 f \n"]
    for off in offsets[1:]:
        xref.append(f"{off:010d} 00000 n \n".encode())
    xref_bytes = b"".join(xref)
    trailer = f"trailer<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode()
    return header + body + xref_bytes + trailer


def main() -> None:
    for rel in PATHS:
        out = PUBLIC / rel.lstrip("/")
        out.parent.mkdir(parents=True, exist_ok=True)
        title = out.stem.replace("-", " ").replace("_", " ")
        out.write_bytes(pdf_bytes(title))
        print(f"Wrote {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
