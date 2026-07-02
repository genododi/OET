#!/usr/bin/env python3
"""
Import Telegram public channel previews and optional Desktop exports into OET Study Partner.

Scrapes https://t.me/s/<handle> (text, links, documents, photos, audio) and downloads
public CDN files to public/ashgan/{notes,pdfs,audio,images}/.

Usage:
  python3 scripts/import-ashgan-assets.py --handle OETDoctors --limit 20 --download --write-ts
  python3 scripts/import-ashgan-assets.py --export-json ~/Downloads/ChatExport/result.json --write-ts
  python3 scripts/import-ashgan-assets.py --default-handles --download --write-ts --limit 12
  python3 scripts/import-ashgan-assets.py --handle @OETDoctorsHub   # private → no preview

Private @OETDoctorsHub: export chat in Telegram Desktop (Settings → Advanced → Export),
then pass --export-json path/to/result.json. Posts from senders matching "ashgan" are
marked attributedToAshgan; others stay adjacent unless you pass --attribute-all.
"""

from __future__ import annotations

import argparse
import html as html_lib
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
PUBLIC_ASHGAN = ROOT / "public" / "ashgan"
LIBRARY_TS = ROOT / "src" / "data" / "ashganLibrary.ts"
GUIDE_TS = ROOT / "src" / "data" / "ashganGuide.ts"
MANIFEST_JSON = ROOT / "src" / "data" / "ashganLibrary.manifest.json"

USER_AGENT = "OET-Study-Partner/1.0 (public Telegram preview importer)"
DEFAULT_HANDLES = ["OETDoctors", "OETimportantmaterials", "OET_ForDoctors", "officialoet"]
INVESTIGATED_HANDLES = [
    "OETDoctorsHub",
    "OETDoctors",
    "officialoet",
    "DrAshgan",
    "drashgan",
    "AshganOET",
    "Dr_Ashgan",
    "OETDrAshgan",
    "DrAshganOET",
    "OETAshgan",
    "Ashgan_OET",
    "OETAshganMedicine",
    "oetashgan",
    "OETimportantmaterials",
    "oetexams_materias",
    "oetlst",
    "medicaldoctorsglobal",
    "OET_ForDoctors",
]

SUBTEST_KEYWORDS: dict[str, list[str]] = {
    "listening": ["listening", "part a", "part b", "part c", "audio", "mp3", "ogg"],
    "reading": ["reading", "part a", "part b", "part c", "skim", "scan"],
    "writing": ["writing", "letter", "referral", "discharge", "hyphen", "grammar"],
    "speaking": ["speaking", "role play", "role-play", "cue card", "interview"],
}


def fetch_url(url: str, timeout: int = 45) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="replace")


def strip_html(raw: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", raw)
    text = re.sub(r"<[^>]+>", "", text)
    return html_lib.unescape(text).strip()


def infer_subtest(text: str, filename: str = "") -> str:
    hay = f"{text} {filename}".lower()
    scores: dict[str, int] = {k: 0 for k in SUBTEST_KEYWORDS}
    for subtest, words in SUBTEST_KEYWORDS.items():
        for w in words:
            if w in hay:
                scores[subtest] += 1
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "general"


def infer_media_type(filename: str, mime_hint: str = "") -> str:
    name = filename.lower()
    if name.endswith(".pdf") or "pdf" in mime_hint:
        return "pdf"
    if re.search(r"\.(mp3|ogg|m4a|wav)$", name) or "audio" in mime_hint:
        return "audio"
    if re.search(r"\.(jpg|jpeg|png|webp|gif)$", name) or "photo" in mime_hint:
        return "image"
    if re.search(r"\.(mp4|webm|mov)$", name) or "video" in mime_hint:
        return "video"
    return "note"


def slugify(text: str, max_len: int = 48) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", text.strip()).strip("-").lower()
    return (s[:max_len] or "item").strip("-")


def parse_message_wraps(page_html: str) -> list[dict[str, Any]]:
    wraps = re.findall(
        r'<div class="tgme_widget_message_wrap[\s\S]*?(?=<div class="tgme_widget_message_wrap|$)',
        page_html,
    )
    items: list[dict[str, Any]] = []
    for block in wraps:
        post_match = re.search(r'data-post="([^"]+)"', block)
        post_id = post_match.group(1) if post_match else ""
        link_match = re.search(r'href="(https://t\.me/[^"]+/\d+)"', block)
        source_url = link_match.group(1) if link_match else ""
        date_match = re.search(r'<time[^>]+datetime="([^"]+)"', block)
        published = date_match.group(1)[:10] if date_match else None
        author_match = re.search(
            r'class="tgme_widget_message_from_author"[^>]*>([^<]+)', block
        )
        author = strip_html(author_match.group(1)) if author_match else ""

        text_match = re.search(
            r'class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)</div>',
            block,
        )
        body = strip_html(text_match.group(1)) if text_match else ""

        doc_title_match = re.search(
            r'class="tgme_widget_message_document_title[^"]*"[^>]*>([^<]+)',
            block,
        )
        doc_title = strip_html(doc_title_match.group(1)) if doc_title_match else ""

        telesco_urls = [
            u
            for u in re.findall(
                r"https://cdn[0-9]?\.telesco\.pe/file/[^\"'\s]+", block
            )
            if "telesco.pe/file/" in u
        ]
        photo_match = re.search(
            r"background-image:url\('(https://cdn[0-9]?\.telesco\.pe/[^']+)'\)",
            block,
        )
        if photo_match and photo_match.group(1) not in telesco_urls:
            telesco_urls.append(photo_match.group(1))

        audio_match = re.search(r'class="tgme_widget_message_voice[^"]*"', block)
        video_match = re.search(r'class="tgme_widget_message_video[^"]*"', block)

        if not body and not doc_title and not telesco_urls:
            continue

        items.append(
            {
                "postId": post_id,
                "sourceUrl": source_url,
                "publishedAt": published,
                "author": author,
                "body": body,
                "documentTitle": doc_title,
                "cdnUrls": telesco_urls,
                "hasVoice": bool(audio_match),
                "hasVideo": bool(video_match),
            }
        )
    return items


def fetch_post_cdn_urls(post_url: str) -> list[str]:
    try:
        page = fetch_url(post_url)
    except Exception:
        return []
    return [
        u
        for u in re.findall(r"https://cdn[0-9]?\.telesco\.pe/file/[^\"'\s]+", page)
        if "telesco.pe/file/" in u
    ]


def scrape_channel(
    handle: str,
    limit: int,
    pages: int = 5,
    start_before: int | None = None,
) -> list[dict[str, Any]]:
    handle = handle.lstrip("@")
    collected: list[dict[str, Any]] = []
    before: int | None = start_before
    for _ in range(pages):
        url = f"https://t.me/s/{handle}"
        if before:
            url += f"?before={before}"
        try:
            page = fetch_url(url)
        except urllib.error.HTTPError as e:
            print(f"  HTTP {e.code} for {url}", file=sys.stderr)
            break
        if "tgme_widget_message" not in page:
            break
        batch = parse_message_wraps(page)
        if not batch:
            break
        for msg in batch:
            msg["sourceHandle"] = f"@{handle}"
            if msg.get("documentTitle") and not msg.get("cdnUrls") and msg.get("sourceUrl"):
                msg["cdnUrls"] = fetch_post_cdn_urls(msg["sourceUrl"])
                time.sleep(0.35)
            collected.append(msg)
            if len(collected) >= limit:
                return collected
        # pagination: oldest post id on page
        ids = [
            int(m.group(1))
            for m in re.finditer(r'data-post="[^/]+/(\d+)"', page)
        ]
        if not ids:
            break
        before = min(ids)
        time.sleep(0.6)
    return collected


def download_file(url: str, dest: Path, max_bytes: int = 25_000_000) -> bool:
    if not url.startswith("https://"):
        return False
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0:
        return True
    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = resp.read(max_bytes + 1)
        if len(data) > max_bytes:
            print(f"  skip (too large): {dest.name}", file=sys.stderr)
            return False
        dest.write_bytes(data)
        print(f"  ✓ {dest.relative_to(ROOT)} ({len(data) // 1024} KB)")
        return True
    except Exception as e:
        print(f"  ✗ download {dest.name}: {e}", file=sys.stderr)
        return False


def guess_extension(url: str, data: bytes | None = None) -> str:
    if data:
        if data.startswith(b"%PDF"):
            return ".pdf"
        if data[:8] == b"\x89PNG\r\n\x1a\n":
            return ".png"
        if data[:2] == b"\xff\xd8":
            return ".jpg"
        if data[:3] == b"ID3":
            return ".mp3"
        if len(data) >= 2 and data[0] == 0xFF and (data[1] & 0xE0) == 0xE0 and data[1] != 0xD8:
            return ".mp3"
        if len(data) >= 8 and data[4:8] == b"ftyp":
            return ".mp4"
    if ".pdf" in url.lower():
        return ".pdf"
    if ".ogg" in url.lower():
        return ".ogg"
    return ".bin"


def build_library_items(
    raw_messages: list[dict[str, Any]],
    *,
    source_handle: str,
    download: bool,
    attribute_ashgan: bool,
) -> list[dict[str, Any]]:
    library: list[dict[str, Any]] = []
    seen_urls: set[str] = set()

    for i, msg in enumerate(raw_messages):
        body = msg.get("body") or ""
        doc_title = msg.get("documentTitle") or ""
        author = msg.get("author") or ""
        attributed = attribute_ashgan or bool(
            re.search(r"ashgan", f"{author} {body}", re.I)
        )
        subtest = infer_subtest(body, doc_title)
        source_url = msg.get("sourceUrl") or ""
        published = msg.get("publishedAt")
        base_id = slugify(doc_title or body[:40] or f"post-{i}")

        cdn_urls: list[str] = list(msg.get("cdnUrls") or [])
        if doc_title.lower().endswith(".pdf"):
            cdn_urls = []
            if source_url:
                cdn_urls = fetch_post_cdn_urls(source_url)
                time.sleep(0.35)
        if cdn_urls:
            for j, url in enumerate(cdn_urls):
                if url in seen_urls:
                    continue
                seen_urls.add(url)
                title = doc_title or (body.split("\n")[0][:80] if body else f"Media {j + 1}")
                media_type = infer_media_type(title)
                ext = guess_extension(url)
                file_bytes: bytes | None = None
                if download:
                    try:
                        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
                        with urllib.request.urlopen(req, timeout=120) as resp:
                            file_bytes = resp.read(25_000_001)
                        if len(file_bytes) > 25_000_000:
                            print(f"  skip (too large): {title[:40]}", file=sys.stderr)
                            continue
                        ext = guess_extension(url, file_bytes)
                    except Exception:
                        file_bytes = None
                if doc_title.lower().endswith(".pdf"):
                    media_type = "pdf"
                    ext = ".pdf"
                if ext in (".mp3", ".ogg", ".m4a", ".wav"):
                    media_type = "audio"
                elif ext == ".pdf":
                    media_type = "pdf"
                elif ext in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
                    media_type = "image"
                folder = {
                    "pdf": "pdfs",
                    "audio": "audio",
                    "image": "images",
                    "video": "images",
                }.get(media_type, "images")
                filename = f"{base_id}-{j}{ext}"
                local_path = f"/ashgan/{folder}/{filename}"
                dest = PUBLIC_ASHGAN / folder / filename
                downloaded = False
                if download and file_bytes is not None:
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    dest.write_bytes(file_bytes)
                    downloaded = True
                    print(f"  ✓ {dest.relative_to(ROOT)} ({len(file_bytes) // 1024} KB)")
                elif download:
                    downloaded = download_file(url, dest)
                if not downloaded and not download:
                    local_path = ""

                library.append(
                    {
                        "id": f"{slugify(source_handle)}-{base_id}-{j}",
                        "kind": media_type,
                        "title": title[:120],
                        "body": body[:1500] if body else "",
                        "subtest": subtest,
                        "sourceUrl": source_url,
                        "sourceHandle": source_handle,
                        "sourceLabel": source_url or source_handle,
                        "publishedAt": published,
                        "mediaPath": local_path if downloaded or dest.exists() else None,
                        "externalUrl": url,
                        "attributedToAshgan": attributed,
                    }
                )
        elif body and len(body) >= 20:
            note_path = ""
            if download:
                notes_dir = PUBLIC_ASHGAN / "notes"
                notes_dir.mkdir(parents=True, exist_ok=True)
                note_file = notes_dir / f"{base_id}.txt"
                note_file.write_text(body, encoding="utf-8")
                note_path = f"/ashgan/notes/{note_file.name}"
                print(f"  ✓ {note_file.relative_to(ROOT)}")
            library.append(
                {
                    "id": f"{slugify(source_handle)}-{base_id}-note",
                    "kind": "note",
                    "title": body.split("\n")[0][:120],
                    "body": body[:2000],
                    "subtest": subtest,
                    "sourceUrl": source_url,
                    "sourceHandle": source_handle,
                    "sourceLabel": source_url or source_handle,
                    "publishedAt": published,
                    "mediaPath": note_path or None,
                    "externalUrl": None,
                    "attributedToAshgan": attributed,
                }
            )

    return library


def resolve_export_file(file_field: str, export_root: Path) -> Path | None:
    if not file_field:
        return None
    raw = Path(file_field)
    candidates = [
        raw,
        export_root / raw,
        export_root.parent / raw,
        export_root / "ChatExport" / raw,
    ]
    for c in candidates:
        if c.is_file():
            return c.resolve()
    return None


def load_telegram_export(path: Path, limit: int) -> list[dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    export_root = path.parent
    messages = data.get("messages") or data.get("chats", {}).get("messages") or []
    if isinstance(messages, dict):
        messages = messages.get("messages", [])
    raw: list[dict[str, Any]] = []
    for m in messages:
        if m.get("type") != "message":
            continue
        text = m.get("text") or ""
        if isinstance(text, list):
            parts = []
            for part in text:
                if isinstance(part, str):
                    parts.append(part)
                elif isinstance(part, dict):
                    parts.append(part.get("text", ""))
            text = "".join(parts)
        text = str(text).strip()
        from_name = m.get("from") or m.get("from_id") or ""
        if isinstance(from_name, dict):
            from_name = from_name.get("first_name", "") or str(from_name)
        file_field = m.get("file") or ""
        file_name = m.get("file_name") or (Path(file_field).name if file_field else "")
        resolved = resolve_export_file(str(file_field), export_root) if file_field else None
        if not text and not file_name:
            continue
        raw.append(
            {
                "postId": str(m.get("id", "")),
                "sourceUrl": "",
                "publishedAt": (m.get("date") or "")[:10] or None,
                "author": str(from_name),
                "body": text,
                "documentTitle": file_name,
                "cdnUrls": [],
                "sourceHandle": "@export",
                "exportFile": str(resolved) if resolved else None,
            }
        )
        if len(raw) >= limit:
            break
    return raw


def copy_export_media(item: dict[str, Any], export_root: Path) -> str | None:
    export_file = item.get("exportFile")
    if not export_file:
        return None
    src = Path(export_file)
    if not src.is_absolute():
        src = export_root / src
    if not src.exists():
        return None
    media_type = infer_media_type(src.name)
    folder = {"pdf": "pdfs", "audio": "audio", "image": "images"}.get(media_type, "notes")
    dest_dir = PUBLIC_ASHGAN / folder
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / f"export-{slugify(src.stem)}{src.suffix.lower()}"
    if not dest.exists():
        dest.write_bytes(src.read_bytes())
        print(f"  ✓ {dest.relative_to(ROOT)}")
    return f"/ashgan/{folder}/{dest.name}"


def process_export(
    export_path: Path,
    limit: int,
    download: bool,
    attribute_all: bool,
) -> list[dict[str, Any]]:
    raw = load_telegram_export(export_path, limit)
    export_root = export_path.parent
    library: list[dict[str, Any]] = []
    for i, msg in enumerate(raw):
        attributed = attribute_all or bool(
            re.search(r"ashgan", f"{msg.get('author','')} {msg.get('body','')}", re.I)
        )
        subtest = infer_subtest(msg.get("body", ""), msg.get("documentTitle", ""))
        media_path = None
        if download and msg.get("exportFile"):
            media_path = copy_export_media(msg, export_root)
        kind = infer_media_type(msg.get("documentTitle") or "")
        if not msg.get("documentTitle") and not media_path:
            kind = "note"
        library.append(
            {
                "id": f"export-{slugify(str(msg.get('postId', i)))}",
                "kind": kind,
                "title": (msg.get("documentTitle") or msg.get("body", "").split("\n")[0])[:120],
                "body": (msg.get("body") or "")[:2000],
                "subtest": subtest,
                "sourceUrl": msg.get("sourceUrl") or "",
                "sourceHandle": msg.get("sourceHandle") or "@export",
                "sourceLabel": f"Telegram export · {msg.get('author', '')}".strip(),
                "publishedAt": msg.get("publishedAt"),
                "mediaPath": media_path,
                "externalUrl": None,
                "attributedToAshgan": attributed,
            }
        )
    return library


def ts_string(value: Any) -> str:
    if value is None:
        return "undefined"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    escaped = json.dumps(str(value), ensure_ascii=False)
    return escaped


def write_library_ts(items: list[dict[str, Any]], handles_tried: list[str]) -> None:
    lines = [
        "/** AUTO-GENERATED by scripts/import-ashgan-assets.py — do not edit by hand. */",
        "import type { AshganLibraryItem } from '../types';",
        "",
        f"export const ashganLibraryImportedAt = {ts_string(time.strftime('%Y-%m-%d'))};",
        f"export const ashganLibrarySourceHandles = {json.dumps(handles_tried, ensure_ascii=False)} as const;",
        "",
        "export const ashganLibraryItems: AshganLibraryItem[] = [",
    ]
    for item in items:
        lines.append("  {")
        for key in (
            "id",
            "kind",
            "title",
            "body",
            "subtest",
            "sourceUrl",
            "sourceHandle",
            "sourceLabel",
            "publishedAt",
            "mediaPath",
            "externalUrl",
            "attributedToAshgan",
        ):
            val = item.get(key)
            if key == "mediaPath" and not val:
                lines.append("    mediaPath: undefined,")
            elif key == "externalUrl" and not val:
                lines.append("    externalUrl: undefined,")
            elif key == "publishedAt" and not val:
                lines.append("    publishedAt: undefined,")
            elif key == "body" and not val:
                lines.append('    body: "",')
            elif val is not None:
                lines.append(f"    {key}: {ts_string(val)},")
        lines.append("  },")
    lines.append("];")
    lines.append("")
    LIBRARY_TS.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {LIBRARY_TS.relative_to(ROOT)} ({len(items)} items)")


def write_guide_entries_ts(ashgan_entries: list[dict[str, Any]]) -> None:
    """Patch ashganGuideEntries array in ashganGuide.ts."""
    if not GUIDE_TS.exists():
        print("ashganGuide.ts missing", file=sys.stderr)
        return
    content = GUIDE_TS.read_text(encoding="utf-8")
    entry_lines = ["export const ashganGuideEntries: AshganGuideEntry[] = ["]
    for e in ashgan_entries:
        entry_lines.append("  {")
        for key in (
            "id",
            "subtest",
            "title",
            "body",
            "sourceUrl",
            "sourceLabel",
            "publishedAt",
        ):
            val = e.get(key)
            if key == "publishedAt" and not val:
                entry_lines.append("    publishedAt: undefined,")
            else:
                entry_lines.append(f"    {key}: {ts_string(val)},")
        entry_lines.append("  },")
    entry_lines.append("];")
    new_block = "\n".join(entry_lines)
    patched, n = re.subn(
        r"export const ashganGuideEntries: AshganGuideEntry\[\] = \[[\s\S]*?\];",
        new_block,
        content,
        count=1,
    )
    if n:
        GUIDE_TS.write_text(patched, encoding="utf-8")
        print(f"Patched ashganGuideEntries ({len(ashgan_entries)} items)")


def main() -> None:
    parser = argparse.ArgumentParser(description="Import Telegram assets for Dr. Ashgan library")
    parser.add_argument("--handle", action="append", help="Public @channel (repeatable)")
    parser.add_argument("--invite-link", help="Documented only; cannot scrape private invites")
    parser.add_argument("--export-json", type=Path, help="Telegram Desktop result.json path")
    parser.add_argument("--default-handles", action="store_true", help="Scrape known public OET channels")
    parser.add_argument("--limit", type=int, default=15, help="Max messages per handle")
    parser.add_argument("--download", action="store_true", help="Download CDN / note files")
    parser.add_argument("--write-ts", action="store_true", help="Write ashganLibrary.ts (+ guide entries)")
    parser.add_argument("--attribute-all", action="store_true", help="Mark export items as Dr. Ashgan")
    parser.add_argument(
        "--start-before",
        type=int,
        help="Pagination cursor for t.me/s/ (e.g. 2528 for @OETimportantmaterials PDF posts)",
    )
    parser.add_argument(
        "--test-export-fixture",
        action="store_true",
        help="Import scripts/fixtures/telegram-export-sample/result.json (smoke test)",
    )
    args = parser.parse_args()

    if args.test_export_fixture:
        fixture = ROOT / "scripts" / "fixtures" / "telegram-export-sample" / "result.json"
        args.export_json = fixture
        args.download = True
        args.write_ts = True

    if args.invite_link:
        print(
            f"Note: invite link {args.invite_link} requires Telegram app membership; "
            "use --export-json after exporting the chat.",
            file=sys.stderr,
        )

    handles: list[str] = []
    if args.handle:
        handles.extend(h.lstrip("@") for h in args.handle)
    if args.default_handles:
        handles.extend(DEFAULT_HANDLES)

    all_library: list[dict[str, Any]] = []
    ashgan_guide: list[dict[str, Any]] = []
    handles_tried = list(INVESTIGATED_HANDLES)
    scraped_handles: list[str] = []

    if args.export_json:
        print(f"Loading export {args.export_json}...")
        export_items = process_export(
            args.export_json,
            args.limit * 3,
            args.download,
            args.attribute_all,
        )
        all_library.extend(export_items)
        for item in export_items:
            if item.get("attributedToAshgan") and item.get("body"):
                ashgan_guide.append(
                    {
                        "id": item["id"],
                        "subtest": item["subtest"],
                        "title": item["title"],
                        "body": item["body"],
                        "sourceUrl": item.get("sourceUrl") or "",
                        "sourceLabel": item.get("sourceLabel", "Telegram export"),
                        "publishedAt": item.get("publishedAt"),
                    }
                )

    for handle in handles:
        scraped_handles.append(f"@{handle}")
        start_before = args.start_before
        if start_before is None and handle == "OETimportantmaterials":
            start_before = 2528
        print(f"Scraping @{handle} (limit {args.limit})...")
        try:
            msgs = scrape_channel(handle, args.limit, start_before=start_before)
        except Exception as e:
            print(f"  failed: {e}", file=sys.stderr)
            msgs = []
        print(f"  {len(msgs)} messages parsed")
        items = build_library_items(
            msgs,
            source_handle=f"@{handle}",
            download=args.download,
            attribute_ashgan=False,
        )
        all_library.extend(items)
        for item in items:
            if item.get("attributedToAshgan"):
                ashgan_guide.append(
                    {
                        "id": item["id"],
                        "subtest": item["subtest"],
                        "title": item["title"],
                        "body": item["body"],
                        "sourceUrl": item.get("sourceUrl") or "",
                        "sourceLabel": item.get("sourceLabel", ""),
                        "publishedAt": item.get("publishedAt"),
                    }
                )

    # dedupe by id
    by_id: dict[str, dict[str, Any]] = {}
    for item in all_library:
        by_id[item["id"]] = item
    all_library = list(by_id.values())

    manifest = {
        "importedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "handlesTried": handles_tried,
        "scrapedHandles": scraped_handles,
        "itemCount": len(all_library),
        "ashganAttributedCount": sum(1 for i in all_library if i.get("attributedToAshgan")),
        "items": all_library,
    }
    MANIFEST_JSON.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {MANIFEST_JSON.relative_to(ROOT)}")

    if args.write_ts:
        write_library_ts(all_library, scraped_handles or handles_tried[:4])
        write_guide_entries_ts(ashgan_guide)

    print(
        json.dumps(
            {
                "libraryItems": len(all_library),
                "ashganGuideEntries": len(ashgan_guide),
                "attributedToAshgan": manifest["ashganAttributedCount"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
