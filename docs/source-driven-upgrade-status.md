# Source-driven OET upgrade: revised delivery plan

Last reconciled: 2026-08-31

## Objective

Maintain a Medicine-first OET study system for a 450+ target while keeping
third-party source material private, traceable, checksummed, and outside Git.

## Completed

- The Medicine learner experience is live: diagnostic, adaptive plan, timed
  Listening/Reading/Writing/Speaking practice, mocks, review, provenance, and
  deterministic offline tutoring.
- Optional browser-only AI review validates structured responses and falls back
  to the offline tutor on provider failure.
- Learner data uses versioned local schemas and migrations. USMLE remains
  isolated from OET readiness and reporting.
- Major pages and data banks are lazy-loaded. Root/public media duplication and
  unverifiable candidate-experience content were removed from the served app.
- Unit, component, content, governance, audio, manifest, build, and browser-flow
  gates run before GitHub Pages deployment.
- The original upgrade pull request was merged to `main`; GitHub Pages is live.
- Facebook, Telegram, MEGA, the supplied Google document, and the official
  speaking-masterclass reference were archived or indexed on GENODODI. The MEGA
  archive was checksum-verified and safely extracted.

## Resumed work completed

### 1. Recover Google Drive descendants

The original Drive inventory completed, but `gdown` could not obtain public
download URLs for many descendants. A Safari verification on 2026-08-28 proved
that at least one representative blocked file remained publicly downloadable.

The resilient downloader now:

- prefers Google's browser-backed `drive.usercontent.google.com` endpoint;
- rejects HTML access/confirmation responses as files;
- streams to `.part` files and resumes byte ranges where supported;
- sanitizes server-provided filenames and enforces the GENODODI archive root;
- falls back to `gdown` for files needing its confirmation handling;
- exports public native Google Docs, Sheets, and Slides when no binary download
  exists;
- records the successful download method, size, and SHA-256 in each manifest;
- reuses an already archived immutable Drive file ID instead of storing duplicate
  bytes, while retaining the additional source-path record;
- persists after every item so interrupted runs remain resumable.
- preserves the last good per-folder records when Google transiently fails
  during folder enumeration.
- can reconcile and resume from that preserved descendant inventory without
  waiting for Google to repeat a large recursive listing.
- keeps the complete descendant inventory separate from incremental download
  results, so an interrupted pass cannot lose not-yet-processed file IDs;
- retries transient connection resets with staggered backoff and can restrict a
  pass to incomplete folders;
- tolerates a deleted nested folder and continues archiving its accessible
  siblings while recording the skipped child and exact error.

Run the supplied-folder recovery:

```bash
npm run sources:drive-resilient -- --default-sources --retry-blocked --max-workers 8
```

Then recover Drive links discovered in Telegram:

```bash
npm run sources:drive-resilient -- \
  --from-telegram-manifest /Volumes/GENODODI/oet-study-sources/manifests/telegram-link-index.json \
  --destination /Volumes/GENODODI/oet-study-sources/raw/telegram/google-drive \
  --retry-blocked --max-workers 8
```

### 2. Rebuild and verify the external inventory

After recovery, regenerate checksums and the inventory report, then run strict
external-manifest validation:

```bash
npm run sources:inventory
npm run test:source-manifest -- --require-external
```

### 3. Evidence-backed exceptions

The completed recovery established the following external constraints:

- 12 Telegram folder links return 404 before any descendants can be listed;
- one accessible 588-item folder contains one deleted nested folder returning
  404; all 588 accessible sibling files were archived or deduplicated;
- 17 listed files are explicitly owner/editor-only;
- four direct file links are deleted or not publicly shared.

Their file or folder IDs, original paths, source URLs, and exact errors remain
in the per-source manifests and summary reports. No inaccessible item is
reported as archived.

## Archive reconciliation

The final 2026-08-30 external inventory records 4,737 source-path records,
2,328 unique files, and 13,824,066,212 unique bytes. Telegram Drive recovery
records 1,185 downloaded files, 1,872 deduplicated source paths, 68 previously
present paths, and 21 owner-restricted/deleted file exceptions. The six supplied
Drive folders contain no failed descendants. Nine encrypted files are physically
isolated in quarantine; duplicate source-path records retain their provenance.

## Acceptance status

- Application and public-source governance: complete.
- All four Medicine sub-tests and offline tutoring: complete.
- Automated tests and Pages deployment: complete.
- Accessible external archive: complete with checksums and source-path records.
- The complete 4,737-record external ledger is mirrored into the project and refreshed daily; rights-unclear binaries remain private on GENODODI.
- The workstation catalog provides more than 1,000 Medicine test sessions for each of Listening, Reading, Writing, and Speaking.
- Owner-restricted, deleted, or otherwise inaccessible Drive items: documented
  exceptions until the owner changes access.
