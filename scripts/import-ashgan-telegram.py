#!/usr/bin/env python3
"""
Scrape public Telegram channel previews (t.me/s/<handle>) and print JSON for ashganGuideEntries.

Usage:
  python3 scripts/import-ashgan-telegram.py OETDoctors --limit 30
  python3 scripts/import-ashgan-telegram.py <public_channel_handle> > /tmp/ashgan-scrape.json

Only use for public channels. Private groups (@OETDoctorsHub) have no t.me/s/ history.
Paste verified Dr. Ashgan posts into src/data/ashganGuide.ts manually or extend this script
to merge JSON into the TypeScript file.
"""

from __future__ import annotations

import html as html_lib
import json
import re
import sys
import urllib.request

USER_AGENT = "OET-Study-Partner/1.0 (public channel preview scraper)"


def fetch_channel_html(handle: str) -> str:
    handle = handle.lstrip("@")
    url = f"https://t.me/s/{handle}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def extract_messages(page_html: str, limit: int) -> list[dict]:
    blocks = re.findall(
        r'class="tgme_widget_message_wrap[^"]*"[\s\S]*?</div>\s*</div>\s*</div>',
        page_html,
    )
    entries: list[dict] = []
    for block in blocks:
        text_match = re.search(
            r'class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)</div>',
            block,
        )
        if not text_match:
            continue
        raw = text_match.group(1)
        text = re.sub(r"<br\s*/?>", "\n", raw)
        text = re.sub(r"<[^>]+>", "", text)
        text = html_lib.unescape(text).strip()
        if not text or len(text) < 20:
            continue
        link_match = re.search(r'href="(https://t\.me/[^"]+/\d+)"', block)
        source_url = link_match.group(1) if link_match else ""
        date_match = re.search(r'<time[^>]+datetime="([^"]+)"', block)
        published = date_match.group(1)[:10] if date_match else None
        title = text.split("\n")[0][:120]
        entries.append(
            {
                "title": title,
                "body": text[:2000],
                "sourceUrl": source_url,
                "sourceLabel": source_url or "Telegram post",
                "publishedAt": published,
            }
        )
        if len(entries) >= limit:
            break
    return entries


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: import-ashgan-telegram.py <handle> [--limit N]", file=sys.stderr)
        sys.exit(1)
    handle = sys.argv[1].lstrip("@")
    limit = 30
    if "--limit" in sys.argv:
        idx = sys.argv.index("--limit")
        limit = int(sys.argv[idx + 1])
    page = fetch_channel_html(handle)
    if "tgme_widget_message" not in page:
        print(
            json.dumps(
                {
                    "error": "no_public_preview",
                    "handle": handle,
                    "hint": "Channel may be private or username invalid.",
                },
                indent=2,
            )
        )
        sys.exit(2)
    messages = extract_messages(page, limit)
    print(json.dumps({"handle": f"@{handle}", "count": len(messages), "messages": messages}, indent=2))


if __name__ == "__main__":
    main()
