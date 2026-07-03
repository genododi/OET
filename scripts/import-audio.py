#!/usr/bin/env python3
"""Download official OET listening audio from OET CDN and SoundCloud."""

from __future__ import annotations

import json
import shutil
import subprocess
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AUDIO_DIR = ROOT / "public" / "audio" / "listening"
MANIFEST_PATH = ROOT / "src" / "data" / "listeningAudio.manifest.json"

# Probed May 2026 — Sample Tests 1 & 2 are on official SoundCloud (not public CDN MP3).
# Sample Test 3 MP3 is on cdn-aus.aglty.io. Mini Listening #1 has no public MP3 URL.
OFFICIAL_AUDIO = [
    {
        "id": "sample-test-1",
        "filename": "listening-sample-test-1.mp3",
        "source": "soundcloud",
        "url": "https://soundcloud.com/oet-450564055/oet-sample-test-1-new",
        "label": "Official Listening Sample Test 1 (full recording)",
    },
    {
        "id": "sample-test-2",
        "filename": "listening-sample-test-2.mp3",
        "source": "soundcloud",
        "url": "https://soundcloud.com/oet-450564055/oet-listening-sample-test-2",
        "label": "Official Listening Sample Test 2 (full recording)",
    },
    {
        "id": "sample-test-3",
        "filename": "listening-sample-test-3.mp3",
        "source": "cdn",
        "url": "https://cdn-aus.aglty.io/oet/pdf-files/sample-tests/Listening-Sample-Test-3-Audio.mp3",
        "label": "Official Listening Sample Test 3 (full recording)",
        "bytes_hint": 25_196_413,
    },
    {
        "id": "part-b-sample-q28",
        "filename": "part-b-sample-test-2-q28.mp3",
        "source": "cdn",
        "url": "https://cdn-aus.aglty.io/oet/education/Test%202%20Q%2028.mp3",
        "label": "Official Part B extract — Sample Test 2, Question 28",
        "bytes_hint": 873_875,
    },
]


def is_audio(data: bytes) -> bool:
    if data.startswith(b"ID3"):
        return True
    if len(data) >= 2 and data[0] == 0xFF and (data[1] & 0xE0) == 0xE0:
        return True
    return b"ftyp" in data[:32]


def download_cdn(item: dict) -> bytes:
    req = urllib.request.Request(item["url"], headers={"User-Agent": "OET-Study-Partner/1.0"})
    with urllib.request.urlopen(req, timeout=180) as resp:
        data = resp.read()
    if not is_audio(data):
        raise RuntimeError(f"Downloaded file does not look like audio: {item['url']}")
    return data


def download_soundcloud(item: dict, dest: Path) -> int:
    if not shutil.which("yt-dlp"):
        raise RuntimeError("yt-dlp is required to download SoundCloud tracks (brew install yt-dlp)")
    tmp = dest.with_suffix(".tmp.mp3")
    cmd = [
        "yt-dlp",
        "-x",
        "--audio-format",
        "mp3",
        "-o",
        str(tmp),
        item["url"],
    ]
    subprocess.run(cmd, check=True, capture_output=True, text=True)
    if not tmp.exists():
        raise RuntimeError(f"yt-dlp did not produce output for {item['url']}")
    data = tmp.read_bytes()
    if not is_audio(data):
        raise RuntimeError(f"SoundCloud download does not look like audio: {item['url']}")
    dest.write_bytes(data)
    tmp.unlink(missing_ok=True)
    return len(data)


def download_audio(item: dict) -> dict:
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    dest = AUDIO_DIR / item["filename"]
    print(f"Downloading {item['label']}...")
    if item.get("source") == "soundcloud":
        size = download_soundcloud(item, dest)
    else:
        data = download_cdn(item)
        dest.write_bytes(data)
        size = len(data)
    rel = f"/audio/listening/{item['filename']}"
    print(f"  ✓ {size // 1024} KB -> {dest.relative_to(ROOT)}")
    return {
        "id": item["id"],
        "localPath": rel,
        "sourceUrl": item["url"],
        "label": item["label"],
        "bytes": size,
    }


def main() -> None:
    manifest = {"tracks": [], "importedAt": None, "unavailable": []}
    manifest["unavailable"].append(
        {
            "id": "mini-listening-1",
            "reason": "No public MP3 on OET CDN; audio link is inside Mini Listening PDF page 1 only",
        }
    )
    for item in OFFICIAL_AUDIO:
        try:
            manifest["tracks"].append(download_audio(item))
        except (urllib.error.URLError, RuntimeError, subprocess.CalledProcessError) as exc:
            print(f"  ✗ Failed {item['id']}: {exc}")
            manifest["unavailable"].append({"id": item["id"], "reason": str(exc)})
    manifest["importedAt"] = datetime.now(timezone.utc).isoformat()
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"\nManifest written to {MANIFEST_PATH.relative_to(ROOT)}")
    print("Done.")


if __name__ == "__main__":
    main()
