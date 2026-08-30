#!/usr/bin/env python3
"""Inventory Drive descendants and download every accessible file without fail-fast.

Run through uv so the repository does not need a Python virtual environment:
  uv run --with gdown python scripts/acquire-google-drive-resilient.py --default-sources
"""

from __future__ import annotations

import argparse
import hashlib
import importlib
import json
import os
import re
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from email.message import Message
from pathlib import Path
from types import SimpleNamespace
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlencode, urlparse
from urllib.request import Request, urlopen

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
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) OETSourceArchive/1.0"


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


def disposition_filename(value: str | None) -> str | None:
    if not value:
        return None
    message = Message()
    message["content-disposition"] = value
    filename = message.get_filename()
    if not filename:
        return None
    # Content-Disposition is untrusted remote input. Keep only a plain filename.
    filename = Path(filename.replace("\x00", "")).name.strip()
    return filename or None


def download_usercontent(
    file_id: str,
    target: Path,
    destination: Path,
    use_header_filename: bool = False,
) -> Path:
    """Download from the browser-backed Drive endpoint with safe resume support."""
    target = ensure_within(target, destination)
    target.parent.mkdir(parents=True, exist_ok=True)
    partial = ensure_within(target.with_name(f"{target.name}.part"), destination)
    offset = partial.stat().st_size if partial.exists() else 0
    query = urlencode({"id": file_id, "export": "download"})
    headers = {"User-Agent": USER_AGENT}
    if offset:
        headers["Range"] = f"bytes={offset}-"
    request = Request(f"https://drive.usercontent.google.com/download?{query}", headers=headers)

    try:
        response = urlopen(request, timeout=90)
    except (HTTPError, URLError) as error:
        raise RuntimeError(f"Drive usercontent request failed: {error}") from error

    with response:
        content_type = response.headers.get_content_type().lower()
        if content_type in {"text/html", "application/xhtml+xml"}:
            raise RuntimeError(
                "Drive returned an HTML access/confirmation page instead of file bytes"
            )
        if use_header_filename:
            remote_name = disposition_filename(response.headers.get("Content-Disposition"))
            if remote_name:
                target = ensure_within(target.parent / remote_name, destination)
                partial = ensure_within(target.with_name(f"{target.name}.part"), destination)
                offset = partial.stat().st_size if partial.exists() else 0

        append = offset > 0 and response.status == 206
        if offset and not append:
            offset = 0
        with partial.open("ab" if append else "wb") as stream:
            while chunk := response.read(1024 * 1024):
                stream.write(chunk)

    if not partial.exists() or partial.stat().st_size == 0:
        raise RuntimeError("Drive usercontent endpoint returned an empty file")
    os.replace(partial, target)
    return target


def download_workspace_export(
    file_id: str,
    target: Path,
    destination: Path,
    use_header_filename: bool = False,
) -> Path:
    """Export a public native Google Doc, Sheet, or Slides file."""
    candidates = [
        (f"https://docs.google.com/document/d/{file_id}/export?format=pdf", ".pdf"),
        (f"https://docs.google.com/spreadsheets/d/{file_id}/export?format=xlsx", ".xlsx"),
        (f"https://docs.google.com/presentation/d/{file_id}/export/pdf", ".pdf"),
    ]
    errors: list[str] = []
    for url, extension in candidates:
        try:
            response = urlopen(Request(url, headers={"User-Agent": USER_AGENT}), timeout=90)
        except (HTTPError, URLError) as error:
            errors.append(str(error))
            continue
        with response:
            content_type = response.headers.get_content_type().lower()
            if content_type in {"text/html", "application/xhtml+xml"}:
                errors.append(f"{urlparse(url).path}: returned {content_type}")
                continue
            export_target = target
            if use_header_filename:
                remote_name = disposition_filename(response.headers.get("Content-Disposition"))
                if remote_name:
                    export_target = target.parent / remote_name
            if not export_target.suffix:
                export_target = export_target.with_suffix(extension)
            export_target = ensure_within(export_target, destination)
            export_target.parent.mkdir(parents=True, exist_ok=True)
            partial = ensure_within(
                export_target.with_name(f"{export_target.name}.part"), destination
            )
            with partial.open("wb") as stream:
                while chunk := response.read(1024 * 1024):
                    stream.write(chunk)
            if not partial.exists() or partial.stat().st_size == 0:
                errors.append(f"{urlparse(url).path}: returned an empty export")
                continue
            os.replace(partial, export_target)
            return export_target
    raise RuntimeError("Workspace export failed: " + "; ".join(errors))


def download_google_file(
    file_id: str,
    target: Path,
    destination: Path,
    use_header_filename: bool = False,
) -> tuple[Path, str]:
    """Prefer the endpoint proven in Safari, then fall back to gdown."""
    direct_error: Exception | None = None
    transient_markers = (
        "connection reset",
        "remote end closed",
        "temporarily unavailable",
        "timed out",
        "timeout",
    )
    for attempt in range(3):
        try:
            return (
                download_usercontent(
                    file_id,
                    target,
                    destination,
                    use_header_filename=use_header_filename,
                ),
                "drive-usercontent",
            )
        except Exception as error:  # gdown can still handle confirmation pages
            direct_error = error
            is_transient = any(marker in str(error).lower() for marker in transient_markers)
            if not is_transient or attempt == 2:
                break
            # Google occasionally resets concurrent streams. A short staggered
            # retry recovers those files while preserving any partial bytes.
            jitter = (sum(map(ord, file_id)) % 10) / 10
            time.sleep((attempt + 1) * 1.5 + jitter)

    export_error: Exception | None = None
    try:
        return (
            download_workspace_export(
                file_id,
                target,
                destination,
                use_header_filename=use_header_filename,
            ),
            "google-workspace-export",
        )
    except Exception as error:
        export_error = error

    output = str(target.parent) + "/" if use_header_filename else str(target)
    try:
        downloaded = gdown.download(
            id=file_id,
            output=output,
            quiet=True,
            use_cookies=False,
            resume=True,
        )
        if not downloaded:
            raise RuntimeError("gdown returned no downloaded path")
        return ensure_within(Path(downloaded), destination), "gdown"
    except Exception as gdown_error:
        raise RuntimeError(
            f"usercontent failed: {direct_error}; export failed: {export_error}; "
            f"gdown failed: {gdown_error}"
        ) from gdown_error


def existing_candidate(
    item_path: Path,
    destination: Path | None = None,
    original_path: str | None = None,
) -> Path | None:
    if item_path.is_file() and item_path.stat().st_size > 0 and not item_path.name.endswith(".part"):
        return item_path
    raw_root = (ARCHIVE_ROOT / "raw").resolve()
    resolved_item = item_path.resolve()
    if resolved_item.is_relative_to(raw_root):
        quarantined = (
            ARCHIVE_ROOT / "quarantine" / "source-files" / resolved_item.relative_to(raw_root)
        )
        if quarantined.is_file() and quarantined.stat().st_size > 0:
            return quarantined
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


def known_file_index(manifests_root: Path) -> dict[str, Path]:
    """Reuse immutable Drive file IDs instead of storing the same bytes twice."""
    known: dict[str, Path] = {}
    raw_root = (ARCHIVE_ROOT / "raw").resolve()
    for manifest_path in manifests_root.glob("*-google-drive-*.json"):
        if manifest_path.name.startswith("._"):
            continue
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except (OSError, UnicodeError, json.JSONDecodeError):
            continue
        for record in manifest.get("records", []):
            file_id = record.get("fileId")
            local_value = record.get("localPath")
            if not file_id or not local_value:
                continue
            local_path = Path(local_value)
            if local_path.is_file() and local_path.stat().st_size > 0:
                known[file_id] = local_path
                continue
            resolved = local_path.resolve()
            if resolved.is_relative_to(raw_root):
                quarantined = (
                    ARCHIVE_ROOT
                    / "quarantine"
                    / "source-files"
                    / resolved.relative_to(raw_root)
                )
                if quarantined.is_file() and quarantined.stat().st_size > 0:
                    known[file_id] = quarantined
    return known


def enumerate_folder_tolerant(source_id: str, destination: Path) -> tuple[list, list[dict]]:
    """Enumerate accessible siblings even when a nested Drive folder is gone.

    gdown's public folder API aborts the whole recursive listing when any child
    returns 404. Its parser is reused defensively here so the manifest can keep
    the skipped child error while still archiving every accessible sibling.
    """
    module = importlib.import_module("gdown.download_folder")
    session, _ = module._get_session(  # noqa: SLF001 - no public shallow parser exists
        proxy=None,
        use_cookies=False,
        user_agent=USER_AGENT,
    )
    files: list = []
    skipped: list[dict] = []
    visited: set[str] = set()

    def walk(folder: str, prefix: Path, is_root: bool = False) -> None:
        if folder in visited:
            skipped.append(
                {"folderId": folder, "path": str(prefix), "error": "Folder cycle detected"}
            )
            return
        visited.add(folder)
        try:
            _, children = module._parse_embedded_folder_view(  # noqa: SLF001
                sess=session,
                folder_id=folder,
                verify=True,
            )
        except Exception as error:
            if is_root:
                raise
            skipped.append(
                {"folderId": folder, "path": str(prefix), "error": str(error)[:1000]}
            )
            return
        for child_id, child_name, child_type in children:
            safe_name = module._sanitize_filename(filename=child_name)  # noqa: SLF001
            child_path = prefix / safe_name
            if child_type == module._GoogleDriveFile.TYPE_FOLDER:  # noqa: SLF001
                walk(child_id, child_path)
                continue
            original_path = child_path.as_posix()
            local_path = ensure_within(destination / original_path, destination)
            files.append(
                SimpleNamespace(id=child_id, path=original_path, local_path=str(local_path))
            )

    walk(source_id, Path(), is_root=True)
    return files, skipped


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


def process_direct_file(source: dict, destination: Path, known_files: dict[str, Path]) -> dict:
    target_dir = ensure_within(destination / "_direct-files" / source["fileId"], destination)
    target_dir.mkdir(parents=True, exist_ok=True)
    existing = [item for item in target_dir.iterdir() if item.is_file() and item.stat().st_size > 0]
    raw_root = (ARCHIVE_ROOT / "raw").resolve()
    if target_dir.is_relative_to(raw_root):
        quarantine_dir = (
            ARCHIVE_ROOT
            / "quarantine"
            / "source-files"
            / target_dir.relative_to(raw_root)
        )
        if quarantine_dir.is_dir():
            existing.extend(
                item for item in quarantine_dir.iterdir() if item.is_file() and item.stat().st_size > 0
            )
    record = {**source, "status": "pending"}
    known = known_files.get(source["fileId"])
    if known and known.is_file() and known.stat().st_size > 0:
        record.update(
            status="deduplicated",
            localPath=str(known),
            bytes=known.stat().st_size,
            sha256=sha256(known),
            downloadMethod="drive-file-id-reference",
        )
        return record
    if len(existing) == 1:
        record.update(
            status="already-present",
            localPath=str(existing[0]),
            bytes=existing[0].stat().st_size,
            sha256=sha256(existing[0]),
        )
        return record
    try:
        downloaded_path, method = download_google_file(
            source["fileId"],
            target_dir / source["fileId"],
            destination,
            use_header_filename=True,
        )
        record.update(
            status="downloaded",
            localPath=str(downloaded_path),
            bytes=downloaded_path.stat().st_size,
            sha256=sha256(downloaded_path),
            downloadMethod=method,
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
        known_files = known_file_index(manifests_root)
        futures = {
            executor.submit(process_direct_file, source, destination, known_files): source
            for source in pending
        }
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


def process_item(
    item,
    destination: Path,
    known_files: dict[str, Path],
    duplicate_paths: set[str],
) -> dict:
    target = ensure_within(Path(item.local_path), destination)
    has_path_collision = item.path in duplicate_paths
    if has_path_collision:
        target = ensure_within(
            target.with_name(f"{target.stem}__drive-{item.id}{target.suffix}"), destination
        )
    target.parent.mkdir(parents=True, exist_ok=True)
    record = {
        "fileId": item.id,
        "originalPath": item.path,
        "requestedLocalPath": str(target),
        "status": "pending",
    }
    existing = existing_candidate(
        target,
        None if has_path_collision else destination,
        None if has_path_collision else item.path,
    )
    if existing:
        record.update(
            status="already-present",
            localPath=str(existing),
            bytes=existing.stat().st_size,
            sha256=sha256(existing),
        )
        return record
    known = None if has_path_collision else known_files.get(item.id)
    if known and known.is_file() and known.stat().st_size > 0:
        record.update(
            status="deduplicated",
            localPath=str(known),
            bytes=known.stat().st_size,
            sha256=sha256(known),
            downloadMethod="drive-file-id-reference",
        )
        return record
    try:
        downloaded_path, method = download_google_file(item.id, target, destination)
        record.update(
            status="downloaded",
            localPath=str(downloaded_path),
            bytes=downloaded_path.stat().st_size,
            sha256=sha256(downloaded_path),
            downloadMethod=method,
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
    prior_inventory: list[dict] = []
    if manifest_path.exists():
        try:
            prior = json.loads(manifest_path.read_text(encoding="utf-8"))
            if prior.get("folderId") == source_id and prior.get("destination") == str(destination):
                prior_by_id = {
                    record["fileId"]: record
                    for record in prior.get("records", [])
                    if record.get("fileId")
                }
                prior_inventory = [
                    record
                    for record in prior.get("inventory", [])
                    if record.get("fileId") and record.get("originalPath")
                ]
        except (OSError, json.JSONDecodeError):
            prior_by_id = {}
    if not prior_by_id:
        # The same immutable folder may be referenced by both the supplied list
        # and Telegram. Use its sibling inventory to recover IDs after a damaged
        # or transiently empty manifest, without copying sibling bytes.
        for sibling_path in manifests_root.glob(f"*-google-drive-{source_id}.json"):
            if sibling_path == manifest_path or sibling_path.name.startswith("._"):
                continue
            try:
                sibling = json.loads(sibling_path.read_text(encoding="utf-8"))
            except (OSError, UnicodeError, json.JSONDecodeError):
                continue
            for sibling_record in sibling.get("records", []):
                file_id = sibling_record.get("fileId")
                original_path = sibling_record.get("originalPath")
                if not file_id or not original_path:
                    continue
                target = ensure_within(destination / original_path, destination)
                archived = existing_candidate(target, destination, original_path)
                recovered = {
                    "fileId": file_id,
                    "originalPath": original_path,
                    "requestedLocalPath": str(target),
                    "status": "pending",
                }
                if archived:
                    recovered.update(
                        status="already-present",
                        localPath=str(archived),
                        bytes=archived.stat().st_size,
                        sha256=sha256(archived),
                    )
                prior_by_id[file_id] = recovered
            if not prior_inventory:
                prior_inventory = [
                    record
                    for record in sibling.get("inventory", [])
                    if record.get("fileId") and record.get("originalPath")
                ]
            if prior_by_id:
                break
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
            quiet=True,
            use_cookies=False,
            skip_download=True,
        )
        result["enumerationStatus"] = "complete"
    except Exception as error:  # one inaccessible folder must not stop the queue
        result["enumerationError"] = str(error)[:1000]
        try:
            items, skipped_folders = enumerate_folder_tolerant(source_id, destination)
        except Exception as tolerant_error:
            result["tolerantEnumerationError"] = str(tolerant_error)[:1000]
            items = []
            skipped_folders = []
        if items:
            result["enumerationStatus"] = "partial-with-skipped-folders"
            result["skippedFolders"] = skipped_folders
        preserved_descendants = prior_inventory or list(prior_by_id.values())
        if not items and preserved_descendants:
            # Reconcile the last complete inventory even while Google is
            # transiently refusing a fresh recursive listing.
            result["enumerationStatus"] = "complete-from-preserved-inventory"
            items = [
                SimpleNamespace(
                    id=record["fileId"],
                    path=record["originalPath"],
                    local_path=record.get("requestedLocalPath")
                    or str(destination / record["originalPath"]),
                )
                for record in preserved_descendants
                if record.get("fileId") and record.get("originalPath")
            ]
        elif not items:
            result["enumerationStatus"] = "failed"
            result["records"] = []
            items = []

    if result["enumerationStatus"] in {"complete", "partial-with-skipped-folders"}:
        # Persist the descendant inventory before any later hashing/indexing step.
        # A crash after a successful listing must not force another full crawl.
        result["inventory"] = [
            {
                "fileId": item.id,
                "originalPath": item.path,
                "requestedLocalPath": str(ensure_within(Path(item.local_path), destination)),
            }
            for item in items
        ]
        result["generatedAt"] = datetime.now(timezone.utc).isoformat()
        manifest_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    pending_items = []
    path_counts = Counter(item.path for item in items)
    duplicate_paths = {item_path for item_path, count in path_counts.items() if count > 1}
    for item in items:
        prior_record = prior_by_id.get(item.id)
        prior_file = Path(prior_record.get("localPath", "")) if prior_record else None
        if item.path in duplicate_paths:
            pending_items.append(item)
        elif prior_record and prior_record.get("status") == "blocked-or-failed" and not retry_blocked:
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
        known_files = known_file_index(manifests_root)
        futures = {
            executor.submit(
                process_item,
                item,
                destination,
                known_files,
                duplicate_paths,
            ): item
            for item in pending_items
        }
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


def folder_needs_recovery(source_id: str, destination: Path, manifests_root: Path) -> bool:
    """Return true when a folder has failed, blocked, pending, or missing records."""
    manifest_prefix = "telegram-" if "telegram" in destination.parts else "supplied-"
    manifest_path = manifests_root / f"{manifest_prefix}google-drive-{source_id}.json"
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError):
        return True
    if manifest.get("enumerationStatus") not in {"complete", "complete-from-preserved-inventory"}:
        return True
    records = manifest.get("records", [])
    if any(record.get("status") in {"pending", "blocked-or-failed"} for record in records):
        return True
    inventory_ids = {
        record.get("fileId") for record in manifest.get("inventory", []) if record.get("fileId")
    }
    record_ids = {record.get("fileId") for record in records if record.get("fileId")}
    return bool(inventory_ids - record_ids)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--folder-id", action="append", default=[])
    parser.add_argument("--default-sources", action="store_true")
    parser.add_argument("--from-telegram-manifest", type=Path)
    parser.add_argument("--destination", type=Path, default=ARCHIVE_ROOT / "raw/google-drive")
    parser.add_argument("--max-workers", type=int, default=4)
    parser.add_argument("--retry-blocked", action="store_true")
    parser.add_argument("--incomplete-only", action="store_true")
    parser.add_argument("--skip-direct-files", action="store_true")
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

    if args.incomplete_only:
        ids = [
            source_id
            for source_id in ids
            if folder_needs_recovery(source_id, destination, manifests_root)
        ]

    if args.from_telegram_manifest and not args.skip_direct_files:
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
