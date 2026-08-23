#!/usr/bin/env python3
"""Inventory Drive descendants and download every accessible file without fail-fast.

Run through uv so the repository does not need a Python virtual environment:
  uv run --with gdown python scripts/acquire-google-drive-resilient.py --default-sources
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import gdown

ARCHIVE_ROOT = Path("/Volumes/GENODODI/oet-study-sources")
DEFAULT_IDS = [
    "1vJmNmLSAdB19npX2P8q5bspV5hKm_FMM",
    "1Ucb79sZUycOJqmM-bZTku1QCzlAPhBot",
    "1EZvkn35NuRVaSizepiqJp6NCGZKv_V9k",
    "10cvKcazYuaNe01cSahOSHbflbOlAEN0t",
    "1NVdBFWSqnswl58pr96BVwTkH1ceT6P-j",
    "1v2Bza1LzG_Bp5NrMYpZ54CLDp6C-xhu8",
]


def sha256(filename: Path) -> str:
    digest = hashlib.sha256()
    with filename.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def folder_id(url: str) -> str | None:
    match = re.search(r"/(?:drive/(?:mobile/)?folders|folders)/([A-Za-z0-9_-]+)", url)
    if match:
        return match.group(1)
    parsed = urlparse(url)
    if parsed.path.endswith("/folderview"):
        values = parse_qs(parsed.query).get("id", [])
        return values[0] if values else None
    return None


def direct_file_id(url: str) -> str | None:
    match = re.search(r"drive\.google\.com/file/d/([A-Za-z0-9_-]+)", url)
    return match.group(1) if match else None


def ensure_within(path: Path, root: Path) -> Path:
    resolved = path.resolve()
    if not resolved.is_relative_to(root.resolve()):
        raise ValueError(f"Refusing path outside destination: {resolved}")
    return resolved


def existing_candidate(
    item_path: Path,
    destination: Path | None = None,
    original_path: str | None = None,
) -> Path | None:
    if item_path.is_file() and item_path.stat().st_size > 0 and not item_path.name.endswith(".part"):
        return item_path
    if destination and original_path:
        for child in destination.iterdir():
            if not child.is_dir():
                continue
            alternate = ensure_within(child / original_path, destination)
            if alternate.is_file() and alternate.stat().st_size > 0 and not alternate.name.endswith(".part"):
                return alternate
    if not item_path.suffix and item_path.parent.exists():
        candidates = [
            candidate
            for candidate in item_path.parent.glob(f"{item_path.name}*")
            if candidate.is_file() and candidate.stat().st_size > 0 and not candidate.name.endswith(".part")
        ]
        if len(candidates) == 1:
            return candidates[0]
    return None


def load_telegram_ids(manifest: Path) -> list[str]:
    data = json.loads(manifest.read_text(encoding="utf-8"))
    ids: list[str] = []
    for record in data.get("records", []):
        if record.get("category") != "google-drive":
            continue
        candidate = folder_id(record.get("url", ""))
        if candidate and candidate not in ids:
            ids.append(candidate)
    return ids


def load_telegram_direct_files(manifest: Path) -> list[dict]:
    data = json.loads(manifest.read_text(encoding="utf-8"))
    records: list[dict] = []
    seen: set[str] = set()
    for record in data.get("records", []):
        file_id = direct_file_id(record.get("url", ""))
        if record.get("category") != "google-drive" or not file_id or file_id in seen:
            continue
        seen.add(file_id)
        records.append({"fileId": file_id, "sourceUrl": record["url"], "postId": record.get("post_id")})
    return records


def process_direct_file(source: dict, destination: Path) -> dict:
    target_dir = ensure_within(destination / "_direct-files" / source["fileId"], destination)
    target_dir.mkdir(parents=True, exist_ok=True)
    existing = [item for item in target_dir.iterdir() if item.is_file() and item.stat().st_size > 0]
    record = {**source, "status": "pending"}
    if len(existing) == 1:
        record.update(
            status="already-present",
            localPath=str(existing[0]),
            bytes=existing[0].stat().st_size,
            sha256=sha256(existing[0]),
        )
        return record
    try:
        downloaded = gdown.download(
            id=source["fileId"],
            output=str(target_dir) + "/",
            quiet=True,
            use_cookies=False,
            resume=True,
        )
        if not downloaded:
            raise RuntimeError("gdown returned no downloaded path")
        downloaded_path = ensure_within(Path(downloaded), destination)
        record.update(
            status="downloaded",
            localPath=str(downloaded_path),
            bytes=downloaded_path.stat().st_size,
            sha256=sha256(downloaded_path),
        )
    except Exception as error:
        record.update(status="blocked-or-failed", error=str(error)[:1000])
    return record


def acquire_direct_files(
    sources: list[dict],
    destination: Path,
    manifests_root: Path,
    max_workers: int,
    retry_blocked: bool,
) -> dict:
    manifest_path = manifests_root / "telegram-google-drive-direct-files.json"
    prior_by_id: dict[str, dict] = {}
    if manifest_path.exists():
        try:
            prior = json.loads(manifest_path.read_text(encoding="utf-8"))
            prior_by_id = {record["fileId"]: record for record in prior.get("records", [])}
        except (OSError, json.JSONDecodeError):
            prior_by_id = {}
    result = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceContainer": "telegram-google-drive-direct-files",
        "destination": str(destination / "_direct-files"),
        "records": [],
    }
    pending = []
    for source in sources:
        prior_record = prior_by_id.get(source["fileId"])
        prior_file = Path(prior_record.get("localPath", "")) if prior_record else None
        if prior_record and prior_record.get("status") == "blocked-or-failed" and not retry_blocked:
            result["records"].append(prior_record)
        elif prior_record and prior_file and prior_file.is_file() and prior_file.stat().st_size > 0:
            result["records"].append(prior_record)
        else:
            pending.append(source)
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(process_direct_file, source, destination): source for source in pending}
        for future in as_completed(futures):
            record = future.result()
            result["records"].append(record)
            result["generatedAt"] = datetime.now(timezone.utc).isoformat()
            manifest_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"direct file {record['fileId']}: {record['status']}")
    statuses: dict[str, int] = {}
    for record in result["records"]:
        statuses[record["status"]] = statuses.get(record["status"], 0) + 1
    result["statusCounts"] = statuses
    result["generatedAt"] = datetime.now(timezone.utc).isoformat()
    manifest_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    return result


def process_item(item, destination: Path) -> dict:
    target = ensure_within(Path(item.local_path), destination)
    target.parent.mkdir(parents=True, exist_ok=True)
    record = {
        "fileId": item.id,
        "originalPath": item.path,
        "requestedLocalPath": str(target),
        "status": "pending",
    }
    existing = existing_candidate(target, destination, item.path)
    if existing:
        record.update(
            status="already-present",
            localPath=str(existing),
            bytes=existing.stat().st_size,
            sha256=sha256(existing),
        )
        return record
    try:
        downloaded = gdown.download(
            id=item.id,
            output=str(target),
            quiet=True,
            use_cookies=False,
            resume=True,
        )
        if not downloaded:
            raise RuntimeError("gdown returned no downloaded path")
        downloaded_path = ensure_within(Path(downloaded), destination)
        record.update(
            status="downloaded",
            localPath=str(downloaded_path),
            bytes=downloaded_path.stat().st_size,
            sha256=sha256(downloaded_path),
        )
    except Exception as error:
        record.update(status="blocked-or-failed", error=str(error)[:1000])
    return record


def acquire_folder(
    source_id: str,
    destination_root: Path,
    manifests_root: Path,
    max_workers: int,
    retry_blocked: bool,
) -> dict:
    source_url = f"https://drive.google.com/drive/folders/{source_id}"
    destination = ensure_within(destination_root / source_id, destination_root)
    destination.mkdir(parents=True, exist_ok=True)
    manifest_prefix = "telegram-" if "telegram" in destination_root.parts else "supplied-"
    manifest_path = manifests_root / f"{manifest_prefix}google-drive-{source_id}.json"
    prior_by_id: dict[str, dict] = {}
    if manifest_path.exists():
        try:
            prior = json.loads(manifest_path.read_text(encoding="utf-8"))
            if prior.get("folderId") == source_id and prior.get("destination") == str(destination):
                prior_by_id = {
                    record["fileId"]: record
                    for record in prior.get("records", [])
                    if record.get("fileId")
                }
        except (OSError, json.JSONDecodeError):
            prior_by_id = {}
    result = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceUrl": source_url,
        "sourceContainer": "google-drive",
        "folderId": source_id,
        "destination": str(destination),
        "enumerationStatus": "pending",
        "records": [],
    }
    try:
        items = gdown.download_folder(
            id=source_id,
            output=str(destination),
            quiet=False,
            use_cookies=False,
            skip_download=True,
        )
        result["enumerationStatus"] = "complete"
    except Exception as error:  # one inaccessible folder must not stop the queue
        result["enumerationStatus"] = "failed"
        result["enumerationError"] = str(error)[:1000]
        items = []

    pending_items = []
    for item in items:
        prior_record = prior_by_id.get(item.id)
        prior_file = Path(prior_record.get("localPath", "")) if prior_record else None
        if prior_record and prior_record.get("status") == "blocked-or-failed" and not retry_blocked:
            archived = existing_candidate(Path(item.local_path), destination, item.path)
            if archived:
                result["records"].append(
                    {
                        **prior_record,
                        "status": "already-present",
                        "localPath": str(archived),
                        "bytes": archived.stat().st_size,
                        "sha256": sha256(archived),
                        "error": None,
                    }
                )
            else:
                result["records"].append(prior_record)
        elif prior_record and prior_file and prior_file.is_file() and prior_file.stat().st_size > 0:
            result["records"].append(prior_record)
        else:
            pending_items.append(item)

    result["generatedAt"] = datetime.now(timezone.utc).isoformat()
    manifest_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(process_item, item, destination): item for item in pending_items}
        for future in as_completed(futures):
            record = future.result()
            result["records"].append(record)
            print(f"{source_id}: {len(result['records'])}/{len(items)} {record['status']} {record['originalPath']}")
            # Persist after every file so interruption never loses completed work.
            result["generatedAt"] = datetime.now(timezone.utc).isoformat()
            manifest_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    statuses: dict[str, int] = {}
    for record in result["records"]:
        statuses[record["status"]] = statuses.get(record["status"], 0) + 1
    result["statusCounts"] = statuses
    result["generatedAt"] = datetime.now(timezone.utc).isoformat()
    manifest_path.write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return result


def write_summary(archive_root: Path, manifests_root: Path, destination: Path) -> None:
    summary_scope = "telegram" if "telegram" in destination.parts else "supplied"
    folders = []
    for manifest_path in sorted(manifests_root.glob(f"{summary_scope}-google-drive-*.json")):
        try:
            result = json.loads(manifest_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if not result.get("folderId"):
            continue
        statuses: dict[str, int] = {}
        for record in result.get("records", []):
            statuses[record["status"]] = statuses.get(record["status"], 0) + 1
        folders.append(
            {
                "folderId": result["folderId"],
                "enumerationStatus": result.get("enumerationStatus", "unknown"),
                "statusCounts": statuses,
            }
        )
    payload = {"generatedAt": datetime.now(timezone.utc).isoformat(), "folders": folders}
    direct_path = manifests_root / "telegram-google-drive-direct-files.json"
    if summary_scope == "telegram" and direct_path.exists():
        try:
            direct = json.loads(direct_path.read_text(encoding="utf-8"))
            payload["directFiles"] = direct.get("statusCounts", {})
        except (OSError, json.JSONDecodeError):
            pass
    (archive_root / "reports" / f"google-drive-resilient-{summary_scope}-summary.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--folder-id", action="append", default=[])
    parser.add_argument("--default-sources", action="store_true")
    parser.add_argument("--from-telegram-manifest", type=Path)
    parser.add_argument("--destination", type=Path, default=ARCHIVE_ROOT / "raw/google-drive")
    parser.add_argument("--max-workers", type=int, default=4)
    parser.add_argument("--retry-blocked", action="store_true")
    parser.add_argument("--summarize-only", action="store_true")
    args = parser.parse_args()

    archive_root = ARCHIVE_ROOT.resolve()
    destination = args.destination.resolve()
    if not destination.is_relative_to(archive_root):
        raise SystemExit("Destination must remain under /Volumes/GENODODI/oet-study-sources")
    manifests_root = archive_root / "manifests" / "google-drive"
    destination.mkdir(parents=True, exist_ok=True)
    manifests_root.mkdir(parents=True, exist_ok=True)

    ids: list[str] = []
    for source_id in (DEFAULT_IDS if args.default_sources else []):
        if source_id not in ids:
            ids.append(source_id)
    for source_id in args.folder_id:
        if source_id not in ids:
            ids.append(source_id)
    if args.from_telegram_manifest:
        for source_id in load_telegram_ids(args.from_telegram_manifest):
            if source_id not in ids:
                ids.append(source_id)
    if not ids and not args.summarize_only:
        raise SystemExit("No Google Drive folder IDs were supplied")
    if not 1 <= args.max_workers <= 8:
        raise SystemExit("--max-workers must be between 1 and 8")

    if args.summarize_only:
        write_summary(archive_root, manifests_root, destination)
        print("Rebuilt resilient Drive summary from per-source manifests.")
        return

    if args.from_telegram_manifest:
        acquire_direct_files(
            load_telegram_direct_files(args.from_telegram_manifest),
            destination,
            manifests_root,
            max_workers=args.max_workers,
            retry_blocked=args.retry_blocked,
        )

    for source_id in ids:
        acquire_folder(
            source_id,
            destination,
            manifests_root,
            max_workers=args.max_workers,
            retry_blocked=args.retry_blocked,
        )
    write_summary(archive_root, manifests_root, destination)
    print(f"Processed {len(ids)} Google Drive folder(s) without fail-fast aborts.")


if __name__ == "__main__":
    main()
