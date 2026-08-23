#!/usr/bin/env python3
"""Inventory and safely archive links posted in @OETimportantmaterials.

The public channel preview is paginated. This script stores each source-page snapshot,
records every post/link relationship, and optionally downloads public Drive folders.
It never reads Telegram credentials or private local Telegram data.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import subprocess
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, unquote, urljoin, urlparse
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup

CHANNEL = "OETimportantmaterials"
CHANNEL_URL = f"https://t.me/s/{CHANNEL}"
DEFAULT_ROOT = Path("/Volumes/GENODODI/oet-study-sources")
USER_AGENT = "Mozilla/5.0 (compatible; OETSourceArchiver/1.0)"


@dataclass
class TelegramLink:
    post_id: int
    post_url: str
    url: str
    label: str
    category: str
    acquisition_status: str = "inventoried"
    local_path: str | None = None
    note: str | None = None


def fetch(url: str, timeout: int = 45) -> tuple[bytes, str, str]:
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=timeout) as response:
        return response.read(), response.headers.get("content-type", "application/octet-stream"), response.geturl()


def safe_name(value: str, fallback: str) -> str:
    value = unquote(value).strip().replace("\x00", "")
    value = re.sub(r"[\\/:*?\"<>|]+", "_", value)
    value = re.sub(r"\s+", " ", value).strip(" .")
    return value[:180] or fallback


def category_for(url: str) -> str:
    host = urlparse(url).netloc.lower().removeprefix("www.")
    if host in {"drive.google.com", "docs.google.com"}:
        return "google-drive"
    if host.endswith("mega.nz"):
        return "mega"
    if host in {"youtube.com", "youtu.be"}:
        return "youtube"
    if host.endswith("facebook.com"):
        return "facebook"
    if host in {"t.me", "telegram.me"}:
        return "telegram-post"
    if host in {"wa.me", "chat.whatsapp.com", "discord.gg", "discord.com"}:
        return "community-invite"
    return "web"


def drive_folder_id(url: str) -> str | None:
    match = re.search(r"/(?:drive/(?:mobile/)?folders|folders)/([A-Za-z0-9_-]+)", url)
    if match:
        return match.group(1)
    query_id = parse_qs(urlparse(url).query).get("id", [])
    return query_id[0] if query_id else None


def archive_generic(link: TelegramLink, root: Path) -> None:
    if link.category in {"community-invite", "facebook", "mega"}:
        link.acquisition_status = "link-only"
        link.note = "Inventoried; handled by its dedicated source workflow or requires an account action."
        return

    if link.category == "google-drive" and drive_folder_id(link.url):
        link.acquisition_status = "queued-for-drive-workflow"
        return

    if link.category == "youtube":
        metadata_dir = root / "raw" / "telegram" / "youtube-metadata"
        metadata_dir.mkdir(parents=True, exist_ok=True)
        target = metadata_dir / f"post-{link.post_id}.json"
        try:
            result = subprocess.run(
                [
                    "yt-dlp", "--skip-download", "--dump-single-json", "--playlist-end", "1",
                    "--socket-timeout", "15", "--no-warnings", link.url,
                ],
                capture_output=True,
                text=True,
                timeout=45,
                check=False,
            )
        except subprocess.TimeoutExpired:
            link.acquisition_status = "metadata-timeout"
            link.note = "yt-dlp metadata lookup exceeded 45 seconds; the source URL remains inventoried."
            return
        if result.returncode == 0:
            target.write_text(result.stdout, encoding="utf-8")
            link.acquisition_status = "metadata-saved"
            link.local_path = str(target.relative_to(root))
        else:
            link.acquisition_status = "metadata-failed"
            link.note = result.stderr[-300:]
        return

    try:
        payload, content_type, final_url = fetch(link.url)
    except Exception as exc:  # noqa: BLE001 - each inaccessible link is a report row
        link.acquisition_status = "fetch-failed"
        link.note = str(exc)[:300]
        return

    parsed = urlparse(final_url)
    suffix = Path(parsed.path).suffix.lower()
    is_html = "text/html" in content_type
    fallback = f"post-{link.post_id}-{hashlib.sha256(link.url.encode()).hexdigest()[:10]}"
    if is_html:
        name = f"{fallback}.html"
        destination_dir = root / "raw" / "telegram" / "linked-pages"
        status = "page-snapshot-saved"
    else:
        name = safe_name(Path(parsed.path).name, fallback + (suffix or ".bin"))
        destination_dir = root / "raw" / "telegram" / "linked-files"
        status = "file-saved"
    destination_dir.mkdir(parents=True, exist_ok=True)
    destination = destination_dir / name
    if not (destination.exists() and destination.read_bytes() == payload):
        destination.write_bytes(payload)
    link.acquisition_status = status
    link.local_path = str(destination.relative_to(root))


def scrape(root: Path, max_pages: int) -> list[TelegramLink]:
    pages_dir = root / "raw" / "telegram" / "channel-pages"
    pages_dir.mkdir(parents=True, exist_ok=True)
    before: int | None = None
    seen_posts: set[int] = set()
    records: list[TelegramLink] = []

    for page_number in range(max_pages):
        url = CHANNEL_URL if before is None else f"{CHANNEL_URL}?before={before}"
        payload, _, _ = fetch(url)
        (pages_dir / f"page-{page_number:03d}-before-{before or 'latest'}.html").write_bytes(payload)
        soup = BeautifulSoup(payload, "lxml")
        messages = soup.select(".tgme_widget_message[data-post]")
        page_ids: list[int] = []
        new_posts = 0
        for message in messages:
            data_post = message.get("data-post", "")
            match = re.search(r"/(\d+)$", data_post)
            if not match:
                continue
            post_id = int(match.group(1))
            page_ids.append(post_id)
            if post_id in seen_posts:
                continue
            seen_posts.add(post_id)
            new_posts += 1
            anchors = message.select(
                ".tgme_widget_message_text a[href], a.tgme_widget_message_link_preview[href]"
            )
            seen_in_post: set[str] = set()
            for anchor in anchors:
                raw_url = html.unescape(anchor.get("href", "")).strip()
                if not raw_url:
                    continue
                joined = urljoin(CHANNEL_URL, raw_url)
                # Some old Telegram posts contain two pasted URLs without a separator.
                # Preserve both source links instead of treating the joined string as one URL.
                absolutes = re.findall(r"https?://.*?(?=https?://|$)", joined)
                for absolute in absolutes:
                    if absolute in seen_in_post:
                        continue
                    seen_in_post.add(absolute)
                    records.append(
                        TelegramLink(
                            post_id=post_id,
                            post_url=f"https://t.me/{CHANNEL}/{post_id}",
                            url=absolute,
                            label=anchor.get_text(" ", strip=True)[:300],
                            category=category_for(absolute),
                        )
                    )
        if not page_ids or new_posts == 0:
            break
        next_before = min(page_ids)
        if before is not None and next_before >= before:
            break
        before = next_before
        time.sleep(0.25)
    return records


def download_drive_folders(records: list[TelegramLink], root: Path) -> None:
    destination_root = root / "raw" / "telegram" / "google-drive"
    destination_root.mkdir(parents=True, exist_ok=True)
    attempted: set[str] = set()
    for record in records:
        folder_id = drive_folder_id(record.url)
        if record.category != "google-drive" or not folder_id:
            continue
        if folder_id in attempted:
            record.acquisition_status = "duplicate-folder-reference"
            continue
        attempted.add(folder_id)
        destination = destination_root / folder_id
        destination.mkdir(parents=True, exist_ok=True)
        result = subprocess.run(
            [
                "uv", "run", "--with", "gdown", "gdown", "--folder", "--continue",
                "--no-cookies", "-O", str(destination), record.url,
            ],
            capture_output=True,
            text=True,
            timeout=60 * 60 * 6,
            check=False,
        )
        record.acquisition_status = "downloaded" if result.returncode == 0 else "download-partial-or-failed"
        record.local_path = str(destination.relative_to(root))
        if result.returncode != 0:
            record.note = (result.stderr or result.stdout)[-500:]


def write_reports(records: list[TelegramLink], root: Path) -> None:
    manifests = root / "manifests"
    reports = root / "reports"
    manifests.mkdir(parents=True, exist_ok=True)
    reports.mkdir(parents=True, exist_ok=True)
    generated_at = datetime.now(timezone.utc).isoformat()
    payload = {
        "schemaVersion": 1,
        "generatedAt": generated_at,
        "source": f"@{CHANNEL}",
        "records": [asdict(record) for record in records],
    }
    (manifests / "telegram-link-index.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    unique_urls = len({record.url for record in records})
    categories: dict[str, int] = {}
    statuses: dict[str, int] = {}
    for record in records:
        categories[record.category] = categories.get(record.category, 0) + 1
        statuses[record.acquisition_status] = statuses.get(record.acquisition_status, 0) + 1
    lines = [
        "# Telegram link inventory",
        "",
        f"- Source: `@{CHANNEL}`",
        f"- Generated: {generated_at}",
        f"- Post/link records: {len(records)}",
        f"- Unique URLs: {unique_urls}",
        "",
        "## Categories",
        "",
        *[f"- {key}: {value}" for key, value in sorted(categories.items())],
        "",
        "## Acquisition status",
        "",
        *[f"- {key}: {value}" for key, value in sorted(statuses.items())],
    ]
    (reports / "telegram-link-inventory.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT)
    parser.add_argument("--max-pages", type=int, default=250)
    parser.add_argument("--download-drive", action="store_true")
    args = parser.parse_args()
    root = args.root.resolve()
    if not str(root).startswith("/Volumes/GENODODI/"):
        raise SystemExit("Archive root must be under /Volumes/GENODODI/")
    records = scrape(root, args.max_pages)
    for record in records:
        archive_generic(record, root)
    if args.download_drive:
        download_drive_folders(records, root)
    write_reports(records, root)
    print(f"Inventoried {len(records)} post/link records from @{CHANNEL}.")


if __name__ == "__main__":
    main()
